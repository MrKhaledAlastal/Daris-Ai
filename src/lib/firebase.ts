
import { initializeApp, getApps, getApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// if (process.env.NODE_ENV === "development") {
//   process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
//   process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
// }

const firebaseConfig = {
  "apiKey": "AIzaSyDj1wFLCvvDjZMetceQQq7iYy5z_BmNZhw",
  "authDomain": "tawjihiai-1c0ee.firebaseapp.com",
  "projectId": "tawjihiai-1c0ee",
  "storageBucket": "tawjihiai-1c0ee.firebasestorage.app",
  "messagingSenderId": "134724828324",
  "appId": "1:134724828324:web:7055f4bd780e1850b93a31",
  "measurementId": "G-HSG27178E5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// if (process.env.NODE_ENV === "development") {
//   connectFirestoreEmulator(db, "127.0.0.1", 8080);
//   connectAuthEmulator(auth, "http://127.0.0.1:9099");
// }

export default app;
