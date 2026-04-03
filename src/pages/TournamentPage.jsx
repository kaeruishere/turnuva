import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getTournament, getTournamentMatches, generateFixture,
  submitMatchResult, confirmMatchResult, disputeMatchResult,
  calculateStandings, getH2H
} from '../services/tournamentService';
import {
  ArrowLeft, Trophy, Calendar, BarChart2, Swords, Settings,
  CheckCircle, XCircle, Clock, AlertTriangle, Copy, Check,
  Shield, Zap
} from 'lucide-react';

export default function TournamentPage({ tournamentId, onBack }) {
  const { currentUser, userProfile } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('standings');
  const [matchModal, setMatchModal] = useState(null);
  const [h2hPlayer, setH2hPlayer] = useState(null);
  const [copied, setCopied] = useState(false);

  const username = userProfile?.username || currentUser?.displayName || '';

  useEffect(() => { load(); }, [tournamentId]);

  async function load() {
    setLoading(true);
    try {
      const [t, m] = await Promise.all([getTournament(tournamentId), getTournamentMatches(tournamentId)]);
      setTournament(t);
      setMatches(m);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) return <div className="spinner" />;
  if (!tournament) return <div className="empty-state"><p>Turnuva bulunamadı</p></div>;

  const isAdmin = tournament.adminUid === currentUser.uid;
  const standings = calculateStandings(tournament.players || [], matches);
  const myUid = currentUser.uid;

  const tabs = [
    { id: 'standings', label: 'Puan', icon: Trophy },
    { id: 'fixtures', label: 'Maçlar', icon: Calendar },
    { id: 'stats', label: 'İstat', icon: BarChart2 },
    { id: 'h2h', label: 'H2H', icon: Swords },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin', icon: Settings }] : []),
  ];

  function copyCode() {
    navigator.clipboard.writeText(tournament.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack} style={{ marginBottom: '12px', paddingLeft: '6px' }}>
          <ArrowLeft size={16} /> Geri
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
          <div>
            <div className="accent-line" />
            <h1 style={{ fontFamily: 'Bebas Neue', fontSize: '1.6rem', letterSpacing: '0.06em', lineHeight: 1.1 }}>
              {tournament.name.toUpperCase()}
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
              {tournament.status === 'waiting' && <span className="badge badge-yellow">Bekleniyor</span>}
              {tournament.status === 'active' && <span className="badge badge-green">⚡ Aktif</span>}
              {tournament.status === 'finished' && <span className="badge badge-gray">Tamamlandı</span>}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {tournament.players?.length || 0} oyuncu
              </span>
            </div>
          </div>
          {tournament.status === 'waiting' && (
            <button
              onClick={copyCode}
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent-glow)',
                borderRadius: '10px',
                padding: '8px 12px',
                cursor: 'pointer',
                textAlign: 'center',
                flexShrink: 0,
              }}
            >
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.3rem', letterSpacing: '0.2em', color: 'var(--accent)' }}>
                {tournament.joinCode}
              </div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                {copied ? <><Check size={9} /> Kopyalandı</> : <><Copy size={9} /> Kopyala</>}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'standings' && <StandingsTab standings={standings} />}
      {tab === 'fixtures' && (
        <FixturesTab
          matches={matches}
          myUid={myUid}
          tournament={tournament}
          onAction={(match) => setMatchModal(match)}
          onConfirm={async (id) => { await confirmMatchResult(id); load(); }}
          onDispute={async (id) => { await disputeMatchResult(id); load(); }}
        />
      )}
      {tab === 'stats' && <StatsTab standings={standings} matches={matches} players={tournament.players} />}
      {tab === 'h2h' && (
        <H2HTab
          players={tournament.players}
          matches={matches}
          myUid={myUid}
        />
      )}
      {tab === 'admin' && isAdmin && (
        <AdminTab
          tournament={tournament}
          matches={matches}
          onAction={load}
        />
      )}

      {/* Match Result Modal */}
      {matchModal && (
        <MatchResultModal
          match={matchModal}
          myUid={myUid}
          onClose={() => setMatchModal(null)}
          onSubmit={async (homeG, awayG, homeR, awayR, deductH, deductA) => {
            await submitMatchResult(matchModal.id, myUid, homeG, awayG, homeR, awayR, deductH, deductA);
            setMatchModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

// ─── STANDINGS TAB ────────────────────────────────────────────────────────────

function StandingsTab({ standings }) {
  if (standings.length === 0) return (
    <div className="empty-state"><div className="empty-state-icon">🏆</div><p>Henüz puan tablosu yok</p></div>
  );

  return (
    <div className="card">
      <div style={{ overflowX: 'auto' }}>
        <table className="standings-table">
          <thead>
            <tr>
              <th>#</th>
              <th style={{ textAlign: 'left' }}>Oyuncu</th>
              <th>O</th>
              <th>G</th>
              <th>B</th>
              <th>M</th>
              <th>GA</th>
              <th>Av</th>
              <th style={{ color: 'var(--accent)' }}>P</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((p, i) => (
              <tr key={p.uid}>
                <td>
                  <span className={`rank-badge rank-${i < 3 ? i + 1 : 'other'}`}>{i + 1}</span>
                </td>
                <td>
                  <div className="player-cell">
                    <div className="player-avatar">{p.username[0]}</div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.username}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.played}</td>
                <td style={{ color: 'var(--accent)' }}>{p.won}</td>
                <td style={{ color: 'var(--text-secondary)' }}>{p.drawn}</td>
                <td style={{ color: 'var(--red)' }}>{p.lost}</td>
                <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>{p.goalsFor}:{p.goalsAgainst}</td>
                <td style={{ color: p.goalDiff >= 0 ? 'var(--accent)' : 'var(--red)', fontSize: '0.85rem' }}>
                  {p.goalDiff > 0 ? '+' : ''}{p.goalDiff}
                </td>
                <td style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'Bebas Neue', letterSpacing: '0.05em' }}>
                  {p.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── FIXTURES TAB ─────────────────────────────────────────────────────────────

function FixturesTab({ matches, myUid, tournament, onAction, onConfirm, onDispute }) {
  const [filter, setFilter] = useState('all');

  const pending = matches.filter(m => m.status === 'pending' || m.status === 'disputed');
  const submitted = matches.filter(m => m.status === 'submitted');
  const confirmed = matches.filter(m => m.status === 'confirmed');

  const display = filter === 'all' ? matches :
                  filter === 'pending' ? [...pending, ...submitted] :
                  confirmed;

  if (matches.length === 0) return (
    <div className="empty-state"><div className="empty-state-icon">📅</div><p>Fikstür henüz oluşturulmadı</p></div>
  );

  function canSubmit(m) {
    return (m.status === 'pending' || m.status === 'disputed') &&
      (m.homeUid === myUid || m.awayUid === myUid);
  }

  function canConfirm(m) {
    return m.status === 'submitted' && m.submittedBy !== myUid &&
      (m.homeUid === myUid || m.awayUid === myUid);
  }

  return (
    <div>
      <div className="tabs" style={{ marginBottom: '16px' }}>
        <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>Tümü</button>
        <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
          Bekleyen {submitted.length > 0 && <span style={{ background: 'var(--red)', color: '#fff', borderRadius: '10px', padding: '0 5px', fontSize: '0.65rem', marginLeft: '4px' }}>{submitted.length}</span>}
        </button>
        <button className={`tab ${filter === 'done' ? 'active' : ''}`} onClick={() => setFilter('done')}>Tamamlanan</button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {display.map(m => (
          <MatchCard
            key={m.id}
            match={m}
            myUid={myUid}
            canSubmit={canSubmit(m)}
            canConfirm={canConfirm(m)}
            onSubmit={() => onAction(m)}
            onConfirm={() => onConfirm(m.id)}
            onDispute={() => onDispute(m.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match: m, myUid, canSubmit, canConfirm, onSubmit, onConfirm, onDispute }) {
  const isConfirmed = m.status === 'confirmed';
  const isSubmitted = m.status === 'submitted';
  const isDisputed = m.status === 'disputed';
  const isMyMatch = m.homeUid === myUid || m.awayUid === myUid;

  let statusEl = null;
  if (isConfirmed) statusEl = <span className="badge badge-green"><CheckCircle size={9} style={{ marginRight: '3px' }} />Onaylandı</span>;
  else if (isSubmitted) statusEl = <span className="badge badge-yellow"><Clock size={9} style={{ marginRight: '3px' }} />Onay Bekliyor</span>;
  else if (isDisputed) statusEl = <span className="badge badge-red"><AlertTriangle size={9} style={{ marginRight: '3px' }} />İtiraz</span>;
  else statusEl = <span className="badge badge-gray">Oynanmadı</span>;

  return (
    <div className="match-card" style={{
      flexDirection: 'column',
      alignItems: 'stretch',
      border: isMyMatch && !isConfirmed ? '1px solid var(--border-bright)' : undefined,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div className="match-team">
          <div className="player-avatar" style={{ margin: '0 auto 4px', width: '26px', height: '26px', fontSize: '0.65rem' }}>
            {m.homeName[0]}
          </div>
          <div className="match-team-name">{m.homeName}</div>
        </div>

        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          {isConfirmed || isSubmitted ? (
            <div className="match-score">
              <span>{m.homeGoals}</span>
              <span className="match-score-sep">—</span>
              <span>{m.awayGoals}</span>
            </div>
          ) : (
            <div className="match-vs">VS</div>
          )}
          {statusEl}
        </div>

        <div className="match-team">
          <div className="player-avatar" style={{ margin: '0 auto 4px', width: '26px', height: '26px', fontSize: '0.65rem' }}>
            {m.awayName[0]}
          </div>
          <div className="match-team-name">{m.awayName}</div>
        </div>
      </div>

      {/* Red card info */}
      {isConfirmed && (m.homeRedCards > 0 || m.awayRedCards > 0) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '6px' }}>
          {m.homeRedCards > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>
              🟥 {m.homeName}: {m.homeRedCards} {m.deductHomeRed ? '(averajdan düşüldü)' : ''}
            </span>
          )}
          {m.awayRedCards > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--red)' }}>
              🟥 {m.awayName}: {m.awayRedCards} {m.deductAwayRed ? '(averajdan düşüldü)' : ''}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      {(canSubmit || canConfirm) && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
          {canSubmit && (
            <button className="btn btn-primary btn-sm btn-full" onClick={onSubmit}>
              Sonuç Gir
            </button>
          )}
          {canConfirm && (
            <>
              <button className="btn btn-primary btn-sm" style={{ flex: 1 }} onClick={onConfirm}>
                <CheckCircle size={14} /> Onayla
              </button>
              <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={onDispute}>
                <XCircle size={14} /> İtiraz
              </button>
            </>
          )}
        </div>
      )}

      {isSubmitted && m.submittedBy === myUid && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '8px' }}>
          Rakibinin onayı bekleniyor...
        </p>
      )}
    </div>
  );
}

// ─── STATS TAB ────────────────────────────────────────────────────────────────

function StatsTab({ standings, matches, players }) {
  const confirmed = matches.filter(m => m.status === 'confirmed');

  const topScorer = [...standings].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const bestDefense = [...standings].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const mostRed = [...standings].sort((a, b) => b.redCards - a.redCards)[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Overview */}
      <div className="stat-grid">
        <div className="stat-box">
          <div className="stat-value">{confirmed.length}</div>
          <div className="stat-label">Maç</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{confirmed.reduce((s, m) => s + m.homeGoals + m.awayGoals, 0)}</div>
          <div className="stat-label">Toplam Gol</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ fontSize: '1.4rem' }}>
            {confirmed.length > 0
              ? (confirmed.reduce((s, m) => s + m.homeGoals + m.awayGoals, 0) / confirmed.length).toFixed(1)
              : '—'}
          </div>
          <div className="stat-label">Maç Başı Gol</div>
        </div>
        <div className="stat-box">
          <div className="stat-value" style={{ color: 'var(--red)' }}>
            {confirmed.reduce((s, m) => s + m.homeRedCards + m.awayRedCards, 0)}
          </div>
          <div className="stat-label">Kırmızı Kart</div>
        </div>
      </div>

      {/* Awards */}
      <div className="card">
        <div className="card-header"><span className="card-title">🏅 Liderler</span></div>
        <div style={{ padding: '0' }}>
          {[
            { label: '⚽ En Çok Gol', player: topScorer, value: `${topScorer?.goalsFor ?? 0} gol` },
            { label: '🛡️ En İyi Savunma', player: bestDefense, value: `${bestDefense?.goalsAgainst ?? 0} yenilen` },
            { label: '🟥 En Çok Kırmızı', player: mostRed, value: `${mostRed?.redCards ?? 0} kart` },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px 20px',
              borderBottom: i < 2 ? '1px solid var(--border)' : 'none',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>{item.label}</div>
                <div style={{ fontWeight: 700 }}>{item.player?.username ?? '—'}</div>
              </div>
              <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--accent)' }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Per player */}
      <div className="card">
        <div className="card-header"><span className="card-title">📊 Oyuncu Detay</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="standings-table">
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>Oyuncu</th>
                <th>Gol</th>
                <th>Yenilen</th>
                <th>Av</th>
                <th>🟥</th>
                <th>Galibiyet%</th>
              </tr>
            </thead>
            <tbody>
              {standings.map(p => (
                <tr key={p.uid}>
                  <td><div className="player-cell"><div className="player-avatar">{p.username[0]}</div>{p.username}</div></td>
                  <td style={{ color: 'var(--accent)' }}>{p.goalsFor}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{p.goalsAgainst}</td>
                  <td style={{ color: p.goalDiff >= 0 ? 'var(--accent)' : 'var(--red)' }}>
                    {p.goalDiff > 0 ? '+' : ''}{p.goalDiff}
                  </td>
                  <td style={{ color: 'var(--red)' }}>{p.redCards}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {p.played > 0 ? Math.round(p.won / p.played * 100) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── H2H TAB ──────────────────────────────────────────────────────────────────

function H2HTab({ players, matches, myUid }) {
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');

  const h2hMatches = p1 && p2 ? getH2H(p1, p2, matches) : [];

  let p1wins = 0, p2wins = 0, draws = 0;
  h2hMatches.forEach(m => {
    const hg = m.deductHomeRed ? Math.max(0, m.homeGoals - m.homeRedCards) : m.homeGoals;
    const ag = m.deductAwayRed ? Math.max(0, m.awayGoals - m.awayRedCards) : m.awayGoals;
    const isP1Home = m.homeUid === p1;
    const p1g = isP1Home ? hg : ag;
    const p2g = isP1Home ? ag : hg;
    if (p1g > p2g) p1wins++;
    else if (p2g > p1g) p2wins++;
    else draws++;
  });

  const p1name = players?.find(p => p.uid === p1)?.username || '';
  const p2name = players?.find(p => p.uid === p2)?.username || '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'center' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Oyuncu 1</label>
              <select className="form-input" value={p1} onChange={e => setP1(e.target.value)}>
                <option value="">Seç</option>
                {players?.filter(p => p.uid !== p2).map(p => (
                  <option key={p.uid} value={p.uid}>{p.username}</option>
                ))}
              </select>
            </div>
            <div style={{ fontFamily: 'Bebas Neue', fontSize: '1.2rem', color: 'var(--text-muted)', marginTop: '16px' }}>VS</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Oyuncu 2</label>
              <select className="form-input" value={p2} onChange={e => setP2(e.target.value)}>
                <option value="">Seç</option>
                {players?.filter(p => p.uid !== p1).map(p => (
                  <option key={p.uid} value={p.uid}>{p.username}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {p1 && p2 && (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'center' }}>
            <div className="stat-box" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--accent)' }}>{p1wins}</div>
              <div className="stat-label">{p1name}</div>
            </div>
            <div className="stat-box" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--text-secondary)' }}>{draws}</div>
              <div className="stat-label">Beraberlik</div>
            </div>
            <div className="stat-box" style={{ textAlign: 'center' }}>
              <div className="stat-value" style={{ color: 'var(--blue)' }}>{p2wins}</div>
              <div className="stat-label">{p2name}</div>
            </div>
          </div>

          {h2hMatches.length === 0 ? (
            <div className="empty-state"><p>Bu iki oyuncu henüz karşılaşmadı</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {h2hMatches.map(m => (
                <div key={m.id} className="match-card">
                  <div className="match-team">
                    <div className="match-team-name">{m.homeName}</div>
                  </div>
                  <div className="match-score">
                    {m.homeGoals}<span className="match-score-sep">—</span>{m.awayGoals}
                  </div>
                  <div className="match-team">
                    <div className="match-team-name">{m.awayName}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {!p1 && !p2 && (
        <div className="empty-state">
          <div className="empty-state-icon">⚔️</div>
          <p>İki oyuncu seç, karşılaşma geçmişini gör</p>
        </div>
      )}
    </div>
  );
}

// ─── ADMIN TAB ────────────────────────────────────────────────────────────────

function AdminTab({ tournament, matches, onAction }) {
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    if (tournament.players.length < 2) return alert('En az 2 oyuncu gerekli');
    if (!window.confirm(`${tournament.players.length} oyuncu için fikstür oluşturulsun mu? Bu işlem geri alınamaz.`)) return;
    setLoading(true);
    try {
      await generateFixture(tournament.id, tournament.players);
      onAction();
    } catch (e) { alert(e.message); }
    setLoading(false);
  }

  const hasFixture = matches.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Join code */}
      <div className="card">
        <div className="card-header"><span className="card-title">🔑 Join Kodu</span></div>
        <div className="card-body">
          <div className="join-code">{tournament.joinCode}</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textAlign: 'center' }}>
            Bu kodu arkadaşlarınla paylaş
          </p>
        </div>
      </div>

      {/* Players */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">👥 Oyuncular ({tournament.players?.length})</span>
        </div>
        <div style={{ padding: '0' }}>
          {tournament.players?.map((p, i) => (
            <div key={p.uid} style={{
              padding: '12px 20px',
              borderBottom: i < tournament.players.length - 1 ? '1px solid var(--border)' : 'none',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div className="player-avatar">{p.username[0]}</div>
              <span style={{ fontWeight: 600 }}>{p.username}</span>
              {p.uid === tournament.adminUid && <span className="badge badge-blue">Admin</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Generate fixture */}
      {!hasFixture && tournament.status === 'waiting' && (
        <div className="card">
          <div className="card-body">
            <h3 style={{ fontFamily: 'Bebas Neue', fontSize: '1.1rem', marginBottom: '8px' }}>⚡ Fikstür Oluştur</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Tüm oyuncular katıldıktan sonra lig fikstürünü oluştur. Her takım birbirleriyle 1 kez oynayacak.
            </p>
            <button className="btn btn-primary btn-full" onClick={handleGenerate} disabled={loading || tournament.players.length < 2}>
              {loading ? 'Oluşturuluyor...' : `Fikstürü Oluştur (${tournament.players.length} oyuncu)`}
            </button>
          </div>
        </div>
      )}

      {hasFixture && (
        <div className="alert alert-success">
          ✅ Fikstür oluşturuldu — {matches.length} maç
        </div>
      )}
    </div>
  );
}

// ─── MATCH RESULT MODAL ───────────────────────────────────────────────────────

function MatchResultModal({ match, myUid, onClose, onSubmit }) {
  const isHome = match.homeUid === myUid;
  const [hGoals, setHGoals] = useState('');
  const [aGoals, setAGoals] = useState('');
  const [hRed, setHRed] = useState(0);
  const [aRed, setARed] = useState(0);
  const [deductH, setDeductH] = useState(false);
  const [deductA, setDeductA] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (hGoals === '' || aGoals === '') return;
    setLoading(true);
    await onSubmit(parseInt(hGoals), parseInt(aGoals), hRed, aRed, deductH, deductA);
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">
          Maç Sonucu
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="player-avatar" style={{ margin: '0 auto 4px' }}>{match.homeName[0]}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{match.homeName}</div>
          </div>
          <div style={{ fontFamily: 'Bebas Neue', fontSize: '1rem', color: 'var(--text-muted)', letterSpacing: '0.1em' }}>VS</div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div className="player-avatar" style={{ margin: '0 auto 4px' }}>{match.awayName[0]}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{match.awayName}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '8px', alignItems: 'flex-end', marginBottom: '16px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{match.homeName}</label>
              <input className="form-input" type="number" min="0" max="99" value={hGoals}
                onChange={e => setHGoals(e.target.value)} placeholder="0" required
                style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'Bebas Neue' }} />
            </div>
            <div style={{ paddingBottom: '2px', color: 'var(--text-muted)', fontFamily: 'Bebas Neue', fontSize: '1.5rem' }}>—</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">{match.awayName}</label>
              <input className="form-input" type="number" min="0" max="99" value={aGoals}
                onChange={e => setAGoals(e.target.value)} placeholder="0" required
                style={{ textAlign: 'center', fontSize: '1.5rem', fontFamily: 'Bebas Neue' }} />
            </div>
          </div>

          {/* Red cards */}
          <div style={{ background: 'var(--bg-elevated)', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '12px' }}>
              🟥 Kırmızı Kartlar (Opsiyonel)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>{match.homeName}</label>
                <input className="form-input" type="number" min="0" max="11" value={hRed}
                  onChange={e => { setHRed(parseInt(e.target.value) || 0); if (!e.target.value) setDeductH(false); }}
                  style={{ textAlign: 'center' }} />
                {hRed > 0 && (
                  <label className="form-check" style={{ marginTop: '6px' }}>
                    <input type="checkbox" checked={deductH} onChange={e => setDeductH(e.target.checked)} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Averajdan düş</span>
                  </label>
                )}
              </div>
              <div>
                <label className="form-label" style={{ fontSize: '0.7rem' }}>{match.awayName}</label>
                <input className="form-input" type="number" min="0" max="11" value={aRed}
                  onChange={e => { setARed(parseInt(e.target.value) || 0); if (!e.target.value) setDeductA(false); }}
                  style={{ textAlign: 'center' }} />
                {aRed > 0 && (
                  <label className="form-check" style={{ marginTop: '6px' }}>
                    <input type="checkbox" checked={deductA} onChange={e => setDeductA(e.target.checked)} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Averajdan düş</span>
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="alert alert-info" style={{ fontSize: '0.78rem', marginBottom: '16px' }}>
            ℹ️ Rakibinin onayı gerekecek. Farklı sonuç girilirse itiraz açılır.
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'Gönderiliyor...' : 'Sonucu Gönder'}
          </button>
        </form>
      </div>
    </div>
  );
}
