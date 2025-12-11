import { useState, useEffect } from 'react';
import Chat from './Chat';

// Rol bilgileri
const ROLE_INFO = {
    vampir: { name: 'Vampir', emoji: '🧛', color: 'text-vampire-400', bgColor: 'from-vampire-700 to-vampire-900' },
    koylu: { name: 'Köylü', emoji: '👨‍🌾', color: 'text-emerald-400', bgColor: 'from-emerald-700 to-emerald-900' },
    doktor: { name: 'Doktor', emoji: '👨‍⚕️', color: 'text-cyan-400', bgColor: 'from-cyan-700 to-cyan-900' },
    gozcu: { name: 'Gözcü', emoji: '🔮', color: 'text-purple-400', bgColor: 'from-purple-700 to-purple-900' },
    jester: { name: 'Jester', emoji: '🃏', color: 'text-yellow-400', bgColor: 'from-yellow-700 to-yellow-900' },
    eskort: { name: 'Eskort', emoji: '💃', color: 'text-pink-400', bgColor: 'from-pink-700 to-pink-900' },
    mezar_hirsizi: { name: 'Mezar Hırsızı', emoji: '⚰️', color: 'text-gray-400', bgColor: 'from-gray-700 to-gray-900' },
    medyum: { name: 'Medyum', emoji: '🔯', color: 'text-indigo-400', bgColor: 'from-indigo-700 to-indigo-900' },
    intikamci: { name: 'İntikamci', emoji: '⚔️', color: 'text-orange-400', bgColor: 'from-orange-700 to-orange-900' }
};

// Faz bilgileri
const PHASE_INFO = {
    role_reveal: { name: 'Rol Gösterimi', icon: '🎭', bgClass: 'bg-gradient-to-r from-purple-900 to-indigo-900' },
    night: { name: 'Gece', icon: '🌙', bgClass: 'bg-gradient-to-r from-indigo-900 to-slate-900' },
    day: { name: 'Gündüz', icon: '☀️', bgClass: 'bg-gradient-to-r from-amber-600 to-orange-500' },
    voting: { name: 'Oylama', icon: '🗳️', bgClass: 'bg-gradient-to-r from-vampire-600 to-rose-600' },
    ended: { name: 'Oyun Bitti', icon: '🏁', bgClass: 'bg-gradient-to-r from-gray-700 to-gray-900' }
};

function GameScreen({
    gameState,
    myRole,
    teammates,
    playerId,
    timer,
    messages,
    unreadMessages = 0,
    onNightAction,
    onVote,
    onSendMessage,
    onBackToLobby,
    onToggleChat
}) {
    const [selectedTarget, setSelectedTarget] = useState(null);
    const [hasActed, setHasActed] = useState(false);
    const [showChat, setShowChat] = useState(false);
    const [eskortStayHome, setEskortStayHome] = useState(false);

    const roleInfo = ROLE_INFO[myRole] || ROLE_INFO.koylu;
    const phaseInfo = PHASE_INFO[gameState?.phase] || PHASE_INFO.night;

    // Oyuncu bilgileri
    const players = gameState?.players || [];
    const myPlayer = players.find(p => p.id === playerId);
    const isAlive = myPlayer?.isAlive ?? true;

    // Faz değiştiğinde seçimi sıfırla
    useEffect(() => {
        setSelectedTarget(null);
        setHasActed(false);
        setEskortStayHome(false);
    }, [gameState?.phase]);

    // Chat toggle handler
    const handleChatToggle = (isOpen) => {
        setShowChat(isOpen);
        onToggleChat?.(isOpen);
    };

    // Gece aksiyonu gönder
    const handleNightAction = async () => {
        if (hasActed) return;

        let actionType = '';
        let targetId = selectedTarget;

        if (myRole === 'vampir') {
            if (!selectedTarget) return;
            actionType = 'vampir_kill';
        } else if (myRole === 'doktor') {
            if (!selectedTarget) return;
            actionType = 'doktor_save';
        } else if (myRole === 'gozcu') {
            if (!selectedTarget) return;
            actionType = 'gozcu_check';
        } else if (myRole === 'eskort') {
            actionType = 'eskort_visit';
            targetId = eskortStayHome ? null : selectedTarget;
            if (!eskortStayHome && !selectedTarget) return;
        } else if (myRole === 'mezar_hirsizi') {
            if (gameState?.round !== 1) return;
            if (!selectedTarget) return;
            actionType = 'mezar_hirsizi_target';
        } else if (myRole === 'medyum') {
            if (!selectedTarget) return;
            actionType = 'medyum_revive';
        } else if (myRole === 'intikamci') {
            if (!selectedTarget) return;
            actionType = 'intikamci_mark';
        } else {
            return;
        }

        await onNightAction(targetId, actionType);
        setHasActed(true);
    };

    // Oy gönder
    const handleVote = async () => {
        if (!selectedTarget || hasActed) return;

        await onVote(selectedTarget);
        setHasActed(true);
    };

    // Seçilebilir mi?
    const canSelect = (player) => {
        if (!isAlive) return false;
        if (player.id === playerId) return false;
        if (!player.isAlive) return false;

        // Gece fazında
        if (gameState?.phase === 'night') {
            // Köylü ve Jester seçemez
            if (myRole === 'koylu' || myRole === 'jester') return false;
            // Mezar Hırsızı sadece ilk gece seçebilir
            if (myRole === 'mezar_hirsizi' && gameState?.round !== 1) return false;
            // Medyum sadece ölü oyuncuları seçebilir (bu canSelect değil, ayrı UI)
            if (myRole === 'medyum') return false; // Ölüler için ayrı liste gösterilecek
            // Vampir başka vampiri öldüremez
            if (myRole === 'vampir' && teammates.includes(player.name)) return false;
        }

        return true;
    };

    // Oyun bitti ekranı
    if (gameState?.phase === 'ended') {
        const winner = gameState.winner;
        const allPlayers = gameState.allPlayers || players;

        const winnerEmoji = winner === 'jester' ? '🃏' : winner === 'vampires' ? '🧛' : '👨‍🌾';
        const winnerText = winner === 'jester' ? 'Jester Kazandı!' :
            winner === 'vampires' ? 'Vampirler Kazandı!' : 'Köylüler Kazandı!';
        const winnerColor = winner === 'jester' ? 'text-yellow-400' :
            winner === 'vampires' ? 'text-vampire-400' : 'text-emerald-400';

        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <div className="card max-w-lg w-full text-center">
                    <div className="mb-6">
                        <span className="text-6xl block mb-4 animate-float">
                            {winnerEmoji}
                        </span>
                        <h1 className={`font-gothic text-4xl mb-2 ${winnerColor}`}>
                            {winnerText}
                        </h1>
                        <p className="text-gray-400">
                            {winner === 'jester' && 'Jester herkesi kandırdı!'}
                            {winner === 'vampires' && 'Karanlık köye hakim oldu...'}
                            {winner === 'villagers' && 'Köy vampirlerden kurtuldu!'}
                        </p>
                    </div>

                    {/* Tüm roller */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-300 mb-3">Roller</h3>
                        <div className="space-y-2">
                            {allPlayers.map(player => {
                                const pRoleInfo = ROLE_INFO[player.role] || ROLE_INFO.koylu;
                                return (
                                    <div
                                        key={player.id}
                                        className={`flex items-center justify-between p-3 rounded-lg
                      ${player.isAlive ? 'bg-night-800' : 'bg-night-900/50 opacity-60'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-xl">{pRoleInfo.emoji}</span>
                                            <span className={player.id === playerId ? 'text-vampire-300 font-medium' : 'text-white'}>
                                                {player.name}
                                                {player.id === playerId && ' (Sen)'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${pRoleInfo.color}`}>{pRoleInfo.name}</span>
                                            {!player.isAlive && <span className="text-gray-500">💀</span>}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <button onClick={onBackToLobby} className="btn-primary w-full">
                        🏠 Lobiye Dön
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header - Faz bilgisi ve timer */}
            <header className={`${phaseInfo.bgClass} py-4 px-4`}>
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{phaseInfo.icon}</span>
                        <div>
                            <h2 className="font-bold text-white">{phaseInfo.name}</h2>
                            <p className="text-sm text-white/70">Tur {gameState?.round || 1}</p>
                        </div>
                    </div>

                    {/* Timer */}
                    <div className="text-center">
                        <div className="text-3xl font-mono font-bold text-white">
                            {timer.remaining}
                        </div>
                        <div className="w-24 h-1 bg-white/30 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all duration-1000"
                                style={{ width: `${(timer.remaining / timer.total) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Rol */}
                    <div className="text-right">
                        <p className="text-xs text-white/70">Senin Rolün</p>
                        <p className={`font-bold ${roleInfo.color}`}>
                            {roleInfo.emoji} {roleInfo.name}
                        </p>
                    </div>
                </div>
            </header>

            {/* Vampir takım arkadaşları */}
            {myRole === 'vampir' && teammates.length > 0 && (
                <div className="bg-vampire-900/50 py-2 px-4 text-center">
                    <p className="text-sm text-vampire-300">
                        🧛 Vampir takım arkadaşların: <strong>{teammates.join(', ')}</strong>
                    </p>
                </div>
            )}

            {/* Ana içerik */}
            <main className="flex-1 p-4 overflow-auto">
                <div className="max-w-4xl mx-auto">
                    {/* Rol gösterimi fazı */}
                    {gameState?.phase === 'role_reveal' && (
                        <div className="flex items-center justify-center min-h-[50vh]">
                            <div className={`card text-center bg-gradient-to-br ${roleInfo.bgColor} border-0`}>
                                <span className="text-8xl block mb-4 animate-float">{roleInfo.emoji}</span>
                                <h2 className={`font-gothic text-4xl mb-2 ${roleInfo.color}`}>
                                    {roleInfo.name}
                                </h2>
                                <p className="text-gray-300 max-w-xs mx-auto">
                                    {myRole === 'vampir' && 'Geceleri köylüleri avla. Diğer vampirleri görebilirsin.'}
                                    {myRole === 'koylu' && 'Vampirleri bul ve gündüz oylamasında elemeye çalış.'}
                                    {myRole === 'doktor' && 'Her gece bir kişiyi vampirlerden koruyabilirsin.'}
                                    {myRole === 'gozcu' && 'Her gece bir kişinin vampir olup olmadığını öğrenebilirsin.'}
                                    {myRole === 'jester' && 'Amacın köy halkını seni asmaları için kandırmak! Asılırsan kazanırsın!'}
                                    {myRole === 'eskort' && 'Her gece birini ziyaret edebilir veya evde kalabilirsin. Dikkat: Ziyaret ettiğin kişi saldırıya uğrarsa sen de ölürsün!'}
                                    {myRole === 'mezar_hirsizi' && 'İlk gece bir hedef seç. Hedefin öldüğünde onun rolüne dönüşürsün!'}
                                    {myRole === 'medyum' && 'Oyun boyunca SADECE 1 KERE ölmüş bir oyuncuyu canlandırabilirsin!'}
                                    {myRole === 'intikamci' && 'Her gece birini işaretle. Ölürsen, işaretlediğin kişi de seninle birlikte ölür!'}
                                </p>
                                {teammates.length > 0 && (
                                    <div className="mt-4 p-3 bg-black/30 rounded-lg">
                                        <p className="text-sm text-gray-400">Takım arkadaşların:</p>
                                        <p className="text-vampire-300 font-semibold">{teammates.join(', ')}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Gece ve Gündüz/Oylama fazları */}
                    {(gameState?.phase === 'night' || gameState?.phase === 'day' || gameState?.phase === 'voting') && (
                        <>
                            {/* Durum mesajı */}
                            <div className="mb-6 text-center">
                                {!isAlive && (
                                    <div className="bg-gray-800/50 text-gray-400 py-3 px-4 rounded-lg mb-4">
                                        💀 Sen öldün. Artık oylamaya katılamazsın ama ölülerin chat'inde konuşabilirsin.
                                    </div>
                                )}

                                {gameState?.phase === 'night' && isAlive && (
                                    <div className="bg-indigo-900/50 text-indigo-300 py-3 px-4 rounded-lg">
                                        {myRole === 'vampir' && '🧛 Öldürmek istediğin köylüyü seç'}
                                        {myRole === 'doktor' && '👨‍⚕️ Korumak istediğin kişiyi seç'}
                                        {myRole === 'gozcu' && '🔮 Sorgulamak istediğin kişiyi seç'}
                                        {myRole === 'eskort' && '💃 Ziyaret etmek istediğin kişiyi seç veya evde kal'}
                                        {myRole === 'mezar_hirsizi' && gameState?.round === 1 && '⚰️ Hedefini seç! Öldüğünde onun rolüne dönüşeceksin.'}
                                        {myRole === 'mezar_hirsizi' && gameState?.round !== 1 && '⚰️ Hedefinin ölmesini bekle...'}
                                        {myRole === 'medyum' && '🔯 Canlandırmak istediğin ÖLÜ oyuncuyu aşağıdan seç'}
                                        {myRole === 'intikamci' && '⚔️ İşaretlemek istediğin kişiyi seç. Ölürsen o da ölecek!'}
                                        {myRole === 'jester' && '🃏 Gece boyunca bekle... Gündüz seni asmaları için kandır!'}
                                        {myRole === 'koylu' && '😴 Uyu ve sabahı bekle...'}
                                    </div>
                                )}

                                {gameState?.phase === 'day' && isAlive && (
                                    <div className="bg-amber-900/50 text-amber-300 py-3 px-4 rounded-lg">
                                        ☀️ Tartışma zamanı! Kim vampir olabilir?
                                    </div>
                                )}

                                {gameState?.phase === 'voting' && isAlive && (
                                    <div className="bg-rose-900/50 text-rose-300 py-3 px-4 rounded-lg">
                                        🗳️ Elemek istediğin kişiyi seç!
                                    </div>
                                )}
                            </div>

                            {/* Eskort evde kal seçeneği */}
                            {gameState?.phase === 'night' && myRole === 'eskort' && isAlive && (
                                <div className="mb-4 flex justify-center">
                                    <button
                                        onClick={() => {
                                            setEskortStayHome(!eskortStayHome);
                                            if (!eskortStayHome) setSelectedTarget(null);
                                        }}
                                        className={`px-6 py-3 rounded-lg font-medium transition-all ${eskortStayHome
                                            ? 'bg-pink-600 text-white ring-2 ring-pink-400'
                                            : 'bg-night-800 text-gray-300 hover:bg-night-700'
                                            }`}
                                    >
                                        🏠 Evde Kal {eskortStayHome && '✓'}
                                    </button>
                                </div>
                            )}

                            {/* Medyum - Ölü oyuncu listesi */}
                            {gameState?.phase === 'night' && myRole === 'medyum' && isAlive && (
                                <div className="mb-6">
                                    <h3 className="text-center text-indigo-300 font-medium mb-3">🔯 Canlandırılacak Ölü Oyuncular</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {(gameState?.deadPlayers || []).map(deadPlayer => (
                                            <button
                                                key={deadPlayer.id}
                                                onClick={() => !hasActed && setSelectedTarget(deadPlayer.id)}
                                                disabled={hasActed}
                                                className={`p-4 rounded-xl transition-all duration-200 text-center
                                                    bg-gradient-to-br from-indigo-900 to-indigo-950 border border-indigo-700
                                                    ${selectedTarget === deadPlayer.id ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-night-900 scale-105' : ''}
                                                    ${!hasActed ? 'hover:scale-105 hover:border-indigo-500 cursor-pointer' : 'cursor-default opacity-50'}`}
                                            >
                                                <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-indigo-800 
                                                    flex items-center justify-center text-xl mb-2">
                                                    💀
                                                </div>
                                                <p className="font-medium text-white truncate">{deadPlayer.name}</p>
                                                <p className="text-xs text-indigo-400">Ölü</p>
                                            </button>
                                        ))}
                                        {(!gameState?.deadPlayers || gameState.deadPlayers.length === 0) && (
                                            <p className="col-span-full text-center text-gray-500">Henüz ölen oyuncu yok.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Oyuncu kartları */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                                {players.map(player => {
                                    const isMe = player.id === playerId;
                                    const isTeammate = myRole === 'vampir' && teammates.includes(player.name);
                                    const isSelected = selectedTarget === player.id;
                                    const selectable = canSelect(player) && !hasActed && !(myRole === 'eskort' && eskortStayHome);

                                    return (
                                        <button
                                            key={player.id}
                                            onClick={() => selectable && setSelectedTarget(player.id)}
                                            disabled={!selectable}
                                            className={`p-4 rounded-xl transition-all duration-200 text-center
                        ${player.isAlive
                                                    ? 'bg-gradient-to-br from-night-800 to-night-900 border border-night-700'
                                                    : 'bg-gray-900/50 border border-gray-800 opacity-50'}
                        ${isSelected ? 'ring-2 ring-vampire-400 ring-offset-2 ring-offset-night-900 scale-105' : ''}
                        ${selectable ? 'hover:scale-105 hover:border-vampire-500 cursor-pointer' : 'cursor-default'}
                        ${isTeammate && gameState?.phase === 'night' ? 'border-vampire-500/50' : ''}`}
                                        >
                                            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-vampire-600 to-vampire-800 
                                    flex items-center justify-center text-xl font-bold mb-2">
                                                {!player.isAlive ? '💀' : player.name.charAt(0).toUpperCase()}
                                            </div>
                                            <p className={`font-medium truncate ${isMe ? 'text-vampire-300' : 'text-white'}`}>
                                                {player.name}
                                            </p>
                                            {isMe && <p className="text-xs text-gray-500">(Sen)</p>}
                                            {isTeammate && gameState?.phase === 'night' && (
                                                <p className="text-xs text-vampire-400">🧛 Vampir</p>
                                            )}
                                            {!player.isAlive && <p className="text-xs text-gray-500">Öldü</p>}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Aksiyon butonu */}
                            {isAlive && (gameState?.phase === 'night' || gameState?.phase === 'voting') && (
                                <div className="text-center">
                                    {gameState?.phase === 'night' && myRole !== 'koylu' && myRole !== 'jester' && myRole !== 'medyum' && !(myRole === 'mezar_hirsizi' && gameState?.round !== 1) && (
                                        <button
                                            onClick={handleNightAction}
                                            disabled={(!selectedTarget && !eskortStayHome) || hasActed}
                                            className="btn-primary px-8"
                                        >
                                            {hasActed ? '✅ Aksiyon Gönderildi' :
                                                myRole === 'vampir' ? '🩸 Saldır' :
                                                    myRole === 'doktor' ? '💉 Koru' :
                                                        myRole === 'gozcu' ? '🔮 Sorgula' :
                                                            myRole === 'eskort' ? (eskortStayHome ? '🏠 Evde Kal' : '💃 Ziyaret Et') :
                                                                myRole === 'mezar_hirsizi' ? '⚰️ Hedefi Kilitle' :
                                                                    myRole === 'intikamci' ? '⚔️ İşaretle' : 'Gönder'}
                                        </button>
                                    )}

                                    {/* Medyum için ayrı buton */}
                                    {gameState?.phase === 'night' && myRole === 'medyum' && (
                                        <button
                                            onClick={handleNightAction}
                                            disabled={!selectedTarget || hasActed}
                                            className="btn-primary px-8 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600"
                                        >
                                            {hasActed ? '✅ Canlandırma Gönderildi' : '🔯 Canlandır'}
                                        </button>
                                    )}

                                    {gameState?.phase === 'voting' && (
                                        <button
                                            onClick={handleVote}
                                            disabled={!selectedTarget || hasActed}
                                            className="btn-danger px-8"
                                        >
                                            {hasActed ? '✅ Oy Verildi' : '🗳️ Oy Ver'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* Chat Toggle with Badge */}
            <button
                onClick={() => handleChatToggle(!showChat)}
                className="fixed bottom-4 right-4 w-14 h-14 bg-vampire-600 hover:bg-vampire-500 
                   rounded-full shadow-lg flex items-center justify-center text-2xl
                   transition-transform hover:scale-110 z-40 relative"
            >
                💬
                {/* Okunmamış mesaj rozeti */}
                {unreadMessages > 0 && !showChat && (
                    <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs 
                          font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                )}
            </button>

            {/* Chat Panel */}
            {showChat && (
                <div className="fixed bottom-20 right-4 w-80 h-96 z-50">
                    <Chat
                        messages={messages}
                        onSendMessage={onSendMessage}
                        isAlive={isAlive}
                        phase={gameState?.phase}
                        myRole={myRole}
                        onClose={() => handleChatToggle(false)}
                    />
                </div>
            )}
        </div>
    );
}

export default GameScreen;
