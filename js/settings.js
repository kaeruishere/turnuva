import { db, state, getDefaultPlayers, saveDefaultPlayers, esc } from './app.js';
import { showToast, openModal, closeModal } from './ui.js';
import {
  collection, query, where, getDocs, orderBy, limit,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function openSettings(navigate) {
  let currentRedCard = false, activeTId = null, lastDoneTId = null, lastDoneName = '';

  try {
    const [aSnap, dSnap] = await Promise.all([
      getDocs(query(collection(db, 'tournaments'), where('status', '==', 'active'))),
      getDocs(query(collection(db, 'tournaments'), where('status', '==', 'done'), orderBy('createdAt', 'desc'), limit(1)))
    ]);

    if (!aSnap.empty) {
      activeTId      = aSnap.docs[0].id;
      currentRedCard = aSnap.docs[0].data().redCardPenalty === true;
    }
    if (!dSnap.empty) {
      lastDoneTId  = dSnap.docs[0].id;
      lastDoneName = dSnap.docs[0].data().name;
    }
  } catch (e) { console.warn('Settings fetch error:', e); }

  // Her settings açılışında taze oku
  const players = getDefaultPlayers();

  openModal(`
    <div class="modal settings-modal">
      <div class="flex items-center justify-between mb-5">
        <h3 class="modal-title mb-0" style="margin-bottom:0">⚙️ AYARLAR</h3>
        <button class="btn btn-ghost btn-sm" id="s-close" style="font-size:1.2rem">✕</button>
      </div>

      <div class="sec-label" style="border:none">Kural Ayarları</div>
      <label class="flex items-center justify-between gap-3 mb-5" style="padding:16px; background:var(--el-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-md); cursor:pointer;">
        <div>
          <div class="text-bold mb-1">🟥 Kırmızı Kart Averaj Düşürür</div>
          <div class="text-xs text-muted">Her kırmızı kart gol averajını -1 azaltır</div>
        </div>
        <input type="checkbox" id="chk-redcard" ${currentRedCard ? 'checked' : ''} style="width:22px;height:22px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;">
      </label>

      <div class="sec-label" style="border:none">Varsayılan Oyuncular</div>
      <div id="default-players-list" class="flex flex-col gap-2 mb-3"></div>
      <button class="btn btn-secondary btn-sm btn-full mb-5" id="btn-add-p-def">＋ Oyuncu Ekle</button>

      <div class="sec-label" style="border:none">Aktif Turnuva</div>
      <div class="flex flex-col gap-2 mb-5">
        <button class="btn btn-danger btn-full" id="btn-end-t" ${!activeTId ? 'disabled' : ''}>🏁 Turnuvayı Bitir</button>
        <button class="btn btn-secondary btn-full" id="btn-delete-t" ${!activeTId ? 'disabled' : ''}>🗑️ Turnuvayı Sil</button>
      </div>

      <div class="sec-label" style="border:none">Son Bitirilen Turnuva</div>
      ${lastDoneTId ? `
        <div style="background:var(--el-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px; margin-bottom:12px;">
          <div class="text-bold mb-1">${esc(lastDoneName)}</div>
          <div class="text-xs text-muted">Yanlışlıkla bitirdiysen geri alabilirsin</div>
        </div>
        <button class="btn btn-secondary btn-full" id="btn-reopen-t">↩ Turnuvayı Tekrar Başlat</button>
      ` : `<div class="text-sm text-muted text-center" style="padding:10px">Bitirilen turnuva yok</div>`}
    </div>
  `);

  document.getElementById('s-close').onclick = closeModal;

  // ── Red card toggle ──
  document.getElementById('chk-redcard').onchange = async e => {
    if (!activeTId) { showToast('Aktif turnuva yok', 'error'); e.target.checked = !e.target.checked; return; }
    await updateDoc(doc(db, 'tournaments', activeTId), { redCardPenalty: e.target.checked });
    showToast(e.target.checked ? '🟥 Kırmızı kart averaj düşürür' : '↩ Kırmızı kart etkisiz',
              e.target.checked ? 'success' : 'error');
  };

  // ── Turnuva işlemleri ──
  document.getElementById('btn-end-t').onclick = async () => {
    if (!activeTId) return;
    if (!confirm('Aktif turnuvayı bitirmek istediğinden emin misin?')) return;
    await updateDoc(doc(db, 'tournaments', activeTId), { status: 'done' });
    closeModal(); showToast('✅ Turnuva bitirildi');
    if (state.page === 'detail') navigate('tournaments');
  };

  document.getElementById('btn-delete-t').onclick = async () => {
    if (!activeTId) return;
    if (!confirm('Aktif turnuva kalıcı silinecek!')) return;
    if (!confirm('Bu işlem geri alınamaz. Emin misin?')) return;
    const msSnap = await getDocs(collection(db, `tournaments/${activeTId}/matches`));
    await Promise.all(msSnap.docs.map(d => deleteDoc(doc(db, `tournaments/${activeTId}/matches`, d.id))));
    await deleteDoc(doc(db, 'tournaments', activeTId));
    closeModal(); showToast('🗑️ Turnuva silindi', 'error');
    if (state.page === 'detail') navigate('tournaments');
  };

  const rb = document.getElementById('btn-reopen-t');
  if (rb) rb.onclick = async () => {
    if (activeTId) await updateDoc(doc(db, 'tournaments', activeTId), { status: 'done' });
    await updateDoc(doc(db, 'tournaments', lastDoneTId), { status: 'active' });
    closeModal(); showToast('✅ Turnuva tekrar başlatıldı');
  };

  // ── Varsayılan oyuncu listesi ──
  // Debounce: input değişince hemen kaydet ama geri render etme (odak kaybetmez)
  let debounceTimer;
  const _debounce = (fn, ms = 400) => (...args) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => fn(...args), ms);
  };

  const renderPList = () => {
    const current = getDefaultPlayers(); // her render'da taze oku
    const list    = document.getElementById('default-players-list');
    list.innerHTML = current.map((p, i) => `
      <div class="flex gap-2">
        <input type="text" class="input flex-grow p-list-input" value="${esc(p)}" data-index="${i}" style="padding:8px 12px; font-size:0.9rem;" placeholder="Oyuncu adı">
        <button class="btn btn-ghost btn-sm p-list-del" data-index="${i}" title="Sil">✕</button>
      </div>
    `).join('');

    list.querySelectorAll('.p-list-input').forEach(input => {
      input.oninput = _debounce(e => {
        const cur = getDefaultPlayers();
        cur[+e.target.dataset.index] = e.target.value;
        saveDefaultPlayers(cur);
      });
    });

    list.querySelectorAll('.p-list-del').forEach(btn => {
      btn.onclick = () => {
        const cur = getDefaultPlayers();
        cur.splice(+btn.dataset.index, 1);
        saveDefaultPlayers(cur);
        renderPList();
        showToast('Oyuncu silindi', 'error');
      };
    });
  };

  document.getElementById('btn-add-p-def').onclick = () => {
    const cur = getDefaultPlayers();
    cur.push('');
    saveDefaultPlayers(cur);
    renderPList();
    // Focus the new input
    setTimeout(() => {
      const inputs = document.querySelectorAll('.p-list-input');
      inputs[inputs.length - 1]?.focus();
    }, 50);
  };

  renderPList();
}
