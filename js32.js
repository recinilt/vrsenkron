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
        
        function updateControlsForSync(inSync) {
            // Normal VR kontrolleri
            const playBtn = getCachedElement('btn-play');
            const pauseBtn = getCachedElement('btn-pause');
            const stopBtn = getCachedElement('btn-stop');
            const rewindBtn = getCachedElement('btn-rewind');
            const forwardBtn = getCachedElement('btn-forward');
            const syncBtn = getCachedElement('btn-sync');
            
            // YouTube kontrolleri
            const ytPlayBtn = document.getElementById('yt-btn-play');
            const ytPauseBtn = document.getElementById('yt-btn-pause');
            const ytStopBtn = document.getElementById('yt-btn-stop');
            const ytRewindBtn = document.getElementById('yt-btn-rewind');
            const ytForwardBtn = document.getElementById('yt-btn-forward');
            const ytSyncBtn = document.getElementById('yt-btn-sync');
            
            if (inSync) {
                // Sync modunda tüm kontroller disabled
                if (playBtn) playBtn.disabled = true;
                if (pauseBtn) pauseBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = true;
                if (rewindBtn) rewindBtn.disabled = true;
                if (forwardBtn) forwardBtn.disabled = true;
                if (syncBtn) syncBtn.disabled = true;
                
                if (ytPlayBtn) ytPlayBtn.disabled = true;
                if (ytPauseBtn) ytPauseBtn.disabled = true;
                if (ytStopBtn) ytStopBtn.disabled = true;
                if (ytRewindBtn) ytRewindBtn.disabled = true;
                if (ytForwardBtn) ytForwardBtn.disabled = true;
                if (ytSyncBtn) ytSyncBtn.disabled = true;
                
            } else {
                // Normal mod - owner/viewer'a göre ayarla
                // ✅ FIX: VR kontrolleri için de disabled + opacity + cursor ayarı
                const vrOwnerOnlyBtns = [playBtn, pauseBtn, stopBtn, rewindBtn, forwardBtn];
                const ytOwnerOnlyBtns = [ytPlayBtn, ytPauseBtn, ytStopBtn, ytRewindBtn, ytForwardBtn];
                
                vrOwnerOnlyBtns.forEach(btn => {
                    if (btn) {
                        btn.disabled = !isRoomOwner;
                        btn.style.opacity = isRoomOwner ? '1' : '0.5';
                        btn.style.cursor = isRoomOwner ? 'pointer' : 'not-allowed';
                    }
                });
                
                ytOwnerOnlyBtns.forEach(btn => {
                    if (btn) {
                        btn.disabled = !isRoomOwner;
                        btn.style.opacity = isRoomOwner ? '1' : '0.5';
                        btn.style.cursor = isRoomOwner ? 'pointer' : 'not-allowed';
                    }
                });
                
                // Sync butonu herkes için açık
                if (syncBtn) {
                    syncBtn.disabled = false;
                    syncBtn.style.opacity = '1';
                    syncBtn.style.cursor = 'pointer';
                }
                if (ytSyncBtn) {
                    ytSyncBtn.disabled = false;
                    ytSyncBtn.style.opacity = '1';
                    ytSyncBtn.style.cursor = 'pointer';
                }
            }
        }