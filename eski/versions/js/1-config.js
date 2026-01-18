// ============================================
// YAPILANDIRMA VE SABİTLER - ULTIMATE VERSİYON
// ============================================

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);

// Cloudflare Worker Proxy (Google Drive için)
const CLOUDFLARE_WORKER = 'https://mefeypublicv2.recepyeni.workers.dev';

// Senkronizasyon Sabitleri
const SYNC_DELAY = 1000;

// Desteklenen Video Formatları
const SUPPORTED_VIDEO_FORMATS = [
    'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv',
    'm4v', 'flv', '3gp', 'wmv', 'ts', 'm3u8'
];

// Desteklenen Altyazı Formatları
const SUPPORTED_SUBTITLE_FORMATS = [
    'srt', 'vtt', 'ass', 'ssa', 'sub'
];

// Ortam Tanımlamaları
const ENVIRONMENTS = {
    'none': {
        name: 'Ortamsız',
        preset: null,
        color: '#1a1a2e',
        weight: 0
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
    googledrive: {
        pattern: /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/,
        transform: (match) => {
            const fileId = match[1];
            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            return `${CLOUDFLARE_WORKER}?url=${encodeURIComponent(directUrl)}`;
        }
    },
    zerostorage: {
        pattern: /zerostorage\.net\/(?:embed\/|file\/)([a-zA-Z0-9-]+)/,
        transform: (match) => {
            const fileId = match[1];
            return `https://zerostorage.net/file/${fileId}`;
        }
    },
    cloudinary: {
        pattern: /res\.cloudinary\.com\/([^\/]+)\/video\/upload\//,
        transform: (url) => {
            return url;
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

// VR Kontrol Paneli Pozisyonu (TAM SOLA, UZAKTA, 90 derece dönük)
const VR_UI_CONFIG = {
    position: { x: -5, y: 1.6, z: -3 },      // Çok daha solda ve biraz önde
    rotation: { x: 0, y: 90, z: 0 },         // 90 derece sağa bakıyor (tam sola bakmak gerek)
    scale: 0.7,                               // Biraz daha küçük
    buttonSize: 0.28,
    seekBarWidth: 1.8
};

console.log('✓ Yapılandırma yüklendi (Ultimate Versiyon)');
console.log('✓ Video formatları:', SUPPORTED_VIDEO_FORMATS.length);
console.log('✓ Altyazı formatları:', SUPPORTED_SUBTITLE_FORMATS.length);
console.log('✓ Cloudflare Worker:', CLOUDFLARE_WORKER);
console.log('✓ Google Drive proxy: Aktif');
console.log('✓ Zerostorage desteği: Aktif');
console.log('✓ Cloudinary desteği: Aktif');
console.log('✓ TS/M3U8 video desteği: Aktif');
console.log('✓ VR Panel pozisyonu: TAM SOL, x=-5, z=-3');