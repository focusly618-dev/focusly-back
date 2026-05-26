import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ITimeBlock } from './interfaces/time-block.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TimeBlocksService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('time_blocks');
  }

  private convertDate(val: unknown): Date | undefined {
    if (!val) return undefined;
    if (val instanceof admin.firestore.Timestamp) {
      return val.toDate();
    }
    if (val instanceof Date) {
      return isNaN(val.getTime()) ? undefined : val;
    }
    if (typeof val === 'string') {
      const date = new Date(val);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }

  private mapToTimeBlock(data: admin.firestore.DocumentData): ITimeBlock {
    return {
      ...data,
      startTime: this.convertDate(data.startTime)!,
      endTime: this.convertDate(data.endTime)!,
      createdAt: this.convertDate(data.createdAt)!,
    } as ITimeBlock;
  }

  async create(blockData: Partial<ITimeBlock>): Promise<string> {
    const id = uuidv4();
    const docRef = this.collection.doc(id);
    await docRef.set({
      ...blockData,
      id: docRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  async createMany(blocksData: Partial<ITimeBlock>[]): Promise<void> {
    if (blocksData.length === 0) return;
    const batch = this.firebaseService.db.batch();
    for (const data of blocksData) {
      const id = data.id || uuidv4();
      const docRef = this.collection.doc(id);
      batch.set(docRef, {
        ...data,
        id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
  }

  async findAll(): Promise<ITimeBlock[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => this.mapToTimeBlock(doc.data()));
  }

  async findOne(id: string): Promise<ITimeBlock> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Time block with ID ${id} not found`);
    }
    return this.mapToTimeBlock(doc.data()!);
  }

  async findAllByUser(userId: string): Promise<ITimeBlock[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.docs.map((doc) => this.mapToTimeBlock(doc.data()));
  }

  async update(
    id: string,
    updateData: Partial<ITimeBlock>,
  ): Promise<ITimeBlock> {
    const docRef = this.collection.doc(id);
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    await docRef.update(sanitized);
    const doc = await docRef.get();
    return this.mapToTimeBlock(doc.data()!);
  }

  async getSyncedGoogleIds(userId: string): Promise<string[]> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('source', '==', 'Google')
      .get();
    return snapshot.docs
      .map((doc) => doc.data().externalEventId as string)
      .filter(Boolean);
  }

  async deleteManyFocusBlocks(userId: string): Promise<void> {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .where('blockType', '==', 'Focus_Block')
      .get();

    if (snapshot.empty) return;
    const batch = this.firebaseService.db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  }

  async deleteManyByExternalIds(
    userId: string,
    externalIds: string[],
  ): Promise<void> {
    if (externalIds.length === 0) return;

    // Firestore in operator supports up to 30 values in a query, batch delete in chunks
    const chunks: string[][] = [];
    for (let i = 0; i < externalIds.length; i += 30) {
      chunks.push(externalIds.slice(i, i + 30));
    }

    for (const chunk of chunks) {
      const snapshot = await this.collection
        .where('userId', '==', userId)
        .where('externalEventId', 'in', chunk)
        .get();

      if (!snapshot.empty) {
        const batch = this.firebaseService.db.batch();
        snapshot.docs.forEach((doc) => batch.delete(doc.ref));
        await batch.commit();
      }
    }
  }
}
