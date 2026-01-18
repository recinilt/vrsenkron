// ===========================
// CONFIG.JS - V7 - PAUSE SYNC İYİLEŞTİRMESİ
// ===========================

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

// DEBUG MODU
const DEBUGMODE = true;

function debugLog(...args) {
    if (DEBUGMODE) console.log(...args);
}

// TEMEL SABİTLER
const SYNCDELAY = 5000;
const KEYFRAMEINTERVAL = 7000;
const CLOCKSYNCINTERVAL = 60000;
const SEEKDEBOUNCEDELAY = 2000;
const SEEKREWINDSECONDS = 2;

// V7 YENİ: PAUSE SYNC İYİLEŞTİRMESİ
const PAUSE_REWIND_BUFFER = 4; // Pause'ta en geridekinden kaç saniye geri gidilecek
const PLAY_BUFFER_TIME = 5000; // Play için 5 saniye buffer süresi (ms)
const POSITION_REPORT_TIMEOUT = 1000; // Position raporlama için bekleme süresi (ms)

// PRELOAD BUFFER
const PRELOADBUFFERSECONDS = 7;
const PRELOADWAITINGTIMEOUT = 30000;
const PRELOADPOLLINGINTERVAL = 500;

// ADAPTIVE TIER SİSTEMİ
const TIER1THRESHOLD = 3000;
const TIER2THRESHOLD = 7000;
const TIER3THRESHOLD = 15000;
const TIERCRITICALTHRESHOLD = 20000;
const TIER2LAGGINGSPEED = 1.1;
const TIER3GROUPSPEED = 0.88;
const TIER3LAGGINGSPEED = 1.25;
const GROUPLAGGINGMINCOUNT = 3;
const GROUPSTATUSCACHEMS = 1500;

// DRIFT GÜNCELLEME
const DRIFTUPDATEINTERVAL = 5000;
const DRIFTTOLERANCEMS = 1000;
const DRIFTTOLERANCERATE = 0.1;

// AUTO-RECONNECT
const AUTORECONNECTENABLED = true;
const AUTORECONNECTTHRESHOLD = 20000;

// OWNER PRESENCE
const OWNERPRESENCEUPDATEINTERVAL = 5000;
const OWNERPRESENCECHECKINTERVAL = 10000;
const OWNERPRESENCETIMEOUT = 15000;

// ORTAMLAR
const ENVIRONMENTS = {
    none: { name: 'Ortamsız', preset: null },
    default: { name: 'Klasik', preset: 'default' },
    forest: { name: 'Orman', preset: 'forest' },
    starry: { name: 'Yıldızlı Gece', preset: 'starry' }
};

// VİDEO SERVİSLER
const VIDEOSERVICES = {
    youtube: {
        pattern: /(youtu\.be|youtube\.com\/watch\?v=|\/embed\/|\/v\/|\/shorts\/)([a-zA-Z0-9-]{11})/,
        transform: (m) => `https://www.youtube.com/embed/${m[2]}?autoplay=1&controls=1`
    },
    googledrive: {
        pattern: /drive\.google\.com.*?[?&]?(file\/d\/|open\?id=)([a-zA-Z0-9-]+)/,
        transform: (m) => `https://mefeypublicv2.recepyeni.workers.dev/?url=${encodeURIComponent('https://drive.google.com/uc?export=download&id=' + m[2])}`
    },
    direct: {
        pattern: /\.(mp4|webm|ogg|mov|mkv|m3u8|ts)(\?.*)?$/i,
        transform: (url) => url
    }
};

// VR UI AYARLARI
const VRUICONFIG = {
    position: { x: -5, y: 1.6, z: -3 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: 0.7,
    buttonSize: 0.28,
    seekBarWidth: 1.8
};

// VİDEO KÜTÜPHANESİ
const DEFAULTVIDEOLIBRARY = [
    { title: 'Revolver - Türkçe Dublaj', url: 'https://vr-sinema.online/videos/revolver-turkce-dublaj.mp4' },
    { title: 'Chocolat - Çikolata (2000) - Türkçe Dublaj', url: 'https://vr-sinema.online/videos/chocolat-cikolata-2000-turkce-dublaj.mp4' }
];

// GLOBAL DEĞİŞKENLER
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

// DRIFT TRACKING
let driftUpdateInterval = null;
let lastDrift = 0;
let lastPlaybackRate = 1.0;

// RACE CONDITION FIX
let groupStatusCache = null;
let groupStatusCacheTime = 0;

// PRELOAD WAITING
let preloadWaitingInterval = null;
let preloadTargetTime = null;
let preloadTimeout = null;

// OWNER PRESENCE
let ownerPresenceRef = null;
let ownerPresenceInterval = null;
let ownerMonitorInterval = null;

// TIMEOUT TRACKING (V6)
let currentPlayTimeout = null;
let currentPauseTimeout = null;
let currentSeekTimeout = null;

// UI
let subtitleElement = null;
let subtitleData = null;
let screenPosition = { x: 0, y: 2, z: -10 };

// LİSTENER REFERANSLARI
let clockSyncInterval = null;
let videoStateListener = null;
let urgentUpdatesListener = null;
let keyframesListener = null;
let requestsListener = null;
let presenceListener = null;
let seekBarUpdateInterval = null;
let lastSyncDisableTime = 0;

debugLog('Config yüklendi - V7 - PAUSE SYNC İYİLEŞTİRMESİ');
debugLog('Pause rewind buffer: ' + PAUSE_REWIND_BUFFER + 's');
debugLog('Play buffer time: ' + (PLAY_BUFFER_TIME / 1000) + 's');
