import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createTournament, joinTournament, getUserTournaments } from '../services/tournamentService';
import { Plus, Hash, Trophy, ChevronRight, Users, Clock } from 'lucide-react';

export default function HomePage({ onSelectTournament }) {
  const { currentUser, userProfile } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // 'create' | 'join'
  const [form, setForm] = useState({ name: '', code: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const username = userProfile?.username || currentUser?.displayName || 'Oyuncu';

  useEffect(() => {
    loadTournaments();
  }, []);

  async function loadTournaments() {
    setLoading(true);
    try {
      const list = await getUserTournaments(currentUser.uid);
      setTournaments(list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const { id, code } = await createTournament(currentUser.uid, username, form.name);
      await loadTournaments();
      setModal(null);
      setForm({ name: '', code: '' });
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  }

  async function handleJoin(e) {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      await joinTournament(form.code.toUpperCase(), currentUser.uid, username);
      await loadTournaments();
      setModal(null);
      setForm({ name: '', code: '' });
    } catch (err) { setError(err.message); }
    setSubmitting(false);
  }

  const statusLabel = {
    waiting: { label: 'Bekleniyor', cls: 'badge-yellow' },
    active: { label: 'Aktif', cls: 'badge-green' },
    finished: { label: 'Bitti', cls: 'badge-gray' },
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div className="accent-line" />
        <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.8rem', letterSpacing: '0.06em' }}>
          HOŞ GELDİN, <span style={{ color: 'var(--accent)' }}>{username.toUpperCase()}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '4px' }}>
          Turnuvalarını yönet ve takip et
        </p>
      </div>

      {/* Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '28px' }}>
        <button className="btn btn-primary btn-lg" onClick={() => { setModal('create'); setError(''); }}>
          <Plus size={18} /> Turnuva Oluştur
        </button>
        <button className="btn btn-secondary btn-lg" onClick={() => { setModal('join'); setError(''); }}>
          <Hash size={18} /> Katıl
        </button>
      </div>

      {/* Tournaments */}
      <div className="section-title">
        <Trophy size={16} style={{ color: 'var(--accent)' }} />
        Turnuvalarım
      </div>

      {loading ? (
        <div className="spinner" />
      ) : tournaments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">⚽</div>
          <p>Henüz bir turnuvan yok.</p>
          <p style={{ marginTop: '6px' }}>Oluştur veya join kodu ile katıl!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tournaments.map(t => {
            const s = statusLabel[t.status] || statusLabel.waiting;
            const isAdmin = t.adminUid === currentUser.uid;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTournament(t.id)}
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                  textAlign: 'left',
                  width: '100%',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--border-bright)';
                  e.currentTarget.style.background = 'var(--bg-elevated)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg-card)';
                }}
              >
                <div style={{
                  width: '40px', height: '40px',
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent-glow)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Trophy size={18} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </span>
                    {isAdmin && <span className="badge badge-blue" style={{ fontSize: '0.6rem' }}>ADMİN</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`badge ${s.cls}`}>{s.label}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Users size={11} /> {t.players?.length || 0} oyuncu
                    </span>
                    {t.status === 'waiting' && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'Bebas Neue', letterSpacing: '0.1em' }}>
                        {t.joinCode}
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {modal === 'create' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Yeni Turnuva
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label">Turnuva Adı</label>
                <input
                  className="form-input"
                  placeholder="Örn: Kuzin Ligi 2025"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                  autoFocus
                />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '16px' }}>
                Turnuva oluşturulunca bir join kodu alacaksın. Oyuncular bu kodla katılabilir.
              </p>
              <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
                {submitting ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Join Modal */}
      {modal === 'join' && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Turnuvaya Katıl
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)}>✕</button>
            </div>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label">Join Kodu</label>
                <input
                  className="form-input"
                  placeholder="ABC123"
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                  autoFocus
                  style={{ textTransform: 'uppercase', letterSpacing: '0.2em', fontSize: '1.1rem' }}
                  maxLength={6}
                />
              </div>
              <button className="btn btn-primary btn-full" type="submit" disabled={submitting}>
                {submitting ? 'Katılıyor...' : 'Katıl'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
