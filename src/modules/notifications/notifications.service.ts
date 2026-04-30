import { Injectable, NotFoundException } from '@nestjs/common';
import { FirebaseService } from '../../firebase/firebase.service';
import { INotification } from './interfaces/notification.interface';
import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationsService {
  private collection: admin.firestore.CollectionReference;

  constructor(private firebaseService: FirebaseService) {
    this.collection = this.firebaseService.db.collection('notifications');
  }

  async create(notificationData: Partial<INotification>): Promise<string> {
    const id = uuidv4();
    const docRef = this.collection.doc(id);
    await docRef.set({
      ...notificationData,
      id: docRef.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return docRef.id;
  }

  async findAll(): Promise<INotification[]> {
    const snapshot = await this.collection.get();
    return snapshot.docs.map((doc) => doc.data() as INotification);
  }

  async findOne(id: string): Promise<INotification> {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    return doc.data() as INotification;
  }

  async findAllByUser(userId: string): Promise<INotification[]> {
    const snapshot = await this.collection.where('userId', '==', userId).get();
    return snapshot.docs.map((doc) => doc.data() as INotification);
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const message = {
      notification: {
        title,
        body,
      },
      token,
      data,
    };

    try {
      await admin.messaging().send(message);
      console.log('Successfully sent message:', title);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }
}
