// Firebase App & Firestore (Modular SDK v9+)
import { initializeApp } from "firebase/app";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  disableNetwork,
  enableNetwork 
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC19ucyGluD_GB8Cr20BBHsG1wW4RO1ki8",
  authDomain: "sanjeewa-finance.firebaseapp.com",
  projectId: "sanjeewa-finance",
  storageBucket: "sanjeewa-finance.firebasestorage.app",
  messagingSenderId: "133080585024",
  appId: "1:133080585024:web:e77995cc74c15c9fa9a0a5",
  measurementId: "G-G8E543HJ9M"
};

const app = initializeApp(firebaseConfig);

let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (err) {
  console.warn("Firestore persistent cache initialization failed, falling back to memory cache:", err);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch (fallbackErr) {
    console.error("Firestore initialization error:", fallbackErr);
  }
}

export const db = firestoreDb;

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Immediate offline/online switching so Firestore never hangs waiting for network timeouts
if (typeof window !== "undefined") {
  if (!navigator.onLine) {
    disableNetwork(db).catch(() => {});
  }

  window.addEventListener("online", () => {
    enableNetwork(db).catch(() => {});
  });

  window.addEventListener("offline", () => {
    disableNetwork(db).catch(() => {});
  });
}



