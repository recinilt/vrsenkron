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

> **📌 TANIM:** Bu dokümantasyondaki **"BİLGİ BANKASI"** terimi, Claude'un document index'indeki `claudesync/` klasöründeki tüm proje dosyalarını ifade eder. Sohbete `/mnt/user-data/uploads/` yoluyla eklenen dosyalar ise **"Ekteki Dosyalar"** olarak anılır.

### Ana Özellikler:
- ✅ Gerçek zamanlı video senkronizasyonu
- ✅ VR desteği (A-Frame)
- ✅ P2P video paylaşımı (WebTorrent)
- ✅ Adaptive streaming (HLS/DASH)
- ✅ Otomatik sahiplik transferi
- ✅ Buffer yönetimi
- ✅ Drift düzeltme mekanizması
- ✅ VR UI Panel (ekran kontrol, ses, video, seek bar)

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

| Dosya | Görev |
|-------|-------|
| js01.js | Temel değişkenler ve konfigürasyon |
| js02.js | Global state yönetimi |
| js03.js | Adaptive streaming yönetimi |
| js04.js | DASH kalite kontrolü |
| js05.js | HLS/DASH setup |
| js06.js | Seek işlemleri |
| js07.js | Firebase init ve helper'lar |
| js08.js | RAF queue ve caching |
| js09.js | Cleanup fonksiyonları |
| js10.js | P2P video source switching |
| js11.js | P2P client destroy |
| js12.js | P2P seeding (yayıncı) |
| js13.js | P2P joining (izleyici) |
| js14.js | P2P UI güncellemeleri |
| js15.js | Dosya seçme event'leri |
| js16.js | Full cleanup |
| js17.js | Firebase batch updates |
| js18.js | Oda oluşturma |
| js19.js | Odaya katılma |
| js20.js | Sahiplik transferi |
| js21.js | Odadan ayrılma |
| js22.js | Oda listesi gösterme |
| js23.js | UI geçişleri |
| js24.js | 3D sahne oluşturma |
| js25.js | VR buton yönetimi |
| js26.js | Video oynatma |
| js27.js | Video duraklama |
| js28.js | Sync başlatma |
| js29.js | Sync state uygulama |
| js30.js | Sync countdown |
| js31.js | Sync execution |
| js32.js | Sync state temizleme |
| js33.js | Video state dinleme |
| js34.js | Video senkronizasyonu |
| js35.js | Video state listener |
| js36.js | Keyframe gönderme |
| js37.js | Keyframe dinleme |
| js38.js | Drift tracking |
| js39.js | Sahip kontrolü |
| js40.js | Periodic tasks ve init |
| js41.js | VR UI Panel (ekran, ses, video, seek bar) |

---

## ⚙️ Özellikler

### 1. Video Senkronizasyonu
- Gerçek zamanlı oynatma durumu senkronizasyonu
- Drift düzeltme (3 seviyeli: TIER1, TIER2, TIER3)
- Hard seek mekanizması (9+ saniye sapma)
- Buffer-wait sistemi

### 2. P2P Video Paylaşımı
- WebTorrent ile peer-to-peer video aktarımı
- Magnet URI oluşturma ve paylaşma
- İndirme/yükleme progress tracking
- Peer sayısı gösterimi

### 3. Adaptive Streaming
- HLS (.m3u8) desteği
- DASH (.mpd) desteği
- Kalite sınırlama (360p, 480p, 720p)
- Otomatik bandwidth adaptasyonu

### 4. VR Özellikleri
- A-Frame tabanlı VR ortamı
- VR kontrolör desteği
- Raycaster ile etkileşim
- 3 farklı ekran boyutu (Orta, Büyük, IMAX)

**VR UI Panel (js41.js):**
- Ekran hareket kontrolleri (yukarı, aşağı, sol, sağ, yakın, uzak, sıfırla)
- Ekran boyut ayarı (büyüt/küçült)
- Ses kontrolleri (ses+, ses-, sessiz)
- Video kontrolleri (geri/ileri sarma, oynat/duraklat, stop)
- Hassas seek bar (tıklama ile pozisyon değiştirme)
- Gerçek zamanlı zaman göstergesi
- Ses seviyesi göstergesi

### 5. Sahiplik Sistemi
- Oda sahibi ayrılınca otomatik transfer
- En eski katılımcıya sahiplik verme
- Owner-only kontroller

### 6. Performans Optimizasyonları
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
const firebaseConfig = {
    apiKey: "AIzaSyC60idSLdAiqAjPWAOMaM3g8LAKPGEUwH8",
    authDomain: "vr-sinema.firebaseapp.com",
    databaseURL: "https://vr-sinema-default-rtdb.firebaseio.com",
    projectId: "vr-sinema",
    storageBucket: "vr-sinema.firebasestorage.app",
    messagingSenderId: "724648238300",
    appId: "1:724648238300:web:dceba8c536e8a5ffd96819"
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

```
claudesync/                 # ← BİLGİ BANKASI (Ana Proje)
├── index.html              # Ana HTML dosyası
├── styles.css              # CSS stilleri
├── firebase-rules.json     # Firebase güvenlik kuralları
├── CLAUDE.md               # Proje dokümantasyonu
├── js01.js - js41.js       # 41 adet JavaScript modülü
```

---

## 🔥 Firebase Yapılandırması

### Veritabanı Yapısı

```
rooms/
  └── $roomId/
      ├── name: string
      ├── owner: string (userId)
      ├── videoUrl: string
      ├── screenSize: "medium" | "large" | "imax"
      ├── environment: "none" | "minimal"
      ├── createdAt: timestamp
      ├── p2p/
      │   ├── magnetURI: string
      │   ├── fileName: string
      │   └── fileSize: number
      ├── activeViewers/
      │   └── $userId/
      │       ├── joinedAt: timestamp
      │       ├── lastSeen: timestamp
      │       ├── isOwner: boolean
      │       ├── currentDrift: number
      │       └── currentPosition: number
      ├── videoState/
      │   ├── isPlaying: boolean
      │   ├── currentTime: number
      │   ├── startTimestamp: number
      │   └── lastUpdate: timestamp
      ├── keyframes/
      │   └── $keyframeId/
      │       ├── time: number
      │       └── timestamp: timestamp
      └── syncState/
          ├── isBuffering: boolean
          ├── syncedSeekPosition: number
          ├── syncedPlayTime: number
          ├── initiatedBy: string
          └── initiatedAt: timestamp
```

---

## 🔧 Önemli Fonksiyonlar

### Oda Yönetimi

| Fonksiyon | Dosya | Görev |
|-----------|-------|-------|
| `createRoom()` | js18.js | Yeni oda oluşturur, P2P modunda torrent seed'ler |
| `joinRoom(roomId)` | js19.js | Odaya katılır, listener'ları başlatır |
| `leaveRoom()` | js21.js | Odadan ayrılır, tüm kaynakları temizler |

### Video Kontrolleri

| Fonksiyon | Dosya | Görev |
|-----------|-------|-------|
| `playVideo()` | js26.js | Owner tarafından video oynatılır |
| `pauseVideo()` | js27.js | Owner tarafından video duraklatılır |
| `stopVideo()` | js41.js | Video durur ve başa sarar |
| `seekForward()` | js06.js | 10 saniyelik ileri sarma |
| `seekBackward()` | js06.js | 10 saniyelik geri sarma |

### Senkronizasyon

| Fonksiyon | Dosya | Görev |
|-----------|-------|-------|
| `syncVideo()` | js34.js | İzleyicilerin pozisyonunu ayarlar |
| `initiateSync()` | js28.js | Tüm izleyicileri senkronize eder |
| `sendKeyframe()` | js36.js | Owner keyframe gönderir |
| `listenKeyframes()` | js37.js | Viewer keyframe'leri dinler |

### VR UI Panel (js41.js)

| Fonksiyon | Görev |
|-----------|-------|
| `createVRUIPanel()` | VR kontrol paneli oluşturur |
| `moveScreen(direction)` | Ekranı hareket ettirir |
| `scaleScreen(direction)` | Ekranı büyütür/küçültür |
| `adjustVolume(delta)` | Ses seviyesini ayarlar |
| `toggleMute()` | Sessiz modu açar/kapar |
| `createVRSeekBar(panel)` | Hassas seek bar oluşturur |
| `seekToPosition(percentage)` | Belirtilen pozisyona atlar |

### Cleanup & Memory Management

| Fonksiyon | Dosya | Görev |
|-----------|-------|-------|
| `fullCleanup()` | js16.js | Tüm kaynakları temizler |
| `clearVideoListeners()` | js09.js | Video listener'larını temizler |
| `cleanupVRUIPanel()` | js41.js | VR panel'i temizler |

---

## 🔄 Senkronizasyon Mekanizması

### Clock Sync
```javascript
// js17.js - initClockSync()
// 3 sample alır, ortalama offset hesaplar
clockOffset = (sample1 + sample2 + sample3) / 3
```

### Drift Seviyeleri
| Seviye | Aralık | Playback Rate |
|--------|--------|---------------|
| TIER1 | 0-300ms | 1.0x |
| TIER2 | 300-800ms | 1.05x |
| TIER3 | 800-1500ms | 1.15x |
| Büyük | 1.5-9s | 1.25x-1.5x |
| Hard Seek | 9+ saniye | Seek + Buffer |

### Keyframe Sistemi
- **Gönderen:** Owner her 10 saniyede bir keyframe gönderir (js36.js)
- **Dinleyen:** Viewer'lar keyframe'leri dinler, 9+ saniye drift varsa hard seek (js37.js)

---

## 📡 P2P (WebTorrent) Desteği

### Akış

1. **Oda Sahibi (Seeder):**
   - Lokal dosyayı seçer
   - `seedLocalVideo()` ile torrent oluşturulur
   - Magnet URI Firebase'e kaydedilir

2. **İzleyici (Leecher):**
   - Magnet URI Firebase'den alınır
   - `joinP2PTorrent()` ile torrent'e katılır
   - Video dosyası indirilir ve oynatılır

### Tracker'lar
```javascript
const WEBTORRENT_TRACKERS = [
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
    'wss://tracker.webtorrent.dev'
];
```

---

## 📺 Adaptive Streaming (ABR)

### Desteklenen Formatlar
- **HLS (.m3u8):** HLS.js ile
- **DASH (.mpd):** dash.js ile
- **Progressive (mp4, webm):** Native HTML5

### Kalite Sınırlama
```javascript
const QUALITY_CAPS = [360, 480, 720];
let abrMaxHeightCap = 720; // Kullanıcı ayarlayabilir
```

---

## ⚡ Performans Optimizasyonları

### 1. Memory Leak Prevention
```javascript
const activeIntervals = [];
const activeTimeouts = [];
const firebaseListeners = [];
```

### 2. DOM Caching
```javascript
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
function queueRAF(callback) {
    rafQueue.push(callback);
    if (!rafScheduled) {
        requestAnimationFrame(() => { /* ... */ });
    }
}
```

### 4. Firebase Batch Updates
```javascript
function queueFirebaseUpdate(path, value) {
    pendingFirebaseUpdates[path] = value;
    setTimeout(flushFirebaseUpdates, 1000);
}
```

---

## 🐛 Bilinen Sorunlar ve Çözümler

| FIX | Sorun | Çözüm |
|-----|-------|-------|
| #1 | Video listener memory leak | `videoElement.listeners` array ile track |
| #2 | VR panel button listeners | `panel._buttonListeners` ile sakla |
| #3 | joinRoom race condition | `isJoiningRoom` flag ile kilitle |
| #4 | Sync seek/play race | `seeked` event bekle |
| #5 | Main thread bloklama | RAF kullan |
| #6 | Buffer flag temizleme | Pause'da `isBuffering = false` |
| #7 | hashchange listener leak | Referans sakla, cleanup'ta kaldır |
| #8 | onDisconnect referans leak | `currentOnDisconnectRef` ile yönet |
| #9 | Sync timeout uzun | 30s → 15s |
| #10 | syncVideoState recursive | `isSyncingVideoState` flag |
| #11 | Countdown interval birikmesi | Mevcut interval'ı temizle |
| #12 | DOM thrashing | Element cache + `queueRAF()` |

---

## 🎮 Kullanım Kılavuzu

### Oda Oluşturma
1. "Oda Adı" girin
2. Video kaynağı seçin (URL veya P2P)
3. Ekran boyutu ve ortam ayarlayın
4. "Oda Oluştur ve Katıl" butonuna basın

### Kontroller (Oda Sahibi)
| Buton | Görev |
|-------|-------|
| ▶️ Oynat | Videoyu başlatır |
| ⏸️ Duraklat | Videoyu durdurur |
| ⏹️ Stop | Başa sarar ve durdurur |
| ⏪ -10s | 10 saniye geri |
| ⏩ +10s | 10 saniye ileri |
| 🔄 Sync | Tüm izleyicileri senkronize eder |

### Keyboard Kısayolları
| Tuş | Görev |
|-----|-------|
| Space | Play/Pause |
| ← | -10s |
| → | +10s |

### VR Kontrol Paneli (Sol taraf)
- **Ekran Hareket:** 8 yönlü kontrol
- **Ekran Boyut:** Büyüt/Küçült
- **Ses Kontrol:** +/-/Mute
- **Video Kontrol:** Play/Pause/Stop/Seek
- **Seek Bar:** Hassas tıklama ile pozisyon değiştir

---

## 📊 Sabitler

```javascript
const SYNCCHECKINTERVAL = 750;
const KEYFRAME_INTERVAL = 10000;
const CLOCK_SYNC_INTERVAL = 60000;
const DRIFT_UPDATE_INTERVAL = 10000;
const PRESENCE_UPDATE_INTERVAL = 30000;
const PRELOAD_BUFFER_SECONDS = 9;

const TIER1_THRESHOLD = 300;
const TIER2_THRESHOLD = 800;
const TIER3_THRESHOLD = 1500;
const LARGE_DRIFT_THRESHOLD = 9000;
const HARD_SEEK_MIN_INTERVAL = 2000;
```

---

## 🚀 Deployment

### Namecheap Hosting
- Domain: `https://vr-sinema.online`
- Klasör: `public_html/vr-sinema/`

### GitHub Pages
- Repository: `recinilt/mefeypublicv2`
- URL: `https://recinilt.github.io/mefeypublicv2/`

### Cache Busting
```html
<script>
const v = new Date().getTime();
document.write('<script src="js01.js?v=' + v + '"><\/script>');
// ... js01.js - js41.js
</script>
```

---

**Versiyon:** 3.7  
**Son Güncelleme:** 2025