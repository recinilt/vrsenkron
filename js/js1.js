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
        

        // ==================== AUTH HELPERS ====================
        // Ensure Firebase Auth (anonymous) is ready before any RTDB write that requires auth
        async function ensureAuthReady() {
            if (auth && auth.currentUser) {
                currentUser = auth.currentUser;
                return currentUser;
            }
            try {
                await ensureAuthReady();
                if (!currentUser) throw new Error('AUTH_NOT_READY');

                return currentUser;
            } catch (e) {
                console.warn('Anonymous auth failed:', e);
                return null;
            }
        }

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
        
        // ==================== P2P (WebTorrent) ====================
        const P2P_TRACKERS = [
            'wss://tracker.openwebtorrent.com/announce',
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.btorrent.xyz/announce',
            'wss://tracker.files.fm:7073/announce',
            'wss://tracker.webtorrent.dev/announce'
        ];
        let p2pClient = null;
        let p2pTorrent = null;
        let p2pMagnetURI = null;
        let p2pProgressInterval = null;


        // ✅ Owner transfer tracking
        let ownerTransferInProgress = false;

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

function applyHlsCap() {
    if (!hlsInstance || !hlsInstance.levels || hlsInstance.levels.length === 0) return;

    let capIndex = -1;
    for (let i = 0; i < hlsInstance.levels.length; i++) {
        const h = hlsInstance.levels[i].height || 0;
        if (h > 0 && h <= abrMaxHeightCap) capIndex = i;
    }

    if (capIndex === -1) {
        // If levels don't expose height, just cap to the top level (best effort)
        capIndex = hlsInstance.levels.length - 1;
    }

    hlsInstance.autoLevelCapping = capIndex;

    // If currently above cap, force next segment down
    if (hlsInstance.currentLevel > capIndex) {
        hlsInstance.nextAutoLevel = capIndex;
    }
}

function normalizeKbps(value) {
    if (!isFinite(value) || isNaN(value)) return null;
    // dash.js commonly uses kbps, but guard if bits/s slipped in
    if (value > 100000) return Math.round(value / 1000);
    return Math.round(value);
}

function applyDashCap() {
    if (!dashInstance) return;

    let list = [];
    try {
        list = dashInstance.getBitrateInfoListFor('video') || [];
    } catch (e) {
        list = [];
    }
    if (!list.length) return;

    const kbpsValues = list.map(i => normalizeKbps(i.bitrate)).filter(v => v !== null);
    if (!kbpsValues.length) return;

    const minKbps = Math.min(...kbpsValues);

    const candidates = list
        .filter(i => (i.height || 0) > 0 && i.height <= abrMaxHeightCap)
        .map(i => normalizeKbps(i.bitrate))
        .filter(v => v !== null);

    const maxKbps = candidates.length ? Math.max(...candidates) : minKbps;

    // Start low, keep min low, cap max to selected threshold
    dashInstance.updateSettings({
        streaming: {
            abr: {
                initialBitrate: { audio: -1, video: minKbps },
                minBitrate: { audio: -1, video: minKbps },
                maxBitrate: { audio: -1, video: maxKbps }
            },
            buffer: {
                fastSwitchEnabled: true
            }
        }
    });
}

function setupAdaptiveSource(url) {
    if (!videoElement) return;

    // ✅ P2P placeholder guard: never assign p2p://* to <video src>
    if (typeof url === 'string' && url.startsWith('p2p://')) {
        destroyAdaptiveStreaming();
        revokeCurrentVideoURL();
        try {
            videoElement.removeAttribute('src');
            videoElement.load();
        } catch (e) {}
        return;
    }

    destroyAdaptiveStreaming();

    const type = getStreamType(url);

    if (type === 'hls') {
        if (window.Hls && Hls.isSupported()) {
            hlsInstance = new Hls({
                startLevel: 0, // start from lowest
                minAutoBitrate: 0, // allow lowest
                abrEwmaDefaultEstimate: 150000, // very low initial estimate (bps)
                abrBandWidthFactor: 0.9, // ✅ FIX: 0.8 -> 0.9 (kalite düşürme için daha muhafazakar)
                abrBandWidthUpFactor: 0.6 // ✅ FIX: 0.7 -> 0.6 (yukarı geçişte daha dikkatli)
            });

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                applyHlsCap();
                updateQualityCapUI();
            });

            hlsInstance.attachMedia(videoElement);
            hlsInstance.loadSource(url);
            return;
        }

        // Safari / native HLS support
        videoElement.src = url;
        updateQualityCapUI();
        return;
    }

    if (type === 'dash') {
        if (window.dashjs && dashjs.MediaPlayer) {
            dashInstance = dashjs.MediaPlayer().create();

            dashInstance.updateSettings({
                streaming: {
                    abr: {
                        initialBitrate: { audio: -1, video: 150 }, // kbps
                        minBitrate: { audio: -1, video: 100 },
                        maxBitrate: { audio: -1, video: 2500 } // will be recalculated on init
                    },
                    buffer: {
                        fastSwitchEnabled: true
                    }
                }
            });

            dashInstance.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                applyDashCap();
                updateQualityCapUI();
            });

            dashInstance.initialize(videoElement, url, false);
            return;
        }

        videoElement.src = url;
        updateQualityCapUI();
        return;
    }

    // Native progressive (mp4/webm/etc.)
    videoElement.src = url;
    updateQualityCapUI();
}

// ==================== P2P (WebTorrent) ====================
function isWebTorrentSupported() {
    return window.WebTorrent && WebTorrent.WEBRTC_SUPPORT;
}

function initP2PClientIfNeeded() {
    if (!isWebTorrentSupported()) {
        console.warn('WebTorrent/WebRTC not supported in this browser.');
        return null;
    }
    if (!p2pClient) {
        p2pClient = new WebTorrent();
        p2pClient.on('error', (err) => {
            console.warn('WebTorrent client error:', err);
        });
    }
    return p2pClient;
}
