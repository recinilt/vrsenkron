function playVideo() {
            if (!isRoomOwner || !videoElement) return;
            
            if (syncState && syncState.isBuffering) {
                startSyncCountdown();
                return;
            }
            
            if (playPromisePending) return;
            playPromisePending = true;
            
            lastCommandSource = 'self';
            
            const playPromise = videoElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    playPromisePending = false;
                    const serverTime = getServerTime();
                    
                    db.ref('rooms/' + currentRoomId + '/videoState').update({
                        isPlaying: true,
                        currentTime: videoElement.currentTime,
                        startTimestamp: serverTime,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // ✅ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        lastCommandSource = null;
                    }, 300));
                }).catch(error => {
                    playPromisePending = false;
                    lastCommandSource = null;
                    
                    if (error.name === 'NotAllowedError') {
                        console.warn('Autoplay blocked - user interaction required');
                    } else if (error.name !== 'AbortError') {
                        console.warn('Play error:', error);
                    }
                });
            } else {
                playPromisePending = false;
                const serverTime = getServerTime();
                db.ref('rooms/' + currentRoomId + '/videoState').update({
                    isPlaying: true,
                    currentTime: videoElement.currentTime,
                    startTimestamp: serverTime,
                    lastUpdate: firebase.database.ServerValue.TIMESTAMP
                });
                // ✅ FIX: Timeout'u track et
                trackTimeout(setTimeout(() => { lastCommandSource = null; }, 300));
            }
        }
        
        function pauseVideo() {
            if (!isRoomOwner || !videoElement) return;
            
            if (playPromisePending) {
                const checkAndPause = () => {
                    if (!playPromisePending) {
                        executePause();
                    } else {
                        setTimeout(checkAndPause, 50);
                    }
                };
                setTimeout(checkAndPause, 50);
                return;
            }
            
            executePause();
        }
        
        function executePause() {
            if (!videoElement) return;
            
            lastCommandSource = 'self';
            
            videoElement.pause();
            
            const currentPos = videoElement.currentTime;
            
            const updates = {
                'videoState/isPlaying': false,
                'videoState/currentTime': currentPos,
                'videoState/startTimestamp': getServerTime(),
                'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
                'keyframes': null,
                'syncState': null
            };
            
            db.ref('rooms/' + currentRoomId).update(updates).then(() => {
                debugLog('⏸️ Pause broadcasted, keyframes/syncState cleared');
            }).catch(err => console.warn('Pause update error:', err));
            
            // ✅ FIX: Timeout'u track et
            trackTimeout(setTimeout(() => {
                lastCommandSource = null;
            }, 300));
        }
        
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
