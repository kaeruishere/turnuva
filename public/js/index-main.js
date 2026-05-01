import { createTournament, listenToTournaments, getTournament, joinTournament, getTournamentByCode } from './tournament.js';
import { showModal, hideModal, setupModalClose, renderTournamentCard } from './ui.js';
import { login, logout, observeAuth } from './auth.js';
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const tournamentsList = document.getElementById('tournaments-list');
const btnShowCreate = document.getElementById('btn-show-create');
const btnShowJoinCode = document.getElementById('btn-show-join-code');
const formCreate = document.getElementById('form-create');
const formJoin = document.getElementById('form-join');
const formJoinCode = document.getElementById('form-join-code');
const userProfile = document.getElementById('user-profile');

let currentUser = null;

// Auth Observer
observeAuth(async (user) => {
    currentUser = user;
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Load custom profile
    const userSnap = await getDoc(doc(db, "users", user.uid));
    const userData = userSnap.exists() ? userSnap.data() : null;

    if (userData && userData.emoji) {
        userProfile.innerHTML = `<div class="profile-img" style="display: flex; align-items: center; justify-content: center; font-size: 1.5rem; background: var(--card-bg);">${userData.emoji}</div>`;
    } else {
        userProfile.innerHTML = `<img src="${user.photoURL}" class="profile-img" title="${user.displayName}">`;
    }
    
    document.getElementById('btn-logout').onclick = logout;
});

// Initialize
setupModalClose();

btnShowCreate.onclick = () => showModal('modal-create');
btnShowJoinCode.onclick = () => showModal('modal-join-code');

// Handle Tournament Creation
formCreate.onsubmit = async (e) => {
    e.preventDefault();
    const name = document.getElementById('tournament-name').value;
    const password = document.getElementById('tournament-password').value;

    try {
        const id = await createTournament(name, password, currentUser);
        hideModal('modal-create');
        window.location.href = `lobby.html?id=${id}`;
    } catch (error) {
        console.error("Hata:", error);
        alert("Turnuva oluşturulurken bir hata oluştu.");
    }
};

// Handle Join by Code
formJoinCode.onsubmit = async (e) => {
    e.preventDefault();
    const code = document.getElementById('input-join-code').value.trim();

    try {
        const tournament = await getTournamentByCode(code);
        if (!tournament) {
            alert("Bu kodla eşleşen bir turnuva bulunamadı!");
            return;
        }

        if (tournament.password) {
            // If has password, redirect to the password join flow
            hideModal('modal-join-code');
            window.joinFromList(tournament.id, true, tournament.name);
        } else {
            await joinTournament(tournament.id, currentUser);
            window.location.href = `lobby.html?id=${tournament.id}`;
        }
    } catch (error) {
        console.error("Join Error:", error);
        alert("Bir hata oluştu.");
    }
};

// Handle Tournament List
listenToTournaments((tournaments) => {
    if (tournaments.length === 0) {
        tournamentsList.innerHTML = `
            <div class="card" style="text-align: center; color: var(--text-muted); padding: 3rem 1rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem;">🏆</div>
                <p>Henüz aktif turnuva yok. Hemen bir tane oluştur!</p>
            </div>
        `;
        return;
    }

    tournamentsList.innerHTML = tournaments.map(t => renderTournamentCard(t)).join('');
});

// Global Join Function
window.joinFromList = async (id, hasPass, name) => {
    if (!currentUser) return;

    if (!hasPass) {
        await joinTournament(id, currentUser);
        window.location.href = `lobby.html?id=${id}`;
        return;
    }

    document.getElementById('join-id').value = id;
    document.getElementById('join-title').innerText = `${name} - Giriş`;
    document.getElementById('join-desc').innerText = "Bu turnuva şifre korumalıdır.";
    showModal('modal-join');
};

formJoin.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('join-id').value;
    const enteredPass = document.getElementById('join-password').value;

    const tournament = await getTournament(id);
    if (tournament && tournament.password === enteredPass) {
        await joinTournament(id, currentUser);
        window.location.href = `lobby.html?id=${id}`;
    } else {
        alert("Hatalı şifre!");
    }
};
