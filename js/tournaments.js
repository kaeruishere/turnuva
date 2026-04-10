import { db, state, getDefaultPlayers, getTournamentName, esc } from './app.js';
import { showToast, formatDate, SPIN, openModal, closeModal } from './ui.js';
import {
  collection, query, orderBy, onSnapshot, getDocs,
  addDoc, updateDoc, deleteDoc, doc, where, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function renderTournaments(navigate) {
  state.page = 'tournaments';
  const main = document.getElementById('main');
  main.innerHTML = SPIN;

  state.unsub.forEach(u => u());
  state.unsub = [];

  const q = query(collection(db, 'tournaments'), orderBy('createdAt', 'desc'));
  const u = onSnapshot(q, async (snap) => {
    const all    = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const active = all.filter(t => t.status === 'active');
    const old    = all.filter(t => t.status !== 'active');

    // ── Paralel matchCount fetch ──
    const matchCounts = {};
    await Promise.all(all.map(async t => {
      const ms   = await getDocs(collection(db, `tournaments/${t.id}/matches`));
      const done = ms.docs.filter(d => d.data().done).length;
      matchCounts[t.id] = { done, total: ms.size };
    }));

    let html = `
      <button class="btn btn-primary btn-full mb-4" id="btn-new-t" style="height:50px;">
        ＋ Yeni Turnuva Başlat
      </button>
    `;

    if (active.length > 0) {
      html += `<div class="sec-label">Aktif Turnuva</div>`;
      html += active.map(t => cardHTML(t, matchCounts[t.id], true)).join('');
    }
    if (old.length > 0) {
      html += `<div class="sec-label">Geçmiş Turnuvalar</div>`;
      html += old.map(t => cardHTML(t, matchCounts[t.id], false)).join('');
    }
    if (all.length === 0) {
      html += `<div class="empty"><div class="empty-icon">🏆</div>Henüz turnuva yok.<br>Butona tıklayarak ilk turnuvayı başlat!</div>`;
    }

    main.innerHTML = html;

    document.getElementById('btn-new-t').onclick = () => openNewTournamentModal(navigate);

    main.querySelectorAll('.t-card').forEach(card => {
      card.onclick = () => navigate('detail', card.dataset.id);
    });
  });
  state.unsub.push(u);
}

function cardHTML(t, mc, isActive) {
  const done  = mc?.done  ?? 0;
  const total = mc?.total ?? 0;
  return `
    <div class="card card-hoverable t-card ${isActive ? 'active-t' : ''}" data-id="${t.id}" style="padding:14px; display:flex; align-items:center; justify-content:space-between; cursor:pointer;">
      <div class="t-card-accent"></div>
      <div>
        <div class="t-card-name">${esc(t.name)}</div>
        <div class="t-card-meta">${formatDate(t.createdAt)} · ${done}/${total} maç tamamlandı</div>
      </div>
      <div class="flex items-center gap-2">
        <div class="t-badge ${isActive ? 'active' : 'done'}">${isActive ? 'Aktif' : 'Bitti'}</div>
        <span class="text-muted" style="font-size:1.4rem; padding-bottom:2px">›</span>
      </div>
    </div>
  `;
}

export async function createTournament(name, players) {
  // Varsa aktifi bitir
  const aq    = query(collection(db, 'tournaments'), where('status', '==', 'active'));
  const aSnap = await getDocs(aq);
  await Promise.all(aSnap.docs.map(d => updateDoc(doc(db, 'tournaments', d.id), { status: 'done' })));

  const tRef = await addDoc(collection(db, 'tournaments'), {
    name, players, createdAt: serverTimestamp(), status: 'active', redCardPenalty: false
  });

  const schedule = generateSchedule(players);
  await Promise.all(schedule.map((pair, i) =>
    addDoc(collection(db, `tournaments/${tRef.id}/matches`), {
      slot: i,
      home: players[pair[0]],
      away: players[pair[1]],
      hG: 0, aG: 0, hRed: 0, aRed: 0, done: false
    })
  ));

  showToast('🏆 Turnuva oluşturuldu!');
  return tRef.id;
}

function generateSchedule(players) {
  const list   = players.map((_, i) => i);
  if (list.length % 2 !== 0) list.push(-1);
  const rounds = list.length - 1;
  const half   = list.length / 2;
  const sched  = [];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const a = list[i], b = list[list.length - 1 - i];
      if (a !== -1 && b !== -1) sched.push([a, b]);
    }
    list.splice(1, 0, list.pop());
  }
  [...sched].forEach(([a, b]) => sched.push([b, a]));
  return sched;
}

export function openNewTournamentModal(navigate) {
  // Her açılışta localStorage'dan taze oku
  let players = getDefaultPlayers();

  const render = () => {
    openModal(`
      <div class="modal">
        <h3 class="modal-title">🏆 Yeni Turnuva</h3>
        <p class="text-sm text-muted mb-4">Katılacak oyuncuları düzenle:</p>

        <div id="new-t-players" class="flex flex-col gap-2 mb-4">
          ${players.map((p, i) => `
            <div class="flex gap-2">
              <input type="text" class="input flex-grow p-input" value="${esc(p)}" data-index="${i}" placeholder="Oyuncu adı" style="padding:10px 14px;">
              <button class="btn btn-ghost btn-sm p-del" data-index="${i}" title="Sil">✕</button>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-secondary btn-sm btn-full mb-5" id="btn-add-p">＋ Oyuncu Ekle</button>

        <div class="flex gap-3">
          <button class="btn btn-ghost flex-grow" id="btn-cancel">İptal</button>
          <button class="btn btn-primary flex-grow" id="btn-start" ${players.filter(p => p.trim()).length < 2 ? 'disabled' : ''}>Başlat</button>
        </div>
      </div>
    `);

    const list = document.getElementById('new-t-players');

    list.querySelectorAll('.p-input').forEach(input => {
      input.oninput = e => { players[+e.target.dataset.index] = e.target.value; };
    });
    list.querySelectorAll('.p-del').forEach(btn => {
      btn.onclick = () => { players.splice(+btn.dataset.index, 1); render(); };
    });

    document.getElementById('btn-add-p').onclick = () => { players.push(''); render(); };
    document.getElementById('btn-cancel').onclick = closeModal;

    document.getElementById('btn-start').onclick = async () => {
      const finalPlayers = players.map(p => p.trim()).filter(Boolean);
      if (finalPlayers.length < 2) {
        showToast('En az 2 oyuncu lazım', 'error'); return;
      }
      const btn = document.getElementById('btn-start');
      btn.disabled = true; btn.textContent = '⏳ Oluşturuluyor...';
      await createTournament(getTournamentName(), finalPlayers);
      closeModal();
    };
  };

  render();
}
