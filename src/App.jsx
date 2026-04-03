import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import TournamentPage from './pages/TournamentPage';
import { LogOut } from 'lucide-react';
import './styles/global.css';

function AppShell() {
  const { currentUser, userProfile, logout } = useAuth();
  const [page, setPage] = useState('home');
  const [selectedTournament, setSelectedTournament] = useState(null);

  if (!currentUser) return <AuthPage />;

  const username = userProfile?.username || currentUser.displayName || 'Oyuncu';

  function selectTournament(id) {
    setSelectedTournament(id);
    setPage('tournament');
  }

  function goHome() {
    setPage('home');
    setSelectedTournament(null);
  }

  return (
    <div className="app-shell">
      <nav className="navbar">
        <a className="navbar-brand" onClick={goHome} style={{ cursor: 'pointer' }}>
          ⚽ <span>PES</span> LİGİ
        </a>
        <div className="navbar-actions">
          <span className="nav-user">{username}</span>
          <button className="btn btn-ghost btn-sm" onClick={logout} title="Çıkış Yap">
            <LogOut size={15} />
          </button>
        </div>
      </nav>

      <main className="main-content">
        {page === 'home' && <HomePage onSelectTournament={selectTournament} />}
        {page === 'tournament' && selectedTournament && (
          <TournamentPage tournamentId={selectedTournament} onBack={goHome} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
