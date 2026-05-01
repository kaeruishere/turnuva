// UI Helper Functions

export const showModal = (modalId) => {
    document.getElementById(modalId).style.display = 'flex';
};

export const hideModal = (modalId) => {
    document.getElementById(modalId).style.display = 'none';
};

export const setupModalClose = () => {
    document.querySelectorAll('.btn-close-modal').forEach(btn => {
        btn.onclick = (e) => {
            const modal = e.target.closest('.modal-overlay');
            if (modal) modal.style.display = 'none';
        };
    });
};

export const renderTournamentCard = (tournament) => {
    const statusLabel = {
        'waiting': 'Bekliyor',
        'active': 'Devam Ediyor',
        'finished': 'Tamamlandı'
    };

    const statusColor = {
        'waiting': 'var(--secondary)',
        'active': 'var(--primary)',
        'finished': 'var(--text-muted)'
    };

    return `
        <div class="card tournament-card" data-id="${tournament.id}" data-has-pass="${!!tournament.password}">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                <div>
                    <h3 style="margin-bottom: 0.2rem;">${tournament.name}</h3>
                    <p style="font-size: 0.8rem; color: var(--text-muted);">Kod: ${tournament.code}</p>
                </div>
                <span style="font-size: 0.7rem; padding: 0.2rem 0.6rem; border-radius: 20px; background: ${statusColor[tournament.status]}33; color: ${statusColor[tournament.status]}; border: 1px solid ${statusColor[tournament.status]}66;">
                    ${statusLabel[tournament.status]}
                </span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.9rem; color: var(--text-muted);">${tournament.participants.length} Katılımcı</span>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.joinFromList('${tournament.id}', ${!!tournament.password}, '${tournament.name}')">
                    ${tournament.password ? '🔑 Katıl' : 'Giriş Yap'}
                </button>
            </div>
        </div>
    `;
};
