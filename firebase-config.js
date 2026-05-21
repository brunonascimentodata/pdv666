import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDNtdJer8LXjIV9XuqGXZ_y3GvEktKnJKg",
  authDomain: "fir-pdv666.firebaseapp.com",
  projectId: "fir-pdv666",
  storageBucket: "fir-pdv666.firebasestorage.app",
  messagingSenderId: "387155811902",
  appId: "1:387155811902:web:1968959ca93ebf33953b6f",
  measurementId: "G-JL3X7SM3SD"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);