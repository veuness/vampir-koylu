// Oyun Rolleri
const ROLES = {
  VAMPIR: 'vampir',
  KOYLU: 'koylu',
  BUYUCU: 'buyucu'
};

// Oyun Fazları
const PHASES = {
  LOBBY: 'lobby',
  ROLE_REVEAL: 'role_reveal',
  NIGHT: 'night',
  DAY: 'day',
  VOTING: 'voting',
  ENDED: 'ended'
};

// Zamanlayıcı Süreleri (saniye)
const TIMERS = {
  ROLE_REVEAL: 5,
  NIGHT: 30,
  DAY: 60,
  VOTING: 30
};

// Rol Dağılımı (oyuncu sayısına göre)
const ROLE_DISTRIBUTION = {
  4: { vampir: 1, buyucu: 0, koylu: 3 },
  5: { vampir: 1, buyucu: 1, koylu: 3 },
  6: { vampir: 1, buyucu: 1, koylu: 4 },
  7: { vampir: 2, buyucu: 1, koylu: 4 },
  8: { vampir: 2, buyucu: 1, koylu: 5 },
  9: { vampir: 2, buyucu: 1, koylu: 6 },
  10: { vampir: 3, buyucu: 1, koylu: 6 },
  11: { vampir: 3, buyucu: 1, koylu: 7 },
  12: { vampir: 3, buyucu: 2, koylu: 7 }
};

// Rol Açıklamaları
const ROLE_DESCRIPTIONS = {
  vampir: {
    name: 'Vampir',
    description: 'Geceleri köylüleri avla. Diğer vampirleri görebilirsin.',
    emoji: '🧛'
  },
  koylu: {
    name: 'Köylü',
    description: 'Vampirleri bul ve gündüz oylamasında elemeye çalış.',
    emoji: '👨‍🌾'
  },
  buyucu: {
    name: 'Büyücü',
    description: 'Her gece bir kişiyi vampirlerden koruyabilirsin.',
    emoji: '🧙'
  }
};

module.exports = {
  ROLES,
  PHASES,
  TIMERS,
  ROLE_DISTRIBUTION,
  ROLE_DESCRIPTIONS
};
