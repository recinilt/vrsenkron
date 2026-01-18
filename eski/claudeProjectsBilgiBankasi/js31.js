        
        // Ã¢Å“â€¦ FIX #4: executeSync - seek/play yarÃ„Â±Ã…Å¸masÃ„Â±nÃ„Â± ÃƒÂ¶nle
        function executeSync(state) {
            if (!videoElement || !state) return;
            
            // Ã¢Å“â€¦ FIX: syncedSeekPosition NaN/Infinity validation
            if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                debugLog('Ã¢Å¡Â Ã¯Â¸Â Invalid syncedSeekPosition, aborting sync');
                clearSyncState();
                return;
            }
            
            debugLog('ÄŸÅ¸ÂÂ¬ Executing sync at:', Date.now());
            
            // Ã¢Å“â€¦ FIX #4: Ãƒâ€“nce seek, sonra seeked event'i bekle, sonra play
            videoElement.currentTime = state.syncedSeekPosition;
            videoElement.playbackRate = 1.0;
            
            // Ã¢Å“â€¦ FIX: seeked listener'Ã„Â± track et
            let syncSeekCompleted = false;
            
            const onSeekedForSync = () => {
                if (syncSeekCompleted) return;
                syncSeekCompleted = true;
                videoElement.removeEventListener('seeked', onSeekedForSync);
                
                videoElement.play().then(() => {
                    debugLog('Ã¢Å“â€¦ Sync play successful');
                    
                    syncModeActive = false;
                    
                    if (isRoomOwner) {
                        const serverTime = getServerTime();
                        db.ref('rooms/' + currentRoomId + '/videoState').update({
                            isPlaying: true,
                            currentTime: state.syncedSeekPosition,
                            startTimestamp: serverTime,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            // Ã¢Å“â€¦ FIX: Timeout'u track et
                            trackTimeout(setTimeout(() => {
                                clearSyncState();
                            }, 500));
                        });
                    } else {
                        // Ã¢Å“â€¦ FIX: Timeout'u track et
                        trackTimeout(setTimeout(() => {
                            clearSyncState();
                        }, 1000));
                    }
                }).catch(error => {
                    console.error('Sync play error:', error);
                    // Ã¢Å“â€¦ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        clearSyncState();
                    }, 500));
                });
            };
            
            videoElement.addEventListener('seeked', onSeekedForSync);
            
            // Ã¢Å“â€¦ FIX #4: Timeout fallback - track edildi
            trackTimeout(setTimeout(() => {
                if (!syncSeekCompleted) {
                    syncSeekCompleted = true;
                    videoElement.removeEventListener('seeked', onSeekedForSync);
                    debugLog('Ã¢Å¡Â Ã¯Â¸Â Sync seeked timeout, forcing play');
                    videoElement.play().catch(() => {});
                    syncModeActive = false;
                    clearSyncState();
                }
            }, 3000));
        }
