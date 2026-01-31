// ============================================================
// firebase.config.js
// Firebase configuration using modular SDK
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// Your Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDdl39cF6mOvTaWmWlOsvFYx2WJQiQzVD8",
  authDomain: "femhack-b0154.firebaseapp.com",
  projectId: "femhack-b0154",
  storageBucket: "femhack-b0154.firebasestorage.app",
  messagingSenderId: "375190622287",
  appId: "1:375190622287:web:c553aa0d0e91afaff81a3a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const auth = getAuth(app);
const db = getFirestore(app);

// Export for use in other files
export { auth, db };
