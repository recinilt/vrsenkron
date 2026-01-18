// ==================== SYNC MECHANISM ====================
        
        function initiateSync() {
            if (!currentRoomId || !videoElement) return;
            
            debugLog('🔄 Sync initiated by user');
            
            const syncBtn = getCachedElement('btn-sync');
            if (syncBtn) syncBtn.disabled = true;
            
            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                .then(snapshot => {
                    const viewers = snapshot.val();
                    if (!viewers) return;
                    
                    const positions = [];
                    
                    positions.push(videoElement.currentTime);
                    
                    Object.keys(viewers).forEach(uid => {
                        if (uid !== currentUser.uid && viewers[uid].currentPosition !== undefined) {
                            positions.push(viewers[uid].currentPosition);
                        }
                    });
                    
                    let minPosition = Math.min(...positions);
                    // ✅ FIX: NaN/Infinity validation
                    if (!isFinite(minPosition) || isNaN(minPosition)) {
                        minPosition = videoElement.currentTime || 0;
                    }
                    const targetPosition = Math.max(0, minPosition - 4);
                    
                    debugLog('📍 Positions:', positions, '→ Target:', targetPosition);
                    
                    const currentPos = videoElement.currentTime;
                    if (Math.abs(currentPos - targetPosition) > 1) {
                        db.ref('rooms/' + currentRoomId + '/syncState').set({
                            isBuffering: true,
                            syncedSeekPosition: targetPosition,
                            syncedPlayTime: null,
                            initiatedBy: currentUser.uid,
                            initiatedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    
                    applySyncState({
                        isBuffering: true,
                        syncedSeekPosition: targetPosition,
                        syncedPlayTime: null
                    });
                })
                .catch(error => {
                    console.error('Sync error:', error);
                    if (syncBtn) syncBtn.disabled = false;
                });
        }
        
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
