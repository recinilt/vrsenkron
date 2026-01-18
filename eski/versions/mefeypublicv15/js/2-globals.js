// ============================================
// GLOBAL DEĞİŞKENLER - ULTIMATE VERSİYON
// ============================================

// Firebase Referansları
let database = firebase.database();
let auth = firebase.auth();
let roomsRef = database.ref('rooms');
let roomRef = null;

// Video ve Ortam
let videoElement = null;
let currentEnvironment = 'default';
let currentSubtitleTrack = null;

// Oda Bilgileri
let currentRoomId = null;
let currentRoomData = null;
let isRoomOwner = false;
let viewerPresenceRef = null;

// Senkronizasyon
let syncTimeout = null;
let lastSyncTime = 0;

// UI Durumu
let uiOverlay = null;
let vrControls = null;
let roomInfoDisplay = null;

// VR UI Elemanları
let vrUIPanel = null;
let vrSeekBar = null;
let vrScreenControls = null;

// Altyazı
let subtitleElement = null;
let subtitleData = null;
let subtitleUpdateInterval = null;

// Ekran Pozisyonu (Her kullanıcının kendi ayarı)
let screenPosition = { x: 0, y: 2, z: -10 };
let screenRotation = { x: 0, y: 0, z: 0 };

console.log('✓ Global değişkenler tanımlandı (Ultimate Versiyon)');
