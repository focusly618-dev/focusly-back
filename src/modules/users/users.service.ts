import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { IUser, IUserSettings } from './interfaces/user.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class UsersService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('users');
  }

  async create(userData: Partial<IUser>): Promise<IUser> {
    try {
      const id = userData.id || uuidv4();
      const userDoc = this.collection.doc(id);
      const plainData = instanceToPlain(userData);

      const newUser = {
        ...plainData,
        id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await userDoc.set(newUser);

      return {
        ...userData,
        id,
        createdAt: new Date(),
        lastSyncAt: new Date(),
      } as IUser;
    } catch (error) {
      console.error('Error creating user in Firestore:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const snapshot = await this.collection.where('email', '==', email).get();
    if (snapshot.empty) {
      return null;
    }
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as IUser;
  }

  async findOne(id: string): Promise<IUser> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { id: doc.id, ...doc.data() } as IUser;
  }

  async find(): Promise<IUser[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as IUser);
  }

  async updateSettings(
    id: string,
    settings: Partial<IUserSettings>,
  ): Promise<void> {
    const userDoc = this.collection.doc(id);
    await userDoc.update({
      settings: settings,
      lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async updateGoogleRefreshToken(
    id: string,
    refreshToken: string,
  ): Promise<void> {
    const userDoc = this.collection.doc(id);
    await userDoc.update({
      googleRefreshToken: refreshToken,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async update(id: string, userData: Partial<IUser>): Promise<IUser> {
    try {
      const userDoc = this.collection.doc(id);
      const plainData = instanceToPlain(userData);

      await userDoc.update({
        ...plainData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      const updatedDoc = await userDoc.get();
      return { id: updatedDoc.id, ...updatedDoc.data() } as IUser;
    } catch (error) {
      console.error('Error updating user in Firestore:', error);
      throw error;
    }
  }
}
