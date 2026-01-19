# 🎬 VR Cinema ULTRA - Teknik Dokümantasyon

## 📋 İçindekiler
- [Proje Genel Bakış](#proje-genel-bakış)
- [Teknoloji Stack](#teknoloji-stack)
- [Mimari Yapı](#mimari-yapı)
- [Özellikler](#özellikler)
- [Kurulum](#kurulum)
- [Dosya Yapısı](#dosya-yapısı)
- [Firebase Yapılandırması](#firebase-yapılandırması)
- [Önemli Fonksiyonlar](#önemli-fonksiyonlar)
- [Senkronizasyon Mekanizması](#senkronizasyon-mekanizması)
- [P2P (WebTorrent) Desteği](#p2p-webtorrent-desteği)
- [Adaptive Streaming (ABR)](#adaptive-streaming-abr)
- [Performans Optimizasyonları](#performans-optimizasyonları)
- [Bilinen Sorunlar ve Çözümler](#bilinen-sorunlar-ve-çözümler)

---

## 🎯 Proje Genel Bakış

**VR Cinema ULTRA**, çoklu kullanıcıların bir arada VR ortamında senkronize video izleyebileceği bir web uygulamasıdır.

> **📌 TANIM:** Bu dokümantasyondaki **"BİLGİ BANKASI"** terimi, Claude'un document index'indeki (1-45) `claudesync/` klasöründeki tüm proje dosyalarını ifade eder. Sohbete `/mnt/user-data/uploads/` yoluyla eklenen dosyalar ise **"Ekteki Dosyalar"** olarak anılır.

### Ana Özellikler:
- ✅ Gerçek zamanlı video senkronizasyonu
- ✅ VR desteği (A-Frame)
- ✅ P2P video paylaşımı (WebTorrent)
- ✅ Adaptive streaming (HLS/DASH)
- ✅ Otomatik sahiplik transferi
- ✅ Buffer yönetimi
- ✅ Drift düzeltme mekanizması

---

## 🛠️ Teknoloji Stack

### Frontend
- **A-Frame 1.6.0** - VR framework
- **HTML5 Video** - Video oynatma
- **CSS3** - Stil ve animasyonlar

### Backend & Veritabanı
- **Firebase Realtime Database** - Gerçek zamanlı veri senkronizasyonu
- **Firebase Authentication** - Anonim kullanıcı girişi

### Streaming Teknolojileri
- **HLS.js 1.6.15** - HLS streaming desteği
- **dash.js 5.1.1** - DASH streaming desteği
- **WebTorrent** - P2P video paylaşımı

### Performans & Optimizasyon
- Interval/timeout tracking (memory leak prevention)
- RAF (RequestAnimationFrame) queue
- Firebase batch updates
- DOM element caching

---

## 🏗️ Mimari Yapı

### Modüler JavaScript Yapısı

Proje 41 ayrı JavaScript dosyasına bölünmüştür:

```
js01.js → Temel değişkenler ve konfigürasyon
js02.js → Global state yönetimi
js03.js → Adaptive streaming yönetimi
js04.js → DASH kalite kontrolü
js05.js → HLS/DASH setup
js06.js → Seek işlemleri
js07.js → Firebase init ve helper'lar
js08.js → RAF queue ve caching
js09.js → Cleanup fonksiyonları
js10.js → P2P video source switching
js11.js → P2P client destroy
js12.js → P2P seeding (yayıncı)
js13.js → P2P joining (izleyici)
js14.js → P2P UI güncellemeleri
js15.js → Dosya seçme event'leri
js16.js → Full cleanup
js17.js → Firebase batch updates
js18.js → Oda oluşturma
js19.js → Odaya katılma
js20.js → Sahiplik transferi
js21.js → Odadan ayrılma
js22.js → Oda listesi gösterme
js23.js → UI geçişleri
js24.js → 3D sahne oluşturma
js25.js → VR buton yönetimi
js26.js → Video oynatma
js27.js → Video duraklama
js28.js → Sync başlatma
js29.js → Sync state uygulama
js30.js → Sync countdown
js31.js → Sync execution
js32.js → Sync state temizleme
js33.js → Video state dinleme
js34.js → Video senkronizasyonu
js35.js → Video state listener
js36.js → Keyframe gönderme
js37.js → Keyframe dinleme
js38.js → Drift tracking
js39.js → Sahip kontrolü
js40.js → Periodic tasks ve init
js41.js → VR UI Panel (ekran kontrol, ses, video kontrolleri, seek bar)
```

---

## ⚙️ Özellikler

### 1. **Video Senkronizasyonu**
- Gerçek zamanlı oynatma durumu senkronizasyonu
- Drift düzeltme (3 seviyeli: TIER1, TIER2, TIER3)
- Hard seek mekanizması (9+ saniye sapma)
- Buffer-wait sistemi

### 2. **P2P Video Paylaşımı**
- WebTorrent ile peer-to-peer video aktarımı
- Magnet URI oluşturma ve paylaşma
- İndirme/yükleme progress tracking
- Peer sayısı gösterimi

### 3. **Adaptive Streaming**
- HLS (.m3u8) desteği
- DASH (.mpd) desteği
- Kalite sınırlama (360p, 480p, 720p)
- Otomatik bandwidth adaptasyonu

### 4. **VR Özellikleri**
- A-Frame tabanlı VR ortamı
- VR kontrolör desteği
- Raycaster ile etkileşim
- 3 farklı ekran boyutu (Orta, Büyük, IMAX)
- **VR UI Panel (js41.js):**
  - Ekran hareket kontrolleri (yukarı, aşağı, sol, sağ, yakın, uzak)
  - Ekran boyut ayarı (büyüt/küçült)
  - Ses kontrolleri (ses+, ses-, sessiz)
  - Video kontrolleri (geri/ileri sarma, oynat/duraklat, durdur)
  - Hassas seek bar (tıklama ile pozisyon değiştirme)
  - Gerçek zamanlı zaman göstergesi
  - Ses seviyesi göstergesi

### 5. **Sahiplik Sistemi**
- Oda sahibi ayrılınca otomatik transfer
- En eski katılımcıya sahiplik verme
- Owner-only kontroller

### 6. **Performans Optimizasyonları**
- Memory leak prevention
- Interval/timeout tracking
- Firebase batch updates
- DOM element caching
- RAF queue sistemi

---

## 📦 Kurulum

### Gereksinimler
- Modern web tarayıcı (Chrome, Firefox, Edge)
- Firebase projesi
- WebTorrent tracker erişimi

### Adımlar

1. **Firebase Projesi Oluşturma**
```javascript
// Firebase config (js01.js içinde)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    databaseURL: "https://your-project.firebaseio.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

2. **Firebase Rules Ayarlama**
```bash
firebase deploy --only database
```
(firebase-rules.json dosyasını kullanın)

3. **Dosyaları Yükleme**
- Tüm JS dosyalarını sunucuya yükleyin
- index.html ve styles.css'i yükleyin
- Cache busting için `?v=timestamp` parametresi kullanılıyor

4. **Test Etme**
- İki farklı tarayıcı/sekme açın
- Birinden oda oluşturun
- Diğerinden odaya katılın

---

## 📁 Dosya Yapısı

> **ÖNEMLİ NOT:** Bu dokümantasyonda **"BİLGİ BANKASI"** terimi, Claude'un context window'undaki (document index 1-45) `claudesync/` klasöründeki dosyaları ifade eder:
> - `claudesync/index.html`
> - `claudesync/styles.css`
> - `claudesync/js01.js` - `js41.js` (41 adet JavaScript modülü)
> - `claudesync/firebase-rules.json`
> - `claudesync/CLAUDE.md` (bu dokümantasyon)
>
> **Sohbete eklenen dosyalar** (`/mnt/user-data/uploads/` klasöründeki) ise **"EKTEKİ DOSYALAR"** veya **"REFERANS DOSYALAR"** olarak anılır.

```
claudesync/                 # ← BİLGİ BANKASI (Ana Proje)
├── index.html              # Ana HTML dosyası
├── styles.css              # CSS stilleri
├── firebase-rules.json     # Firebase güvenlik kuralları
├── CLAUDE.md               # Proje dokümantasyonu
├── js01.js                 # Config ve state
├── js02.js                 # Global değişkenler
├── js03.js                 # ABR yönetimi
├── ...                     # (41 JS dosyası)
├── js40.js                 # Init ve periodic tasks
└── js41.js                 # VR UI Panel (ekran, ses, video kontrolleri)
```

---

## 🔥 Firebase Yapılandırması

### Veritabanı Yapısı

```
rooms/
  ├── $roomId/
  │   ├── name: string
  │   ├── owner: string (userId)
  │   ├── videoUrl: string
  │   ├── screenSize: "medium" | "large" | "imax"
  │   ├── environment: "none" | "minimal"
  │   ├── createdAt: timestamp
  │   ├── p2p/
  │   │   ├── magnetURI: string
  │   │   ├── fileName: string
  │   │   └── fileSize: number
  │   ├── activeViewers/
  │   │   └── $userId/
  │   │       ├── joinedAt: timestamp
  │   │       ├── lastSeen: timestamp
  │   │       ├── isOwner: boolean
  │   │       ├── currentDrift: number
  │   │       └── currentPosition: number
  │   ├── videoState/
  │   │   ├── isPlaying: boolean
  │   │   ├── currentTime: number
  │   │   ├── startTimestamp: number
  │   │   └── lastUpdate: timestamp
  │   ├── keyframes/
  │   │   └── $keyframeId/
  │   │       ├── time: number
  │   │       └── timestamp: timestamp
  │   └── syncState/
  │       ├── isBuffering: boolean
  │       ├── syncedSeekPosition: number
  │       ├── syncedPlayTime: number
  │       ├── initiatedBy: string
  │       └── initiatedAt: timestamp
```

### Güvenlik Kuralları Özeti
- Tüm okuma/yazma işlemleri authentication gerektirir
- Keyframe sadece owner tarafından yazılabilir
- Viewer sadece kendi verilerini güncelleyebilir
- Validation kuralları ile veri bütünlüğü sağlanır

---

## 🔧 Önemli Fonksiyonlar

### Oda Yönetimi

#### `createRoom()`
**Dosya:** js18.js  
**Görev:** Yeni oda oluşturur, P2P modunda torrent seed'ler

```javascript
async function createRoom()
```

#### `joinRoom(roomId)`
**Dosya:** js19.js  
**Görev:** Odaya katılır, listener'ları başlatır, sahiplik kontrolü yapar

```javascript
async function joinRoom(roomId)
```

#### `leaveRoom()`
**Dosya:** js21.js  
**Görev:** Odadan ayrılır, tüm listener'ları ve kaynakları temizler

```javascript
function leaveRoom()
```

### Video Kontrolleri

#### `playVideo()`
**Dosya:** js26.js  
**Görev:** Owner tarafından video oynatılır

```javascript
function playVideo()
```

#### `pauseVideo()`
**Dosya:** js27.js  
**Görev:** Owner tarafından video duraklatılır, keyframe/syncState temizlenir

```javascript
function pauseVideo()
```

#### `seekForward()` / `seekBackward()`
**Dosya:** js06.js  
**Görev:** 10 saniyelik ileri/geri sarma (debounced)

```javascript
function seekForward()
function seekBackward()
```

### Senkronizasyon

#### `syncVideo()`
**Dosya:** js34.js  
**Görev:** İzleyicilerin video pozisyonunu ve hızını ayarlar

**Drift Seviyeleri:**
- **TIER1 (0-300ms):** Playback rate 1.0
- **TIER2 (300-800ms):** Playback rate 1.05 (geriden gelenler)
- **TIER3 (800-1500ms):** Playback rate 1.15
- **3-9 saniye:** Aggressive playback rate (1.5x / 0.75x)
- **9+ saniye:** Hard seek + buffer-wait

```javascript
function syncVideo()
```

#### `initiateSync()`
**Dosya:** js28.js  
**Görev:** Kullanıcı "Sync" butonuna bastığında tüm izleyicileri senkronize eder

```javascript
function initiateSync()
```

### P2P Fonksiyonları

#### `seedLocalVideo(file)`
**Dosya:** js12.js  
**Görev:** Lokal video dosyasını WebTorrent ile seed eder

```javascript
async function seedLocalVideo(file)
```

#### `joinP2PTorrent(magnetURI)`
**Dosya:** js13.js  
**Görev:** Magnet URI'den torrent'e katılır, video dosyasını indirir

```javascript
async function joinP2PTorrent(magnetURI)
```

### Cleanup & Memory Management

#### `fullCleanup()`
**Dosya:** js16.js  
**Görev:** Tüm interval, timeout, listener ve kaynakları temizler

```javascript
function fullCleanup()
```

#### `clearVideoListeners()`
**Dosya:** js09.js  
**Görev:** Video element üzerindeki tüm event listener'ları temizler

```javascript
function clearVideoListeners()
```

### VR UI Panel Fonksiyonları

#### `createVRUIPanel()`
**Dosya:** js41.js  
**Görev:** VR ortamında sol tarafta kontrol paneli oluşturur

**Panel Özellikleri:**
- Ekran hareket kontrolleri (8 yön)
- Ekran boyut ayarı
- Ses kontrolleri (artır/azalt/sessiz)
- Video kontrolleri (oynat/durdur/sarma)
- Hassas seek bar (lokal koordinat ile tıklama)
- Gerçek zamanlı zaman göstergesi

```javascript
function createVRUIPanel()
```

#### `moveScreen(direction)`
**Dosya:** js41.js  
**Görev:** VR ekranını hareket ettirir

```javascript
function moveScreen('up' | 'down' | 'left' | 'right' | 'forward' | 'backward' | 'reset')
```

#### `scaleScreen(direction)`
**Dosya:** js41.js  
**Görev:** VR ekranını büyütür/küçültür

```javascript
function scaleScreen('up' | 'down')
```

#### `adjustVolume(delta)`
**Dosya:** js41.js  
**Görev:** Ses seviyesini ayarlar

```javascript
function adjustVolume(delta) // delta: -0.1 veya 0.1
```

#### `createVRSeekBar(panel)`
**Dosya:** js41.js  
**Görev:** Hassas tıklamalı seek bar oluşturur

```javascript
function createVRSeekBar(panel)
```

---

## 🔄 Senkronizasyon Mekanizması

### Clock Sync
```javascript
// js17.js - initClockSync()
// 3 sample alır, ortalama offset hesaplar
clockOffset = (sample1 + sample2 + sample3) / 3
```

### Drift Tracking
```javascript
// js38.js - trackDrift()
expectedTime = currentTime + (serverTime - startTimestamp) / 1000
drift = (videoElement.currentTime - expectedTime) * 1000
```

### Keyframe Sistemi
- **Gönderen:** Owner her 10 saniyede bir keyframe gönderir (js36.js)
- **Dinleyen:** Viewer'lar keyframe'leri dinler, 9+ saniye drift varsa hard seek (js37.js)

### Sync State
- `isBuffering: true` → Tüm izleyiciler belirli pozisyonda duraklat
- `syncedPlayTime` set edilince → Countdown başlar, herkes aynı anda oynatır

---

## 📡 P2P (WebTorrent) Desteği

### Akış

1. **Oda Sahibi (Seeder):**
   - Lokal dosyayı seçer
   - `seedLocalVideo()` ile torrent oluşturulur
   - Magnet URI Firebase'e kaydedilir
   - Video `URL.createObjectURL()` ile oynatılır

2. **İzleyici (Leecher):**
   - Magnet URI Firebase'den alınır
   - `joinP2PTorrent()` ile torrent'e katılır
   - Video dosyası WebTorrent'ten `file.renderTo()` ile video element'e bağlanır
   - İndirme progress UI'da gösterilir

### Tracker'lar
```javascript
const WEBTORRENT_TRACKERS = [
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev'
];
```

### Progress Tracking
```javascript
// Her 500ms'de bir güncelleme
p2pUpdateInterval = setInterval(() => {
    const progress = Math.round(currentTorrent.progress * 100);
    const stats = `📥 ${downloadSpeed} | 📤 ${uploadSpeed} | 👥 ${numPeers}`;
    updateP2PStatus(`İndiriliyor: %${progress}`, progress);
}, 500);
```

---

## 📺 Adaptive Streaming (ABR)

### Desteklenen Formatlar
- **HLS (.m3u8):** HLS.js ile
- **DASH (.mpd):** dash.js ile
- **Progressive (mp4, webm):** Native HTML5

### Kalite Sınırlama
```javascript
// js03.js
const QUALITY_CAPS = [360, 480, 720];
let abrMaxHeightCap = 720; // Kullanıcı ayarlayabilir
```

### HLS Konfigürasyonu
```javascript
// js05.js
hlsInstance = new Hls({
    startLevel: 0,              // En düşük kaliteden başla
    minAutoBitrate: 0,
    abrEwmaDefaultEstimate: 150000, // Düşük başlangıç tahmini
    abrBandWidthFactor: 0.9,    // Muhafazakar kalite düşürme
    abrBandWidthUpFactor: 0.6   // Dikkatli yukarı geçiş
});
```

### DASH Konfigürasyonu
```javascript
// js05.js
dashInstance.updateSettings({
    streaming: {
        abr: {
            initialBitrate: { video: 150 }, // kbps
            minBitrate: { video: 100 },
            maxBitrate: { video: 2500 }
        }
    }
});
```

---

## ⚡ Performans Optimizasyonları

### 1. Memory Leak Prevention
```javascript
// js08.js - Tracking sistemleri
const activeIntervals = [];
const activeTimeouts = [];
const firebaseListeners = [];

function trackInterval(id) { activeIntervals.push(id); }
function trackTimeout(id) { activeTimeouts.push(id); }
function trackListener(ref) { firebaseListeners.push(ref); }
```

### 2. DOM Caching
```javascript
// js08.js
let cachedElements = {};
function getCachedElement(id) {
    if (!cachedElements[id]) {
        cachedElements[id] = document.getElementById(id);
    }
    return cachedElements[id];
}
```

### 3. RAF Queue
```javascript
// js08.js
let rafQueue = [];
function queueRAF(callback) {
    rafQueue.push(callback);
    if (!rafScheduled) {
        rafScheduled = true;
        requestAnimationFrame(() => {
            rafQueue.splice(0).forEach(cb => cb());
        });
    }
}
```

### 4. Firebase Batch Updates
```javascript
// js17.js
let pendingFirebaseUpdates = {};
function queueFirebaseUpdate(path, value) {
    pendingFirebaseUpdates[path] = value;
    setTimeout(flushFirebaseUpdates, 1000);
}
```

### 5. Throttled Video Texture Update
```javascript
// js40.js - A-Frame component
AFRAME.registerComponent('video-texture-fix', {
    updateInterval: 100, // 100ms (10 FPS)
    tick: function(time) {
        if (time - this.lastUpdate < this.updateInterval) return;
        if (this.material && this.material.map) {
            this.material.map.needsUpdate = true;
        }
    }
});
```

---

## 🐛 Bilinen Sorunlar ve Çözümler

### FIX #1: Video Listener Memory Leak
**Sorun:** Video element listener'ları temizlenmiyordu  
**Çözüm:** `videoElement.listeners` array'inde listener'ları track et, `clearVideoListeners()` ile temizle

### FIX #2: VR Panel Button Listeners
**Sorun:** VR butonlarının listener'ları kaldırılmıyordu  
**Çözüm:** `panel._buttonListeners` array'inde sakla, leaveRoom'da temizle

### FIX #3: joinRoom Race Condition
**Sorun:** Çift tıklamada iki kere joinRoom çağrılıyordu  
**Çözüm:** `isJoiningRoom` flag'i ile kilitle

### FIX #4: Sync Seek/Play Race
**Sorun:** Seek ve play aynı anda çalışıyordu  
**Çözüm:** `seeked` event'ini bekle, sonra play

### FIX #5: Main Thread Bloklama
**Sorun:** syncVideo çok uzun süren hesaplamalar yapıyordu  
**Çözüm:** Hesaplamaları böl, RAF kullan

### FIX #6: Buffer Flag Temizleme
**Sorun:** Pause sırasında `isBuffering` temizlenmiyordu  
**Çözüm:** Pause state'inde `isBuffering = false`

### FIX #7: hashchange Listener Leak
**Sorun:** hashchange listener kaldırılmıyordu  
**Çözüm:** `hashChangeHandler` referansı sakla, cleanup'ta kaldır

### FIX #8: onDisconnect Referans Leak
**Sorun:** Firebase onDisconnect referansları birikmişti  
**Çözüm:** `currentOnDisconnectRef` sakla, yeni joinRoom'da cancel et

### FIX #9: Sync Timeout Uzun
**Sorun:** 30 saniye buffer timeout çok uzundu  
**Çözüm:** 15 saniyeye düşürüldü

### FIX #10: syncVideoState Recursive Trigger
**Sorun:** syncVideoState kendini tetikliyordu  
**Çözüm:** `isSyncingVideoState` flag'i ile kilitle

### FIX #11: Countdown Interval Birikmesi
**Sorun:** Her sync'te yeni interval oluşuyordu  
**Çözüm:** Mevcut interval'ı temizle, yenisini track et

### FIX #12: DOM Thrashing
**Sorun:** Interval içinde DOM sorgulama yapılıyordu  
**Çözüm:** Element'leri loop dışında cache'le, `queueRAF()` kullan

### MEMORY LEAK FIX: Object URL
**Sorun:** `URL.createObjectURL()` ile oluşturulan URL'ler revoke edilmiyordu  
**Çözüm:** `currentVideoObjectURL` sakla, `revokeCurrentVideoURL()` ile temizle

---

## 🎮 Kullanım Kılavuzu

### Oda Oluşturma
1. "Oda Adı" girin
2. Video kaynağını seçin:
   - **URL:** YouTube, Google Drive veya direkt link
   - **P2P:** Lokal video dosyası seçin
3. Ekran boyutu ve ortam ayarlayın
4. "Oda Oluştur ve Katıl" butonuna basın

### Odaya Katılma
1. "Mevcut Odalar" butonuna basın
2. Listeden bir oda seçin
3. Otomatik olarak VR ortamına geçiş yapılır

### Kontroller (Oda Sahibi)
- **▶️ Oynat:** Videoyu başlatır
- **⏸️ Duraklat:** Videoyu durdurur
- **⏪ -10s:** 10 saniye geri sarar
- **⏩ +10s:** 10 saniye ileri sarar
- **🔄 Sync:** Tüm izleyicileri senkronize eder
- **📉/📈 Kalite:** Max streaming kalitesini ayarlar

### VR Modunda
- VR gözlük takın
- Cursor ile butonlara tıklayın
- **VR Kontrol Paneli (Sol tarafta):**
  - **Ekran Hareket:** Yukarı/Aşağı/Sol/Sağ/Yakın/Uzak/Sıfırla butonları
  - **Ekran Boyut:** Büyüt (+) / Küçült (-) butonları
  - **Ses Kontrol:** Ses+ / Ses- / Sessiz (M) butonları
  - **Video Kontrol:** << (Geri) / > (Oynat) / X (Dur) / >> (İleri)
  - **Hassas Seek Bar:** Zaman çubuğuna tıklayarak istediğiniz pozisyona atlayın
- Keyboard kısayolları:
  - `Space`: Play/Pause
  - `←`: -10s
  - `→`: +10s

---

## 🔐 Güvenlik

### Firebase Rules
- Authentication zorunlu
- Owner sadece kendi odasını kontrol edebilir
- Viewer sadece kendi verilerini güncelleyebilir
- Validation ile veri bütünlüğü sağlanır

### P2P Güvenlik
- WebTorrent trackers HTTPS/WSS kullanır
- Magnet URI Firebase'de şifreli saklanır
- Peer kimlik doğrulama yapılmaz (anonim)

---

## 📊 Sabitler ve Threshold'lar

```javascript
// js01.js
const SYNCCHECKINTERVAL = 750;          // Video state check interval
const KEYFRAME_INTERVAL = 10000;        // Owner keyframe gönderme
const CLOCK_SYNC_INTERVAL = 60000;      // Clock sync yenileme
const DRIFT_UPDATE_INTERVAL = 10000;    // Drift hesaplama
const PRESENCE_UPDATE_INTERVAL = 30000; // Presence güncelleme
const PRELOAD_BUFFER_SECONDS = 9;       // Buffer süresi

// Drift thresholds
const TIER1_THRESHOLD = 300;            // 0-300ms: 1.0x speed
const TIER2_THRESHOLD = 800;            // 300-800ms: 1.05x speed
const TIER3_THRESHOLD = 1500;           // 800-1500ms: 1.15x speed
const LARGE_DRIFT_THRESHOLD = 9000;     // 9+ saniye: Hard seek

// Hard seek throttle
const HARD_SEEK_MIN_INTERVAL = 2000;    // Min 2 saniye arayla hard seek
```

---

## 🚀 Deployment

### Namecheap Hosting
1. Tüm dosyaları FTP ile yükleyin
2. `public_html/vr-sinema/` klasörüne yerleştirin
3. Domain: `https://vr-sinema.online`

### GitHub Pages
1. Repository: `recinilt/mefeypublicv2`
2. GitHub Pages'de publish edin
3. URL: `https://recinilt.github.io/mefeypublicv2/`

### Cache Busting
```html
<script>
const v = new Date().getTime();
document.write('<script src="js01.js?v=' + v + '"><\/script>');
// ... (tüm JS dosyaları js01.js - js41.js)
document.write('<script src="js41.js?v=' + v + '"><\/script>');
</script>
```

---

## 📝 Lisans ve Katkı

**Proje:** VR Cinema ULTRA  
**Versiyon:** 3.7  
**Yazar:** [Proje Sahibi]  
**Tarih:** 2024

### Katkıda Bulunma
- Bug report: GitHub Issues
- Feature request: GitHub Discussions
- Code contribution: Pull Request

---

## 🔗 Bağlantılar

- **Firebase Console:** https://console.firebase.google.com
- **A-Frame Docs:** https://aframe.io/docs/
- **HLS.js:** https://github.com/video-dev/hls.js
- **dash.js:** https://github.com/Dash-Industry-Forum/dash.js
- **WebTorrent:** https://webtorrent.io/docs

---

## 📞 Destek

Sorunlarınız için:
1. Bu dokümantasyonu kontrol edin
2. Console log'larını inceleyin (`DEBUG_MODE = true`)
3. Firebase Rules'ı kontrol edin
4. Network tab'ı kontrol edin (P2P bağlantılar için)

---

**Son Güncelleme:** 2024  
**Dokümantasyon Versiyonu:** 1.0