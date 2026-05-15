import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from './schemas/workspace.inputs';
import { FirebaseService } from '../../firebase/firebase.service';
import { Workspace } from './schemas/workspace.schema';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class WorkspacesService {
  private collectionRef: admin.firestore.CollectionReference;

  constructor(private readonly firebaseService: FirebaseService) {
    this.collectionRef = this.firebaseService.db.collection('workspaces');
  }

  async create(
    createWorkspaceInput: CreateWorkspaceInput,
    userId: string,
  ): Promise<Workspace> {
    const id = uuidv4();
    const newWorkspaceRef = this.collectionRef.doc(id);
    const now = new Date();

    const workspaceData = {
      id: newWorkspaceRef.id,
      userId,
      title: createWorkspaceInput.title,
      ...(createWorkspaceInput.emoji && {
        emoji: createWorkspaceInput.emoji,
      }),
      ...(createWorkspaceInput.background_color && {
        background_color: createWorkspaceInput.background_color,
      }),
      ...(createWorkspaceInput.card_show_background !== undefined && {
        card_show_background: createWorkspaceInput.card_show_background,
      }),
      content: createWorkspaceInput.content,
      ...(createWorkspaceInput.taskId && {
        taskId: createWorkspaceInput.taskId,
      }),
      ...(createWorkspaceInput.folderId && {
        folderId: createWorkspaceInput.folderId,
      }),
      saveStatus: createWorkspaceInput.saveStatus,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    await newWorkspaceRef.set(workspaceData);

    return {
      ...workspaceData,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findAll(
    userId: string,
    search?: string,
    folderId?: string,
  ): Promise<Workspace[]> {
    let query: admin.firestore.Query = this.collectionRef.where(
      'userId',
      '==',
      userId,
    );

    if (folderId) {
      query = query.where('folderId', '==', folderId);
    }

    const snapshot = await query.get();

    let workspaces = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        saveStatus: (data.saveStatus as boolean | undefined) ?? false,
        createdAt: (data.createdAt as admin.firestore.Timestamp).toDate(),
        updatedAt: (data.updatedAt as admin.firestore.Timestamp).toDate(),
      } as Workspace;
    });

    if (search) {
      const searchLower = search.toLowerCase();
      workspaces = workspaces.filter(
        (workspace) =>
          workspace.title?.toLowerCase().includes(searchLower) ||
          workspace.content?.toLowerCase().includes(searchLower),
      );
    }

    return workspaces;
  }

  async findOne(id: string, userId: string): Promise<Workspace> {
    const doc = await this.collectionRef.doc(id).get();

    if (!doc.exists) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    const data = doc.data() as admin.firestore.DocumentData;
    if (data.userId !== userId) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    return {
      ...data,
      saveStatus: (data.saveStatus as boolean | undefined) ?? false,
      createdAt: (data.createdAt as admin.firestore.Timestamp).toDate(),
      updatedAt: (data.updatedAt as admin.firestore.Timestamp).toDate(),
    } as Workspace;
  }

  async getTotalWorkspaces(userId: string): Promise<number> {
    const snapshot = await this.collectionRef
      .where('userId', '==', userId)
      .count()
      .get();
    return snapshot.data().count;
  }

  async update(
    id: string,
    updateWorkspaceInput: UpdateWorkspaceInput,
    userId: string,
  ): Promise<Workspace> {
    const docRef = this.collectionRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    const now = new Date();
    const updateData: Record<string, unknown> = {
      ...updateWorkspaceInput,
      updatedAt: admin.firestore.Timestamp.fromDate(now),
    };

    // Explicitly handle emoji and background_color persistence/removal
    if (updateWorkspaceInput.emoji === null || updateWorkspaceInput.emoji === '') {
      updateData.emoji = admin.firestore.FieldValue.delete();
    } else if (updateWorkspaceInput.emoji) {
      updateData.emoji = updateWorkspaceInput.emoji;
    }

    if (updateWorkspaceInput.background_color === null || updateWorkspaceInput.background_color === 'none') {
      updateData.background_color = admin.firestore.FieldValue.delete();
    } else if (updateWorkspaceInput.background_color) {
      updateData.background_color = updateWorkspaceInput.background_color;
    }

    if (updateWorkspaceInput.card_show_background === null) {
      updateData.card_show_background = admin.firestore.FieldValue.delete();
    } else if (updateWorkspaceInput.card_show_background !== undefined) {
      updateData.card_show_background = updateWorkspaceInput.card_show_background;
    }

    // Remove id from updateData if present
    delete updateData.id;

    // Handle exclusive taskId: if this workspace is taking a taskId, other workspaces must release it
    if (updateWorkspaceInput.taskId) {
      const otherWorkspaces = await this.collectionRef
        .where('taskId', '==', updateWorkspaceInput.taskId)
        .get();

      const batch = this.firebaseService.db.batch();
      otherWorkspaces.docs.forEach((otherDoc) => {
        if (otherDoc.id !== id) {
          batch.update(otherDoc.ref, {
            taskId: admin.firestore.FieldValue.delete(),
            updatedAt: admin.firestore.Timestamp.fromDate(now),
          });
        }
      });
      await batch.commit();
    }

    // Handle unlinking (null taskId)
    if (updateWorkspaceInput.taskId === null) {
      updateData.taskId = admin.firestore.FieldValue.delete();
    }

    // Remove undefined fields to avoid overwriting with undefined
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await docRef.update(
      updateData as admin.firestore.UpdateData<admin.firestore.DocumentData>,
    );

    const updatedDoc = await docRef.get();
    const updatedData = updatedDoc.data() as admin.firestore.DocumentData;

    return {
      ...updatedData,
      saveStatus: (updatedData.saveStatus as boolean | undefined) ?? false,
      createdAt: (updatedData.createdAt as admin.firestore.Timestamp).toDate(),
      updatedAt: (updatedData.updatedAt as admin.firestore.Timestamp).toDate(),
    } as Workspace;
  }

  async remove(id: string, userId: string): Promise<boolean> {
    const docRef = this.collectionRef.doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    await docRef.delete();
    return true;
  }
  async findByTaskId(taskId: string): Promise<Workspace | null> {
    const snapshot = await this.collectionRef
      .where('taskId', '==', taskId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    return {
      ...data,
      createdAt: (data.createdAt as admin.firestore.Timestamp).toDate(),
      updatedAt: (data.updatedAt as admin.firestore.Timestamp).toDate(),
    } as Workspace;
  }
}
