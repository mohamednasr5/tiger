import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyCzkn2CQrhgtuqxy1t-lUWgbzUmmQhznN8",

  authDomain: "tiger-d1433.firebaseapp.com",

  databaseURL: "https://tiger-d1433-default-rtdb.firebaseio.com",

  projectId: "tiger-d1433",

  storageBucket: "tiger-d1433.firebasestorage.app",

  messagingSenderId: "421931992267",

  appId: "1:421931992267:web:a2262dbb2984b3b158074e",

  measurementId: "G-6ESN039VQC"

};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

// تصدير الدوال الأساسية
export { signInWithPopup, signOut, onAuthStateChanged, collection, getDocs, doc, setDoc };
