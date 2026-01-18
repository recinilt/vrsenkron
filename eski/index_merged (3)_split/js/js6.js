        
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
