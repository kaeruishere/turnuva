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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
        <h3 style="font-family:'Bebas Neue';font-size:1.3rem;letter-spacing:.06em">⚙️ AYARLAR</h3>
        <button class="btn btn-ghost btn-sm" id="s-close">✕</button>
      </div>

      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);margin-bottom:10px">Kural Ayarları</div>
      <label style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:var(--el);border:1px solid var(--border-hi);border-radius:10px;cursor:pointer;margin-bottom:22px;gap:12px">
        <div>
          <div style="font-size:.88rem;font-weight:600;margin-bottom:3px">🟥 Kırmızı Kart Averaj Düşürür</div>
          <div style="font-size:.74rem;color:var(--text2)">Her kırmızı kart gol averajını -1 azaltır</div>
        </div>
        <input type="checkbox" id="chk-redcard" ${currentRedCard?'checked':''} style="width:18px;height:18px;accent-color:var(--accent);cursor:pointer;flex-shrink:0">
      </label>

      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);margin-bottom:10px">Aktif Turnuva</div>
      <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:22px">
        <button class="btn btn-danger btn-full" id="btn-end-t" ${!activeTId?'disabled':''}>🏁 Turnuvayı Bitir</button>
        <button class="btn btn-secondary btn-full" id="btn-delete-t" ${!activeTId?'disabled':''}>🗑️ Turnuvayı Sil</button>
      </div>

      <div style="font-size:.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:var(--text2);margin-bottom:10px">Son Bitirilen Turnuva</div>
      ${lastDoneTId ? `
        <div style="background:var(--el);border:1px solid var(--border-hi);border-radius:10px;padding:11px 13px;margin-bottom:10px">
          <div style="font-size:.82rem;font-weight:600;margin-bottom:2px">${lastDoneName}</div>
          <div style="font-size:.72rem;color:var(--text2)">Yanlışlıkla bitirdiysen geri alabilirsin</div>
        </div>
        <button class="btn btn-secondary btn-full" id="btn-reopen-t">↩ Turnuvayı Tekrar Başlat</button>
      ` : `<div style="font-size:.82rem;color:var(--text3)">Bitirilen turnuva yok</div>`}
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
