// ============================================================
// TIGER E-Commerce - Firebase Configuration
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-storage.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js";
import { getMessaging, isSupported as isMessagingSupported } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-messaging.js";

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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

let analytics = null;
isSupported().then(yes => { if (yes) analytics = getAnalytics(app); }).catch(() => {});

let messaging = null;
isMessagingSupported().then(yes => {
  if (yes) {
    messaging = getMessaging(app);
  }
}).catch(() => {});

export { app, auth, db, storage, analytics, messaging };