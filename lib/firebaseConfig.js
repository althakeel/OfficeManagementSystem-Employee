// lib/firebaseConfig.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDQX_pWYi0m5fkUKZLStS1mDHh53e0goTM",
  authDomain: "officemanagementsystem-252bb.firebaseapp.com",
  projectId: "officemanagementsystem-252bb",
  storageBucket: "officemanagementsystem-252bb.appspot.com", // corrected domain!
  messagingSenderId: "656663600821",
  appId: "1:656663600821:web:87215a8e4f149688e268fc",
  measurementId: "G-D989D3CDS1"
};

// Initialize only once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
