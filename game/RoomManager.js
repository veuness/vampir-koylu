const { PHASES, ROLES, ROLE_DISTRIBUTION, DEFAULT_ROOM_CONFIG } = require('./constants');

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

    // Yeni oda oluştur (config ile)
    createRoom(hostId, hostName, config = {}) {
        const roomCode = this.generateRoomCode();

        // Config'i varsayılanlarla birleştir
        const roomConfig = {
            roomName: config.roomName || DEFAULT_ROOM_CONFIG.roomName,
            maxPlayers: Math.min(Math.max(config.maxPlayers || DEFAULT_ROOM_CONFIG.maxPlayers, 4), 12),
            roles: {
                vampir: config.roles?.vampir ?? DEFAULT_ROOM_CONFIG.roles.vampir,
                doktor: config.roles?.doktor ?? DEFAULT_ROOM_CONFIG.roles.doktor,
                gozcu: config.roles?.gozcu ?? DEFAULT_ROOM_CONFIG.roles.gozcu,
                koylu: config.roles?.koylu ?? DEFAULT_ROOM_CONFIG.roles.koylu
            },
            timers: {
                day: config.timers?.day || DEFAULT_ROOM_CONFIG.timers.day,
                voting: config.timers?.voting || DEFAULT_ROOM_CONFIG.timers.voting
            }
        };

        const room = {
            code: roomCode,
            hostId: hostId,
            config: roomConfig,
            players: new Map(),
            phase: PHASES.LOBBY,
            round: 0,
            votes: new Map(),
            nightActions: {
                vampirTarget: null,
                doktorTarget: null,
                gozcuTarget: null,
                vampirVotes: new Map()
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

        if (room.players.size >= room.config.maxPlayers) {
            return { success: false, error: `Oda dolu! (Maksimum ${room.config.maxPlayers} oyuncu)` };
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
                    roomName: room.config.roomName,
                    playerCount: room.players.size,
                    hostName: room.players.get(room.hostId)?.name || 'Bilinmiyor',
                    maxPlayers: room.config.maxPlayers
                });
            }
        }
        return publicRooms;
    }

    // Rol dağıtımı (oda config'inden)
    assignRoles(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return { success: false, error: 'Oda bulunamadı!' };

        const playerCount = room.players.size;

        // Minimum 4 oyuncu gerekli
        if (playerCount < 4) {
            return { success: false, error: 'Minimum 4 oyuncu gerekli!' };
        }

        // Oda config'inden rol dağılımını al
        const config = room.config.roles;

        // Rolleri oluştur
        const roles = [];
        for (let i = 0; i < Math.min(config.vampir || 0, playerCount); i++) roles.push(ROLES.VAMPIR);
        for (let i = 0; i < Math.min(config.doktor || 0, playerCount - roles.length); i++) roles.push(ROLES.DOKTOR);
        for (let i = 0; i < Math.min(config.gozcu || 0, playerCount - roles.length); i++) roles.push(ROLES.GOZCU);
        for (let i = 0; i < Math.min(config.jester || 0, playerCount - roles.length); i++) roles.push(ROLES.JESTER);
        for (let i = 0; i < Math.min(config.eskort || 0, playerCount - roles.length); i++) roles.push(ROLES.ESKORT);
        for (let i = 0; i < Math.min(config.mezar_hirsizi || 0, playerCount - roles.length); i++) roles.push(ROLES.MEZAR_HIRSIZI);
        for (let i = 0; i < Math.min(config.medyum || 0, playerCount - roles.length); i++) roles.push(ROLES.MEDYUM);
        for (let i = 0; i < Math.min(config.intikamci || 0, playerCount - roles.length); i++) roles.push(ROLES.INTIKAMCI);

        // Geri kalanı köylü
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
