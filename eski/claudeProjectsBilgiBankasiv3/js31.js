        
        // âœ… FIX #4: executeSync - seek/play yarÄ±ÅŸmasÄ±nÄ± Ã¶nle
        function executeSync(state) {
            if (!videoElement || !state) return;
            
            // âœ… FIX: syncedSeekPosition NaN/Infinity validation
            if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                debugLog('âš ï¸ Invalid syncedSeekPosition, aborting sync');
                clearSyncState();
                return;
            }
            
            debugLog('ğŸ¬ Executing sync at:', Date.now());
            
            // âœ… FIX #4: Ã–nce seek, sonra seeked event'i bekle, sonra play
            videoElement.currentTime = state.syncedSeekPosition;
            videoElement.playbackRate = 1.0;
            
            // âœ… FIX: seeked listener'Ä± track et
            let syncSeekCompleted = false;
            
            const onSeekedForSync = () => {
                if (syncSeekCompleted) return;
                syncSeekCompleted = true;
                videoElement.removeEventListener('seeked', onSeekedForSync);
                
                videoElement.play().then(() => {
                    debugLog('âœ… Sync play successful');
                    
                    syncModeActive = false;
                    
                    if (isRoomOwner) {
                        const serverTime = getServerTime();
                        db.ref('rooms/' + currentRoomId + '/videoState').update({
                            isPlaying: true,
                            currentTime: state.syncedSeekPosition,
                            startTimestamp: serverTime,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            // âœ… FIX: Timeout'u track et
                            trackTimeout(setTimeout(() => {
                                clearSyncState();
                            }, 500));
                        });
                    } else {
                        // âœ… FIX: Timeout'u track et
                        trackTimeout(setTimeout(() => {
                            clearSyncState();
                        }, 1000));
                    }
                }).catch(error => {
                    console.error('Sync play error:', error);
                    // âœ… FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        clearSyncState();
                    }, 500));
                });
            };
            
            videoElement.addEventListener('seeked', onSeekedForSync);
            
            // âœ… FIX #4: Timeout fallback - track edildi
            trackTimeout(setTimeout(() => {
                if (!syncSeekCompleted) {
                    syncSeekCompleted = true;
                    videoElement.removeEventListener('seeked', onSeekedForSync);
                    debugLog('âš ï¸ Sync seeked timeout, forcing play');
                    videoElement.play().catch(() => {});
                    syncModeActive = false;
                    clearSyncState();
                }
            }, 3000));
        }
