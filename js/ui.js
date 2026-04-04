// ─── TOAST ───
export function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 2800);
}

// ─── MODAL ───
export function openModal(html) {
  const o = document.getElementById('modal-overlay');
  o.innerHTML = html;
  o.classList.remove('hidden');
  return o;
}
export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ─── BOTTOM NAV ───
export function renderNav(activePage) {
  const tabs = [
    { id: 'tournaments', icon: '🏆', label: 'Turnuvalar' },
    { id: 'bets',        icon: '🎯', label: 'İddia'      },
    { id: 'results',     icon: '📊', label: 'Sonuçlar'   },
  ];
  return `
    <nav class="bottom-nav">
      ${tabs.map(t => `
        <button class="bnav-btn ${activePage === t.id ? 'active' : ''}" data-page="${t.id}">
          <span class="bnav-icon">${t.icon}</span>
          <span class="bnav-label">${t.label}</span>
        </button>
      `).join('')}
    </nav>
  `;
}

// ─── TOP NAV ───
export function renderTopNav(username) {
  return `
    <nav class="nav">
      <div class="nav-brand">⚽ <span>PES</span> LİGİ</div>
      <div class="nav-right">
        <span class="nav-user">${username}</span>
        <button class="btn btn-ghost btn-sm" id="btn-settings-nav">⚙️</button>
        <button class="btn btn-ghost btn-sm" id="btn-logout">Çıkış</button>
      </div>
    </nav>
  `;
}

// ─── SPINNER ───
export const SPIN = `<div class="spin"></div>`;

// ─── FORMAT DATE ───
export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}
