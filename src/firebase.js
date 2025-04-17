import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, logEvent } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDkeV5iBsc5Zq-8AtDE5BzvXatGcvmvmUo",
  authDomain: "home-energy-report-ba33d.firebaseapp.com",
  projectId: "home-energy-report-ba33d",
  storageBucket: "home-energy-report-ba33d.firebasestorage.app",
  messagingSenderId: "238459081144",
  appId: "1:238459081144:web:3284d63064fc33dfd47f4d",
  measurementId: "G-QDNKR8CQWZ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const logAnalyticsEvent = (eventName, eventParams = {}) => {
  logEvent(analytics, eventName, eventParams);
};