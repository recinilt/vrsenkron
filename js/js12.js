function applySyncState(state) {
            if (!videoElement || !state) return;
            
            // ✅ FIX: syncedSeekPosition validation
            if (state.syncedSeekPosition !== undefined && state.syncedSeekPosition !== null) {
                if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                    debugLog('⚠️ Invalid syncedSeekPosition in applySyncState');
                    state.syncedSeekPosition = videoElement.currentTime || 0;
                }
            }
            
            syncState = state;
            syncModeActive = true;
            
            if (state.isBuffering) {
                videoElement.pause();
                videoElement.currentTime = state.syncedSeekPosition;
                
                updateSyncUI('🔄 Senkronizasyon başlatıldı...');
                // ✅ FIX: Timeout'ları track et
                trackTimeout(setTimeout(() => {
                    updateSyncUI(`⏸️ Video ${state.syncedSeekPosition.toFixed(1)}s'de duraklatıldı`);
                }, 500));
                trackTimeout(setTimeout(() => {
                    if (isRoomOwner) {
                        updateSyncUI('⏳ Hazır olduğunuzda ▶️ OYNAT butonuna basın');
                    } else {
                        updateSyncUI('⏳ Oda sahibinin oynatmasını bekliyoruz...');
                    }
                }, 1000));
                
                updateControlsForSync(true);
                
                // ✅ FIX #9: Buffer timeout 30s → 15s
                if (isRoomOwner) {
                    syncTimeoutId = setTimeout(() => {
                        debugLog('⏰ Sync timeout - auto starting countdown');
                        startSyncCountdown();
                    }, 15000); // 30s → 15s
                }
                
            } else if (state.syncedPlayTime) {
                startSyncCountdownFromState(state);
            }
        }
        
        function startSyncCountdown() {
            if (!isRoomOwner || !syncState) return;
            
            if (syncTimeoutId) {
                clearTimeout(syncTimeoutId);
                syncTimeoutId = null;
            }
            
            const playTime = Date.now() + 5000;
            
            db.ref('rooms/' + currentRoomId + '/syncState').update({
                isBuffering: false,
                syncedPlayTime: playTime
            });
        }
        
        // ✅ FIX #11: Countdown interval'ı track et
        function startSyncCountdownFromState(state) {
            if (!state.syncedPlayTime) return;
            
            const playTime = state.syncedPlayTime;
            const now = Date.now();
            
            if (playTime <= now) {
                // ✅ FIX: Timeout'u track et
                trackTimeout(setTimeout(() => {
                    executeSync(state);
                }, 100));
                return;
            }
            
            // ✅ INTERVAL FIX: DOM element'i döngü dışında cache'le
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'block';
            }
            
            // ✅ FIX #11: Mevcut interval'ı temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            countdownInterval = setInterval(() => {
                const remaining = playTime - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    
                    // ✅ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        executeSync(state);
                    }, 100));
                } else {
                    const seconds = Math.ceil(remaining / 1000);
                    // ✅ countdownElement döngü dışında cache'lendi
                    if (countdownElement) {
                        countdownElement.textContent = `▶️ ${seconds} saniye sonra başlıyor...`;
                    }
                    updateSyncUI(`⏱️ ${seconds} saniye sonra oynatılacak...`);
                }
            }, 100);
            
            // ✅ FIX #11: Interval'ı track et
            trackInterval(countdownInterval);
        }
