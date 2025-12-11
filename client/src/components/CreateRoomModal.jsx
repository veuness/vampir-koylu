import { useState } from 'react';

function CreateRoomModal({ onClose, onCreateRoom }) {
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState({
        roomName: 'Vampir Köylü Odası',
        maxPlayers: 8,
        roles: {
            vampir: 2,
            doktor: 1,
            gozcu: 1,
            jester: 0,
            eskort: 0,
            mezar_hirsizi: 0,
            koylu: 4
        },
        timers: {
            day: 60,
            voting: 30
        }
    });

    const [error, setError] = useState('');

    // Toplam rol sayısı
    const totalRoles = Object.values(config.roles).reduce((a, b) => a + b, 0);

    // Validasyon
    const validate = () => {
        if (config.roomName.trim().length < 2) {
            setError('Oda adı en az 2 karakter olmalı!');
            return false;
        }
        if (totalRoles > config.maxPlayers) {
            setError('Toplam rol sayısı maksimum oyuncu sayısını geçemez!');
            return false;
        }
        if (config.roles.vampir < 1) {
            setError('En az 1 vampir olmalı!');
            return false;
        }
        if (config.timers.day < 10 || config.timers.voting < 10) {
            setError('Süre en az 10 saniye olmalı!');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validate()) return;

        setIsLoading(true);
        try {
            await onCreateRoom(config);
        } catch (err) {
            setError('Oda oluşturulurken hata oluştu!');
        } finally {
            setIsLoading(false);
        }
    };

    const updateRole = (role, value) => {
        const numValue = Math.max(0, Math.min(parseInt(value) || 0, 12));
        setConfig(prev => ({
            ...prev,
            roles: { ...prev.roles, [role]: numValue }
        }));
    };

    const updateTimer = (timer, value) => {
        const numValue = Math.max(10, Math.min(parseInt(value) || 10, 300));
        setConfig(prev => ({
            ...prev,
            timers: { ...prev.timers, [timer]: numValue }
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto animate-fadeIn">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-vampire-300">🏠 Yeni Oda Oluştur</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Oda Adı */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Oda Adı
                        </label>
                        <input
                            type="text"
                            value={config.roomName}
                            onChange={(e) => setConfig(prev => ({ ...prev, roomName: e.target.value }))}
                            className="input-dark"
                            maxLength={30}
                        />
                    </div>

                    {/* Maksimum Oyuncu */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Maksimum Oyuncu
                        </label>
                        <input
                            type="range"
                            min="4"
                            max="12"
                            value={config.maxPlayers}
                            onChange={(e) => setConfig(prev => ({ ...prev, maxPlayers: parseInt(e.target.value) }))}
                            className="w-full accent-vampire-500"
                        />
                        <div className="flex justify-between text-sm text-gray-400 mt-1">
                            <span>4</span>
                            <span className="text-vampire-400 font-bold">{config.maxPlayers}</span>
                            <span>12</span>
                        </div>
                    </div>

                    {/* Rol Dağılımı */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Rol Dağılımı
                            <span className={`ml-2 text-xs ${totalRoles > config.maxPlayers ? 'text-red-400' : 'text-gray-500'}`}>
                                (Toplam: {totalRoles}/{config.maxPlayers})
                            </span>
                        </label>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Vampir */}
                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🧛</span>
                                    <span className="text-vampire-400 font-medium text-sm">Vampir</span>
                                </div>
                                <input
                                    type="number"
                                    min="1"
                                    max="5"
                                    value={config.roles.vampir}
                                    onChange={(e) => updateRole('vampir', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                            </div>

                            {/* Doktor */}
                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">👨‍⚕️</span>
                                    <span className="text-cyan-400 font-medium text-sm">Doktor</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="3"
                                    value={config.roles.doktor}
                                    onChange={(e) => updateRole('doktor', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                            </div>

                            {/* Gözcü */}
                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🔮</span>
                                    <span className="text-purple-400 font-medium text-sm">Gözcü</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    value={config.roles.gozcu}
                                    onChange={(e) => updateRole('gozcu', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                            </div>

                            {/* Jester */}
                            <div className="bg-night-800 p-3 rounded-lg border border-yellow-600/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🃏</span>
                                    <span className="text-yellow-400 font-medium text-sm">Jester</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    value={config.roles.jester}
                                    onChange={(e) => updateRole('jester', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Asılırsa kazanır!</p>
                            </div>

                            {/* Eskort */}
                            <div className="bg-night-800 p-3 rounded-lg border border-pink-600/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">💃</span>
                                    <span className="text-pink-400 font-medium text-sm">Eskort</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="2"
                                    value={config.roles.eskort}
                                    onChange={(e) => updateRole('eskort', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Ziyaret edebilir</p>
                            </div>

                            {/* Mezar Hırsızı */}
                            <div className="bg-night-800 p-3 rounded-lg border border-gray-600/30">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">⚰️</span>
                                    <span className="text-gray-400 font-medium text-sm">Mezar Hırsızı</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="1"
                                    value={config.roles.mezar_hirsizi || 0}
                                    onChange={(e) => updateRole('mezar_hirsizi', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">Rol çalar!</p>
                            </div>

                            {/* Köylü */}
                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">👨‍🌾</span>
                                    <span className="text-amber-400 font-medium text-sm">Köylü</span>
                                </div>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={config.roles.koylu}
                                    onChange={(e) => updateRole('koylu', e.target.value)}
                                    className="input-dark text-center text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Süre Ayarları */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-3">
                            Süre Ayarları (saniye)
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">☀️</span>
                                    <span className="text-amber-400 font-medium">Gündüz</span>
                                </div>
                                <input
                                    type="number"
                                    min="10"
                                    max="300"
                                    value={config.timers.day}
                                    onChange={(e) => updateTimer('day', e.target.value)}
                                    className="input-dark text-center"
                                />
                            </div>

                            <div className="bg-night-800 p-3 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xl">🗳️</span>
                                    <span className="text-rose-400 font-medium">Oylama</span>
                                </div>
                                <input
                                    type="number"
                                    min="10"
                                    max="120"
                                    value={config.timers.voting}
                                    onChange={(e) => updateTimer('voting', e.target.value)}
                                    className="input-dark text-center"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Error */}
                    {error && (
                        <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg text-sm">
                            {error}
                        </div>
                    )}

                    {/* Butonlar */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                        >
                            İptal
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || totalRoles > config.maxPlayers}
                            className="btn-primary flex-1"
                        >
                            {isLoading ? 'Oluşturuluyor...' : '🎮 Oda Oluştur'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default CreateRoomModal;
