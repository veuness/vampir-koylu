import { useState, useEffect, useCallback } from 'react';
import socket from './socket';
import WelcomeScreen from './components/WelcomeScreen';
import LobbyScreen from './components/LobbyScreen';
import WaitingRoom from './components/WaitingRoom';
import GameScreen from './components/GameScreen';
import OnlinePlayersPanel from './components/OnlinePlayersPanel';
import CharactersModal from './components/CharactersModal';

// Oyun ekranları
const SCREENS = {
    WELCOME: 'welcome',
    LOBBY: 'lobby',
    WAITING_ROOM: 'waiting_room',
    GAME: 'game'
};

function App() {
    // Ekran durumu
    const [screen, setScreen] = useState(SCREENS.WELCOME);

    // Oyuncu bilgisi
    const [playerName, setPlayerName] = useState('');
    const [playerId, setPlayerId] = useState(null);

    // Oda bilgisi
    const [roomCode, setRoomCode] = useState(null);
    const [roomData, setRoomData] = useState(null);

    // Oyun durumu
    const [gameState, setGameState] = useState(null);
    const [myRole, setMyRole] = useState(null);
    const [teammates, setTeammates] = useState([]);

    // Timer
    const [timer, setTimer] = useState({ remaining: 0, total: 0 });

    // Chat
    const [messages, setMessages] = useState([]);
    const [unreadMessages, setUnreadMessages] = useState(0);
    const [isChatOpen, setIsChatOpen] = useState(false);

    // Online oyuncular
    const [onlinePlayers, setOnlinePlayers] = useState([]);
    const [isOnlinePanelOpen, setIsOnlinePanelOpen] = useState(false);

    // Bağlantı durumu
    const [isConnected, setIsConnected] = useState(socket.connected);

    // Error/notification
    const [notification, setNotification] = useState(null);

    // Characters Modal
    const [showCharactersModal, setShowCharactersModal] = useState(false);

    // LocalStorage'dan isim kontrolü
    useEffect(() => {
        const savedName = localStorage.getItem('vampir_player_name');
        if (savedName && socket.connected) {
            // Otomatik giriş dene
            socket.emit('set_name', savedName, (response) => {
                if (response.success) {
                    setPlayerName(response.name);
                    setScreen(SCREENS.LOBBY);
                }
            });
        }
    }, []);

    // Socket bağlantı event'leri
    useEffect(() => {
        const onConnect = () => {
            setIsConnected(true);
            setPlayerId(socket.id);
            console.log('Bağlandı:', socket.id);
        };

        const onDisconnect = () => {
            setIsConnected(false);
            showNotification('Bağlantı koptu! Yeniden bağlanılıyor...', 'error');
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);

        // İlk bağlantı kontrolü
        if (socket.connected) {
            setPlayerId(socket.id);
            setIsConnected(true);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
        };
    }, []);

    // Online oyuncular event'i
    useEffect(() => {
        const onOnlinePlayers = (players) => {
            setOnlinePlayers(players);
        };

        socket.on('online_players', onOnlinePlayers);

        // İlk listeyi al
        socket.emit('get_online_players', (players) => {
            setOnlinePlayers(players || []);
        });

        return () => {
            socket.off('online_players', onOnlinePlayers);
        };
    }, []);

    // Oyun event'leri
    useEffect(() => {
        // Oda güncellendi
        const onRoomUpdated = (data) => {
            setRoomData(data);
        };

        // Rol atandı
        const onRoleAssigned = (data) => {
            setMyRole(data.role);
            setTeammates(data.teammates || []);
            setScreen(SCREENS.GAME);
        };

        // Oyun durumu güncellendi
        const onGameState = (data) => {
            setGameState(data);
        };

        // Timer güncellendi
        const onTimerUpdate = (data) => {
            setTimer(data);
        };

        // Gece sonucu
        const onNightResult = (data) => {
            if (data.killed) {
                showNotification(`${data.killed.name} bu gece öldürüldü!`, 'error');
            } else if (data.saved) {
                showNotification('Doktor birini kurtardı!', 'success');
            } else {
                showNotification('Bu gece kimse ölmedi.', 'info');
            }
        };

        // Gözcü sonucu
        const onGozcuResult = (data) => {
            const resultText = data.isVampir
                ? `🔮 ${data.targetName} bir VAMPİR!`
                : `🔮 ${data.targetName} masum görünüyor.`;
            showNotification(resultText, data.isVampir ? 'warning' : 'info');
        };

        // Oylama sonucu
        const onVoteResult = (data) => {
            if (data.tie) {
                showNotification('Oylar eşit! Kimse elenmedi.', 'info');
            } else if (data.eliminated) {
                const roleEmoji = data.eliminated.role === 'vampir' ? '🧛' :
                    data.eliminated.role === 'doktor' ? '👨‍⚕️' :
                        data.eliminated.role === 'gozcu' ? '🔮' : '👨‍🌾';
                showNotification(
                    `${data.eliminated.name} (${roleEmoji} ${data.eliminated.role}) elendi!`,
                    'warning'
                );
            }
        };

        // Oyun bitti
        const onGameEnded = (data) => {
            setGameState(prev => ({
                ...prev,
                phase: 'ended',
                winner: data.winner,
                allPlayers: data.players
            }));
        };

        // Chat mesajı
        const onChatMessage = (data) => {
            setMessages(prev => [...prev, data]);
            // Chat kapalıysa okunmamış sayacını artır
            if (!isChatOpen) {
                setUnreadMessages(prev => prev + 1);
            }
        };

        socket.on('room_updated', onRoomUpdated);
        socket.on('role_assigned', onRoleAssigned);
        socket.on('game_state', onGameState);
        socket.on('timer_update', onTimerUpdate);
        socket.on('night_result', onNightResult);
        socket.on('gozcu_result', onGozcuResult);
        socket.on('vote_result', onVoteResult);
        socket.on('game_ended', onGameEnded);
        socket.on('chat_message', onChatMessage);

        return () => {
            socket.off('room_updated', onRoomUpdated);
            socket.off('role_assigned', onRoleAssigned);
            socket.off('game_state', onGameState);
            socket.off('timer_update', onTimerUpdate);
            socket.off('night_result', onNightResult);
            socket.off('gozcu_result', onGozcuResult);
            socket.off('vote_result', onVoteResult);
            socket.off('game_ended', onGameEnded);
            socket.off('chat_message', onChatMessage);
        };
    }, [isChatOpen]);

    // Bildirim göster
    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    // Chat aç/kapa
    const handleToggleChat = (isOpen) => {
        setIsChatOpen(isOpen);
        if (isOpen) {
            setUnreadMessages(0);
        }
    };

    // İsim belirleme
    const handleSetName = useCallback((name) => {
        return new Promise((resolve) => {
            socket.emit('set_name', name, (response) => {
                if (response.success) {
                    setPlayerName(response.name);
                    localStorage.setItem('vampir_player_name', response.name);
                    setScreen(SCREENS.LOBBY);
                } else {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Oda oluştur (config ile)
    const handleCreateRoom = useCallback((config = {}) => {
        return new Promise((resolve) => {
            socket.emit('create_room', config, (response) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setScreen(SCREENS.WAITING_ROOM);
                } else {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Odaya katıl
    const handleJoinRoom = useCallback((code) => {
        return new Promise((resolve) => {
            socket.emit('join_room', code, (response) => {
                if (response.success) {
                    setRoomCode(response.roomCode);
                    setScreen(SCREENS.WAITING_ROOM);
                } else {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Odadan ayrıl
    const handleLeaveRoom = useCallback(() => {
        return new Promise((resolve) => {
            socket.emit('leave_room', (response) => {
                if (response.success) {
                    setRoomCode(null);
                    setRoomData(null);
                    setGameState(null);
                    setMyRole(null);
                    setTeammates([]);
                    setMessages([]);
                    setScreen(SCREENS.LOBBY);
                } else {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Oyunu başlat
    const handleStartGame = useCallback(() => {
        return new Promise((resolve) => {
            socket.emit('start_game', (response) => {
                if (!response.success) {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Gece aksiyonu
    const handleNightAction = useCallback((targetId, actionType) => {
        return new Promise((resolve) => {
            socket.emit('night_action', { targetId, actionType }, (response) => {
                if (response.success) {
                    showNotification('Aksiyon gönderildi!', 'success');
                }
                resolve(response);
            });
        });
    }, []);

    // Oy ver
    const handleVote = useCallback((targetId) => {
        return new Promise((resolve) => {
            socket.emit('vote', targetId, (response) => {
                if (response.success) {
                    showNotification('Oyun gönderildi!', 'success');
                } else if (response.error) {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Chat mesajı gönder
    const handleSendMessage = useCallback((message) => {
        return new Promise((resolve) => {
            socket.emit('chat_message', message, (response) => {
                if (!response.success && response.error) {
                    showNotification(response.error, 'error');
                }
                resolve(response);
            });
        });
    }, []);

    // Çıkış yap
    const handleLogout = () => {
        // Socket bağlantısını kapat
        socket.disconnect();

        // LocalStorage temizle
        localStorage.removeItem('vampir_player_name');

        // Sayfayı yenile
        window.location.reload();
    };

    // Ana ekrana dön
    const handleBackToLobby = () => {
        setRoomCode(null);
        setRoomData(null);
        setGameState(null);
        setMyRole(null);
        setTeammates([]);
        setMessages([]);
        setUnreadMessages(0);
        setScreen(SCREENS.LOBBY);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-night-900 via-vampire-900 to-night-900">
            {/* Bağlantı durumu */}
            {!isConnected && (
                <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-2 z-50">
                    🔌 Bağlantı koptu! Yeniden bağlanılıyor...
                </div>
            )}

            {/* Logout butonu (Welcome hariç) */}
            {screen !== SCREENS.WELCOME && playerName && (
                <button
                    onClick={handleLogout}
                    className="fixed top-4 right-4 z-50 bg-night-800/80 hover:bg-vampire-700 
                     border border-vampire-600/50 text-white px-4 py-2 rounded-lg 
                     shadow-lg transition-all duration-200 flex items-center gap-2"
                >
                    <span className="text-sm">{playerName}</span>
                    <span className="text-vampire-400">🚪</span>
                </button>
            )}

            {/* Bildirim */}
            {notification && (
                <div
                    className={`fixed top-4 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn
            ${notification.type === 'error' ? 'bg-red-600' :
                            notification.type === 'success' ? 'bg-green-600' :
                                notification.type === 'warning' ? 'bg-amber-600' : 'bg-blue-600'}
            text-white font-medium max-w-md text-center`}
                >
                    {notification.message}
                </div>
            )}

            {/* Online Oyuncular Paneli (Lobby ve sonrası) */}
            {screen !== SCREENS.WELCOME && (
                <OnlinePlayersPanel
                    players={onlinePlayers}
                    isOpen={isOnlinePanelOpen}
                    onToggle={() => setIsOnlinePanelOpen(!isOnlinePanelOpen)}
                />
            )}

            {/* Ana içerik (panel açıkken sola kaydır) */}
            <div className={`transition-all duration-300 ${screen !== SCREENS.WELCOME ? 'lg:pl-64' : ''}`}>
                {/* Ekranlar */}
                {screen === SCREENS.WELCOME && (
                    <WelcomeScreen onSetName={handleSetName} />
                )}

                {screen === SCREENS.LOBBY && (
                    <LobbyScreen
                        playerName={playerName}
                        onCreateRoom={handleCreateRoom}
                        onJoinRoom={handleJoinRoom}
                    />
                )}

                {screen === SCREENS.WAITING_ROOM && (
                    <WaitingRoom
                        roomCode={roomCode}
                        roomData={roomData}
                        playerId={playerId}
                        onStartGame={handleStartGame}
                        onLeaveRoom={handleLeaveRoom}
                    />
                )}

                {screen === SCREENS.GAME && (
                    <GameScreen
                        gameState={gameState}
                        myRole={myRole}
                        teammates={teammates}
                        playerId={playerId}
                        timer={timer}
                        messages={messages}
                        unreadMessages={unreadMessages}
                        onNightAction={handleNightAction}
                        onVote={handleVote}
                        onSendMessage={handleSendMessage}
                        onBackToLobby={handleBackToLobby}
                        onToggleChat={handleToggleChat}
                    />
                )}
            </div>

            {/* Karakterler Butonu (Sağ alt) */}
            {screen !== SCREENS.WELCOME && (
                <button
                    onClick={() => setShowCharactersModal(true)}
                    className="fixed bottom-4 left-4 z-40 bg-gradient-to-r from-vampire-700 to-vampire-800
                               hover:from-vampire-600 hover:to-vampire-700 text-white px-4 py-3 rounded-xl
                               shadow-lg transition-all duration-200 flex items-center gap-2 border border-vampire-600/50"
                >
                    <span className="text-xl">📖</span>
                    <span className="hidden sm:inline font-medium">Karakterler</span>
                </button>
            )}

            {/* Characters Modal */}
            {showCharactersModal && (
                <CharactersModal onClose={() => setShowCharactersModal(false)} />
            )}
        </div>
    );
}

export default App;
