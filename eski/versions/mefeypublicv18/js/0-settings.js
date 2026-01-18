// ============================================
// MERKEZI AYARLAR - TÜM PARAMETRELERİ BURADAN DEĞİŞTİRİN
// ============================================

const VR_SETTINGS = {
    
    // ============================================
    // VR UI PANEL AYARLARI
    // ============================================
    vrUI: {
        // Panel Pozisyonu (X: Sol/Sağ, Y: Yukarı/Aşağı, Z: Önde/Arkada)
        position: { 
            x: -6,      // Solda (negatif = sol, pozitif = sağ)
            y: 1.6,     // Göz hizasında
            z: -3       // Hafif arkada
        },
        
        // Panel Rotasyonu (Derece)
        rotation: { 
            x: 0,       // Eğim yok
            y: 45,      // 45° sağa dönük (kullanıcıya bakıyor)
            z: 0 
        },
        
        // Panel Boyutları
        panelWidth: 2.5,        // Panel genişliği (eski: 1.2)
        panelHeight: 3.5,       // Panel yüksekliği (eski: 1.8)
        
        // Buton Boyutları
        buttonWidth: 1.8,       // Ana buton genişliği (eski: 1)
        buttonHeight: 0.3,      // Ana buton yüksekliği (eski: 0.15)
        smallButtonSize: 0.25,  // Küçük butonlar (ok tuşları) (eski: 0.12)
        
        // Seek Bar
        seekBarWidth: 2.0,      // Seek bar genişliği (eski: 1)
        seekBarHeight: 0.1,     // Seek bar yüksekliği (eski: 0.05)
        
        // Text Boyutları
        titleTextWidth: 3.5,    // Başlık text genişliği (eski: 1.8)
        buttonTextWidth: 3.0,   // Buton text genişliği (eski: 1.6)
        timeTextWidth: 3.0,     // Zaman text genişliği (eski: 1.6)
        
        // Renkler
        colors: {
            background: '#1a1a2e',
            title: '#00d9ff',
            playButton: '#00ff88',
            rewindButton: '#ff6b6b',
            forwardButton: '#4ecdc4',
            arrowButtons: '#ffd93d',
            resetButton: '#ff6b6b',
            seekBar: '#555555',
            seekProgress: '#00ff88',
            text: '#000000',
            timeText: '#ffffff'
        }
    },
    
    // ============================================
    // VIDEO AYARLARI
    // ============================================
    video: {
        // Senkronizasyon
        syncDelay: 3000,                // Play başlamadan önce bekleme (ms)
        driftTolerance: 3.0,            // Sync threshold (saniye)
        seekRewindSeconds: 4,           // Seek sonrası geri sarma (saniye)
        seekDebounceDelay: 2000,        // Seek spam koruması (ms)
        
        // Heartbeat & Polling
        heartbeatInterval: 15000,       // Master heartbeat süresi (ms)
        pollingInterval: 15000,         // Slave polling süresi (ms)
        
        // Buffer
        bufferCheckInterval: 5000,      // Buffer kontrol süresi (ms)
        lowBufferThreshold: 2,          // Düşük buffer eşiği (saniye)
        
        // HLS
        hlsConfig: {
            maxBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000,
            maxBufferHole: 0.5,
            startLevel: -1,
            abrEwmaDefaultEstimate: 500000,
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 3,
            levelLoadingTimeOut: 10000,
            levelLoadingMaxRetry: 3,
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6,
            debug: false
        }
    },
    
    // ============================================
    // EKRAN AYARLARI
    // ============================================
    screen: {
        // Varsayılan pozisyon
        defaultPosition: { x: 0, y: 2, z: -10 },
        
        // Hareket adımı (ok tuşları ile)
        moveStep: 0.5,
        
        // Boyutlar
        sizes: {
            flat: { width: 16, height: 9 },
            '360': { width: 100, height: 100 },
            '180': { width: 50, height: 50 }
        }
    },
    
    // ============================================
    // FİLM KÜTÜPHANESİ - BURAYA YENİ FİLMLER EKLEYİN
    // ============================================
    videoLibrary: [
        {
            name: "Revolver (Tabanca) Türkçe Dublaj 2025",
            url: "https://vr-sinema.online/videos/revolver-turkce-dublaj.mp4",
            category: "Film"
        },
        {
            name: "Chocolat (Çikolata) 2000 Türkçe Dublaj",
            url: "https://vr-sinema.online/videos/chocolat-cikolata-2000-turkce-dublaj.mp4",
            category: "Film"
        },
        {
            name: "Big Buck Bunny (Blender Foundation)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            category: "Demo"
        },
        {
            name: "Elephants Dream (Blender Foundation)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
            category: "Demo"
        },
        {
            name: "Sintel Trailer (Blender Foundation)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
            category: "Demo"
        },
        {
            name: "Tears of Steel (Blender Foundation)",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
            category: "Demo"
        }
        
        // YENİ FİLM EKLEMEK İÇİN:
        // {
        //     name: "Film Adı",
        //     url: "https://example.com/video.mp4",
        //     category: "Kategori" // Film, Demo, Anime, vs.
        // }
    ],
    
    // ============================================
    // ORTAM AYARLARI
    // ============================================
    environments: {
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
    },
    
    // ============================================
    // ALTYAZI AYARLARI
    // ============================================
    subtitle: {
        position: { x: 0, y: -3, z: -10 },
        width: 20,
        color: '#FFFFFF',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 0.2,
        updateInterval: 100  // ms
    },
    
    // ============================================
    // UI AYARLARI
    // ============================================
    ui: {
        // Overlay transition
        transitionDuration: 500,  // ms
        
        // Throttle/Debounce
        viewerUpdateThrottle: 5000,  // ms
        roomInfoUpdateThrottle: 3000,  // ms
        
        // Sync status
        syncStatusDisplayDuration: 3000  // ms
    },
    
    // ============================================
    // KLAVYE KISAYOLLARI
    // ============================================
    keyboard: {
        enabled: true,
        shortcuts: {
            playPause: 'Space',
            seekForward: 'ArrowRight',
            seekBackward: 'ArrowLeft',
            screenUp: 'ArrowUp',
            screenDown: 'ArrowDown',
            screenLeft: 'KeyA',
            screenRight: 'KeyD',
            screenForward: 'KeyE',
            screenBackward: 'KeyQ',
            resetScreen: 'KeyR',
            toggleSubtitles: 'KeyC',
            toggleMute: 'KeyM',
            toggleFullscreen: 'KeyF'
        },
        seekAmount: 10  // saniye
    },
    
    // ============================================
    // NETWORK AYARLARI
    // ============================================
    network: {
        cloudflareWorker: 'https://mefeypublicv2.recepyeni.workers.dev',
        corsProxyEnabled: true,
        requestTimeout: 10000  // ms
    },
    
    // ============================================
    // DEV/DEBUG AYARLARI
    // ============================================
    debug: {
        enableConsoleLog: true,
        logHeartbeat: true,
        logPolling: true,
        logSync: true,
        logVideoEvents: true
    }
};

// ============================================
// KOLAYLAŞTIRICI FONKSİYONLAR
// ============================================

// Ayar değeri al
function getSetting(path) {
    const keys = path.split('.');
    let value = VR_SETTINGS;
    
    for (const key of keys) {
        value = value[key];
        if (value === undefined) {
            console.warn('⚠️ Setting bulunamadı:', path);
            return null;
        }
    }
    
    return value;
}

// Film listesini al
function getVideoLibrary() {
    return VR_SETTINGS.videoLibrary;
}

// Film listesine ekle
function addToVideoLibrary(name, url, category = 'Film') {
    VR_SETTINGS.videoLibrary.push({ name, url, category });
    console.log('✅ Film kütüphaneye eklendi:', name);
}

// Ortam listesini al
function getEnvironments() {
    return VR_SETTINGS.environments;
}

// VR UI ayarlarını al
function getVRUISettings() {
    return VR_SETTINGS.vrUI;
}

// Video ayarlarını al
function getVideoSettings() {
    return VR_SETTINGS.video;
}

console.log('✅ Merkezi ayarlar yüklendi (0-settings.js)');
console.log('📚 Film sayısı:', VR_SETTINGS.videoLibrary.length);
console.log('🎭 Ortam sayısı:', Object.keys(VR_SETTINGS.environments).length);
console.log('🎮 VR Panel boyutu:', VR_SETTINGS.vrUI.panelWidth, 'x', VR_SETTINGS.vrUI.panelHeight);
console.log('🔘 Buton boyutu:', VR_SETTINGS.vrUI.buttonWidth, 'x', VR_SETTINGS.vrUI.buttonHeight);
