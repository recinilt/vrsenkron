        
        function clearSyncState() {
            syncState = null;
            syncModeActive = false;
            
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            if (syncTimeoutId) {
                clearTimeout(syncTimeoutId);
                syncTimeoutId = null;
            }
            
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'none';
                countdownElement.textContent = '';
            }
            
            updateControlsForSync(false);
            
            if (isRoomOwner && currentRoomId) {
                db.ref('rooms/' + currentRoomId + '/syncState').remove();
            }
            
            debugLog('🧹 Sync state cleared');
        }
        
        function updateSyncUI(message) {
            const statusText = getCachedElement('sync-text');
            if (statusText) {
                statusText.textContent = message;
                statusText.className = 'status-warning';
            }
        }
        
        function updateControlsForSync(inSync) {
            const playBtn = getCachedElement('btn-play');
            const pauseBtn = getCachedElement('btn-pause');
            const rewindBtn = getCachedElement('btn-rewind');
            const forwardBtn = getCachedElement('btn-forward');
            const syncBtn = getCachedElement('btn-sync');
            
            if (inSync) {
                if (pauseBtn) pauseBtn.disabled = true;
                if (rewindBtn) rewindBtn.disabled = true;
                if (forwardBtn) forwardBtn.disabled = true;
                if (syncBtn) syncBtn.disabled = true;
                
                if (playBtn) {
                    playBtn.disabled = !isRoomOwner;
                }
            } else {
                if (isRoomOwner) {
                    if (playBtn) playBtn.disabled = false;
                    if (pauseBtn) pauseBtn.disabled = false;
                    if (rewindBtn) rewindBtn.disabled = false;
                    if (forwardBtn) forwardBtn.disabled = false;
                }
                if (syncBtn) syncBtn.disabled = false;
            }
        }
