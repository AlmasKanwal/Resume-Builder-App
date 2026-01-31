// ============================================================
// db.js
// Firestore database operations for resumes
// ============================================================

import { db } from './firebase.config.js';
import { 
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.6.0/firebase-firestore.js";

// ── Create Resume ───────────────────────────────────────────
export async function createResume(userId, resumeData) {
  try {
    const docRef = await addDoc(collection(db, "resumes"), {
      userId: userId,
      title: resumeData.title || "Untitled Resume",
      fullName: resumeData.fullName || "",
      email: resumeData.email || "",
      phone: resumeData.phone || "",
      city: resumeData.city || "",
      linkedin: resumeData.linkedin || "",
      summary: resumeData.summary || "",
      education: resumeData.education || [],
      experience: resumeData.experience || [],
      skills: resumeData.skills || [],
      languages: resumeData.languages || [],
      projects: resumeData.projects || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return { success: true, id: docRef.id };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Get All Resumes (for dashboard - all users) ────────────
export async function getAllResumes() {
  try {
    const q = query(collection(db, "resumes"), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    
    const resumes = [];
    querySnapshot.forEach((doc) => {
      resumes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, resumes };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Get Single Resume ───────────────────────────────────────
export async function getResume(resumeId) {
  try {
    const docRef = doc(db, "resumes", resumeId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { 
        success: true, 
        resume: { id: docSnap.id, ...docSnap.data() }
      };
    } else {
      return { success: false, error: "Resume not found" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Update Resume ───────────────────────────────────────────
export async function updateResume(resumeId, resumeData) {
  try {
    const docRef = doc(db, "resumes", resumeId);
    await updateDoc(docRef, {
      ...resumeData,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ── Delete Resume ───────────────────────────────────────────
export async function deleteResume(resumeId) {
  try {
    await deleteDoc(doc(db, "resumes", resumeId));
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}