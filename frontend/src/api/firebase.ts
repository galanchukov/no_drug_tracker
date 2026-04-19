import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Replace with actual config later via .env or directly
const firebaseConfig = {
  apiKey: "AIzaSyCKfl10QOneXDLoRltoibOWrWDfDC53uIQ",
  authDomain: "kdl-inventory.firebaseapp.com",
  projectId: "kdl-inventory",
  storageBucket: "kdl-inventory.firebasestorage.app",
  messagingSenderId: "34029969026",
  appId: "1:34029969026:web:29c5f0b2a8a4c2918d5e9b"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
