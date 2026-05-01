import { db } from './firebase-config.js';
import { doc, onSnapshot, collection, query, where, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { generateSchedule, saveScheduleToFirestore } from './schedule.js';
import { observeAuth } from './auth.js';
import { toggleReady, updateSettings, deleteTournament } from './tournament.js';
import { showModal, hideModal, setupModalClose } from './ui.js';

const urlParams = new URLSearchParams(window.location.search);
const tournamentId = urlParams.get('id');

if (!tournamentId) window.location.href = 'index.html';

const tNameCard = document.getElementById('t-name-card');
const userProfileDiv = document.getElementById('user-profile-img');
const statsContainer = document.getElementById('stats-container');
const adminActions = document.getElementById('admin-actions');
const standingsBody = document.getElementById('standings-body');
const matchesList = document.getElementById('matches-list');
const lobbyPreStart = document.getElementById('lobby-pre-start');
const participantsList = document.getElementById('participants-list');
const btnReady = document.getElementById('btn-ready');
const btnSettings = document.getElementById('btn-settings');
const readyCountText = document.getElementById('ready-count');

let currentTournament = null;
let currentMatches = [];
let currentUser = null;

// Initialize
setupModalClose();

// Auth Observer
observeAuth(async (user) => {
    currentUser = user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    if (userProfileDiv) {
        const userSnap = await getDoc(doc(db, "users", user.uid));
        const userData = userSnap.exists() ? userSnap.data() : null;

        if (userData && userData.emoji) {
            const parent = userProfileDiv.parentElement;
            parent.innerHTML = `<a href="index.html" style="text-decoration: none; color: var(--text-main); font-size: 1.2rem;">←</a>
                                <div class="profile-img" onclick="window.location.href='profile.html'" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--card-bg); cursor: pointer;">${userData.emoji}</div>`;
        } else {
            userProfileDiv.src = user.photoURL;
            userProfileDiv.style.display = 'block';
        }
    }
    if (currentTournament) renderHeader();
});

// Tab switching logic
document.querySelectorAll('.tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.tab, .tab-content').forEach(el => el.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.target).classList.add('active');
        if (tab.dataset.target === 'tab-stats') renderStats();
    };
});

// Listen to Tournament
onSnapshot(doc(db, "tournaments", tournamentId), (snapshot) => {
    if (!snapshot.exists() || snapshot.data().status === 'deleted') {
        alert("Turnuva bulunamadı veya silindi.");
        window.location.href = 'index.html';
        return;
    }
    currentTournament = { id: snapshot.id, ...snapshot.data() };
    renderHeader();
    renderLobby();
});

// Listen to Matches
const q = query(collection(db, "matches"), where("tournamentId", "==", tournamentId));
onSnapshot(q, (snapshot) => {
    currentMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderStandings();
    renderMatches();
    renderStats();
});

function renderHeader() {
    tNameCard.innerText = currentTournament.name;

    if (currentUser && currentUser.uid === currentTournament.adminId) {
        btnSettings.style.display = 'flex';
        btnSettings.onclick = () => {
            document.getElementById('setting-entry').value = currentTournament.settings.entryType;
            document.getElementById('setting-score').value = currentTournament.settings.scoreEntry;
            showModal('modal-settings');
        };
    } else {
        btnSettings.style.display = 'none';
    }

    adminActions.innerHTML = '';
    if (currentTournament.status === 'waiting' && currentUser && currentUser.uid === currentTournament.adminId) {
        const allReady = currentTournament.participants.every(p => p.isReady);
        const btn = document.createElement('button');
        btn.className = `btn btn-primary`;
        btn.innerText = 'BAŞLAT';
        btn.style.fontSize = '0.7rem';
        btn.style.padding = '0.4rem 0.8rem';
        btn.style.opacity = allReady ? '1' : '0.5';
        btn.disabled = !allReady; 

        btn.onclick = async () => {
            if (!allReady) {
                alert("Tüm oyuncuların 'Hazır' olması gerekiyor!");
                return;
            }
            try {
                btn.innerText = 'BAŞLATILIYOR...';
                btn.disabled = true;
                const schedule = generateSchedule(tournamentId, currentTournament.participants);
                await saveScheduleToFirestore(tournamentId, schedule);
                console.log("Tournament started successfully");
            } catch (error) {
                console.error("Start Error:", error);
                alert("Turnuva başlatılırken bir hata oluştu: " + error.message);
                btn.innerText = 'BAŞLAT';
                btn.disabled = false;
            }
        };
        adminActions.appendChild(btn);
    }
}

function renderLobby() {
    if (currentTournament.status === 'waiting') {
        lobbyPreStart.style.display = 'block';
        
        const readyCount = currentTournament.participants.filter(p => p.isReady).length;
        readyCountText.innerText = `${readyCount}/${currentTournament.participants.length} Hazır`;

        participantsList.innerHTML = currentTournament.participants.map(p => `
            <div class="list-item fade-in" style="padding: 1rem; text-align: center; border-color: ${p.isReady ? 'var(--primary)' : 'var(--border-color)'};">
                <img src="${p.photoURL}" style="width: 40px; height: 40px; border-radius: 50%; margin-bottom: 0.5rem; border: 2px solid ${p.isReady ? 'var(--primary)' : 'transparent'};">
                <div style="font-weight: 600; font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>
                <div style="font-size: 0.65rem; color: ${p.isReady ? 'var(--primary)' : 'var(--text-muted)'}; margin-top: 0.3rem;">
                    ${p.isReady ? '● HAZIR' : '○ Bekliyor'}
                </div>
            </div>
        `).join('');

        if (currentUser) {
            const me = currentTournament.participants.find(p => p.uid === currentUser.uid);
            if (me) {
                btnReady.innerText = me.isReady ? 'Hazırım ✓' : 'Hazır Ol';
                btnReady.className = `btn ${me.isReady ? 'btn-secondary' : 'btn-primary'}`;
                btnReady.onclick = () => toggleReady(tournamentId, currentUser.uid, !me.isReady);
            }
        }
    } else {
        lobbyPreStart.style.display = 'none';
    }
}

function renderStats() {
    if (currentMatches.length === 0) {
        statsContainer.innerHTML = '<div class="card" style="text-align: center; color: var(--text-muted);">Henüz maç oynanmadı.</div>';
        return;
    }

    const stats = {};
    currentTournament.participants.forEach(p => {
        stats[p.uid] = { name: p.name, gf: 0, ga: 0, pointsLostTo: {}, maxConcededSingle: 0, streak: 0, maxStreak: 0 };
    });

    const playedMatches = currentMatches.filter(m => m.homeScore !== null).sort((a, b) => (a.playedAt || 0) - (b.playedAt || 0));

    playedMatches.forEach(m => {
        const h = stats[m.homeId];
        const a = stats[m.awayId];
        if (!h || !a) return;

        h.gf += m.homeScore; h.ga += m.awayScore;
        a.gf += m.awayScore; a.ga += m.homeScore;

        if (m.awayScore > h.maxConcededSingle) h.maxConcededSingle = m.awayScore;
        if (m.homeScore > a.maxConcededSingle) a.maxConcededSingle = m.homeScore;

        if (m.homeScore < m.awayScore) {
            h.streak = 0; a.streak++;
        } else if (m.homeScore > m.awayScore) {
            a.streak = 0; h.streak++;
        } else {
            h.streak++; a.streak++;
        }
        h.maxStreak = Math.max(h.maxStreak, h.streak);
        a.maxStreak = Math.max(a.maxStreak, a.streak);
    });

    const topScorers = Object.values(stats).sort((a, b) => b.gf - a.gf).slice(0, 5);
    const mostConceded = Object.values(stats).sort((a, b) => b.ga - a.ga).slice(0, 5);
    const bestStreaks = Object.values(stats).sort((a, b) => b.maxStreak - a.maxStreak).slice(0, 5);

    let html = `
        <div class="stat-card fade-in">
            <h4 style="font-size: 0.8rem; color: var(--primary); margin-bottom: 0.8rem;">⚽ EN ÇOK GOL ATANLAR</h4>
            ${topScorers.map(s => `<div class="stat-item"><span class="stat-label">${s.name}</span><span class="stat-value">${s.gf} Gol</span></div>`).join('')}
        </div>
        <div class="stat-card fade-in">
            <h4 style="font-size: 0.8rem; color: var(--accent); margin-bottom: 0.8rem;">🛡️ EN ÇOK GOL YİYENLER</h4>
            ${mostConceded.map(s => `<div class="stat-item"><span class="stat-label">${s.name}</span><span class="stat-value">${s.ga} Gol</span></div>`).join('')}
        </div>
        <div class="stat-card fade-in">
            <h4 style="font-size: 0.8rem; color: var(--secondary); margin-bottom: 0.8rem;">🔥 EN UZUN YENİLMEZLİK</h4>
            ${bestStreaks.map(s => `<div class="stat-item"><span class="stat-label">${s.name}</span><span class="stat-value">${s.maxStreak} Maç</span></div>`).join('')}
        </div>
    `;

    statsContainer.innerHTML = html;
}

// Settings Form
document.getElementById('form-settings').onsubmit = async (e) => {
    e.preventDefault();
    const newSettings = {
        entryType: document.getElementById('setting-entry').value,
        scoreEntry: document.getElementById('setting-score').value
    };
    await updateSettings(tournamentId, newSettings);
    hideModal('modal-settings');
};

document.getElementById('btn-finish-manual').onclick = async () => {
    if (confirm("Turnuvayı bitti olarak işaretlemek istiyor musunuz?")) {
        await updateDoc(doc(db, "tournaments", tournamentId), { status: 'finished' });
        hideModal('modal-settings');
    }
};

document.getElementById('btn-delete-tournament').onclick = async () => {
    if (confirm("Turnuvayı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) {
        await deleteTournament(tournamentId);
        window.location.href = 'index.html';
    }
};

function renderStandings() {
    const stats = {};
    currentTournament.participants.forEach(p => {
        stats[p.uid] = { name: p.name, o: 0, g: 0, b: 0, m: 0, ag: 0, yg: 0, av: 0, p: 0 };
    });

    currentMatches.forEach(m => {
        if (m.homeScore === null || m.awayScore === null) return;

        const h = stats[m.homeId];
        const a = stats[m.awayId];
        if (!h || !a) return;

        h.o++; a.o++;
        h.ag += m.homeScore; h.yg += m.awayScore;
        a.ag += m.awayScore; a.yg += m.homeScore;

        if (m.homeScore > m.awayScore) {
            h.g++; a.m++; h.p += 3;
        } else if (m.homeScore < m.awayScore) {
            a.g++; h.m++; a.p += 3;
        } else {
            h.b++; a.b++; h.p += 1; a.p += 1;
        }
        h.av = h.ag - h.yg;
        a.av = a.ag - a.yg;
    });

    const sorted = Object.values(stats).sort((a, b) => b.p - a.p || b.av - a.av || b.ag - a.ag);

    standingsBody.innerHTML = sorted.map((s, i) => `
        <tr class="fade-in">
            <td class="rank-${i+1}">${i+1}</td>
            <td><strong>${s.name}</strong></td>
            <td style="text-align: center;">${s.o}</td>
            <td style="text-align: center;">${s.g}</td>
            <td style="text-align: center;" class="hide-mobile">${s.b}</td>
            <td style="text-align: center;" class="hide-mobile">${s.m}</td>
            <td style="text-align: center;">${s.av}</td>
            <td style="text-align: center;"><strong>${s.p}</strong></td>
        </tr>
    `).join('');
}

function renderMatches() {
    if (currentMatches.length === 0) {
        matchesList.innerHTML = '<p style="text-align: center; color: var(--text-muted); margin-top: 2rem;">Turnuva henüz başlatılmadı.</p>';
        return;
    }

    const rounds = {};
    currentMatches.forEach(m => {
        if (!rounds[m.round]) rounds[m.round] = [];
        rounds[m.round].push(m);
    });

    matchesList.innerHTML = Object.keys(rounds).sort((a, b) => a - b).map(r => `
        <div style="margin-bottom: 2rem;" class="fade-in">
            <h3 style="font-size: 0.8rem; color: var(--primary); margin-bottom: 1rem; border-left: 3px solid var(--primary); padding-left: 0.5rem; text-transform: uppercase;">
                ${r}. Hafta
            </h3>
            <div class="card" style="padding: 0;">
                ${rounds[r].map(m => `
                    <div class="match-card" onclick="window.location.href='match.html?id=${m.id}'">
                        <div class="team-name">${m.homeName}</div>
                        <div class="match-score">
                            ${m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : 'VS'}
                        </div>
                        <div class="team-name team-right">${m.awayName}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}
