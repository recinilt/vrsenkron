// ============================================
// YAPILANDIRMA VE SABİTLER - ULTIMATE VERSİYON
// ============================================

// Firebase'i başlat
firebase.initializeApp(firebaseConfig);



// Senkronizasyon Sabitleri
const SYNC_DELAY = 3000;

// Desteklenen Video Formatları
const SUPPORTED_VIDEO_FORMATS = [
    'mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv',
    'm4v', 'flv', '3gp', 'wmv'
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
        // ID'yi yakalayan Regex (Hem /file/d/ hem de id= formatlarını destekler)
        pattern: /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/,
        
        transform: (match) => {
            const fileId = match[1];
            
            // Google Drive direkt download linki
            const directUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
            
            // Netlify proxy üzerinden CORS bypass
            return `${window.location.origin}/proxy?url=${encodeURIComponent(directUrl)}`;
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

// VR Kontrol Paneli Pozisyonu
const VR_UI_CONFIG = {
    position: { x: -2, y: 1.6, z: -1.5 },  // Sol tarafta
    scale: 0.8,
    buttonSize: 0.3,
    seekBarWidth: 2
};

console.log('✓ Yapılandırma yüklendi (Ultimate Versiyon)');
console.log('✓ Video formatları:', SUPPORTED_VIDEO_FORMATS.length);
console.log('✓ Altyazı formatları:', SUPPORTED_SUBTITLE_FORMATS.length);
console.log('✓ YouTube API:', API_KEYS.YOUTUBE_API_KEY !== 'YOUR_YOUTUBE_API_KEY_HERE' ? 'Aktif' : 'Pasif');
console.log('✓ Google Drive API:', API_KEYS.GOOGLE_DRIVE_API_KEY !== 'YOUR_GOOGLE_DRIVE_API_KEY_HERE' ? 'Aktif' : 'Pasif');