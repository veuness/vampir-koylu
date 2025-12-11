// Oyun Rolleri
const ROLES = {
  VAMPIR: 'vampir',
  KOYLU: 'koylu',
  DOKTOR: 'doktor',
  GOZCU: 'gozcu',
  JESTER: 'jester',
  ESKORT: 'eskort'
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

// Varsayılan Zamanlayıcı Süreleri (saniye)
const DEFAULT_TIMERS = {
  ROLE_REVEAL: 5,
  NIGHT: 30,
  DAY: 60,
  VOTING: 30
};

// Varsayılan Oda Ayarları
const DEFAULT_ROOM_CONFIG = {
  roomName: 'Vampir Köylü Odası',
  maxPlayers: 8,
  roles: {
    vampir: 2,
    doktor: 1,
    gozcu: 1,
    jester: 0,
    eskort: 0,
    koylu: 4
  },
  timers: {
    day: 60,
    voting: 30
  }
};

// Rol Dağılımı (oyuncu sayısına göre) - Otomatik mod için
const ROLE_DISTRIBUTION = {
  4: { vampir: 1, doktor: 0, gozcu: 0, jester: 0, eskort: 0, koylu: 3 },
  5: { vampir: 1, doktor: 1, gozcu: 0, jester: 0, eskort: 0, koylu: 3 },
  6: { vampir: 1, doktor: 1, gozcu: 1, jester: 0, eskort: 0, koylu: 3 },
  7: { vampir: 2, doktor: 1, gozcu: 1, jester: 0, eskort: 0, koylu: 3 },
  8: { vampir: 2, doktor: 1, gozcu: 1, jester: 0, eskort: 1, koylu: 3 },
  9: { vampir: 2, doktor: 1, gozcu: 1, jester: 1, eskort: 1, koylu: 3 },
  10: { vampir: 3, doktor: 1, gozcu: 1, jester: 1, eskort: 1, koylu: 3 },
  11: { vampir: 3, doktor: 1, gozcu: 1, jester: 1, eskort: 1, koylu: 4 },
  12: { vampir: 3, doktor: 2, gozcu: 1, jester: 1, eskort: 1, koylu: 4 }
};

// Rol Açıklamaları
const ROLE_DESCRIPTIONS = {
  vampir: {
    name: 'Vampir',
    description: 'Geceleri köylüleri avla. Diğer vampirleri görebilirsin.',
    emoji: '🧛',
    team: 'vampir'
  },
  koylu: {
    name: 'Köylü',
    description: 'Vampirleri bul ve gündüz oylamasında elemeye çalış.',
    emoji: '👨‍🌾',
    team: 'villager'
  },
  doktor: {
    name: 'Doktor',
    description: 'Her gece bir kişiyi vampirlerden koruyabilirsin.',
    emoji: '👨‍⚕️',
    team: 'villager'
  },
  gozcu: {
    name: 'Gözcü',
    description: 'Her gece bir kişinin vampir olup olmadığını öğrenebilirsin.',
    emoji: '🔮',
    team: 'villager'
  },
  jester: {
    name: 'Jester',
    description: 'Amacın: Köy halkını seni asmaları için kandır! Asılırsan tek başına kazanırsın.',
    emoji: '🃏',
    team: 'neutral'
  },
  eskort: {
    name: 'Eskort',
    description: 'Her gece birini ziyaret edebilir veya evde kalabilirsin. Ziyaret ettiğin kişi saldırıya uğrarsa sen de ölürsün!',
    emoji: '💃',
    team: 'villager'
  }
};

module.exports = {
  ROLES,
  PHASES,
  DEFAULT_TIMERS,
  DEFAULT_ROOM_CONFIG,
  ROLE_DISTRIBUTION,
  ROLE_DESCRIPTIONS
};
