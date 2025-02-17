import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
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
const auth = getAuth(app)

// Initialize Analytics only on client side
let analytics = null
if (typeof window !== "undefined") {
  // Dynamic import to avoid server-side initialization
  import("firebase/analytics").then((module) => {
    analytics = module.getAnalytics(app)
  })
}

export { db, analytics, auth }

