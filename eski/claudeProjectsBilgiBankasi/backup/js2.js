        
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

        // âœ… FIX #3: joinRoom yarÄ±ÅŸmasÄ± Ã¶nleme
        let isJoiningRoom = false;
        
        // âœ… FIX #8: onDisconnect referansÄ±
        let currentOnDisconnectRef = null;
        
        // âœ… FIX #7: hashchange listener referansÄ±
        let hashChangeHandler = null;

        // âœ… FIX: Scene ve keyboard listener referanslarÄ± (cleanup iÃ§in)
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

        // âœ… MEMORY LEAK FIX: Object URL tracking
        let currentVideoObjectURL = null;

        // âœ… Owner transfer tracking
        let ownerTransferInProgress = false;

        // ==================== P2P WebTorrent STATE ====================
        let p2pClient = null;
        let currentTorrent = null;
        let selectedLocalFile = null;
        let currentVideoSourceType = 'url'; // 'url' veya 'p2p'
        let p2pUpdateInterval = null;
        
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
