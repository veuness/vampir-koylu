import { useState, useEffect } from 'react';
import socket from '../socket';

function LobbyScreen({ playerName, onCreateRoom, onJoinRoom }) {
    const [rooms, setRooms] = useState([]);
    const [joinCode, setJoinCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('rooms'); // 'rooms' | 'join'

    // Oda listesini dinle
    useEffect(() => {
        // İlk yüklemede odaları al
        socket.emit('get_rooms', (roomList) => {
            setRooms(roomList || []);
        });

        // Oda güncellemelerini dinle
        const handleRoomsUpdated = (roomList) => {
            setRooms(roomList || []);
        };

        socket.on('rooms_updated', handleRoomsUpdated);

        return () => {
            socket.off('rooms_updated', handleRoomsUpdated);
        };
    }, []);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        try {
            await onCreateRoom();
        } finally {
            setIsLoading(false);
        }
    };

    const handleJoinRoom = async (code) => {
        if (!code || code.trim().length < 4) return;

        setIsLoading(true);
        try {
            await onJoinRoom(code.trim().toUpperCase());
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="font-gothic text-4xl text-vampire-400 mb-2">
                        🧛 Vampir Köylü
                    </h1>
                    <p className="text-gray-400">
                        Hoş geldin, <span className="text-vampire-300 font-semibold">{playerName}</span>!
                    </p>
                </div>

                {/* Ana Aksiyonlar */}
                <div className="card mb-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <button
                            onClick={handleCreateRoom}
                            disabled={isLoading}
                            className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                            <span className="text-xl">🏠</span>
                            Yeni Oda Oluştur
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setActiveTab('rooms')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'rooms'
                                ? 'bg-vampire-600 text-white'
                                : 'bg-night-800 text-gray-400 hover:bg-night-700'
                            }`}
                    >
                        📋 Açık Odalar ({rooms.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('join')}
                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${activeTab === 'join'
                                ? 'bg-vampire-600 text-white'
                                : 'bg-night-800 text-gray-400 hover:bg-night-700'
                            }`}
                    >
                        🔑 Kod ile Katıl
                    </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'rooms' && (
                    <div className="card">
                        <h2 className="text-xl font-semibold text-vampire-300 mb-4">
                            Açık Odalar
                        </h2>

                        {rooms.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-gray-400 text-lg mb-2">🏚️ Şu an açık oda yok</p>
                                <p className="text-gray-500 text-sm">
                                    Yeni bir oda oluştur veya bir oda kodu gir
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {rooms.map((room) => (
                                    <div
                                        key={room.code}
                                        className="bg-night-800 rounded-lg p-4 flex items-center justify-between
                               border border-vampire-700/30 hover:border-vampire-500/50 transition-all"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-mono text-vampire-300">
                                                    {room.code}
                                                </span>
                                                <span className="text-xs bg-vampire-700/50 text-vampire-200 px-2 py-0.5 rounded">
                                                    {room.playerCount}/{room.maxPlayers}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-400 mt-1">
                                                Host: {room.hostName}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleJoinRoom(room.code)}
                                            disabled={isLoading}
                                            className="btn-secondary py-2 px-4"
                                        >
                                            Katıl
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'join' && (
                    <div className="card">
                        <h2 className="text-xl font-semibold text-vampire-300 mb-4">
                            Kod ile Odaya Katıl
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Oda Kodu
                                </label>
                                <input
                                    type="text"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                    placeholder="Örn: ABC123"
                                    className="input-dark text-center text-2xl font-mono tracking-widest uppercase"
                                    maxLength={6}
                                />
                            </div>

                            <button
                                onClick={() => handleJoinRoom(joinCode)}
                                disabled={isLoading || joinCode.length < 4}
                                className="btn-primary w-full"
                            >
                                Odaya Katıl
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Info */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-gray-500">
                        Minimum 4, maksimum 12 oyuncu ile oynanır
                    </p>
                </div>
            </div>
        </div>
    );
}

export default LobbyScreen;
