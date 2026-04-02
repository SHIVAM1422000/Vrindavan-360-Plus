import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';

// Import the Firebase configuration
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase SDK
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth();
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

export const logAnalyticsEvent = (name: string, params?: any) => {
  if (analytics) {
    logEvent(analytics, name, params);
  }
};
