import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCeJNpgCl30z9pQM2PRBCnMeKc2UI7aUkg",
  authDomain: "momo-3f260.firebaseapp.com",
  databaseURL: "https://momo-3f260-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "momo-3f260",
  storageBucket: "momo-3f260.firebasestorage.app",
  messagingSenderId: "543073577321",
  appId: "1:543073577321:web:e7a1ee6c63a5759dfe35f8",
  measurementId: "G-9G449W72S9"
};

const app = initializeApp(firebaseConfig);

export const db = getDatabase(app);