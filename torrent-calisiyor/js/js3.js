function executeSeek(direction, totalAmount) {
    if (!videoElement || isSeeking) return;

    if (videoElement.readyState < 1) {
        console.warn('Video metadata not loaded yet');
        return;
    }

    isSeeking = true;

    const targetTime = Math.max(0, Math.min(videoElement.duration || Infinity, videoElement.currentTime + totalAmount));

    lastCommandSource = 'self';
    videoElement.pause();

    let seekCompleted = false;

    const onSeeked = () => {
        if (seekCompleted) return;
        seekCompleted = true;
        videoElement.removeEventListener('seeked', onSeeked);

        const newPos = videoElement.currentTime;
        const updates = {
            'videoState/isPlaying': false,
            'videoState/currentTime': newPos,
            'videoState/startTimestamp': getServerTime(),
            'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
            'keyframes': null,
            'syncState': null
        };

        db.ref(`rooms/${currentRoomId}`).update(updates)
            .then(() => {
                debugLog(`Seek ${direction} complete, paused at`, newPos);
                isSeeking = false;
            })
            .catch(err => {
                console.warn('Seek update error:', err);
                isSeeking = false;
            });

        // ✅ FIX: Timeout'u track et
        trackTimeout(setTimeout(() => { lastCommandSource = null; }, 2500));
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = targetTime;

    // ✅ FIX: Timeout'u track et
    trackTimeout(setTimeout(() => {
        if (!seekCompleted) {
            isSeeking = false;
            debugLog('Seek timeout - forcing completion');
            onSeeked();
        }
    }, 2000));
}



        // ==================== FIREBASE INIT ====================
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        
        // ==================== HELPER FUNCTIONS ====================
        function debugLog(...args) {
            if (DEBUG_MODE) console.log(...args);
        }
        

        // requestAnimationFrame queue limiter
        let rafQueue = [];
        let rafScheduled = false;
        
        function queueRAF(callback) {
            rafQueue.push(callback);
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(() => {
                    const callbacks = rafQueue.splice(0);
                    rafScheduled = false;
                    callbacks.forEach(cb => {
                        try { cb(); } catch(e) { console.warn('RAF callback error:', e); }
                    });
                });
            }
        }
        
        
        function getServerTime() {
            return Date.now() + clockOffset;
        }
        
        // DOM Element Caching
        function getCachedElement(id) {
            if (!cachedElements[id]) {
                cachedElements[id] = document.getElementById(id);
            }
            return cachedElements[id];
        }
        
        function clearElementCache() {
            cachedElements = {};
        }
        
        // ==================== MEMORY LEAK PREVENTION ====================
        function trackInterval(id) {
            if (id) activeIntervals.push(id);
            return id;
        }
        
        function trackTimeout(id) {
            if (id) activeTimeouts.push(id);
            return id;
        }
        
        function trackListener(ref) {
            if (ref) firebaseListeners.push(ref);
            return ref;
        }
        
        // ✅ FIX #7 & #11: Tüm interval'ları temizle
        function clearAllIntervals() {
            // Buffer countdown temizle
            if (bufferCountdownInterval) {
                clearInterval(bufferCountdownInterval);
                bufferCountdownInterval = null;
            }
            
            // Countdown interval temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            // Seek debounce timer temizle
            if (seekDebounceTimer) {
                clearTimeout(seekDebounceTimer);
                seekDebounceTimer = null;
            }
            
            // P2P update interval temizle
            if (p2pUpdateInterval) {
                clearInterval(p2pUpdateInterval);
                p2pUpdateInterval = null;
            }
            
            activeIntervals.forEach(id => clearInterval(id));
            activeIntervals.length = 0;
        }
        
        function clearAllTimeouts() {
            // Sync timeout temizle
            if (syncTimeoutId) {
                clearTimeout(syncTimeoutId);
                syncTimeoutId = null;
            }
            
            // Command source timeout temizle
            if (commandSourceTimeoutId) {
                clearTimeout(commandSourceTimeoutId);
                commandSourceTimeoutId = null;
            }
            
            // Video state update debounce temizle
            if (videoStateUpdateDebounce) {
                clearTimeout(videoStateUpdateDebounce);
                videoStateUpdateDebounce = null;
            }
            
            // Firebase batch timeout temizle
            if (firebaseBatchTimeout) {
                clearTimeout(firebaseBatchTimeout);
                firebaseBatchTimeout = null;
            }
            
            activeTimeouts.forEach(id => clearTimeout(id));
            activeTimeouts.length = 0;
        }
        
        function clearAllListeners() {
            firebaseListeners.forEach(ref => {
                try {
                    ref.off();
                } catch (e) {
                    console.warn('Listener cleanup error:', e);
                }
            });
            firebaseListeners.length = 0;
        }
