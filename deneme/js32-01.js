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
            
            if (syncPlayAtTimeTimeout) {
                clearTimeout(syncPlayAtTimeTimeout);
                syncPlayAtTimeTimeout = null;
            }
            
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'none';
                countdownElement.textContent = '';
            }
            
            updateControlsForSync(false);
            
            // Sync state'i Firebase'den sil (sadece owner)
            if (isRoomOwner && currentRoomId) {
                db.ref('rooms/' + currentRoomId + '/syncState').remove().catch(() => {});
            }
            
            enableSyncButton();
            updateSyncUI('✅ Senkronize');
            
            debugLog('🧹 Sync state cleared');
        }
        
        function updateSyncUI(message) {
            // Normal VR modu
            const statusText = getCachedElement('sync-text');
            if (statusText && message) {
                statusText.textContent = message;
                statusText.className = message.includes('✅') ? 'status-good' : 'status-warning';
            }
            
            // YouTube modu
            const ytSyncStatus = document.getElementById('youtube-sync-status');
            if (ytSyncStatus && message) {
                ytSyncStatus.textContent = message;
                ytSyncStatus.className = message.includes('✅') ? 'status-good' : 'status-warning';
            }
        }