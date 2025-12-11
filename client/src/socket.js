import { io } from 'socket.io-client';

// Dinamik URL - development vs production
const getSocketURL = () => {
    // Production'da aynı domain kullan
    if (window.location.hostname !== 'localhost') {
        return window.location.origin;
    }
    // Development'ta backend server'a bağlan
    return 'http://localhost:3000';
};

// Socket.io client instance
const socket = io(getSocketURL(), {
    // Plesk Nginx uyumluluğu için polling + websocket
    transports: ['polling', 'websocket'],
    // Otomatik yeniden bağlanma
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    // Timeout ayarları
    timeout: 20000,
    // Credentials
    withCredentials: true
});

// Bağlantı event'leri
socket.on('connect', () => {
    console.log('🔌 Sunucuya bağlandı:', socket.id);
});

socket.on('disconnect', (reason) => {
    console.log('🔌 Bağlantı koptu:', reason);
});

socket.on('connect_error', (error) => {
    console.error('🔌 Bağlantı hatası:', error.message);
});

socket.on('reconnect', (attemptNumber) => {
    console.log('🔌 Yeniden bağlandı (deneme:', attemptNumber, ')');
});

socket.on('reconnect_attempt', (attemptNumber) => {
    console.log('🔌 Yeniden bağlanmaya çalışılıyor...', attemptNumber);
});

export default socket;
