// ============================================
// CONFIG - ULTRA VERSİYON
// 5sn Senkron | 7sn Keyframe
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

// SABİTLER
const SYNC_DELAY = 10000;              // 5 SANİYE
const KEYFRAME_INTERVAL = 7000;       // 7 SANİYE
const CLOCK_SYNC_INTERVAL = 60000;
const SEEK_DEBOUNCE_DELAY = 2000;
const SEEK_REWIND_SECONDS = 4;
const SMOOTH_THRESHOLD = 5000;

const ENVIRONMENTS = {
    'none': { name: 'Ortamsız', preset: null },
    'default': { name: 'Klasik', preset: 'default' },
    'forest': { name: 'Orman', preset: 'forest' },
    'starry': { name: 'Yıldız', preset: 'starry' }
};

const VIDEO_SERVICES = {
    youtube: {
        pattern: /(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/,
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

const VR_UI_CONFIG = {
    position: { x: -5, y: 1.6, z: -3 },
    rotation: { x: 0, y: 90, z: 0 },
    scale: 0.7,
    buttonSize: 0.28,
    seekBarWidth: 1.8
};

// GLOBAL
let database = firebase.database();
let auth = firebase.auth();
let roomsRef = database.ref('rooms');
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

// UI
let subtitleElement = null;
let subtitleData = null;
let screenPosition = { x: 0, y: 2, z: -10 };

console.log('✓ Config yüklendi: 5sn Senkron | 7sn Keyframe');
