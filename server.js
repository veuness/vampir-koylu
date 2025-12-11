const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./game/RoomManager');
const gameManager = require('./game/GameManager');
const { PHASES } = require('./game/constants');

const app = express();
const server = http.createServer(app);

// Socket.io CORS ayarları - Plesk uyumlu
const io = new Server(server, {
    cors: {
        origin: [
            'https://vampir.pompamc.com',
            'http://vampir.pompamc.com',
            'http://localhost:5173',
            'http://localhost:3000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    },
    // Plesk Nginx uyumluluğu için polling + websocket
    transports: ['polling', 'websocket'],
    allowEIO3: true
});

// GameManager'a io instance'ı ver
gameManager.setIO(io);

// Online oyuncuları takip et
const onlinePlayers = new Map(); // socketId -> { id, name }

// Online oyuncu listesini yayınla
function broadcastOnlinePlayers() {
    const players = Array.from(onlinePlayers.values());
    io.emit('online_players', players);
}

// Statik dosyaları sun (React build)
app.use(express.static(path.join(__dirname, 'public')));

// API endpoint'leri
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

app.get('/api/rooms', (req, res) => {
    res.json(roomManager.getPublicRooms());
});

app.get('/api/online-count', (req, res) => {
    res.json({ count: onlinePlayers.size });
});

// SPA fallback - tüm diğer route'ları React'e yönlendir
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Socket.io bağlantı yönetimi
io.on('connection', (socket) => {
    console.log(`🔌 Yeni bağlantı: ${socket.id}`);

    // Oyuncu bilgisi
    let currentPlayer = {
        id: socket.id,
        name: null,
        roomCode: null
    };

    // İsim belirleme
    socket.on('set_name', (name, callback) => {
        if (!name || name.trim().length < 2) {
            callback({ success: false, error: 'İsim en az 2 karakter olmalı!' });
            return;
        }
        currentPlayer.name = name.trim().substring(0, 20);

        // Online oyunculara ekle
        onlinePlayers.set(socket.id, {
            id: socket.id,
            name: currentPlayer.name
        });
        broadcastOnlinePlayers();

        callback({ success: true, name: currentPlayer.name });
        console.log(`👤 İsim belirlendi: ${currentPlayer.name} (Online: ${onlinePlayers.size})`);
    });

    // Oda oluştur (config ile)
    socket.on('create_room', (config, callback) => {
        // Eski format desteği (callback ilk parametre olarak)
        if (typeof config === 'function') {
            callback = config;
            config = {};
        }

        if (!currentPlayer.name) {
            callback({ success: false, error: 'Önce isim belirlemelisin!' });
            return;
        }

        // Zaten bir odadaysa çık
        if (currentPlayer.roomCode) {
            roomManager.leaveRoom(currentPlayer.roomCode, socket.id);
            socket.leave(currentPlayer.roomCode);
        }

        const room = roomManager.createRoom(socket.id, currentPlayer.name, config || {});
        currentPlayer.roomCode = room.code;
        socket.join(room.code);

        callback({ success: true, roomCode: room.code, config: room.config });
        console.log(`🏠 Oda oluşturuldu: ${room.code} (${room.config.roomName}) by ${currentPlayer.name}`);

        // Oda listesini güncelle
        io.emit('rooms_updated', roomManager.getPublicRooms());
    });

    // Odaya katıl
    socket.on('join_room', (roomCode, callback) => {
        if (!currentPlayer.name) {
            callback({ success: false, error: 'Önce isim belirlemelisin!' });
            return;
        }

        const result = roomManager.joinRoom(roomCode.toUpperCase(), socket.id, currentPlayer.name);

        if (!result.success) {
            callback(result);
            return;
        }

        currentPlayer.roomCode = roomCode.toUpperCase();
        socket.join(currentPlayer.roomCode);

        callback({ success: true, roomCode: currentPlayer.roomCode, config: result.room.config });
        console.log(`🚪 ${currentPlayer.name} odaya katıldı: ${currentPlayer.roomCode}`);

        // Odadaki herkese bildir
        broadcastRoomUpdate(currentPlayer.roomCode);

        // Oda listesini güncelle
        io.emit('rooms_updated', roomManager.getPublicRooms());
    });

    // Odadan ayrıl
    socket.on('leave_room', (callback) => {
        if (!currentPlayer.roomCode) {
            callback({ success: false, error: 'Bir odada değilsin!' });
            return;
        }

        const roomCode = currentPlayer.roomCode;
        const room = roomManager.leaveRoom(roomCode, socket.id);

        socket.leave(roomCode);
        currentPlayer.roomCode = null;

        callback({ success: true });
        console.log(`🚶 ${currentPlayer.name} odadan ayrıldı: ${roomCode}`);

        // Oda hala varsa güncelle
        if (room) {
            broadcastRoomUpdate(roomCode);
        }

        // Oda listesini güncelle
        io.emit('rooms_updated', roomManager.getPublicRooms());
    });

    // Oyunu başlat (sadece host)
    socket.on('start_game', (callback) => {
        if (!currentPlayer.roomCode) {
            callback({ success: false, error: 'Bir odada değilsin!' });
            return;
        }

        const room = roomManager.getRoom(currentPlayer.roomCode);
        if (!room) {
            callback({ success: false, error: 'Oda bulunamadı!' });
            return;
        }

        if (room.hostId !== socket.id) {
            callback({ success: false, error: 'Sadece oda sahibi oyunu başlatabilir!' });
            return;
        }

        const result = gameManager.startGame(currentPlayer.roomCode);
        callback(result);

        if (result.success) {
            console.log(`🎮 Oyun başladı: ${currentPlayer.roomCode}`);
        }
    });

    // Gece aksiyonu (vampir/doktor/gozcu)
    socket.on('night_action', ({ targetId, actionType }, callback) => {
        if (!currentPlayer.roomCode) {
            callback({ success: false, error: 'Bir odada değilsin!' });
            return;
        }

        const result = gameManager.processNightAction(
            currentPlayer.roomCode,
            socket.id,
            targetId,
            actionType
        );

        callback(result);
    });

    // Oy ver
    socket.on('vote', (targetId, callback) => {
        if (!currentPlayer.roomCode) {
            callback({ success: false, error: 'Bir odada değilsin!' });
            return;
        }

        const result = gameManager.vote(currentPlayer.roomCode, socket.id, targetId);
        callback(result);
    });

    // Chat mesajı
    socket.on('chat_message', (message, callback) => {
        if (!currentPlayer.roomCode) {
            callback({ success: false, error: 'Bir odada değilsin!' });
            return;
        }

        if (!message || message.trim().length === 0) {
            callback({ success: false, error: 'Mesaj boş olamaz!' });
            return;
        }

        const result = gameManager.sendChatMessage(
            currentPlayer.roomCode,
            socket.id,
            message.trim().substring(0, 200)
        );

        callback(result);
    });

    // Oda listesi iste
    socket.on('get_rooms', (callback) => {
        callback(roomManager.getPublicRooms());
    });

    // Online oyuncuları iste
    socket.on('get_online_players', (callback) => {
        callback(Array.from(onlinePlayers.values()));
    });

    // Bağlantı koptuğunda
    socket.on('disconnect', () => {
        console.log(`🔌 Bağlantı koptu: ${socket.id} (${currentPlayer.name || 'Anonim'})`);

        // Online oyunculardan çıkar
        onlinePlayers.delete(socket.id);
        broadcastOnlinePlayers();

        if (currentPlayer.roomCode) {
            const room = roomManager.leaveRoom(currentPlayer.roomCode, socket.id);

            if (room) {
                broadcastRoomUpdate(currentPlayer.roomCode);

                // Eğer oyun devam ediyorsa, oyun durumunu güncelle
                if (room.phase !== PHASES.LOBBY && room.phase !== PHASES.ENDED) {
                    gameManager.broadcastGameState(currentPlayer.roomCode);

                    // Kazanan kontrolü
                    const winner = gameManager.checkWinCondition(currentPlayer.roomCode);
                    if (winner) {
                        gameManager.endGame(currentPlayer.roomCode, winner);
                    }
                }
            }

            // Oda listesini güncelle
            io.emit('rooms_updated', roomManager.getPublicRooms());
        }
    });

    // Oda durumunu yayınla
    function broadcastRoomUpdate(roomCode) {
        const room = roomManager.getRoom(roomCode);
        if (!room) return;

        const players = Array.from(room.players.values()).map(p => ({
            id: p.id,
            name: p.name,
            isHost: p.isHost
        }));

        io.to(roomCode).emit('room_updated', {
            code: room.code,
            hostId: room.hostId,
            config: room.config,
            players,
            phase: room.phase
        });
    }
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🧛 Vampir Köylü Sunucusu çalışıyor: http://localhost:${PORT}`);
    console.log(`📡 Socket.io bağlantıları dinleniyor...`);
});
