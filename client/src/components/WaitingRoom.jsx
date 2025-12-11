import { useState } from 'react';

function WaitingRoom({ roomCode, roomData, playerId, onStartGame, onLeaveRoom }) {
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const players = roomData?.players || [];
    const isHost = roomData?.hostId === playerId;
    const canStart = players.length >= 4;

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(roomCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Kopyalama hatası:', err);
        }
    };

    const handleStartGame = async () => {
        setIsLoading(true);
        try {
            await onStartGame();
        } finally {
            setIsLoading(false);
        }
    };

    const handleLeaveRoom = async () => {
        setIsLoading(true);
        try {
            await onLeaveRoom();
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen p-4">
            <div className="max-w-xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8 pt-8">
                    <h1 className="font-gothic text-4xl text-vampire-400 mb-4">
                        🏠 Bekleme Odası
                    </h1>

                    {/* Oda Kodu */}
                    <div className="card-dark inline-block">
                        <p className="text-sm text-gray-400 mb-2">Oda Kodu</p>
                        <div className="flex items-center gap-3">
                            <span className="text-4xl font-mono font-bold text-vampire-300 tracking-widest">
                                {roomCode}
                            </span>
                            <button
                                onClick={handleCopyCode}
                                className="p-2 bg-vampire-700/50 hover:bg-vampire-600/50 rounded-lg transition-all"
                                title="Kodu Kopyala"
                            >
                                {copied ? '✅' : '📋'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Bu kodu arkadaşlarınla paylaş!
                        </p>
                    </div>
                </div>

                {/* Oyuncu Listesi */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-vampire-300">
                            Oyuncular
                        </h2>
                        <span className="text-sm text-gray-400">
                            {players.length}/12
                        </span>
                    </div>

                    <div className="space-y-2">
                        {players.map((player, index) => (
                            <div
                                key={player.id}
                                className={`flex items-center gap-3 p-3 rounded-lg transition-all animate-slideIn
                  ${player.isHost
                                        ? 'bg-gradient-to-r from-vampire-700/50 to-vampire-600/30 border border-vampire-500/30'
                                        : 'bg-night-800 border border-night-700'}`}
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-vampire-500 to-vampire-700 
                               flex items-center justify-center text-lg font-bold">
                                    {player.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-white">
                                        {player.name}
                                        {player.id === playerId && (
                                            <span className="ml-2 text-xs text-vampire-400">(Sen)</span>
                                        )}
                                    </p>
                                    {player.isHost && (
                                        <p className="text-xs text-vampire-400">👑 Oda Sahibi</p>
                                    )}
                                </div>
                            </div>
                        ))}

                        {/* Boş slotlar */}
                        {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="flex items-center gap-3 p-3 rounded-lg bg-night-900/50 border border-dashed border-night-700"
                            >
                                <div className="w-10 h-10 rounded-full bg-night-800 flex items-center justify-center">
                                    <span className="text-gray-600">?</span>
                                </div>
                                <p className="text-gray-500 text-sm">Oyuncu bekleniyor...</p>
                            </div>
                        ))}
                    </div>

                    {players.length < 4 && (
                        <p className="mt-4 text-center text-amber-400 text-sm">
                            ⚠️ Oyunu başlatmak için en az 4 oyuncu gerekli
                        </p>
                    )}
                </div>

                {/* Aksiyonlar */}
                <div className="space-y-3">
                    {isHost ? (
                        <button
                            onClick={handleStartGame}
                            disabled={isLoading || !canStart}
                            className="btn-primary w-full text-lg"
                        >
                            {isLoading ? 'Başlatılıyor...' : '🎮 Oyunu Başlat'}
                        </button>
                    ) : (
                        <div className="card-dark text-center">
                            <p className="text-gray-400">
                                Oda sahibinin oyunu başlatmasını bekliyorsun...
                            </p>
                            <div className="mt-3 flex justify-center gap-1">
                                <span className="w-2 h-2 bg-vampire-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                <span className="w-2 h-2 bg-vampire-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                <span className="w-2 h-2 bg-vampire-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={handleLeaveRoom}
                        disabled={isLoading}
                        className="btn-secondary w-full"
                    >
                        🚪 Odadan Ayrıl
                    </button>
                </div>

                {/* Rol Dağılımı Bilgisi */}
                <div className="mt-8 card-dark">
                    <h3 className="text-lg font-semibold text-vampire-300 mb-3">
                        📊 Rol Dağılımı
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                        <div>
                            <p className="text-2xl mb-1">🧛</p>
                            <p className="text-gray-400">Vampir</p>
                            <p className="text-vampire-400 font-bold">
                                {players.length >= 10 ? 3 : players.length >= 7 ? 2 : 1}
                            </p>
                        </div>
                        <div>
                            <p className="text-2xl mb-1">🧙</p>
                            <p className="text-gray-400">Büyücü</p>
                            <p className="text-purple-400 font-bold">
                                {players.length >= 12 ? 2 : players.length >= 5 ? 1 : 0}
                            </p>
                        </div>
                        <div>
                            <p className="text-2xl mb-1">👨‍🌾</p>
                            <p className="text-gray-400">Köylü</p>
                            <p className="text-emerald-400 font-bold">
                                {Math.max(0, players.length - (players.length >= 10 ? 3 : players.length >= 7 ? 2 : 1) - (players.length >= 12 ? 2 : players.length >= 5 ? 1 : 0))}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default WaitingRoom;
