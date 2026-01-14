// ============================================
// YAPILANDIRMA VE SABİTLER - OPTİMİZE EDİLMİŞ
// ============================================

// Firebase Yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyDRW70DwsKBdDk0f1QnblEBVjR2xFNJGTQ",
    authDomain: "vrsinema-d023f.firebaseapp.com",
    databaseURL: "https://vrsinema-d023f-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "vrsinema-d023f",
    storageBucket: "vrsinema-d023f.firebasestorage.app",
    messagingSenderId: "148635313546",
    appId: "1:148635313546:web:7d9dc2c36a574c7b5d02e3"
};

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Senkronizasyon Sabitleri
const SYNC_DELAY = 3000;        // Video başlatma gecikmesi (ms)
// ❌ UPDATE_INTERVAL kaldırıldı - Periyodik güncelleme yok!

// Ortam Tanımlamaları - SADECE HAFİF ORTAMLAR (5 adet)
const ENVIRONMENTS = {
    'none': {
        name: 'Ortamsız',
        preset: null,
        color: '#1a1a2e',
        weight: 0  // En hafif
    },
    'default': {
        name: 'Klasik Sinema',
        preset: 'default',
        color: '#1a1a2e',
        weight: 1
    },
    'forest': {
        name: 'Orman',
        preset: 'forest',
        color: '#2d5016',
        weight: 2
    },
    'starry': {
        name: 'Yıldızlı Gece',
        preset: 'starry',
        color: '#191970',
        weight: 1
    },
    'goaland': {
        name: 'Gökyüzü Adası',
        preset: 'goaland',
        color: '#87ceeb',
        weight: 2
    }
};

// Video Servisi Yapılandırmaları
const VIDEO_SERVICES = {
    youtube: {
        pattern: /(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/,
        transform: (match) => {
            const videoId = match[3];
            return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1`;
        }
    },
    vimeo: {
        pattern: /vimeo\.com\/(\d+)/,
        transform: (match) => {
            return `https://player.vimeo.com/video/${match[1]}?autoplay=1`;
        }
    },
    dailymotion: {
        pattern: /dailymotion\.com\/video\/([a-zA-Z0-9]+)/,
        transform: (match) => {
            return `https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1`;
        }
    },
    bunny: {
        pattern: /(bunnycdn|b-cdn)\.net/,
        transform: (url) => url
    },
    catbox: {
        pattern: /catbox\.moe/,
        transform: (url) => url
    }
};

console.log('✓ Yapılandırma yüklendi (Optimize Edilmiş)');
console.log('✓ Hafif ortam sayısı:', Object.keys(ENVIRONMENTS).length);
