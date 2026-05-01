import { db } from './firebase-config.js';
import { doc, onSnapshot, updateDoc, collection, query, where, getDocs, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { calculateFormScore, getOdds } from './odds.js';
import { observeAuth } from './auth.js';

const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('id');

if (!matchId) window.location.href = 'index.html';

const homeName = document.getElementById('home-name');
const awayName = document.getElementById('away-name');
const homeScoreVal = document.getElementById('home-score-val');
const awayScoreVal = document.getElementById('away-score-val');
const formScore = document.getElementById('form-score');
const adminPanel = document.getElementById('admin-panel');
const backLink = document.getElementById('back-link');

let currentMatch = null;
let currentUser = null;
let currentTournament = null;

// Auth Observer
observeAuth((user) => {
    currentUser = user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    if (currentMatch) checkPermissions();
});

// Listen to Match
onSnapshot(doc(db, "matches", matchId), async (snapshot) => {
    if (!snapshot.exists()) {
        alert("Maç bulunamadı!");
        window.location.href = 'index.html';
        return;
    }
    currentMatch = { id: snapshot.id, ...snapshot.data() };
    
    backLink.href = `lobby.html?id=${currentMatch.tournamentId}`;
    renderMatch();
    loadOdds();
    
    // Fetch tournament for settings
    const tSnap = await getDoc(doc(db, "tournaments", currentMatch.tournamentId));
    currentTournament = tSnap.data();
    checkPermissions();
});

function checkPermissions() {
    if (!currentUser || !currentTournament) {
        adminPanel.style.display = 'none';
        return;
    }

    const isAdmin = currentUser.uid === currentTournament.adminId;
    const canEveryoneScore = currentTournament.settings.scoreEntry === 'all';
    const isParticipant = currentTournament.participants.some(p => p.uid === currentUser.uid);
    
    const hasPermission = isAdmin || (canEveryoneScore && isParticipant);
    
    if (hasPermission && currentMatch.homeScore === null) {
        adminPanel.style.display = 'block';
    } else {
        adminPanel.style.display = 'none';
    }
}

function renderMatch() {
    homeName.innerText = currentMatch.homeName;
    awayName.innerText = currentMatch.awayName;
    homeScoreVal.innerText = currentMatch.homeScore !== null ? currentMatch.homeScore : '-';
    awayScoreVal.innerText = currentMatch.awayScore !== null ? currentMatch.awayScore : '-';
    
    if (currentMatch.homeScore !== null) {
        document.getElementById('match-notes').value = currentMatch.notes || '';
    }
}

async function loadOdds() {
    const q = query(collection(db, "matches"), where("tournamentId", "==", currentMatch.tournamentId));
    const snap = await getDocs(q);
    const allMatches = snap.docs.map(d => d.data());

    const fH = calculateFormScore(currentMatch.homeId, allMatches);
    const fA = calculateFormScore(currentMatch.awayId, allMatches);
    
    const odds = getOdds(fH, fA);
    
    document.getElementById('odd-1').innerText = odds.h;
    document.getElementById('odd-x').innerText = odds.x;
    document.getElementById('odd-2').innerText = odds.a;
}

formScore.onsubmit = async (e) => {
    e.preventDefault();
    const hScore = parseInt(document.getElementById('input-home').value);
    const aScore = parseInt(document.getElementById('input-away').value);
    const notes = document.getElementById('match-notes').value;

    try {
        await updateDoc(doc(db, "matches", matchId), {
            homeScore: hScore,
            awayScore: aScore,
            notes: notes,
            status: 'played',
            playedAt: serverTimestamp()
        });
        
        await checkTournamentCompletion();
        alert("Skor kaydedildi!");
    } catch (error) {
        console.error("Hata:", error);
        alert("Skor kaydedilirken bir hata oluştu.");
    }
};

async function checkTournamentCompletion() {
    const q = query(collection(db, "matches"), where("tournamentId", "==", currentMatch.tournamentId));
    const snap = await getDocs(q);
    const allMatches = snap.docs.map(d => d.data());
    
    const allPlayed = allMatches.every(m => m.homeScore !== null);
    
    if (allPlayed) {
        await updateDoc(doc(db, "tournaments", currentMatch.tournamentId), {
            status: 'finished'
        });
    }
}
