import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

export const OLD_FIREBASE_CONFIG = {
  projectId: "portal-dashboard-cs-online", // Deactivated, set to new to prevent any fallback
  appId: "1:766714409669:web:7395c3ef113b807ec8f6ac",
  apiKey: "AIzaSyAw4Oer4GPruu1ZUfBClsMSkrWu-gjlFRg",
  authDomain: "portal-dashboard-cs-online.firebaseapp.com",
  storageBucket: "portal-dashboard-cs-online.firebasestorage.app",
  messagingSenderId: "766714409669",
  measurementId: "G-733VS90NSR"
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

// Check if migration has been successfully completed (Forced to true to default to new portal-dashboard-cs-online database)
const isCompleted = true;

// Expose active configuration (Always use the new database)
export const firebaseConfig = NEW_FIREBASE_CONFIG;

// Initialize standard default Firebase app
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Default Firestore with standard setup for the new project, including offline local cache and forceLongPolling fallback
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true,
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true
});

export const auth = getAuth(app);

// Explicit helper functions for the Database Migration Center to connect only to the new target database
export function getSourceFirestore() {
  // Disabled the old database, always return the target firestore to keep operations within the new database only
  return getTargetFirestore();
}

export function getTargetFirestore() {
  const existingApp = getApps().find(a => a.name === "target_app_migration");
  const targetApp = existingApp || initializeApp(NEW_FIREBASE_CONFIG, "target_app_migration");
  return initializeFirestore(targetApp, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true
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
