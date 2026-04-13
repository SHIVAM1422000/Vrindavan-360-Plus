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

// Initialize Analytics only if measurementId is present and we are in a browser
export const analytics = (typeof window !== 'undefined' && firebaseConfig.measurementId) 
  ? getAnalytics(app) 
  : null;

if (typeof window !== 'undefined' && !firebaseConfig.measurementId) {
  console.warn("Firebase Analytics: measurementId is missing in firebase-applet-config.json. Events will not be tracked.");
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
