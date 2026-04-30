import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { ITag } from './interfaces/tag.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TagsService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('tags');
  }

  async create(tagData: Partial<ITag>): Promise<string> {
    const id = uuidv4();
    const docRef = this.collection.doc(id);
    await docRef.set({
      ...tagData,
      id: docRef.id,
    });
    return docRef.id;
  }

  async findAll(): Promise<ITag[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as ITag);
  }

  async findOne(name: string): Promise<ITag> {
    const doc = await this.collection.doc(name).get();
    if (!doc.exists) {
      throw new NotFoundException(`Tag with ID ${name} not found`);
    }
    return doc.data() as ITag;
  }

  async findAllByUser(userId: string): Promise<ITag[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.docs.map((doc) => doc.data() as ITag);
  }
}
