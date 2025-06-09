
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCCKoRI9cbE75Dq9j6M9bhqAkiMmGBbX9w",
  authDomain: "hotel-saas-b84a8.firebaseapp.com",
  projectId: "hotel-saas-b84a8",
  storageBucket: "hotel-saas-b84a8.appspot.com",
  messagingSenderId: "131976801076",
  appId: "1:131976801076:web:a0fc3f51781eeb1020d361",
  measurementId: "G-3YKLRG4RM3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app); // ✅ Realtime Database export