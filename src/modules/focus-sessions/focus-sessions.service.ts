import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { IFocusSession } from './interfaces/focus-session.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FocusSessionsService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('focus_sessions');
  }

  async create(sessionData: Partial<IFocusSession>): Promise<string> {
    const id = uuidv4();
    const docRef = this.collection.doc(id);
    await docRef.set({
      ...sessionData,
      id: docRef.id,
    });
    return docRef.id;
  }

  async findAll(): Promise<IFocusSession[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as IFocusSession);
  }

  async findOne(id: string): Promise<IFocusSession> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Focus session with ID ${id} not found`);
    }
    return doc.data() as IFocusSession;
  }

  async findAllByUser(userId: string): Promise<IFocusSession[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.docs.map((doc) => doc.data() as IFocusSession);
  }
}
