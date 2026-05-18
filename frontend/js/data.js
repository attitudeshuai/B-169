// State Management
const DataManager = {
    state: {
        participants: [],
        winners: [],
        prizes: [
            { id: '1', name: '特等奖', count: 1 },
            { id: '2', name: '一等奖', count: 3 },
            { id: '3', name: '二等奖', count: 5 }
        ],
        currentPrizeId: '1',
        bgImage: ''
    },

    init() {
        const saved = localStorage.getItem('lottery_state_v2');
        if (saved) {
            try {
                this.state = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load state", e);
            }
        }
    },

    save() {
        localStorage.setItem('lottery_state_v2', JSON.stringify(this.state));
    },

    getParticipants() {
        return this.state.participants;
    },

    addParticipants(list) {
        // De-duplicate
        const existingIds = new Set(this.state.participants.map(p => p.id));
        const newOnes = list.filter(p => !existingIds.has(p.id));
        this.state.participants.push(...newOnes);
        this.save();
        return newOnes.length;
    },

    clearData() {
        this.state.participants = [];
        this.state.winners = [];
        this.state.prizes = [
            { id: '1', name: '特等奖', count: 1 },
            { id: '2', name: '一等奖', count: 3 },
            { id: '3', name: '二等奖', count: 5 }
        ]; // 重置为默认奖项
        this.state.currentPrizeId = '1';
        this.save();
    },

    addWinner(participant, prizeId) {
        const winner = {
            ...participant,
            prizeId,
            wonAt: new Date().toISOString()
        };
        this.state.winners.push(winner);
        this.save();
        return winner;
    },

    getWinners() {
        return this.state.winners;
    },

    getRemainingParticipants() {
        const winnerIds = new Set(this.state.winners.map(w => w.id));
        return this.state.participants.filter(p => !winnerIds.has(p.id));
    },

    addPrize(name, count) {
        const id = 'prize_' + Date.now();
        this.state.prizes.push({ id, name, count });
        this.save();
    },

    setBackground(url) {
        this.state.bgImage = url;
        this.save();
    }
};
