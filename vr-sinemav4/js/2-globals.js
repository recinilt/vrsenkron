// ============================================
// GLOBAL DEĞİŞKENLER - OPTİMİZE EDİLMİŞ
// ============================================

// Firebase Referansları
let database = firebase.database();
let auth = firebase.auth();
let roomsRef = database.ref('rooms');
let roomRef = null;

// Video ve Ortam
let videoElement = null;
let currentEnvironment = 'default';

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

// ❌ Chat değişkenleri kaldırıldı - Sohbet sistemi yok

console.log('✓ Global değişkenler tanımlandı (Optimize Edilmiş)');
