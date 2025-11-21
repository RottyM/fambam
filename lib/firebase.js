import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getMessaging } from 'firebase/messaging'; // <--- ADD THIS

// Fallbacks added for the preview environment to prevent crashes
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Debug: Log config to help troubleshoot
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('Firebase Config:', {
    hasApiKey: !!firebaseConfig.apiKey,
    hasAuthDomain: !!firebaseConfig.authDomain,
    hasProjectId: !!firebaseConfig.projectId,
    hasStorageBucket: !!firebaseConfig.storageBucket,
    hasMessagingSenderId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId,
    projectId: firebaseConfig.projectId, // Safe to show
  });
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Messaging only works in the browser (client-side), not on the server
let messaging = null;
if (typeof window !== 'undefined') {
  // Check if browser supports messaging (service workers)
  if ('serviceWorker' in navigator) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error("Firebase Messaging failed to init:", error);
    }
  }
}

// Connect to emulators in development
if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectStorageEmulator(storage, 'localhost', 9199);
    connectFunctionsEmulator(functions, 'localhost', 5001);
    console.log('Connected to Firebase Emulators');
  } catch (error) {
    console.warn('Failed to connect to emulators:', error);
  }
}

export { app, auth, db, storage, functions, messaging };