import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const OLD_FIREBASE_CONFIG = {
  projectId: "quick-tract-wh7sp",
  appId: "1:377436092689:web:84333b6452beee8677f4b0",
  apiKey: "AIzaSyD4jbOCVSNeSc7O9TYqvFRzGpdPI9or61o",
  authDomain: "quick-tract-wh7sp.firebaseapp.com",
  storageBucket: "quick-tract-wh7sp.firebasestorage.app",
  messagingSenderId: "377436092689",
  measurementId: ""
};

export const NEW_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAw4Oer4GPruu1ZUfBClsMSkrWu-gjlFRg",
  authDomain: "portal-dashboard-cs-online.firebaseapp.com",
  projectId: "portal-dashboard-cs-online",
  storageBucket: "portal-dashboard-cs-online.firebasestorage.app",
  messagingSenderId: "766714409669",
  appId: "1:766714409669:web:7395c3ef113b807ec8f6ac",
  measurementId: "G-733VS90NSR"
};

// Check if migration has been successfully completed (Default to true for new portal-dashboard-cs-online database)
const isCompleted = typeof localStorage !== 'undefined'
  ? localStorage.getItem('firebase_migration_completed_to_new') !== 'false'
  : true;

// Expose active configuration
export const firebaseConfig = isCompleted ? NEW_FIREBASE_CONFIG : OLD_FIREBASE_CONFIG;

// Initialize standard default Firebase app
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Default Firestore with caching for old project, standard for new project
export const db = isCompleted
  ? initializeFirestore(app, { ignoreUndefinedProperties: true })
  : initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      }),
      ignoreUndefinedProperties: true
    }, "ai-studio-87ec3faf-a54d-45d2-9df2-1a7a38bce0dd");

export const auth = getAuth(app);

// Explicit helper functions for the Database Migration Center to connect to both old and new databases concurrently
export function getSourceFirestore() {
  const existingApp = getApps().find(a => a.name === "source_app_migration");
  const sourceApp = existingApp || initializeApp(OLD_FIREBASE_CONFIG, "source_app_migration");
  return initializeFirestore(sourceApp, {
    ignoreUndefinedProperties: true
  }, "ai-studio-87ec3faf-a54d-45d2-9df2-1a7a38bce0dd");
}

export function getTargetFirestore() {
  const existingApp = getApps().find(a => a.name === "target_app_migration");
  const targetApp = existingApp || initializeApp(NEW_FIREBASE_CONFIG, "target_app_migration");
  return initializeFirestore(targetApp, {
    ignoreUndefinedProperties: true
  });
}

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
