let isSeeking = false;
        let isHardSeeking = false; // ✅ FIX: syncVideo ve listenKeyframes çakışmasını önlemek için

        
        // ==================== CONFIG ====================
        // Firebase Yapılandırması
const firebaseConfig = {
    apiKey: "AIzaSyC60idSLdAiqAjPWAOMaM3g8LAKPGEUwH8",
    authDomain: "vr-sinema.firebaseapp.com",
    databaseURL: "https://vr-sinema-default-rtdb.firebaseio.com",
    projectId: "vr-sinema",
    storageBucket: "vr-sinema.firebasestorage.app",
    messagingSenderId: "724648238300",
    appId: "1:724648238300:web:dceba8c536e8a5ffd96819"
};
        
        // ==================== OPTIMIZED CONSTANTS ====================
        const SYNCCHECKINTERVAL = 750; // ✅ FIX: drift timing sorunu için artırıldı
        const KEYFRAME_INTERVAL = 10000;
        const CLOCK_SYNC_INTERVAL = 60000;
        const DRIFT_UPDATE_INTERVAL = 10000;
        const PRESENCE_UPDATE_INTERVAL = 30000;
        const CLEANUP_INTERVAL = 10000;
        const PLAY_BUFFER_TIME = 5000;
        const PRELOAD_BUFFER_SECONDS = 9; // ✅ FIX: 7 -> 9 saniye buffer
        
        // Optimized thresholds
        const TIER1_THRESHOLD = 300;
        const TIER2_THRESHOLD = 800;
        const TIER3_THRESHOLD = 1500;
        const TIER2_LAGGING_SPEED = 1.05;
        const TIER3_LAGGING_SPEED = 1.15;
        
        // Hard seek throttle sabitleri
        const LARGE_DRIFT_THRESHOLD = 9000; // ✅ FIX: 3000 -> 9000ms (9sn sonra hard seek)
        const HARD_SEEK_MIN_INTERVAL = 2000;
        
        const OWNER_PRESENCE_UPDATE_INTERVAL = 30000;
        const OWNER_PRESENCE_TIMEOUT = 45000;
        const DEBUG_MODE = true;
        
        // ==================== GLOBAL STATE ====================
        let db, auth, currentUser, currentRoomId, currentRoomData;
        let videoElement, isRoomOwner = false;
        let clockOffset = 0;
        
        // Interval tracking for cleanup (Memory Leak Prevention)
        const activeIntervals = [];
        const activeTimeouts = [];
        const firebaseListeners = [];
        
        // Performance optimization
        let lastDriftValue = null;
        let lastFirebaseUpdate = 0;
        let lastUIUpdate = 0;
        
        // Hard seek throttle tracking
        let lastHardSeekTime = 0;
        let lastSyncedPosition = 0;
        
        // Command source tracking (to prevent self-triggering)
        let lastCommandSource = null;
        
        // Sync mechanism
        let syncState = null;
        let countdownInterval = null;
        let syncTimeoutId = null;
        let lastSyncCheck = 0;
        
        // Buffer countdown system
        let bufferCountdownInterval = null;
        let bufferTargetTime = null;
        let isBuffering = false;
        
        // Cached DOM elements
        let cachedElements = {};
        
        // Firebase batch updates
        let pendingFirebaseUpdates = {};
        let firebaseBatchTimeout = null;

        // ✅ FIX #3: joinRoom yarışması önleme
        let isJoiningRoom = false;
        
        // ✅ FIX #8: onDisconnect referansı
        let currentOnDisconnectRef = null;
        
        // ✅ FIX #7: hashchange listener referansı
        let hashChangeHandler = null;

        // ✅ FIX: Scene ve keyboard listener referansları (cleanup için)
        let sceneEnterVRHandler = null;
        let sceneExitVRHandler = null;
        let keydownHandler = null;

        let seekDebounceTimer = null;
        let pendingSeekAmount = 0;
        let pendingSeekDirection = null;
        let syncModeActive = false;
        let seekTimeoutId = null;
        let commandSourceTimeoutId = null;
        let videoStateUpdateDebounce = null;

        // ✅ MEMORY LEAK FIX: Object URL tracking
        let currentVideoObjectURL = null;

        // ✅ Owner transfer tracking
        let ownerTransferInProgress = false;

        // ==================== P2P WebTorrent STATE ====================
        let p2pClient = null;
        let currentTorrent = null;
        let selectedLocalFile = null;
        let currentVideoSourceType = 'url'; // 'url' veya 'p2p'
        let p2pUpdateInterval = null;
        // ✅ YENİ: P2P download tamamlandı mı?
let isP2PDownloadComplete = false;
        // WebTorrent Tracker URLs
        const WEBTORRENT_TRACKERS = [
            'wss://tracker.btorrent.xyz',
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.webtorrent.dev'
        ];

// ==================== ADAPTIVE STREAMING (ABR) ====================
let hlsInstance = null;
let dashInstance = null;

// Start as low as possible, cap max at <= 720p (user adjustable)
const QUALITY_CAPS = [360, 480, 720];
let abrMaxHeightCap = 720;

function getStreamType(url) {
    const u = (url || '').split('?')[0].toLowerCase();
    if (u.endsWith('.m3u8')) return 'hls';
    if (u.endsWith('.mpd')) return 'dash';
    return 'native';
}

function destroyAdaptiveStreaming() {
    try {
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
    } catch (e) {}

    try {
        if (dashInstance) {
            dashInstance.reset();
            dashInstance = null;
        }
    } catch (e) {}
}

function updateQualityCapUI() {
    const label = getCachedElement('quality-cap-label');
    if (label) label.textContent = `Max: ${abrMaxHeightCap}p`;

    const upBtn = getCachedElement('btn-quality-up');
    const downBtn = getCachedElement('btn-quality-down');
    if (upBtn) upBtn.disabled = abrMaxHeightCap >= 720;
    if (downBtn) downBtn.disabled = abrMaxHeightCap <= QUALITY_CAPS[0];
}

function setMaxQualityCap(newCap) {
    abrMaxHeightCap = Math.max(QUALITY_CAPS[0], Math.min(720, newCap));
    updateQualityCapUI();
    applyAdaptiveCap();
}

function increaseMaxQuality() {
    const idx = QUALITY_CAPS.indexOf(abrMaxHeightCap);
    const next = idx === -1 ? 720 : QUALITY_CAPS[Math.min(QUALITY_CAPS.length - 1, idx + 1)];
    setMaxQualityCap(next);
}

function decreaseMaxQuality() {
    const idx = QUALITY_CAPS.indexOf(abrMaxHeightCap);
    const next = idx === -1 ? 480 : QUALITY_CAPS[Math.max(0, idx - 1)];
    setMaxQualityCap(next);
}

function applyAdaptiveCap() {
    if (hlsInstance) {
        applyHlsCap();
    }
    if (dashInstance) {
        applyDashCap();
    }
}
