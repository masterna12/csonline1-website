import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBbgZ0Lmp2uRMPPHJP9nJT8o9tvmW6mkaU",
  authDomain: "dashboard-cs-hpi-babel.firebaseapp.com",
  projectId: "dashboard-cs-hpi-babel",
  storageBucket: "dashboard-cs-hpi-babel.firebasestorage.app",
  messagingSenderId: "608691617498",
  appId: "1:608691617498:web:be6af54d3626e8439e6fe3",
  measurementId: "G-9M9472EH6M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Operation types for custom error logging as required by standard integration guidelines
export const OperationType = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LIST: 'list',
  GET: 'get',
  WRITE: 'write',
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
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
