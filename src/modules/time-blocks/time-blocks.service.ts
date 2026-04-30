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

  async findAll(): Promise<ITimeBlock[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as ITimeBlock);
  }

  async findOne(id: string): Promise<ITimeBlock> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Time block with ID ${id} not found`);
    }
    return doc.data() as ITimeBlock;
  }

  async findAllByUser(userId: string): Promise<ITimeBlock[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.docs.map((doc) => doc.data() as ITimeBlock);
  }
}
