import { db, state, saveSession } from './app.js';
import { showToast } from './ui.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function renderLogin(onSuccess) {
  document.getElementById('root').innerHTML = `
    <div class="login-wrap">
      <div class="login-box">
        <div class="login-logo">⚽ <span>PES</span> LİGİ</div>
        <div class="login-sub">Kanka moduna giriş yap</div>
        <div class="login-err hidden" id="login-err">Kullanıcı adı veya şifre hatalı.</div>
        <div class="fi-group">
          <label class="fi-label">Kullanıcı Adı</label>
          <input class="fi" id="inp-user" placeholder="kullaniciadi" autocomplete="username" />
        </div>
        <div class="fi-group" style="margin-bottom:20px">
          <label class="fi-label">Şifre</label>
          <input class="fi" id="inp-pass" type="password" placeholder="••••••••" autocomplete="current-password" />
        </div>
        <button class="btn btn-primary btn-full" id="btn-login">Giriş Yap</button>
      </div>
    </div>
  `;

  const tryLogin = async () => {
    const u = document.getElementById('inp-user').value.trim().toLowerCase();
    const p = document.getElementById('inp-pass').value;
    if (!u || !p) return;

    const btn = document.getElementById('btn-login');
    btn.textContent = '...'; btn.disabled = true;

    try {
      const snap = await getDoc(doc(db, 'users', u));
      if (!snap.exists() || snap.data().password !== p) {
        document.getElementById('login-err').classList.remove('hidden');
        btn.textContent = 'Giriş Yap'; btn.disabled = false;
        return;
      }
      state.user = { username: u, ...snap.data() };
      saveSession(state.user);
      onSuccess();
    } catch (e) {
      console.error(e);
      btn.textContent = 'Giriş Yap'; btn.disabled = false;
    }
  };

  document.getElementById('btn-login').onclick = tryLogin;
  document.getElementById('inp-pass').onkeydown = e => { if (e.key === 'Enter') tryLogin(); };
  document.getElementById('inp-user').onkeydown = e => { if (e.key === 'Enter') document.getElementById('inp-pass').focus(); };
}
