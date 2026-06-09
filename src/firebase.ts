import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  apiKey: "AIzaSyBbgZ0Lmp2uRMPPHJP9nJT8o9tvmW6mkaU",
  authDomain: "dashboard-cs-hpi-babel.firebaseapp.com",
  projectId: "dashboard-cs-hpi-babel",
  storageBucket: "dashboard-cs-hpi-babel.firebasestorage.app",
  messagingSenderId: "608691617498",
  appId: "1:608691617498:web:be6af54d3626e8439e6fe3",
  measurementId: "G-9M9472EH6M"
};

// Initialize Firebase safely to prevent "[DEFAULT] app already exists" errors
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Operation types for custom error logging as required by standard integration guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: 'anonymous-dashboard-admin',
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
