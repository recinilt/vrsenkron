// ✅ FIX #4: executeSync - seek/play yarışmasını önle
        function executeSync(state) {
            if (!videoElement || !state) return;
            
            // ✅ FIX: syncedSeekPosition NaN/Infinity validation
            if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                debugLog('⚠️ Invalid syncedSeekPosition, aborting sync');
                clearSyncState();
                return;
            }
            
            debugLog('🎬 Executing sync at:', Date.now());
            
            // ✅ FIX #4: Önce seek, sonra seeked event'i bekle, sonra play
            videoElement.currentTime = state.syncedSeekPosition;
            videoElement.playbackRate = 1.0;
            
            // ✅ FIX: seeked listener'ı track et
            let syncSeekCompleted = false;
            
            const onSeekedForSync = () => {
                if (syncSeekCompleted) return;
                syncSeekCompleted = true;
                videoElement.removeEventListener('seeked', onSeekedForSync);
                
                videoElement.play().then(() => {
                    debugLog('✅ Sync play successful');
                    
                    syncModeActive = false;
                    
                    if (isRoomOwner) {
                        const serverTime = getServerTime();
                        db.ref('rooms/' + currentRoomId + '/videoState').update({
                            isPlaying: true,
                            currentTime: state.syncedSeekPosition,
                            startTimestamp: serverTime,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            // ✅ FIX: Timeout'u track et
                            trackTimeout(setTimeout(() => {
                                clearSyncState();
                            }, 500));
                        });
                    } else {
                        // ✅ FIX: Timeout'u track et
                        trackTimeout(setTimeout(() => {
                            clearSyncState();
                        }, 1000));
                    }
                }).catch(error => {
                    console.error('Sync play error:', error);
                    // ✅ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        clearSyncState();
                    }, 500));
                });
            };
            
            videoElement.addEventListener('seeked', onSeekedForSync);
            
            // ✅ FIX #4: Timeout fallback - track edildi
            trackTimeout(setTimeout(() => {
                if (!syncSeekCompleted) {
                    syncSeekCompleted = true;
                    videoElement.removeEventListener('seeked', onSeekedForSync);
                    debugLog('⚠️ Sync seeked timeout, forcing play');
                    videoElement.play().catch(() => {});
                    syncModeActive = false;
                    clearSyncState();
                }
            }, 3000));
        }
        
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
        
        function listenSyncState() {
            const ref = db.ref('rooms/' + currentRoomId + '/syncState');
            trackListener(ref);
            
            ref.on('value', (snapshot) => {
                const state = snapshot.val();
                
                if (state) {
                    applySyncState(state);
                } else {
                    if (syncState) {
                        clearSyncState();
                    }
                }
            });
        }
        
        function updateViewerPosition() {
            if (!currentUser || !currentRoomId || !videoElement) return;
            
            try {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid + '/currentPosition')
                    .set(videoElement.currentTime)
                    .catch(() => {});
            } catch (error) {
                console.warn('Position update error:', error);
            }
        }
        
        // ✅ FIX #10: syncVideoState - recursive trigger önleme
        let isSyncingVideoState = false;
