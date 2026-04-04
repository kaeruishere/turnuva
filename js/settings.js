import { db, state } from './app.js';
import { showToast, openModal, closeModal } from './ui.js';
import {
  collection, query, where, getDocs, orderBy, limit,
  doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export async function openSettings(navigate) {
  let currentRedCard = false, activeTId = null, lastDoneTId = null, lastDoneName = '';

  try {
    const aq    = query(collection(db, 'tournaments'), where('status','==','active'));
    const aSnap = await getDocs(aq);
    if (!aSnap.empty) {
      activeTId      = aSnap.docs[0].id;
      currentRedCard = aSnap.docs[0].data().redCardPenalty === true;
    }
    const dq    = query(collection(db,'tournaments'), where('status','==','done'), orderBy('createdAt','desc'), limit(1));
    const dSnap = await getDocs(dq);
    if (!dSnap.empty) { lastDoneTId = dSnap.docs[0].id; lastDoneName = dSnap.docs[0].data().name; }
  } catch(e) {}

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
        <input type="checkbox" id="chk-redcard" ${currentRedCard?'checked':''} style="width:22px;height:22px;accent-color:var(--accent);cursor:pointer;flex-shrink:0;">
      </label>

      <div class="sec-label" style="border:none">Aktif Turnuva</div>
      <div class="flex flex-col gap-2 mb-5">
        <button class="btn btn-danger btn-full" id="btn-end-t" ${!activeTId?'disabled':''}>🏁 Turnuvayı Bitir</button>
        <button class="btn btn-secondary btn-full" id="btn-delete-t" ${!activeTId?'disabled':''}>🗑️ Turnuvayı Sil</button>
      </div>

      <div class="sec-label" style="border:none">Son Bitirilen Turnuva</div>
      ${lastDoneTId ? `
        <div style="background:var(--el-bg); border:1px solid var(--border-color); border-radius:var(--border-radius-md); padding:16px; margin-bottom:12px;">
          <div class="text-bold mb-1">${lastDoneName}</div>
          <div class="text-xs text-muted">Yanlışlıkla bitirdiysen geri alabilirsin</div>
        </div>
        <button class="btn btn-secondary btn-full" id="btn-reopen-t">↩ Turnuvayı Tekrar Başlat</button>
      ` : `<div class="text-sm text-muted text-center" style="padding:10px">Bitirilen turnuva yok</div>`}
    </div>
  `);

  document.getElementById('s-close').onclick = closeModal;

  document.getElementById('chk-redcard').onchange = async (e) => {
    if (!activeTId) { showToast('Aktif turnuva yok','error'); e.target.checked=!e.target.checked; return; }
    await updateDoc(doc(db,'tournaments',activeTId), { redCardPenalty: e.target.checked });
    showToast(e.target.checked ? '🟥 Kırmızı kart averaj düşürür' : '↩ Kırmızı kart etkisiz',
              e.target.checked ? 'success' : 'error');
  };

  document.getElementById('btn-end-t').onclick = async () => {
    if (!activeTId) return;
    if (!confirm('Aktif turnuvayı bitirmek istediğinden emin misin?')) return;
    await updateDoc(doc(db,'tournaments',activeTId), { status:'done' });
    closeModal(); showToast('✅ Turnuva bitirildi');
    if (state.page === 'detail') navigate('tournaments');
  };

  document.getElementById('btn-delete-t').onclick = async () => {
    if (!activeTId) return;
    if (!confirm('Aktif turnuva kalıcı silinecek!')) return;
    if (!confirm('Bu işlem geri alınamaz. Emin misin?')) return;
    const msSnap = await getDocs(collection(db, `tournaments/${activeTId}/matches`));
    await Promise.all(msSnap.docs.map(d => deleteDoc(doc(db, `tournaments/${activeTId}/matches`, d.id))));
    await deleteDoc(doc(db,'tournaments',activeTId));
    closeModal(); showToast('🗑️ Turnuva silindi','error');
    if (state.page === 'detail') navigate('tournaments');
  };

  const rb = document.getElementById('btn-reopen-t');
  if (rb) rb.onclick = async () => {
    if (activeTId) await updateDoc(doc(db,'tournaments',activeTId), { status:'done' });
    await updateDoc(doc(db,'tournaments',lastDoneTId), { status:'active' });
    closeModal(); showToast('✅ Turnuva tekrar başlatıldı');
  };
}
