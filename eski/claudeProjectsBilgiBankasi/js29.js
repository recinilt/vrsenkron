        
        function applySyncState(state) {
            if (!videoElement || !state) return;
            
            // Ã¢Å“â€¦ FIX: syncedSeekPosition validation
            if (state.syncedSeekPosition !== undefined && state.syncedSeekPosition !== null) {
                if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                    debugLog('Ã¢Å¡Â Ã¯Â¸Â Invalid syncedSeekPosition in applySyncState');
                    state.syncedSeekPosition = videoElement.currentTime || 0;
                }
            }
            
            syncState = state;
            syncModeActive = true;
            
            if (state.isBuffering) {
                videoElement.pause();
                videoElement.currentTime = state.syncedSeekPosition;
                
                updateSyncUI('ÄŸÅ¸â€â€ Senkronizasyon baÃ…Å¸latÃ„Â±ldÃ„Â±...');
                // Ã¢Å“â€¦ FIX: Timeout'larÃ„Â± track et
                trackTimeout(setTimeout(() => {
                    updateSyncUI(`Ã¢ÂÂ¸Ã¯Â¸Â Video ${state.syncedSeekPosition.toFixed(1)}s'de duraklatÃ„Â±ldÃ„Â±`);
                }, 500));
                trackTimeout(setTimeout(() => {
                    if (isRoomOwner) {
                        updateSyncUI('Ã¢ÂÂ³ HazÃ„Â±r olduÃ„Å¸unuzda Ã¢â€“Â¶Ã¯Â¸Â OYNAT butonuna basÃ„Â±n');
                    } else {
                        updateSyncUI('Ã¢ÂÂ³ Oda sahibinin oynatmasÃ„Â±nÃ„Â± bekliyoruz...');
                    }
                }, 1000));
                
                updateControlsForSync(true);
                
                // Ã¢Å“â€¦ FIX #9: Buffer timeout 30s Ã¢â€ â€™ 15s
                if (isRoomOwner) {
                    syncTimeoutId = setTimeout(() => {
                        debugLog('Ã¢ÂÂ° Sync timeout - auto starting countdown');
                        startSyncCountdown();
                    }, 15000); // 30s Ã¢â€ â€™ 15s
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
