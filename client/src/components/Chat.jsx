import { useState, useRef, useEffect } from 'react';

function Chat({ messages, onSendMessage, isAlive, phase, myRole, onClose }) {
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef(null);

    // Otomatik scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Chat kullanılabilir mi?
    const canChat = () => {
        // Ölüler her zaman ölüler arası chat yapabilir
        if (!isAlive) return true;

        // Gece sadece vampirler kendi aralarında chat yapabilir
        if (phase === 'night') {
            return myRole === 'vampir';
        }

        // Gündüz ve oylama herkes chat yapabilir
        return phase === 'day' || phase === 'voting';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!message.trim() || isSending || !canChat()) return;

        setIsSending(true);
        try {
            await onSendMessage(message.trim());
            setMessage('');
        } finally {
            setIsSending(false);
        }
    };

    // Mesaj türüne göre stil
    const getMessageStyle = (msg) => {
        if (msg.type === 'dead') {
            return 'bg-gray-800/50 border-l-2 border-gray-500 text-gray-400';
        }
        if (msg.type === 'vampir') {
            return 'bg-vampire-900/50 border-l-2 border-vampire-500 text-vampire-200';
        }
        return 'bg-night-800 border-l-2 border-emerald-600';
    };

    return (
        <div className="flex flex-col h-full bg-night-900 rounded-xl border border-night-700 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-night-800 border-b border-night-700">
                <div className="flex items-center gap-2">
                    <span className="text-lg">💬</span>
                    <h3 className="font-semibold text-white">Chat</h3>
                    {!isAlive && (
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">Ölüler</span>
                    )}
                    {isAlive && phase === 'night' && myRole === 'vampir' && (
                        <span className="text-xs bg-vampire-700 text-vampire-200 px-2 py-0.5 rounded">Vampirler</span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                >
                    ✕
                </button>
            </div>

            {/* Mesajlar */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                        <p>Henüz mesaj yok</p>
                        <p className="text-sm mt-1">
                            {!canChat()
                                ? 'Şu an chat yapamazsın'
                                : 'İlk mesajı sen gönder!'}
                        </p>
                    </div>
                ) : (
                    messages.map((msg, index) => (
                        <div
                            key={msg.id || index}
                            className={`p-2 rounded-lg text-sm ${getMessageStyle(msg)}`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-white">
                                    {msg.playerName}
                                </span>
                                {msg.isDead && <span className="text-xs">💀</span>}
                                {msg.type === 'vampir' && <span className="text-xs">🧛</span>}
                                <span className="text-xs text-gray-500">
                                    {new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <p className="text-gray-200">{msg.message}</p>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Mesaj formu */}
            <form onSubmit={handleSubmit} className="p-3 bg-night-800 border-t border-night-700">
                {!canChat() ? (
                    <div className="text-center text-gray-500 text-sm py-2">
                        {phase === 'night' && myRole !== 'vampir' && isAlive
                            ? '🌙 Gece boyunca sessiz olmalısın'
                            : 'Chat şu an kullanılamıyor'}
                    </div>
                ) : (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Mesaj yaz..."
                            className="flex-1 bg-night-700 border border-night-600 rounded-lg px-3 py-2 
                       text-white text-sm placeholder-gray-500
                       focus:outline-none focus:ring-1 focus:ring-vampire-500"
                            maxLength={200}
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            disabled={!message.trim() || isSending}
                            className="bg-vampire-600 hover:bg-vampire-500 text-white px-4 py-2 rounded-lg
                       disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ➤
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
}

export default Chat;
