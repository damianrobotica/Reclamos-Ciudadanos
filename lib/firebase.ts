import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: "AIzaSyB8q1oS2oJroSl7p2-qvv7GsZAphAmvO-k",
  authDomain: "formualrio-de-reclamos.firebaseapp.com",
  projectId: "formualrio-de-reclamos",
  storageBucket: "formualrio-de-reclamos.firebasestorage.app",
  messagingSenderId: "1076266118076",
  appId: "1:1076266118076:web:f6153e314f4e73f0a419b9",
  measurementId: "G-ZG40Y63D8R",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const analytics = getAnalytics(app)
const auth = getAuth(app)

export { db, analytics, auth }

