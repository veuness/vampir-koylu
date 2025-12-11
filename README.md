# 🧛 Vampir Köylü - Multiplayer Browser Game

Gerçek zamanlı, tarayıcı tabanlı multiplayer sosyal çıkarım oyunu.

## 🎮 Özellikler

- **Gerçek Zamanlı Multiplayer**: Socket.io ile anlık iletişim
- **Roller**: Vampir, Köylü, Büyücü
- **Gece/Gündüz Döngüsü**: Otomatik faz geçişleri
- **Oylama Sistemi**: Demokratik eleme
- **Chat Sistemi**: Faza özel mesajlaşma
- **4-12 Oyuncu Desteği**

## 🛠️ Teknolojiler

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React (Vite), TailwindCSS
- **Mimari**: Monolitik (Tek Sunucu)

## 📦 Kurulum

### 1. Bağımlılıkları Yükle

```bash
# Kök dizinde
npm install

# Client dizininde
cd client
npm install
cd ..
```

Veya tek komutla:
```bash
npm run install:all
```

### 2. Development Modunda Çalıştır

```bash
# Her iki sunucuyu da çalıştır (concurrent)
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

### 3. Production Build

```bash
# React build al (public klasörüne)
npm run build

# Production sunucuyu başlat
npm start
```

## 🚀 Deployment (Plesk)

1. Projeyi sunucuya yükle
2. `npm install` çalıştır
3. `npm run build` çalıştır
4. Node.js uygulaması olarak `server.js` ayarla
5. Port: `process.env.PORT` kullanılır

## 📁 Proje Yapısı

```
vampir-koylu/
├── server.js              # Ana sunucu dosyası
├── package.json           # Root dependencies
├── game/
│   ├── constants.js       # Oyun sabitleri
│   ├── RoomManager.js     # Oda yönetimi
│   └── GameManager.js     # Oyun mantığı
├── client/
│   ├── package.json       # Frontend dependencies
│   ├── vite.config.js     # Vite yapılandırması
│   ├── tailwind.config.js # TailwindCSS
│   └── src/
│       ├── App.jsx        # Ana bileşen
│       ├── socket.js      # Socket.io client
│       └── components/
│           ├── WelcomeScreen.jsx
│           ├── LobbyScreen.jsx
│           ├── WaitingRoom.jsx
│           ├── GameScreen.jsx
│           └── Chat.jsx
└── public/               # Build çıktısı (gitignore)
```

## 🎭 Roller

| Rol | Emoji | Açıklama |
|-----|-------|----------|
| Vampir | 🧛 | Gece köylüleri avlar. Diğer vampirleri görür. |
| Köylü | 👨‍🌾 | Vampirleri bulup oylamayla elemeli. |
| Büyücü | 🧙 | Her gece birini vampirlerden koruyabilir. |

## 🔧 GitHub'a Yükleme

```bash
# Git reposunu başlat (zaten varsa atla)
git init

# Tüm dosyaları ekle
git add .

# Commit
git commit -m "Initial commit: Vampir Köylü multiplayer game"

# Remote ekle (kendi repo URL'inizi kullanın)
git remote add origin https://github.com/KULLANICI_ADI/vampir-koylu.git

# Push
git push -u origin main
```

## 📝 Lisans

ISC