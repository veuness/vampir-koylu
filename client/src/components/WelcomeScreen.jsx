import { useState } from 'react';

function WelcomeScreen({ onSetName }) {
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (name.trim().length < 2) {
            setError('İsim en az 2 karakter olmalı!');
            return;
        }

        if (name.trim().length > 20) {
            setError('İsim en fazla 20 karakter olabilir!');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await onSetName(name.trim());
            if (!result.success) {
                setError(result.error);
            }
        } catch (err) {
            setError('Bir hata oluştu!');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card max-w-md w-full text-center">
                {/* Logo / Başlık */}
                <div className="mb-8">
                    <h1 className="font-gothic text-6xl text-vampire-400 mb-2 animate-float">
                        🧛 Vampir Köylü
                    </h1>
                    <p className="text-gray-400 text-lg">
                        Gerçek zamanlı multiplayer sosyal çıkarım oyunu
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2 text-left">
                            Takma Adın
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Örn: VampirAvcısı"
                            className="input-dark text-lg"
                            maxLength={20}
                            autoFocus
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-400">{error}</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || name.trim().length < 2}
                        className="btn-primary w-full text-lg"
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Bağlanıyor...
                            </span>
                        ) : (
                            'Oyuna Gir 🎮'
                        )}
                    </button>
                </form>

                {/* Oyun Kuralları */}
                <div className="mt-8 text-left">
                    <h3 className="text-lg font-semibold text-vampire-300 mb-3">
                        🎮 Nasıl Oynanır?
                    </h3>
                    <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-start gap-2">
                            <span className="text-vampire-400">🧛</span>
                            <span><strong>Vampirler:</strong> Gece köylüleri avlar. Birbirlerini görürler.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">👨‍🌾</span>
                            <span><strong>Köylüler:</strong> Vampirleri bulup gündüz oylamasıyla eleyin.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-purple-400">🧙</span>
                            <span><strong>Büyücü:</strong> Her gece birini vampirlerden koruyabilir.</span>
                        </li>
                    </ul>
                </div>

                {/* Footer */}
                <div className="mt-8 pt-4 border-t border-vampire-700/30">
                    <p className="text-xs text-gray-500">
                        4-12 oyuncu ile oynanır • Gece/Gündüz döngüsü
                    </p>
                </div>
            </div>
        </div>
    );
}

export default WelcomeScreen;
