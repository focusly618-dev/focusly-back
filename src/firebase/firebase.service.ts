import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private firestore: admin.firestore.Firestore;

  constructor(private configService: ConfigService) {
    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '');
    }
    if (admin.apps.length === 0) {
      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        admin.initializeApp();
      }
    }

    this.firestore = admin.firestore();
    this.firestore.settings({ ignoreUndefinedProperties: true });
  }

  onModuleInit() {}

  get db() {
    return this.firestore;
  }

  get auth() {
    return admin.auth();
  }
}
