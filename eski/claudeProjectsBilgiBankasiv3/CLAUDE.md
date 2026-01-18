# VR Sinema ULTRA - Proje Talimatları

## 📋 Proje Açıklaması
WebRTC tabanlı çok oyunculu VR sinema uygulaması. Kullanıcılar sanal gerçeklik ortamında birlikte video izleyebilir, P2P (WebTorrent) ile video paylaşabilir ve gerçek zamanlı senkronize film deneyimi yaşayabilir.

**Temel Özellikler:**
- Çoklu kullanıcı VR sinema odaları
- Gerçek zamanlı video senkronizasyonu
- WebTorrent P2P dosya paylaşımı
- Adaptive Bitrate Streaming (HLS.js + dash.js)
- Firebase Realtime Database backend
- A-Frame VR framework entegrasyonu

## 🚀 Teknoloji Yığını

### Frontend
- **JavaScript**: Vanilla JS (ES6+) - 40 modüler dosya
- **VR Framework**: A-Frame 1.6.0
- **Stil**: CSS3 (Gradients, Backdrop Filter, Flexbox)

### Backend & Database
- **Firebase Realtime Database**: Oda yönetimi, senkronizasyon
- **Firebase Auth**: Anonim kullanıcı doğrulama

### Video Streaming
- **HLS.js** v1.6.15 - HTTP Live Streaming
- **dash.js** v5.1.1 - MPEG-DASH streaming
- **WebTorrent** - P2P video paylaşımı

## 📁 Dosya Yapısı
`
/ (Ana dizin - klasörsüz yapı)
│
├── torentVr.html          # Ana HTML dosyası (giriş noktası)
├── styles.css             # Ana CSS dosyası
│
└── JavaScript Modülleri (40 dosya):
    ├── js1.js  - js10.js   → Firebase config, auth, initialization
    ├── js11.js - js20.js   → Adaptive streaming, video setup
    ├── js21.js - js22.js   → P2P/WebTorrent fonksiyonları
    ├── js23.js - js27.js   → UI controls, video playback
    ├── js28.js - js32.js   → Sync mechanism (multi-tier)
    ├── js33.js - js35.js   → Video state listeners, sync
    ├── js36.js - js38.js   → Keyframe system, drift tracking
    ├── js39.js - js40.js   → Presence, periodic tasks, A-Frame components
`

**NOT**: Tüm dosyalar ana dizinde, klasör yapısı yoktur. HTML'e tıklanınca site direkt açılır.

## 🎯 Modül Sorumlulukları

### Firebase & Auth (js1-js10)
- Firebase configuration ve initialization
- Anonymous authentication
- Database referans yönetimi
- Cleanup tracking (intervals, listeners, timeouts)

### Video Streaming (js11-js20)
- HLS.js ve dash.js adaptive streaming
- YouTube/Google Drive URL processing
- Quality cap system (720p, 1080p, etc.)
- Video source detection ve setup

### P2P WebTorrent (js21-js22)
- seedLocalFile() - Lokal dosya seed etme
- joinP2PTorrent() - Magnet URI ile katılma
- P2P progress tracking
- WebTorrent client yönetimi

### UI & Controls (js23-js27)
- Room list gösterimi
- 3D scene oluşturma (A-Frame)
- Video playback controls (owner only)
  - playVideo()
  - pauseVideo()
  - seekBackward() / seekForward()

### Senkronizasyon (js28-js35)
- **Multi-Tier Drift Correction**:
  - Tier 1: <300ms → playbackRate 1.0
  - Tier 2: 300-700ms → playbackRate 1.15/0.95
  - Tier 3: 700-1500ms → playbackRate 1.2/0.90
  - Large: >9000ms → Hard seek + 9s buffer
- initiateSync() - Manuel senkronizasyon
- syncVideo() - Otomatik drift düzeltme
- syncVideoState() - Owner state broadcast

### Keyframe & Tracking (js36-js38)
- sendKeyframe() - Owner 5 saniyede bir keyframe
- listenKeyframes() - Non-owner keyframe dinleme
- 	rackDrift() - Drift hesaplama ve Firebase update
- updatePresence() - Kullanıcı presence tracking

### Periodic Tasks & Cleanup (js39-js40)
- checkOwnerPresence() - Owner timeout kontrolü
- cleanupOldData() - Eski keyframe/viewer temizliği
- startPeriodicTasks() - Clock sync, drift, presence intervals
- startOwnerTasks() - Keyframe ve cleanup intervals
- A-Frame ideo-texture-fix component (throttled to 100ms)

## 💻 Kod Konvansiyonları

### JavaScript
- **ES6+ Syntax**: Arrow functions, template literals, destructuring
- **Global State Variables**:
`javascript
  currentRoomId         // Aktif oda ID
  currentUser           // Firebase auth user
  isRoomOwner           // Boolean - oda sahibi mi?
  videoElement          // <video> DOM element
  currentRoomData       // Oda bilgisi object
  syncState             // Sync state object
`
- **Naming Convention**:
  - camelCase for functions: createRoom(), syncVideo()
  - UPPER_CASE for constants: TIER1_THRESHOLD, SYNCCHECKINTERVAL
  - Boolean flags: isSeeking, isHardSeeking, isBuffering
  - Descriptive names: ufferCountdownInterval, lastHardSeekTime

### HTML
- **Semantic Structure**: <div id="ui-overlay">, <div id="vr-controls">
- **A-Frame Elements**: 
  - <a-scene> - VR sahne container
  - <a-camera> - VR kamera + raycaster
  - <a-plane> - Video ekranı
  - <a-text> - VR butonları (owner için)
- **Dynamic Loading**: 
`javascript
  const v = new Date().getTime();
  document.write('<script src="js1.js?v=' + v + '"><\/script>');
`
  Cache-busting için timestamp parametresi

### CSS
- **Modern Features**:
  - ackdrop-filter: blur(10px) - Glassmorphism efekti
  - linear-gradient(135deg, #667eea 0%, #764ba2 100%) - Gradient backgrounds
  - Flexbox layouts
- **Responsive**: 
`css
  @media (max-width: 600px) { ... }
`
- **Utility Classes**: .hidden, .status-good, .status-warning, .status-error

## 🔧 Kritik Fonksiyonlar ve Fix'ler

### Room Management
`javascript
createRoom()              // Yeni oda oluştur + Firebase'e kaydet
joinRoom(roomId)          // Odaya katıl + listeners başlat
leaveRoom()               // Odadan ayrıl + cleanup
showRoomList()            // Aktif odaları listele
`

### Video Control (Owner Only)
`javascript
playVideo()               // Video oynat + Firebase state update
pauseVideo()              // Video duraklat + keyframes temizle
seekBackward()            // -10 saniye
seekForward()             // +10 saniye
`

### Sync System
`javascript
syncVideo()               // Multi-tier drift correction
  ├─ Tier 1: <300ms      → playbackRate 1.0
  ├─ Tier 2: 300-700ms   → playbackRate 1.15/0.95
  ├─ Tier 3: 700-1500ms  → playbackRate 1.2/0.90
  └─ Large: >9000ms      → Hard seek + 9s buffer wait

syncVideoState()          // Owner: Firebase'e state gönder
listenVideoState()        // Non-owner: Firebase'den dinle
initiateSync()            // Manuel sync tetikleme (tüm kullanıcılar)
`

### P2P System
`javascript
setupFileInput()          // File input event listeners
handleLocalFileUpload()   // Lokal dosya seçildi
seedLocalFile(file)       // WebTorrent seed başlat
joinP2PTorrent(magnetURI) // Torrent'e katıl ve indir
`

## 🐛 Bilinen Fix'ler ve Optimizasyonlar

### Performance Optimizations
- **FIX #1-2**: Video listener cleanup tracking
`javascript
  videoElement.listeners = [];  // Tüm listener'ları track et
  videoElement.listeners.push({ event: 'play', handler: playListener });
`
- **FIX #5-6**: DOM thrashing prevention
`javascript
  queueRAF(() => { /* DOM updates */ })  // RequestAnimationFrame batch
  getCachedElement('element-id')         // DOM query caching
`
- **FIX #12**: Throttled updates
  - Video texture: 100ms interval (10 FPS yeterli)
  - UI updates: shouldUpdateUI() throttle
  
### Sync Issues
- **FIX #4**: Seek/Play race condition
`javascript
  videoElement.addEventListener('seeked', onSeekedForSync);
  // Önce seek, seeked event'i bekle, sonra play
`
- **FIX #10**: Recursive trigger prevention
`javascript
  let isSyncingVideoState = false;
  if (isSyncingVideoState) return;  // Skip duplicate calls
`
- **FIX #11**: Interval/Timeout tracking
`javascript
  trackInterval(intervalId)    // Cleanup için track et
  trackTimeout(timeoutId)      // Cleanup için track et
  clearInterval(intervalId)    // Her kullanımdan önce null check
`

### Hard Seek Protection
`javascript
let isHardSeeking = false;
let lastHardSeekTime = 0;
const HARD_SEEK_MIN_INTERVAL = 3000;  // 3 saniye throttle

if (now - lastHardSeekTime < HARD_SEEK_MIN_INTERVAL || isHardSeeking) {
    // Throttle - playbackRate kullan
}
`

### Buffer Management
`javascript
const BUFFER_ADVANCE = 9;  // 9 saniye buffer
bufferTargetTime = Date.now() + (BUFFER_ADVANCE * 1000);

bufferCountdownInterval = setInterval(() => {
    const remaining = Math.max(0, bufferTargetTime - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    // Countdown göster
}, 100);
`

## ⚠️ Karakter Kodlama

### UYARI: Mevcut Durum
**Dosyalarda karakter bozulması tespit edildi!**

HTML ve JS dosyalarında şu karakterler bozuk:
- ðŸŽ¬ (olması gereken: 🎬)
- ÄŸÅ¸â€˜â€˜ (olması gereken: 👑)
- Ã¢Å"â€¦ (olması gereken: ✅)
- ÄŸÅ¸ÂŽÂ¬ (olması gereken: 🎬)

### UTF-8 Test String
**Test Karakterler**: ğüşıöçĞÜŞİÖÇ
**Test Cümle**: "Çöğüş işini böyle yapmışsın"
**Test Emoji**: 🎬🚀📋▶️⏸️⏪⏩🔄👑👥📊

### Düzeltme Gerekliliği
Tüm dosyaların UTF-8 (BOM olmadan) formatına dönüştürülmesi GEREKLİDİR.

## 🔑 Firebase Yapısı

### Database Schema
`javascript
rooms/
  {roomId}/
    ├─ name: string
    ├─ owner: uid
    ├─ videoUrl: string
    ├─ screenSize: "medium" | "large" | "imax"
    ├─ environment: "none" | "minimal"
    ├─ createdAt: timestamp
    ├─ p2p/  (optional)
    │   ├─ magnetURI: string
    │   └─ fileName: string
    ├─ videoState/
    │   ├─ isPlaying: boolean
    │   ├─ currentTime: number
    │   ├─ startTimestamp: number
    │   └─ lastUpdate: timestamp
    ├─ syncState/  (optional)
    │   ├─ isBuffering: boolean
    │   ├─ syncedSeekPosition: number
    │   ├─ syncedPlayTime: number
    │   ├─ initiatedBy: uid
    │   └─ initiatedAt: timestamp
    ├─ keyframes/
    │   └─ {pushId}/
    │       ├─ time: number
    │       └─ timestamp: timestamp
    └─ activeViewers/
        └─ {uid}/
            ├─ joinedAt: timestamp
            ├─ lastSeen: timestamp
            ├─ currentPosition: number
            └─ currentDrift: number
`

## 🎮 Kullanıcı Akışı

### 1. Oda Oluşturma (Owner)
`
createRoom() 
  → Firebase'e oda kaydı
  → Anonymous auth
  → create3DScene()
  → startPeriodicTasks()
  → startOwnerTasks()
`

### 2. Odaya Katılma (Viewer)
`
joinRoom(roomId)
  → Firebase'den oda bilgisi
  → Anonymous auth
  → create3DScene()
  → P2P torrent join (eğer P2P oda ise)
  → listenVideoState()
  → listenKeyframes()
  → startPeriodicTasks()
`

### 3. Video Senkronizasyon
`
Owner plays video
  → playVideo()
  → Firebase videoState update
  
Viewer listens
  → listenVideoState()
  → syncVideo()
  → Multi-tier drift correction
`

## 📊 Performans Thresholds
`javascript
// Sync Thresholds
TIER1_THRESHOLD = 300        // ms - Perfect sync
TIER2_THRESHOLD = 700        // ms - Minor adjustment
TIER3_THRESHOLD = 1500       // ms - Moderate adjustment
LARGE_DRIFT_THRESHOLD = 9000 // ms - Hard seek required

// Update Intervals
SYNCCHECKINTERVAL = 200      // ms - Video sync check
KEYFRAME_INTERVAL = 5000     // ms - Owner keyframe broadcast
DRIFT_UPDATE_INTERVAL = 1000 // ms - Drift tracking
PRESENCE_UPDATE_INTERVAL = 10000  // ms - Presence update
CLOCK_SYNC_INTERVAL = 30000  // ms - Clock synchronization

// Throttle Limits
HARD_SEEK_MIN_INTERVAL = 3000  // ms - Hard seek throttle
BUFFER_ADVANCE = 9             // seconds - Buffer wait time
`

## 🎨 UI Components

### Overlay Elements
- #ui-overlay - Ana giriş ekranı (odalar)
- #vr-controls - 2D video kontrolleri (bottom)
- #room-info - Oda bilgisi (top-left)
- #sync-status - Senkronizasyon durumu (top-right)
- #buffer-countdown - Buffer sayacı
- #p2p-status - P2P download progress

### VR Elements (A-Frame)
- VR panel buttons (owner only)
- Video screen (a-plane)
- VR cursor (raycaster)
- Minimal environment (optional a-sky)

## 🚨 Kritik Notlar

### Memory Leak Prevention
`javascript
fullCleanup()
  ├─ clearAllIntervals()
  ├─ clearAllTimeouts()
  ├─ removeAllListeners()
  ├─ revokeCurrentVideoURL()
  └─ Firebase listeners off()
`

### Owner Transfer
`javascript
checkOwnerPresence()  // Her 30 saniyede bir
  → Owner timeout (60s)?
  → İlk viewer'a ownership transfer
  → isRoomOwner = true
  → startOwnerTasks()
`

### Browser Compatibility
- WebRTC support required (P2P için)
- A-Frame WebGL support
- Firebase SDK compat mode
- HLS.js native support check

## 📱 Responsive Design
`css
@media (max-width: 600px) {
    .container { padding: 20px; }
    h1 { font-size: 2em; }
    #vr-controls { bottom: 10px; padding: 10px; }
}
`

## 🔐 Güvenlik

- Anonymous Firebase Auth
- Firebase Security Rules (varsayılan)
- Client-side validation
- CORS handling (crossorigin="anonymous")

## 🎯 Geliştirme Notları

Bu proje modüler JavaScript yapısıyla tasarlanmıştır. Her JS dosyası belirli bir sorumluluk alanına sahiptir ve global scope'ta çalışır. Yeni özellik eklerken:

1. İlgili modülü bulun (js1-js40)
2. Global state değişkenlerini güncelleyin
3. Cleanup fonksiyonlarını unutmayın (trackInterval, trackTimeout)
4. UTF-8 kodlamaya dikkat edin

## ⚡ Quick Start

1. Tüm dosyaların UTF-8 kodlamasında olduğunu doğrulayın
2. Firebase config'i güncelleyin (js1.js)
3. torentVr.html dosyasını tarayıcıda açın
4. Oda oluşturun veya mevcut odaya katılın

---

**Versiyon**: v3.7 (P2P WebTorrent Support)
**Son Güncelleme**: Ocak 2025
**Charset**: UTF-8 (BOM olmadan) - **FİKSE EDİLMELİ**
