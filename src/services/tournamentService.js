import {
  collection, doc, addDoc, getDoc, getDocs, updateDoc, query,
  where, orderBy, serverTimestamp, arrayUnion, deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';

// ─── TOURNAMENTS ──────────────────────────────────────────────────────────────

export async function createTournament(adminUid, adminName, name) {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ref = await addDoc(collection(db, 'tournaments'), {
    name,
    adminUid,
    adminName,
    joinCode: code,
    status: 'waiting', // waiting | active | finished
    players: [{ uid: adminUid, username: adminName }],
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, code };
}

export async function joinTournament(code, uid, username) {
  const q = query(collection(db, 'tournaments'), where('joinCode', '==', code));
  const snap = await getDocs(q);
  if (snap.empty) throw new Error('Turnuva bulunamadı');
  const tDoc = snap.docs[0];
  const data = tDoc.data();
  if (data.status !== 'waiting') throw new Error('Turnuva zaten başladı');
  const already = data.players.find(p => p.uid === uid);
  if (already) throw new Error('Zaten katıldınız');
  await updateDoc(doc(db, 'tournaments', tDoc.id), {
    players: arrayUnion({ uid, username })
  });
  return tDoc.id;
}

export async function getTournament(id) {
  const snap = await getDoc(doc(db, 'tournaments', id));
  if (!snap.exists()) throw new Error('Turnuva bulunamadı');
  return { id: snap.id, ...snap.data() };
}

export async function getUserTournaments(uid) {
  const snap = await getDocs(collection(db, 'tournaments'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(t => t.players?.some(p => p.uid === uid));
}

// ─── FIXTURES ─────────────────────────────────────────────────────────────────

export async function generateFixture(tournamentId, players) {
  const matches = [];
  // Round-robin
  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      matches.push({
        tournamentId,
        homeUid: players[i].uid,
        homeName: players[i].username,
        awayUid: players[j].uid,
        awayName: players[j].username,
        status: 'pending', // pending | submitted | confirmed | disputed
        homeGoals: null,
        awayGoals: null,
        homeRedCards: 0,
        awayRedCards: 0,
        deductHomeRed: false,
        deductAwayRed: false,
        submittedBy: null,
        submittedAt: null,
        confirmedAt: null,
        round: null,
        createdAt: serverTimestamp(),
      });
    }
  }
  const batch = matches.map(m => addDoc(collection(db, 'matches'), m));
  await Promise.all(batch);

  await updateDoc(doc(db, 'tournaments', tournamentId), { status: 'active' });
}

export async function getTournamentMatches(tournamentId) {
  const q = query(
    collection(db, 'matches'),
    where('tournamentId', '==', tournamentId)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ─── MATCH RESULT ─────────────────────────────────────────────────────────────

export async function submitMatchResult(matchId, submitterUid, homeGoals, awayGoals, homeRed, awayRed, deductHome, deductAway) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'submitted',
    homeGoals,
    awayGoals,
    homeRedCards: homeRed,
    awayRedCards: awayRed,
    deductHomeRed: deductHome,
    deductAwayRed: deductAway,
    submittedBy: submitterUid,
    submittedAt: serverTimestamp(),
  });
}

export async function confirmMatchResult(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'confirmed',
    confirmedAt: serverTimestamp(),
  });
}

export async function disputeMatchResult(matchId) {
  await updateDoc(doc(db, 'matches', matchId), {
    status: 'disputed',
  });
}

// ─── STANDINGS ────────────────────────────────────────────────────────────────

export function calculateStandings(players, matches) {
  const table = {};
  players.forEach(p => {
    table[p.uid] = {
      uid: p.uid,
      username: p.username,
      played: 0, won: 0, drawn: 0, lost: 0,
      goalsFor: 0, goalsAgainst: 0, goalDiff: 0,
      redCards: 0, points: 0,
    };
  });

  matches.filter(m => m.status === 'confirmed').forEach(m => {
    const h = table[m.homeUid];
    const a = table[m.awayUid];
    if (!h || !a) return;

    let hGoals = m.homeGoals;
    let aGoals = m.awayGoals;

    // Red card deduction
    if (m.deductHomeRed) hGoals = Math.max(0, hGoals - m.homeRedCards);
    if (m.deductAwayRed) aGoals = Math.max(0, aGoals - m.awayRedCards);

    h.played++; a.played++;
    h.goalsFor += hGoals; h.goalsAgainst += aGoals;
    a.goalsFor += aGoals; a.goalsAgainst += hGoals;
    h.redCards += m.homeRedCards; a.redCards += m.awayRedCards;

    if (hGoals > aGoals) { h.won++; h.points += 3; a.lost++; }
    else if (hGoals < aGoals) { a.won++; a.points += 3; h.lost++; }
    else { h.drawn++; h.points++; a.drawn++; a.points++; }
  });

  return Object.values(table)
    .map(p => ({ ...p, goalDiff: p.goalsFor - p.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor);
}

// ─── HEAD TO HEAD ─────────────────────────────────────────────────────────────

export function getH2H(uid1, uid2, matches) {
  return matches.filter(
    m => m.status === 'confirmed' &&
    ((m.homeUid === uid1 && m.awayUid === uid2) ||
     (m.homeUid === uid2 && m.awayUid === uid1))
  );
}
