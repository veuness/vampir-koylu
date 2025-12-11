import { useState } from 'react';

// Tüm roller ve açıklamaları
const ALL_ROLES = [
    {
        id: 'vampir',
        name: 'Vampir',
        emoji: '🧛',
        team: 'Karanlık',
        teamColor: 'text-vampire-400',
        bgColor: 'from-vampire-800 to-vampire-900',
        borderColor: 'border-vampire-600',
        description: 'Geceleri köylüleri avla. Diğer vampirleri görebilirsin. Köylü sayısına eşitlenince kazanırsın!'
    },
    {
        id: 'koylu',
        name: 'Köylü',
        emoji: '👨‍🌾',
        team: 'Köylü',
        teamColor: 'text-amber-400',
        bgColor: 'from-amber-800 to-amber-900',
        borderColor: 'border-amber-600',
        description: 'Vampirleri bul ve gündüz oylamasında elemeye çalış. Tüm vampirler ölünce kazanırsın!'
    },
    {
        id: 'doktor',
        name: 'Doktor',
        emoji: '👨‍⚕️',
        team: 'Köylü',
        teamColor: 'text-cyan-400',
        bgColor: 'from-cyan-800 to-cyan-900',
        borderColor: 'border-cyan-600',
        description: 'Her gece bir kişiyi vampirlerden koruyabilirsin. O kişi saldırıya uğrasa bile ölmez!'
    },
    {
        id: 'gozcu',
        name: 'Gözcü',
        emoji: '🔮',
        team: 'Köylü',
        teamColor: 'text-purple-400',
        bgColor: 'from-purple-800 to-purple-900',
        borderColor: 'border-purple-600',
        description: 'Her gece bir kişinin vampir olup olmadığını öğrenebilirsin. Bilgiyi akıllıca kullan!'
    },
    {
        id: 'jester',
        name: 'Jester',
        emoji: '🃏',
        team: 'Nötr',
        teamColor: 'text-yellow-400',
        bgColor: 'from-yellow-700 to-yellow-900',
        borderColor: 'border-yellow-500',
        description: 'Amacın: Köy halkını seni asmaları için kandır! Gündüz oylamasında asılırsan TEK BAŞINA kazanırsın!'
    },
    {
        id: 'eskort',
        name: 'Eskort',
        emoji: '💃',
        team: 'Köylü',
        teamColor: 'text-pink-400',
        bgColor: 'from-pink-800 to-pink-900',
        borderColor: 'border-pink-600',
        description: 'Her gece birini ziyaret edebilir veya evde kalabilirsin. DİKKAT: Ziyaret ettiğin kişi saldırıya uğrarsa sen de ölürsün!'
    },
    {
        id: 'mezar_hirsizi',
        name: 'Mezar Hırsızı',
        emoji: '⚰️',
        team: 'Köylü*',
        teamColor: 'text-gray-400',
        bgColor: 'from-gray-700 to-gray-900',
        borderColor: 'border-gray-500',
        description: 'İLK GECE bir hedef seç (değiştiremezsin!). Hedefin öldüğünde onun rolüne dönüşürsün. Vampir bile olabilirsin!'
    },
    {
        id: 'medyum',
        name: 'Medyum',
        emoji: '🔯',
        team: 'Köylü',
        teamColor: 'text-indigo-400',
        bgColor: 'from-indigo-800 to-indigo-900',
        borderColor: 'border-indigo-600',
        description: 'Oyun boyunca SADECE 1 KERE ölmüş bir oyuncuyu canlandırabilirsin. Büyük güç, büyük sorumluluk!'
    },
    {
        id: 'intikamci',
        name: 'İntikamcı',
        emoji: '⚔️',
        team: 'Köylü',
        teamColor: 'text-orange-400',
        bgColor: 'from-orange-800 to-orange-900',
        borderColor: 'border-orange-600',
        description: 'Her gece birini işaretle. Eğer o gece (veya oylama sonucu) ölürsen, işaretlediğin kişi de seninle birlikte ölür!'
    }
];

function CharactersModal({ onClose }) {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-night-900 to-night-800 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl border border-vampire-700/50">
                {/* Header */}
                <div className="bg-gradient-to-r from-vampire-800 to-vampire-900 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        📖 Karakterler
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-300 hover:text-white text-2xl transition-colors w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 72px)' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ALL_ROLES.map((role) => (
                            <div
                                key={role.id}
                                className={`bg-gradient-to-br ${role.bgColor} rounded-xl p-4 border ${role.borderColor} 
                           hover:scale-[1.02] transition-transform duration-200`}
                            >
                                {/* Emoji ve İsim */}
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-4xl">{role.emoji}</span>
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{role.name}</h3>
                                        <span className={`text-xs font-medium ${role.teamColor}`}>
                                            Takım: {role.team}
                                        </span>
                                    </div>
                                </div>

                                {/* Açıklama */}
                                <p className="text-gray-200 text-sm leading-relaxed">
                                    {role.description}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Alt Bilgi */}
                    <div className="mt-6 p-4 bg-night-800/50 rounded-lg border border-night-700">
                        <p className="text-gray-400 text-sm text-center">
                            <span className="text-yellow-400">💡 İpucu:</span> Her oyun farklıdır. Rolleri iyi tanı ve stratejini ona göre belirle!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CharactersModal;
