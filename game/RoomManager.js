const { v4: uuidv4 } = require('uuid');
const { PHASES, ROLES, ROLE_DISTRIBUTION, TIMERS } = require('./constants');

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    // 6 karakterlik benzersiz oda kodu oluştur
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code;
        do {
            code = '';
            for (let i = 0; i < 6; i++) {
                code += chars.charAt(Math.floor(Math.random() * chars.length));
            }
        } while (this.rooms.has(code));
        return code;
    }

    // Yeni oda oluştur
    createRoom(hostId, hostName) {
        const roomCode = this.generateRoomCode();
        const room = {
            code: roomCode,
            hostId: hostId,
            players: new Map(),
            phase: PHASES.LOBBY,
            round: 0,
            votes: new Map(),
            nightActions: {
                vampirTarget: null,
                buyucuTarget: null
            },
            chat: [],
            deadPlayers: new Set(),
            createdAt: Date.now()
        };

        // Host'u odaya ekle
        room.players.set(hostId, {
            id: hostId,
            name: hostName,
            role: null,
            isAlive: true,
            isHost: true
        });

        this.rooms.set(roomCode, room);
        return room;
    }

    // Odaya katıl
    joinRoom(roomCode, playerId, playerName) {
        const room = this.rooms.get(roomCode);

        if (!room) {
            return { success: false, error: 'Oda bulunamadı!' };
        }

        if (room.phase !== PHASES.LOBBY) {
            return { success: false, error: 'Oyun zaten başlamış!' };
        }

        if (room.players.size >= 12) {
            return { success: false, error: 'Oda dolu! (Maksimum 12 oyuncu)' };
        }

        // İsim kontrolü
        const existingNames = Array.from(room.players.values()).map(p => p.name.toLowerCase());
        if (existingNames.includes(playerName.toLowerCase())) {
            return { success: false, error: 'Bu isim zaten kullanılıyor!' };
        }

        room.players.set(playerId, {
            id: playerId,
            name: playerName,
            role: null,
            isAlive: true,
            isHost: false
        });

        return { success: true, room };
    }

    // Odadan ayrıl
    leaveRoom(roomCode, playerId) {
        const room = this.rooms.get(roomCode);

        if (!room) return null;

        const player = room.players.get(playerId);
        if (!player) return null;

        room.players.delete(playerId);

        // Eğer host ayrılırsa ve başka oyuncu varsa, yeni host ata
        if (player.isHost && room.players.size > 0) {
            const newHost = room.players.values().next().value;
            newHost.isHost = true;
            room.hostId = newHost.id;
        }

        // Oda boşsa sil
        if (room.players.size === 0) {
            this.rooms.delete(roomCode);
            return null;
        }

        return room;
    }

    // Oda bilgisi al
    getRoom(roomCode) {
        return this.rooms.get(roomCode);
    }

    // Oyuncunun bulunduğu odayı bul
    findPlayerRoom(playerId) {
        for (const [code, room] of this.rooms) {
            if (room.players.has(playerId)) {
                return room;
            }
        }
        return null;
    }

    // Tüm odaları listele (lobby'deki)
    getPublicRooms() {
        const publicRooms = [];
        for (const [code, room] of this.rooms) {
            if (room.phase === PHASES.LOBBY) {
                publicRooms.push({
                    code: room.code,
                    playerCount: room.players.size,
                    hostName: room.players.get(room.hostId)?.name || 'Bilinmiyor',
                    maxPlayers: 12
                });
            }
        }
        return publicRooms;
    }

    // Rol dağıtımı
    assignRoles(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return false;

        const playerCount = room.players.size;

        // Minimum 4 oyuncu gerekli
        if (playerCount < 4) {
            return { success: false, error: 'Minimum 4 oyuncu gerekli!' };
        }

        // Rol dağılımını al (12'den fazla için 12 kullan)
        const distribution = ROLE_DISTRIBUTION[Math.min(playerCount, 12)] || ROLE_DISTRIBUTION[12];

        // Rolleri oluştur
        const roles = [];
        for (let i = 0; i < distribution.vampir; i++) roles.push(ROLES.VAMPIR);
        for (let i = 0; i < distribution.buyucu; i++) roles.push(ROLES.BUYUCU);
        for (let i = 0; i < distribution.koylu; i++) roles.push(ROLES.KOYLU);

        // Eksik rolleri köylü olarak doldur
        while (roles.length < playerCount) {
            roles.push(ROLES.KOYLU);
        }

        // Rolleri karıştır
        for (let i = roles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [roles[i], roles[j]] = [roles[j], roles[i]];
        }

        // Rolleri oyunculara ata
        let roleIndex = 0;
        for (const player of room.players.values()) {
            player.role = roles[roleIndex++];
            player.isAlive = true;
        }

        return { success: true };
    }

    // Odayı sil
    deleteRoom(roomCode) {
        this.rooms.delete(roomCode);
    }
}

module.exports = new RoomManager();
