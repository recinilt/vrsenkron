        
        function applySyncState(state) {
            if (!videoElement || !state) return;
            
            // âœ… FIX: syncedSeekPosition validation
            if (state.syncedSeekPosition !== undefined && state.syncedSeekPosition !== null) {
                if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                    debugLog('âš ï¸ Invalid syncedSeekPosition in applySyncState');
                    state.syncedSeekPosition = videoElement.currentTime || 0;
                }
            }
            
            syncState = state;
            syncModeActive = true;
            
            if (state.isBuffering) {
                videoElement.pause();
                videoElement.currentTime = state.syncedSeekPosition;
                
                updateSyncUI('ğŸ”„ Senkronizasyon baÅŸlatÄ±ldÄ±...');
                // âœ… FIX: Timeout'larÄ± track et
                trackTimeout(setTimeout(() => {
                    updateSyncUI(`â¸ï¸ Video ${state.syncedSeekPosition.toFixed(1)}s'de duraklatÄ±ldÄ±`);
                }, 500));
                trackTimeout(setTimeout(() => {
                    if (isRoomOwner) {
                        updateSyncUI('â³ HazÄ±r olduÄŸunuzda â–¶ï¸ OYNAT butonuna basÄ±n');
                    } else {
                        updateSyncUI('â³ Oda sahibinin oynatmasÄ±nÄ± bekliyoruz...');
                    }
                }, 1000));
                
                updateControlsForSync(true);
                
                // âœ… FIX #9: Buffer timeout 30s â†’ 15s
                if (isRoomOwner) {
                    syncTimeoutId = setTimeout(() => {
                        debugLog('â° Sync timeout - auto starting countdown');
                        startSyncCountdown();
                    }, 15000); // 30s â†’ 15s
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
