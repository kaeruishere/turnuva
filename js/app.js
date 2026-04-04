import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const cfg = {
  apiKey: "AIzaSyCII19pXF_SLL2Tkjw3FeaPxYHNQ_b3J_Q",
  authDomain: "turnuva-kaeru.firebaseapp.com",
  projectId: "turnuva-kaeru",
  storageBucket: "turnuva-kaeru.firebasestorage.app",
  messagingSenderId: "2078204583",
  appId: "1:2078204583:web:2c83665f82417e3e843182"
};

export const fb  = initializeApp(cfg);
export const db  = getFirestore(fb);

// ─── SHARED STATE ───
export const state = {
  user:          null,   // { username, role }
  tourneyId:     null,   // aktif açık turnuva id
  tourney:       null,   // turnuva dokümanı
  matches:       [],     // maçlar array
  page:          'tournaments', // tournaments | detail | bets | results
  detailId:      null,   // tıklanan turnuva id
  unsub:         [],     // firestore listeners
};

export const DEFAULT_PLAYERS = ['Umut', 'Mehmet Emin', 'Salih', 'Mert'];

export function getTournamentName() {
  const d   = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} – ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── SESSION ───
export function saveSession(user) { sessionStorage.setItem('pes_user', JSON.stringify(user)); }
export function loadSession()     { const s = sessionStorage.getItem('pes_user'); return s ? JSON.parse(s) : null; }
export function clearSession()    { sessionStorage.removeItem('pes_user'); }
