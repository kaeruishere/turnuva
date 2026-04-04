import { db, state } from './app.js';
import { showToast, SPIN, formatDate } from './ui.js';
import {
  collection, query, orderBy, onSnapshot, getDocs, doc,
  setDoc, getDoc, where, serverTimestamp, limit
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─── İDDİA GİRİŞ SAYFASI ───
export function renderBets() {
  state.page = 'bets';
  const main = document.getElementById('main');
  main.innerHTML = SPIN;

  state.unsub.forEach(u => u()); state.unsub = [];

  // Aktif turnuvayı bul
  const q = query(collection(db, 'tournaments'), where('status', '==', 'active'));
  const u = onSnapshot(q, async snap => {
    if (snap.empty) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">🎯</div>Aktif turnuva yok.</div>`;
      return;
    }
    const tourney  = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const msSnap   = await getDocs(query(collection(db, `tournaments/${tourney.id}/matches`), orderBy('slot')));
    const matches  = msSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const next     = matches.find(m => !m.done);

    if (!next) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">🏆</div>Tüm maçlar bitti!<br>İddia girilecek maç kalmadı.</div>`;
      return;
    }

    // Kullanıcının bu maça önceki iddiasını çek
    const betRef  = doc(db, `tournaments/${tourney.id}/matches/${next.id}/bets`, state.user.username);
    const betSnap = await getDoc(betRef);
    const prev    = betSnap.exists() ? betSnap.data() : null;

    drawBetForm(tourney, next, prev);
  });
  state.unsub.push(u);
}

function drawBetForm(tourney, match, prev) {
  const main = document.getElementById('main');

  main.innerHTML = `
    <div class="sec-label" style="margin-top:0">Sıradaki Maç</div>
    <div class="card mb-5 p-0">
      <div class="next-match">
        <div class="nm-team">${match.home}</div>
        <div class="nm-vs">VS</div>
        <div class="nm-team">${match.away}</div>
      </div>
      <div class="nm-slot">Maç ${match.slot+1}</div>
    </div>

    <div class="sec-label">İddialarını Gir</div>
    <div class="card p-0" id="bet-form">

      <!-- MAÇ SONUCU -->
      <div class="bet-section">
        <div class="bet-title">⚽ Maç Sonucu</div>
        <div class="bet-options" id="bet-result">
          ${betOption('result', '1', match.home, prev?.result)}
          ${betOption('result', 'X', 'Beraberlik', prev?.result)}
          ${betOption('result', '2', match.away, prev?.result)}
        </div>
      </div>

      <!-- GOL ALT/ÜST -->
      <div class="bet-section">
        <div class="bet-title">🎯 Gol Sayısı</div>
        <div class="bet-options" id="bet-goals">
          ${betOption('goals', 'alt', 'Alt (0-2)', prev?.goals)}
          ${betOption('goals', 'ust', 'Üst (3+)', prev?.goals)}
        </div>
      </div>

      <!-- KIRMIZI KART -->
      <div class="bet-section">
        <div class="bet-title">🟥 Kırmızı Kart</div>
        <div class="bet-options" id="bet-redcard">
          ${betOption('redcard', 'var', 'Var', prev?.redcard)}
          ${betOption('redcard', 'yok', 'Yok', prev?.redcard)}
        </div>
      </div>

      <!-- İLK GOL ATAN -->
      <div class="bet-section" style="border:none">
        <div class="bet-title">🥅 İlk Gol Atan Taraf</div>
        <div class="bet-options" id="bet-firstgoal">
          ${betOption('firstgoal', match.home, match.home, prev?.firstgoal)}
          ${betOption('firstgoal', 'berabere', 'Gol Olmaz', prev?.firstgoal)}
          ${betOption('firstgoal', match.away, match.away, prev?.firstgoal)}
        </div>
      </div>

    </div>

    ${prev ? `<div class="text-xs text-muted text-center mb-2">Son güncelleme: ${formatDate(prev.updatedAt)}</div>` : ''}
    <button class="btn btn-primary btn-full mt-2" id="btn-save-bet" style="height:50px;">
      ${prev ? '✏️ İddiayı Güncelle' : '🎯 İddiayı Kaydet'}
    </button>
  `;

  // Seçim toggle
  main.querySelectorAll('.bet-opt').forEach(btn => {
    btn.onclick = () => {
      const grp = btn.dataset.group;
      main.querySelectorAll(`.bet-opt[data-group="${grp}"]`).forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };
  });

  document.getElementById('btn-save-bet').onclick = async () => {
    const get = grp => main.querySelector(`.bet-opt.selected[data-group="${grp}"]`)?.dataset.val;
    const result    = get('result');
    const goals     = get('goals');
    const redcard   = get('redcard');
    const firstgoal = get('firstgoal');

    if (!result || !goals || !redcard || !firstgoal) {
      showToast('Tüm alanları doldur!', 'error'); return;
    }

    const betRef = doc(db, `tournaments/${tourney.id}/matches/${match.id}/bets`, state.user.username);
    await setDoc(betRef, {
      username: state.user.username,
      result, goals, redcard, firstgoal,
      matchId: match.id,
      updatedAt: serverTimestamp()
    });
    showToast('✅ İddia kaydedildi!');
  };
}

function betOption(group, val, label, selected) {
  return `
    <button class="bet-opt ${selected === val ? 'selected' : ''}" data-group="${group}" data-val="${val}">
      ${label}
    </button>
  `;
}

// ─── SONUÇLAR SAYFASI ───
export function renderResults() {
  state.page = 'results';
  const main = document.getElementById('main');
  main.innerHTML = SPIN;

  state.unsub.forEach(u => u()); state.unsub = [];

  const q = query(collection(db, 'tournaments'), where('status', '==', 'active'));
  const u = onSnapshot(q, async snap => {
    if (snap.empty) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>Aktif turnuva yok.</div>`;
      return;
    }
    const tourney = { id: snap.docs[0].id, ...snap.docs[0].data() };
    const msSnap  = await getDocs(query(collection(db, `tournaments/${tourney.id}/matches`), orderBy('slot')));
    const matches = msSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const done    = matches.filter(m => m.done);

    if (done.length === 0) {
      main.innerHTML = `<div class="empty"><div class="empty-icon">📊</div>Henüz tamamlanan maç yok.</div>`;
      return;
    }

    // Tüm bitlenen maçların iddialarını çek + skor hesapla
    const players = tourney.players || [];
    const scores  = {}; // username → puan
    players.forEach(p => scores[p.toLowerCase().replace(' ', '_')] = 0);

    const matchResults = [];

    for (const match of done) {
      const betsSnap = await getDocs(collection(db, `tournaments/${tourney.id}/matches/${match.id}/bets`));
      const bets = betsSnap.docs.map(d => d.data());

      const actual = resolveActual(match);
      const row    = { match, bets: [], actual };

      for (const bet of bets) {
        const pts = calcPoints(bet, actual);
        if (!scores[bet.username]) scores[bet.username] = 0;
        scores[bet.username] += pts;
        row.bets.push({ ...bet, pts });
      }
      matchResults.push(row);
    }

    drawResults(matchResults, scores, players);
  });
  state.unsub.push(u);
}

function resolveActual(m) {
  const totalGoals = m.hG + m.aG;
  const hasRed     = (m.hRed||0) + (m.aRed||0) > 0;
  let result, firstgoal;

  if (m.hG > m.aG)      result = '1';
  else if (m.aG > m.hG) result = '2';
  else                   result = 'X';

  if (m.hG > 0 || m.aG > 0) firstgoal = m.hG > 0 ? m.home : m.away; // basit yaklaşım: ev sahibi gol attıysa ev
  else                       firstgoal = 'berabere';

  return {
    result,
    goals:     totalGoals <= 2 ? 'alt' : 'ust',
    redcard:   hasRed ? 'var' : 'yok',
    firstgoal
  };
}

function calcPoints(bet, actual) {
  let pts = 0;
  if (bet.result    === actual.result)    pts += 3;
  if (bet.goals     === actual.goals)     pts += 2;
  if (bet.redcard   === actual.redcard)   pts += 1;
  if (bet.firstgoal === actual.firstgoal) pts += 2;
  return pts;
}

function drawResults(matchResults, scores, players) {
  const main = document.getElementById('main');

  // Sıralama
  const sorted = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .map(([u, pts]) => ({ u, pts }));

  let html = `
    <div class="sec-label mt-0">İddia Sıralaması</div>
    <div class="card mb-5 p-0">
      <div class="table-wrap">
      <table class="stbl">
        <thead><tr>
           <th>#</th>
           <th style="text-align:left;padding-left:12px">Oyuncu</th>
           <th class="text-accent">Puan</th>
        </tr></thead>
        <tbody>
          ${sorted.map((s, i) => `
            <tr>
              <td class="${['rank-1','rank-2','rank-3'][i]||''}" style="font-weight:700">${i+1}</td>
              <td class="pl-name">${s.u}</td>
              <td class="text-accent text-bold">${s.pts}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    </div>

    <div class="sec-label">Maç Bazlı Sonuçlar</div>
  `;

  for (const { match, bets, actual } of [...matchResults].reverse()) {
    html += `
      <div class="card" style="margin-bottom:12px">
        <div class="card-header">
          <span style="font-weight:700">${match.home} ${match.hG} - ${match.aG} ${match.away}</span>
          <span style="font-size:.72rem;color:var(--text2)">Maç ${match.slot+1}</span>
        </div>
        <div style="padding:4px 0">
          <!-- actual -->
          <div style="padding:8px 14px;border-bottom:1px solid var(--border);font-size:.75rem;color:var(--text2);display:flex;gap:12px">
            <span>Sonuç: <b style="color:var(--text)">${actual.result}</b></span>
            <span>Gol: <b style="color:var(--text)">${actual.goals}</b></span>
            <span>Kırmızı: <b style="color:var(--text)">${actual.redcard}</b></span>
            <span>İlk gol: <b style="color:var(--text)">${actual.firstgoal}</b></span>
          </div>
          ${bets.length === 0
            ? `<div class="empty" style="padding:14px">Bu maç için iddia girilmedi</div>`
            : bets.sort((a,b)=>b.pts-a.pts).map(bet => `
              <div style="padding:9px 14px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;gap:8px">
                <div style="font-weight:600;font-size:.86rem">${bet.username}</div>
                <div style="display:flex;gap:8px;font-size:.75rem;color:var(--text2)">
                  <span class="${bet.result===actual.result?'hit':'miss'}">${bet.result}</span>
                  <span class="${bet.goals===actual.goals?'hit':'miss'}">${bet.goals}</span>
                  <span class="${bet.redcard===actual.redcard?'hit':'miss'}">${bet.redcard}</span>
                  <span class="${bet.firstgoal===actual.firstgoal?'hit':'miss'}">${bet.firstgoal}</span>
                </div>
                <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--accent);min-width:28px;text-align:right">
                  ${bet.pts}p
                </div>
              </div>
            `).join('')
          }
        </div>
      </div>
    `;
  }

  main.innerHTML = html;
}
