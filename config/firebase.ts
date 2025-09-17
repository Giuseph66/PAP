import { FirebaseApp, getApps, initializeApp } from 'firebase/app';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyCkQtfbChqQmK6HEQBnU-5SkJoG0GC86UU",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "p-a-p-8ab90.firebaseapp.com",
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL || "https://p-a-p-8ab90-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "p-a-p-8ab90",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "p-a-p-8ab90.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "12891222113",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:12891222113:web:87eed0e27022cd66fa7a20",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-MS2DY2S0C2",
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase services
export const firestore: Firestore = getFirestore(app);
export const realtimeDb: Database = getDatabase(app);

export default app;
