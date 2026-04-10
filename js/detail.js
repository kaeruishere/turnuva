import { db, state, esc } from './app.js';
import { showToast, formatDate, closeModal, openModal, SPIN } from './ui.js';
import {
  doc, collection, query, orderBy, onSnapshot, updateDoc, getDocs, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function renderDetail(id, navigate) {
  state.page     = 'detail';
  state.detailId = id;
  const main     = document.getElementById('main');
  main.innerHTML = SPIN;

  state.unsub.forEach(u => u());
  state.unsub = [];

  // İki listener: turnuva meta + maçlar
  // İkisi de gelene kadar çizme
  let tReady = false, mReady = false;

  const u1 = onSnapshot(doc(db, 'tournaments', id), snap => {
    if (!snap.exists()) return;
    state.tourney = { id: snap.id, ...snap.data() };
    tReady = true;
    if (mReady) drawDetail(navigate);
  });

  const u2 = onSnapshot(
    query(collection(db, `tournaments/${id}/matches`), orderBy('slot')),
    snap => {
      state.matches = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      mReady = true;
      if (tReady) drawDetail(navigate);
    }
  );

  state.unsub.push(u1, u2);
}

function drawDetail(navigate) {
  const t       = state.tourney;
  const matches = state.matches;
  if (!t || !matches.length) return;

  const main = document.getElementById('main');

  // İlk render: tam HTML
  if (!document.getElementById('detail-root')) {
    main.innerHTML = `
      <div id="detail-root">
        <div id="d-header"></div>
        <div id="d-table"></div>
        <div id="d-next"></div>
        <div id="d-fixture"></div>
      </div>
    `;
    // Back ve listener'ları bir kez kur
    main.addEventListener('click', e => {
      const row = e.target.closest('.match-row');
      if (row) { openMatchModal(row.dataset.mid); return; }
      if (e.target.closest('#next-match-card')) {
        const nextMatch = state.matches.find(m => !m.done);
        if (nextMatch) openMatchModal(nextMatch.id);
      }
    });
  }

  let players = t.players || [];
  if (!players.length) {
    const s = new Set();
    matches.forEach(m => { s.add(m.home); s.add(m.away); });
    players = [...s];
  }

  const stats     = buildStats(players, matches, t.redCardPenalty);
  const sorted    = Object.values(stats).sort((a, b) =>
    b.pts - a.pts || (b.ag - b.yg) - (a.ag - a.yg) || b.ag - a.ag
  );
  const nextMatch = matches.find(m => !m.done);
  const doneCount = matches.filter(m => m.done).length;

  // ── Header ──
  document.getElementById('d-header').innerHTML = `
    <button class="back-btn" id="btn-back">‹ Turnuvalar</button>
    <div class="detail-header">
      <div>
        <div class="detail-name">${esc(t.name)}</div>
        <div class="detail-meta">${formatDate(t.createdAt)} · ${doneCount}/${matches.length} maç</div>
      </div>
      <div class="t-badge ${t.status === 'active' ? 'active' : 'done'}">
        ${t.status === 'active' ? 'Aktif' : 'Bitti'}
      </div>
    </div>
  `;
  document.getElementById('btn-back').onclick = () => {
    state.unsub.forEach(u => u()); state.unsub = [];
    state.tourney = null; state.matches = [];
    navigate('tournaments');
  };

  // ── Puan Tablosu ──
  document.getElementById('d-table').innerHTML = `
    <div class="sec-label mt-4">Puan Durumu</div>
    <div class="card p-0">
      <div class="table-wrap">
      <table class="stbl">
        <thead><tr>
          <th>#</th>
          <th style="text-align:left;padding-left:12px">Oyuncu</th>
          <th>O</th><th>G</th><th>B</th><th>M</th>
          <th>AG</th><th>YG</th><th>GF</th>
          <th style="color:var(--accent)">P</th>
        </tr></thead>
        <tbody>
          ${sorted.map((p, i) => {
            const gf = p.ag - p.yg;
            const gfColor = gf > 0 ? 'var(--accent)' : gf < 0 ? 'var(--red)' : 'var(--text-muted)';
            return `
              <tr>
                <td class="${['rank-1','rank-2','rank-3'][i] || ''}" style="font-weight:700">${i + 1}</td>
                <td class="pl-name">${esc(p.name)}</td>
                <td>${p.o}</td><td>${p.g}</td><td>${p.b}</td><td>${p.m}</td>
                <td>${p.ag}</td><td>${p.yg}</td>
                <td style="color:${gfColor}">${gf > 0 ? '+' : ''}${gf}</td>
                <td style="color:var(--accent);font-weight:700">${p.pts}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      </div>
    </div>
  `;

  // ── Sıradaki Maç ──
  document.getElementById('d-next').innerHTML = `
    <div class="sec-label">Sıradaki Maç</div>
    ${nextMatch ? `
      <div class="card" style="cursor:pointer" id="next-match-card">
        <div class="next-match">
          <div class="nm-team">${esc(nextMatch.home)}</div>
          <div class="nm-vs">VS</div>
          <div class="nm-team">${esc(nextMatch.away)}</div>
        </div>
        <div class="nm-slot">Maç ${nextMatch.slot + 1} · Skoru girmek için tıkla</div>
      </div>
    ` : `<div class="card"><div class="empty" style="padding:20px">🏆 Tüm maçlar tamamlandı!</div></div>`}
  `;

  // ── Fikstür ──
  document.getElementById('d-fixture').innerHTML = `
    <div class="sec-label">Fikstür</div>
    <div class="card">
      ${matches.map(m => `
        <div class="match-row ${m.done ? 'done-match' : ''}" data-mid="${m.id}">
          <div class="mr-week">${m.slot + 1}</div>
          <div class="mr-team right">${esc(m.home)}</div>
          <div class="mr-score ${m.done ? '' : 'pending'}">${m.done ? `${m.hG} - ${m.aG}` : '· · ·'}</div>
          <div class="mr-team">${esc(m.away)}</div>
          <div style="width:16px;font-size:.7rem;color:var(--text-muted)">${m.done ? '✓' : ''}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function openMatchModal(mid) {
  const m   = state.matches.find(x => x.id === mid);
  const red = state.tourney?.redCardPenalty === true;
  if (!m) return;

  openModal(`
    <div class="modal">
      <h3 class="modal-title mb-3">${esc(m.home)} vs ${esc(m.away)}</h3>
      <div class="flex justify-center items-center gap-3 mb-4">
        <input type="number" id="mhg" class="fi score-input" value="${m.hG}" min="0" max="99">
        <div class="text-muted" style="font-family:'Bebas Neue',sans-serif;font-size:2rem;">-</div>
        <input type="number" id="mag" class="fi score-input" value="${m.aG}" min="0" max="99">
      </div>
      ${red ? `
        <div style="background:var(--red-dim);border:1px solid rgba(255,75,106,.2);border-radius:var(--border-radius-md);padding:14px;margin-bottom:20px">
          <div class="text-red text-center mb-2 text-xs" style="font-weight:800;letter-spacing:1px">🟥 KIRMIZI KART</div>
          <div class="flex justify-between items-center gap-2">
            <div class="flex-col items-center flex" style="flex:1">
              <div class="text-xs text-muted mb-1">${esc(m.home)}</div>
              <input type="number" id="mhred" class="fi score-input redcard-input" value="${m.hRed || 0}" min="0" max="11">
            </div>
            <div class="flex-col items-center flex" style="flex:1">
              <div class="text-xs text-muted mb-1">${esc(m.away)}</div>
              <input type="number" id="mared" class="fi score-input redcard-input" value="${m.aRed || 0}" min="0" max="11">
            </div>
          </div>
        </div>
      ` : ''}
      <div class="flex flex-col gap-2">
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-full" id="m-cancel">İptal</button>
          <button class="btn btn-primary btn-full" id="m-save">💾 Kaydet</button>
        </div>
        ${m.done ? `<button class="btn btn-danger btn-full" id="m-reset">↩ Skoru Sıfırla</button>` : ''}
      </div>
    </div>
  `);

  document.getElementById('m-cancel').onclick = closeModal;

  document.getElementById('m-save').onclick = async () => {
    const btn  = document.getElementById('m-save');
    btn.disabled = true; btn.textContent = '⏳ Kaydediliyor...';
    const hG   = parseInt(document.getElementById('mhg').value)   || 0;
    const aG   = parseInt(document.getElementById('mag').value)   || 0;
    const hRed = red ? (parseInt(document.getElementById('mhred').value) || 0) : 0;
    const aRed = red ? (parseInt(document.getElementById('mared').value) || 0) : 0;
    await updateDoc(doc(db, `tournaments/${state.detailId}/matches`, mid), { hG, aG, hRed, aRed, done: true });
    closeModal();
    showToast('✅ Skor kaydedildi');
  };

  const rb = document.getElementById('m-reset');
  if (rb) rb.onclick = async () => {
    if (!confirm('Skoru sıfırlamak istediğinden emin misin?')) return;
    rb.disabled = true; rb.textContent = '⏳...';
    await updateDoc(doc(db, `tournaments/${state.detailId}/matches`, mid), { hG: 0, aG: 0, hRed: 0, aRed: 0, done: false });
    closeModal();
    showToast('↩ Skor sıfırlandı', 'error');
  };
}

export function buildStats(players, matches, redCardPenalty = false) {
  const s = {};
  players.forEach(p => s[p] = { name: p, o: 0, g: 0, b: 0, m: 0, ag: 0, yg: 0, pts: 0 });
  matches.filter(m => m.done).forEach(m => {
    const sH = s[m.home], sA = s[m.away];
    if (!sH || !sA) return;
    sH.o++; sA.o++;
    if (redCardPenalty) {
      sH.ag += m.hG; sH.yg += m.aG + (m.aRed || 0);
      sA.ag += m.aG; sA.yg += m.hG + (m.hRed || 0);
    } else {
      sH.ag += m.hG; sH.yg += m.aG;
      sA.ag += m.aG; sA.yg += m.hG;
    }
    if (m.hG > m.aG)      { sH.g++; sH.pts += 3; sA.m++; }
    else if (m.aG > m.hG) { sA.g++; sA.pts += 3; sH.m++; }
    else                   { sH.b++; sA.b++; sH.pts++; sA.pts++; }
  });
  return s;
}
