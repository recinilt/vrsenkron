        
        function applySyncState(state) {
            if (!state) return;
            
            // YouTube veya normal video kontrolü
            if (!isYouTubeMode && !videoElement) return;
            if (isYouTubeMode && (!ytPlayer || !ytPlayerReady)) return;
            
            // Validation
            if (state.syncedSeekPosition !== undefined && state.syncedSeekPosition !== null) {
                if (!isFinite(state.syncedSeekPosition) || isNaN(state.syncedSeekPosition)) {
                    debugLog('⚠️ Invalid syncedSeekPosition in applySyncState');
                    return;
                }
            }
            
            syncState = state;
            syncModeActive = true;
            
            debugLog('🔄 Applying sync state, playAtTime:', state.playAtTime, 'position:', state.syncedSeekPosition);
            
            // Video'yu duraklat ve seek yap
            if (isYouTubeMode) {
                ytPlayer.pauseVideo();
                ytPlayer.seekTo(state.syncedSeekPosition, true);
            } else {
                videoElement.pause();
                videoElement.currentTime = state.syncedSeekPosition;
            }
            
            // Kontrolleri disable et
            updateControlsForSync(true);
            
            // playAtTime varsa, o zamana kadar bekle
            if (state.playAtTime) {
                const serverTime = getServerTime();
                const delay = state.playAtTime - serverTime;
                
                debugLog('⏱️ Will play in', delay, 'ms');
                
                if (delay > 0) {
                    updateSyncUI(`⏱️ ${Math.ceil(delay / 1000)}s sonra başlayacak...`);
                    
                    // Kalan süreyi göster
                    const countdownEl = getCachedElement('sync-countdown');
                    if (countdownEl) {
                        countdownEl.style.display = 'block';
                    }
                    
                    // Countdown interval
                    if (countdownInterval) {
                        clearInterval(countdownInterval);
                        countdownInterval = null;
                    }
                    
                    countdownInterval = setInterval(() => {
                        const remaining = state.playAtTime - getServerTime();
                        const seconds = Math.ceil(remaining / 1000);
                        
                        if (countdownEl) {
                            countdownEl.textContent = `${seconds}...`;
                        }
                        updateSyncUI(`⏱️ ${seconds}s sonra başlayacak...`);
                        
                        if (remaining <= 0) {
                            clearInterval(countdownInterval);
                            countdownInterval = null;
                        }
                    }, 100);
                    trackInterval(countdownInterval);
                    
                    // playAtTime'da oynat
                    if (syncPlayAtTimeTimeout) {
                        clearTimeout(syncPlayAtTimeTimeout);
                    }
                    
                    syncPlayAtTimeTimeout = setTimeout(() => {
                        executeSyncPlay(state);
                    }, delay);
                    trackTimeout(syncPlayAtTimeTimeout);
                    
                } else {
                    // Zaman geçmiş, hemen başlat
                    executeSyncPlay(state);
                }
            }
        }
        
        // Sync play - playAtTime anında çağrılır
        function executeSyncPlay(state) {
            debugLog('🎬 Executing sync play at:', Date.now());
            
            // Countdown'ı temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            const countdownEl = getCachedElement('sync-countdown');
            if (countdownEl) {
                countdownEl.style.display = 'none';
                countdownEl.textContent = '';
            }
            
            if (isYouTubeMode) {
                // YouTube
                ytPlayer.seekTo(state.syncedSeekPosition, true);
                ytPlayer.playVideo();
                
                debugLog('✅ YouTube sync play executed');
                
                // Owner Firebase güncelle
                if (isRoomOwner) {
                    const serverTime = getServerTime();
                    db.ref('rooms/' + currentRoomId + '/videoState').update({
                        isPlaying: true,
                        currentTime: state.syncedSeekPosition,
                        startTimestamp: serverTime,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        clearSyncState();
                    });
                } else {
                    trackTimeout(setTimeout(() => {
                        clearSyncState();
                    }, 500));
                }
                
            } else {
                // Normal video
                videoElement.currentTime = state.syncedSeekPosition;
                
                videoElement.play().then(() => {
                    debugLog('✅ Sync play successful');
                    
                    if (isRoomOwner) {
                        const serverTime = getServerTime();
                        db.ref('rooms/' + currentRoomId + '/videoState').update({
                            isPlaying: true,
                            currentTime: state.syncedSeekPosition,
                            startTimestamp: serverTime,
                            lastUpdate: firebase.database.ServerValue.TIMESTAMP
                        }).then(() => {
                            clearSyncState();
                        });
                    } else {
                        trackTimeout(setTimeout(() => {
                            clearSyncState();
                        }, 500));
                    }
                }).catch(error => {
                    console.error('Sync play error:', error);
                    clearSyncState();
                });
            }
        }
        
        function startSyncCountdown() {
            // Bu fonksiyon artık kullanılmıyor ama backward compatibility için tutuluyor
            if (!isRoomOwner || !syncState) return;
            
            // Direkt sync başlat
            executeOwnerSync();
        }
