// ============================================================
// auth.js
// Authentication functions
// ============================================================

import { auth, db } from './firebase.config.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-auth.js";
import { 
  doc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// ── Sign Up Function ────────────────────────────────────────
export async function signUp(name, email, password) {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, { displayName: name });

    // Save user data to Firestore
    await setDoc(doc(db, "users", user.uid), {
      name: name,
      email: email,
      createdAt: serverTimestamp()
    });

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Login Function ──────────────────────────────────────────
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Logout Function ─────────────────────────────────────────
export async function logout() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Check Auth State ────────────────────────────────────────
export function checkAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

// ── Get Current User ────────────────────────────────────────
export function getCurrentUser() {
  return auth.currentUser;
}