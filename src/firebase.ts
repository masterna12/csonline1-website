import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const firebaseConfig = {
  projectId: "quick-tract-wh7sp",
  appId: "1:377436092689:web:84333b6452beee8677f4b0",
  apiKey: "AIzaSyD4jbOCVSNeSc7O9TYqvFRzGpdPI9or61o",
  authDomain: "quick-tract-wh7sp.firebaseapp.com",
  storageBucket: "quick-tract-wh7sp.firebasestorage.app",
  messagingSenderId: "377436092689",
  measurementId: ""
};

// Initialize Firebase safely to prevent "[DEFAULT] app already exists" errors
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore with persistent caching to dramatically minimize read operations
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, "ai-studio-87ec3faf-a54d-45d2-9df2-1a7a38bce0dd");

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
