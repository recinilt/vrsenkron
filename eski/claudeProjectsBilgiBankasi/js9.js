        
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
        
        // Ã¢Å“â€¦ FIX #1: Video listener'larÃ„Â±nÃ„Â± temizle (ayrÃ„Â± fonksiyon)
        function clearVideoListeners() {
            if (!videoElement) return;
            
            if (videoElement._listeners && videoElement._listeners.length > 0) {
                videoElement._listeners.forEach(({ event, handler }) => {
                    videoElement.removeEventListener(event, handler);
                });
                videoElement._listeners = [];
                debugLog('ÄŸÅ¸Â§Â¹ Video listeners cleared:', videoElement._listeners.length);
            }
            
            // Legacy cleanup
            if (videoElement._eventListeners) {
                videoElement._eventListeners.forEach(([event, listener]) => {
                    videoElement.removeEventListener(event, listener);
                });
                videoElement._eventListeners = [];
            }
        }
