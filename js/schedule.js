import { 
    collection, 
    writeBatch, 
    doc 
} from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";
import { db } from "./firebase-config.js";

const MATCHES_COL = "matches";

export const generateSchedule = (tournamentId, participants) => {
    let players = [...participants];
    if (players.length % 2 !== 0) {
        players.push({ uid: 'bye', name: 'BAY' });
    }

    const n = players.length;
    const rounds = n - 1;
    const matchesPerRound = n / 2;
    const schedule = [];

    // Circle Method
    for (let r = 0; r < rounds; r++) {
        const roundMatches = [];
        for (let i = 0; i < matchesPerRound; i++) {
            const home = players[i];
            const away = players[n - 1 - i];

            if (home.uid !== 'bye' && away.uid !== 'bye') {
                roundMatches.push({
                    tournamentId,
                    homeId: home.uid,
                    homeName: home.name,
                    awayId: away.uid,
                    awayName: away.name,
                    round: r + 1,
                    leg: 1,
                    homeScore: null,
                    awayScore: null,
                    notes: '',
                    status: 'pending'
                });
            }
        }
        schedule.push(...roundMatches);

        // Rotate players (except the first one)
        players.splice(1, 0, players.pop());
    }

    // Leg 2 (Rövanş)
    const leg2 = schedule.map(match => ({
        ...match,
        homeId: match.awayId,
        homeName: match.awayName,
        awayId: match.homeId,
        awayName: match.homeName,
        round: match.round + rounds,
        leg: 2
    }));

    return [...schedule, ...leg2];
};

export const saveScheduleToFirestore = async (tournamentId, matches) => {
    const batch = writeBatch(db);
    matches.forEach(match => {
        const newMatchRef = doc(collection(db, MATCHES_COL));
        batch.set(newMatchRef, {
            ...match,
            createdAt: new Date()
        });
    });
    
    // Also update tournament status to 'active'
    const tournamentRef = doc(db, "tournaments", tournamentId);
    batch.update(tournamentRef, { status: 'active' });

    await batch.commit();
};
