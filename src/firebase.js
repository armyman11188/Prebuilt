// ============================================================================
// src/firebase.js  (nayi file)
// ROMAN URDU: Firebase se connection. Yeh config "public" hoti hai (sirf project
// ki pehchan), isliye website code mein rakhna theek hai. Private key yahan
// kabhi nahi aati.
// ============================================================================
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCbdQp_xSEeojYQDO_5k70DEnHExksAzUI",
  authDomain: "cvpro-e4d38.firebaseapp.com",
  projectId: "cvpro-e4d38",
  storageBucket: "cvpro-e4d38.firebasestorage.app",
  messagingSenderId: "189309758636",
  appId: "1:189309758636:web:312c6e4cc59b1e2898c309",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
