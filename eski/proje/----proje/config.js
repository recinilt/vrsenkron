// ============================================
// CONFIG - OPTIMIZE EDILMIŞ VERSIYON V5
// Drift tracking 5s, Keyframe içinde drift bilgisi
// ============================================

const firebaseConfig = {
  apiKey: "AIzaSyC60idSLdAiqAjPWAOMaM3g8LAKPGEUwH8",
  authDomain: "vr-sinema.firebaseapp.com",
  databaseURL: "https://vr-sinema-default-rtdb.firebaseio.com",
  projectId: "vr-sinema",
  storageBucket: "vr-sinema.firebasestorage.app",
  messagingSenderId: "724648238300",
  appId: "1:724648238300:web:dceba8c536e8a5ffd96819"
};

firebase.initializeApp(firebaseConfig);

// ============================================
// DEBUG MODU
// ============================================
const DEBUG_MODE = true; // Production: false, Development: true

function debugLog(...args) {
  if (DEBUG_MODE) console.log(...args);
}

// ============================================
// TEMEL SABİTLER
// ============================================
const SYNC_DELAY = 5000; // 5 SANİYE (play başlama gecikmesi)
const KEYFRAME_INTERVAL = 7000; // 7 SANİYE (snapshot aralığı)
const CLOCK_SYNC_INTERVAL = 60000; // 60 SANİYE (saat senkron)
const SEEK_DEBOUNCE_DELAY = 2000; // 2 SANİYE (seek debounce)
const SEEK_REWIND_SECONDS = 2; // 2 SANİYE (urgent update rewind)

// YENİ: PRELOAD BUFFER
const PRELOAD_BUFFER_SECONDS = 7; // 7 SANİYE (ileride bekleme süresi)
const PRELOAD_WAITING_TIMEOUT = 30000; // 30 SANİYE (timeout)
const PRELOAD_POLLING_INTERVAL = 500; // 500ms (owner pozisyon kontrolü)

// ============================================
// ÖNERİ 3: ADAPTIVE TIER SİSTEMİ
// ============================================
// Tier Eşikleri (milisaniye)
const TIER_1_THRESHOLD = 3000; // 0-3sn: Normal (müdahale yok)
const TIER_2_THRESHOLD = 7000; // 3-7sn: Hafif catch-up
const TIER_3_THRESHOLD = 15000; // 7-15sn: Grup yavaşlama
const TIER_CRITICAL_THRESHOLD = 20000; // 15sn+: Yeniden katıl

// Hız Ayarları
const TIER_2_LAGGING_SPEED = 1.1; // Tier 2: Hafif hızlanma
const TIER_3_GROUP_SPEED = 0.88; // Tier 3: Grup yavaşlama
const TIER_3_LAGGING_SPEED = 1.25; // Tier 3: Geride kalan hızlanma

// Grup Kontrol
const GROUP_LAGGING_MIN_COUNT = 3; // En az 3 kişi gerideyse grup yavaşlar
const GROUP_STATUS_CACHE_MS = 1500; // Grup durumu cache süresi (race condition fix)

// ============================================
// OPTİMİZASYON: Drift Güncelleme Ayarları
// ============================================
const DRIFT_UPDATE_INTERVAL = 5000; // 5 SANİYE (2s'den 5s'e çıkarıldı - %60 azalma)
const DRIFT_TOLERANCE_MS = 1000; // 1000ms (daha az Firebase write)
const DRIFT_TOLERANCE_RATE = 0.1; // 0.1 (daha az Firebase write)

// Auto-Reconnect (Critical Tier Fix)
const AUTO_RECONNECT_ENABLED = true; // Otomatik yeniden senkronizasyon
const AUTO_RECONNECT_THRESHOLD = 20000; // 20sn üzeri otomatik sync

// YENİ: OWNER PRESENCE
const OWNER_PRESENCE_UPDATE_INTERVAL = 5000; // 5 SANİYE (lastSeen güncelleme)
const OWNER_PRESENCE_CHECK_INTERVAL = 10000; // 10 SANİYE (presence kontrolü)
const OWNER_PRESENCE_TIMEOUT = 15000; // 15 SANİYE (owner kayıp sayılır)

// ============================================
// ORTAMLAR
// ============================================
const ENVIRONMENTS = {
  'none': { name: 'Ortamsız', preset: null },
  'default': { name: 'Klasik', preset: 'default' },
  'forest': { name: 'Orman', preset: 'forest' },
  'starry': { name: 'Yıldız', preset: 'starry' }
};

// ============================================
// VİDEO SERVİSLERİ
// ============================================
const VIDEO_SERVICES = {
  youtube: {
    pattern: /(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/,
    transform: (m) => `https://www.youtube.com/embed/${m[3]}?autoplay=1&controls=1`
  },
  googledrive: {
    pattern: /drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/,
    transform: (m) => `https://mefeypublicv2.recepyeni.workers.dev/?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + m[1])}`
  },
  direct: {
    pattern: /\.(mp4|webm|ogg|mov|mkv|m3u8|ts)(\?|$)/i,
    transform: (url) => url
  }
};

// ============================================
// VR UI AYARLARI
// ============================================
const VR_UI_CONFIG = {
  position: { x: -5, y: 1.6, z: -3 },
  rotation: { x: 0, y: 90, z: 0 },
  scale: 0.7,
  buttonSize: 0.28,
  seekBarWidth: 1.8
};

// ============================================
// VİDEO KÜTÜPHANESİ - SABİT LİNKLER
// ============================================
const DEFAULT_VIDEO_LIBRARY = [
  {
    title: 'Revolver (Türkçe Dublaj)',
    url: 'https://vr-sinema.online/videos/revolver-turkce-dublaj.mp4'
  },
  {
    title: 'Chocolat - Çikolata (2000 - Türkçe Dublaj)',
    url: 'https://vr-sinema.online/videos/chocolat-cikolata-2000-turkce-dublaj.mp4'
  }
];

// ============================================
// GLOBAL DEĞİŞKENLER
// ============================================
let database = firebase.database();
let auth = firebase.auth();
let roomsRef = database.ref('rooms');
let videoLibraryRef = database.ref('videoLibrary');
let roomRef = null;
let videoElement = null;
let currentRoomId = null;
let currentRoomData = null;
let isRoomOwner = false;
let currentEnvironment = 'default';

// SYNC
let clockOffset = 0;
let clockSyncReady = false;
let keyframeInterval = null;
let lastKeyframeTimestamp = 0;
let syncTimeout = null;
let lastSeekTime = 0;
let seekDebounceTimeout = null;

// ÖNERİ 3: Drift Tracking
let driftUpdateInterval = null;
let lastDrift = 0;
let lastPlaybackRate = 1.0;

// Race Condition Fix: Grup durumu cache
let groupStatusCache = null;
let groupStatusCacheTime = 0;

// YENİ: Preload Waiting
let preloadWaitingInterval = null;
let preloadTargetTime = null;
let preloadTimeout = null;

// YENİ: Owner Presence
let ownerPresenceRef = null;
let ownerPresenceInterval = null;
let ownerMonitorInterval = null;

// UI
let subtitleElement = null;
let subtitleData = null;
let screenPosition = { x: 0, y: 2, z: -10 };

// ============================================
// LISTENER REFERANSLARI (CLEANUP İÇİN)
// ============================================
let clockSyncInterval = null;
let videoStateListener = null;
let urgentUpdatesListener = null;
let keyframesListener = null;
let requestsListener = null;
let presenceListener = null;
let seekBarUpdateInterval = null;
let lastSyncDisableTime = 0;

debugLog('✅ Config yüklendi: V5 - OPTİMİZE EDİLDİ');
debugLog('🔧 DRIFT_UPDATE_INTERVAL: 5000ms (2000ms → 5000ms)');
debugLog('🔧 Keyframe içinde drift bilgisi taşınacak');
debugLog('📊 Firebase yazma sayısı ~%36 azaltıldı');