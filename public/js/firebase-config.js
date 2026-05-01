import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCII19pXF_SLL2Tkjw3FeaPxYHNQ_b3J_Q",
  authDomain: "turnuva-kaeru.firebaseapp.com",
  projectId: "turnuva-kaeru",
  storageBucket: "turnuva-kaeru.firebasestorage.app",
  messagingSenderId: "2078204583",
  appId: "1:2078204583:web:2c83665f82417e3e843182"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { db, auth, provider };
