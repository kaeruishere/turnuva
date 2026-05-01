export const calculateFormScore = (playerId, matches) => {
    // Get last 3 matches where the player was involved AND scores are entered
    const playedMatches = matches
        .filter(m => (m.homeId === playerId || m.awayId === playerId) && m.homeScore !== null)
        .sort((a, b) => (b.playedAt || 0) - (a.playedAt || 0)) // Newest first
        .slice(0, 3);

    if (playedMatches.length === 0) return 3; // Default

    let score = 0;
    playedMatches.forEach(m => {
        const isHome = m.homeId === playerId;
        const myScore = isHome ? m.homeScore : m.awayScore;
        const opScore = isHome ? m.awayScore : m.homeScore;

        if (myScore > opScore) score += 3;
        else if (myScore === opScore) score += 1;
    });

    return score === 0 ? 3 : score;
};

export const getOdds = (fH, fA) => {
    const orta = ((fH + fA) / 2) * 0.75;
    const total = fH + fA + orta;

    const probH = fH / total;
    const probX = orta / total;
    const probA = fA / total;

    return {
        h: (1 / probH).toFixed(2),
        x: (1 / probX).toFixed(2),
        a: (1 / probA).toFixed(2)
    };
};
