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

// Initialize Analytics with better safety checks
export const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId 
  ? getAnalytics(app) 
  : null;

if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
  console.log("Firebase Analytics initialized with ID:", firebaseConfig.measurementId);
} else if (typeof window !== 'undefined') {
  console.warn("Analytics missing ID. Standard gtag tracking in index.html will still work.");
}

export const logAnalyticsEvent = (name: string, params?: any) => {
  if (analytics) {
    logEvent(analytics, name, params);
  } else {
    // Fallback for development visibility
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[Analytics Log]: ${name}`, params);
    }
  }
};
