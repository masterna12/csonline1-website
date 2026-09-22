import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseAppletConfig from '../firebase-applet-config.json';

export const OLD_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAw4Oer4GPruu1ZUfBClsMSkrWu-gjlFRg",
  authDomain: "portal-dashboard-cs-online.firebaseapp.com",
  projectId: "portal-dashboard-cs-online",
  storageBucket: "portal-dashboard-cs-online.firebasestorage.app",
  messagingSenderId: "766714409669",
  appId: "1:766714409669:web:7395c3ef113b807ec8f6ac",
  measurementId: "G-733VS90NSR"
};

export const NEW_FIREBASE_CONFIG = {
  apiKey: firebaseAppletConfig.apiKey,
  authDomain: firebaseAppletConfig.authDomain,
  projectId: firebaseAppletConfig.projectId,
  storageBucket: firebaseAppletConfig.storageBucket,
  messagingSenderId: firebaseAppletConfig.messagingSenderId,
  appId: firebaseAppletConfig.appId,
  measurementId: firebaseAppletConfig.measurementId || ""
};

// Check if migration has been successfully completed
const isCompleted = true;

// Expose active configuration (default to the workspace target database, but allow fallback if explicitly toggled)
export const firebaseConfig = (typeof window !== 'undefined' && localStorage.getItem("firebase_migration_completed_to_new") === "false")
  ? OLD_FIREBASE_CONFIG
  : NEW_FIREBASE_CONFIG;

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

// Explicit helper functions for the Database Migration Center to connect to both old and new databases
export function getSourceFirestore() {
  const existingApp = getApps().find(a => a.name === "source_app_migration");
  const sourceApp = existingApp || initializeApp(OLD_FIREBASE_CONFIG, "source_app_migration");
  return initializeFirestore(sourceApp, {
    ignoreUndefinedProperties: true,
    experimentalForceLongPolling: true
  });
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
