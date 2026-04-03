import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Trophy } from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [form, setForm] = useState({ email: '', password: '', username: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        if (!form.username.trim()) { setError('Kullanıcı adı gerekli'); setLoading(false); return; }
        await register(form.email, form.password, form.username.trim());
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Bu email zaten kayıtlı',
        'auth/invalid-email': 'Geçersiz email',
        'auth/weak-password': 'Şifre en az 6 karakter olmalı',
        'auth/user-not-found': 'Kullanıcı bulunamadı',
        'auth/wrong-password': 'Yanlış şifre',
        'auth/invalid-credential': 'Email veya şifre hatalı',
      };
      setError(msgs[err.code] || 'Bir hata oluştu');
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed',
        top: '20%', left: '50%',
        transform: 'translateX(-50%)',
        width: '400px', height: '400px',
        background: 'radial-gradient(circle, rgba(0,229,160,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '56px', height: '56px',
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent-glow)',
            borderRadius: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Trophy size={26} color="var(--accent)" />
          </div>
          <h1 style={{
            fontFamily: 'Bebas Neue',
            fontSize: '2.2rem',
            letterSpacing: '0.1em',
          }}>
            PES <span style={{ color: 'var(--accent)' }}>LİGİ</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            Turnuva takip platformu
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div style={{ padding: '24px' }}>
            {/* Mode toggle */}
            <div className="tabs" style={{ marginBottom: '20px' }}>
              <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>
                Giriş Yap
              </button>
              <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>
                Kayıt Ol
              </button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Kullanıcı Adı</label>
                  <input
                    className="form-input"
                    placeholder="kanka123"
                    value={form.username}
                    onChange={e => set('username', e.target.value)}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="sen@email.com"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Şifre</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  required
                />
              </div>

              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? 'Bekle...' : mode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
              </button>
            </form>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '20px' }}>
          PES Ligi © 2025
        </p>
      </div>
    </div>
  );
}
