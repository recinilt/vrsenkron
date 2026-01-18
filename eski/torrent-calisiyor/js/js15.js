// ✅ FIX #5 & #6: syncVideo - main thread blokajı ve DOM thrashing azaltma
function syncVideo() {
    if (isRoomOwner || isSeeking || isHardSeeking) return;
    if (!videoElement || !currentRoomData || !currentRoomData.videoState) return;

    if (syncState && syncState.isBuffering) return;

    // ✅ YENİ: P2P indirme tamamlanmadıysa sync yapma
    const isP2PMode = currentRoomData.p2p && currentRoomData.p2p.magnetURI;
    if (isP2PMode && !isP2PDownloadComplete) {
        debugLog('⚠️ P2P downloading, sync disabled');
        return;
    }

    // NORMAL SYNC LOGIC (P2P complete veya URL modu)
    const state = currentRoomData.videoState;
    const serverTime = getServerTime();
    let expectedTime = state.currentTime;

    if (state.isPlaying) {
        const elapsed = (serverTime - state.startTimestamp) / 1000;
        if (!isFinite(elapsed) || elapsed < 0 || elapsed > 86400) {
            debugLog('⚠️ Invalid elapsed time, skipping sync');
            return;
        }
        expectedTime = state.currentTime + elapsed;
    }

    const duration = videoElement.duration || Infinity;
    expectedTime = Math.max(0, Math.min(duration, expectedTime));

    const currentTime = videoElement.currentTime;
    const drift = Math.abs(currentTime - expectedTime) * 1000;

    debugLog(`Sync - Expected: ${expectedTime}, Current: ${currentTime}, Drift: ${drift}, Playing: ${state.isPlaying}`);


    if (!state.isPlaying) {
        if (!videoElement.paused) {
            videoElement.pause();
        }
        videoElement.playbackRate = 1.0;

        if (isBuffering) {
            if (bufferCountdownInterval) {
                clearInterval(bufferCountdownInterval);
                bufferCountdownInterval = null;
            }
            isBuffering = false;
            const bufferEl = getCachedElement('buffer-countdown');
            if (bufferEl) bufferEl.style.display = 'none';
            debugLog('isBuffering cleared due to pause');
        }

        if (drift > 500) {
            const alreadyAtPosition = Math.abs(videoElement.currentTime - expectedTime) < 0.5;
            if (!alreadyAtPosition) {
                debugLog(`Paused - seeking to owner position, ${expectedTime}`);
                videoElement.currentTime = expectedTime;
            }
        }
        return;
    }

    // PLAYING STATE SYNC - NORMAL
    if (drift <= TIER1_THRESHOLD) {
        if (videoElement.paused) {
            videoElement.play().catch(err => console.warn('Play failed:', err));
            trackTimeout(setTimeout(() => videoElement.play().catch(() => {}), 200));
        }
        videoElement.playbackRate = 1.0;
    } else if (drift <= TIER2_THRESHOLD) {
        if (videoElement.paused) {
            videoElement.play().catch(() => {});
        }
        const behind = currentTime < expectedTime;
        videoElement.playbackRate = behind ? TIER2_LAGGING_SPEED : 0.95;
    } else if (drift <= TIER3_THRESHOLD) {
        if (videoElement.paused) {
            videoElement.play().catch(() => {});
        }
        const behind = currentTime < expectedTime;
        videoElement.playbackRate = behind ? TIER3_LAGGING_SPEED : 0.90;
    } else if (drift <= 3000) {
        if (videoElement.paused) {
            videoElement.play().catch(() => {});
        }
        const behind = currentTime < expectedTime;
        videoElement.playbackRate = behind ? 1.25 : 0.85;
    } else if (drift <= LARGE_DRIFT_THRESHOLD) {
        if (videoElement.paused) {
            videoElement.play().catch(() => {});
        }
        const behind = currentTime < expectedTime;
        videoElement.playbackRate = behind ? 1.5 : 0.75;
    } else {
        // Large drift - Hard seek
        const now = Date.now();
        if (now - lastHardSeekTime < HARD_SEEK_MIN_INTERVAL || isHardSeeking) {
            debugLog(`Hard seek throttled or in progress, using playbackRate`);
            if (videoElement.paused) {
                videoElement.play().catch(() => {});
            }
            const behind = currentTime < expectedTime;
            videoElement.playbackRate = behind ? 1.75 : 0.65;
            return;
        }

        debugLog(`Large drift detected, ${drift}ms - initiating buffer-wait`);
        isBuffering = true;
        isHardSeeking = true;
        lastHardSeekTime = now;

        const BUFFER_ADVANCE = 9;
        const targetSeek = expectedTime - BUFFER_ADVANCE;
        const clampedTarget = Math.max(0, Math.min(duration, targetSeek));

        videoElement.pause();
        
        const onHardSeeked = () => {
            videoElement.removeEventListener('seeked', onHardSeeked);
            isHardSeeking = false;
            debugLog('✅ Hard seek completed (syncVideo)');
        };
        videoElement.addEventListener('seeked', onHardSeeked);
        
        videoElement.currentTime = clampedTarget;
        lastSyncedPosition = clampedTarget;
        bufferTargetTime = Date.now() + (BUFFER_ADVANCE * 1000);
        
        trackTimeout(setTimeout(() => {
            if (isHardSeeking) {
                videoElement.removeEventListener('seeked', onHardSeeked);
                isHardSeeking = false;
                debugLog('⚠️ Hard seek timeout (syncVideo)');
            }
        }, 3000));

        const countdownEl = getCachedElement('buffer-countdown');
        if (countdownEl) countdownEl.style.display = 'block';

        if (bufferCountdownInterval) {
            clearInterval(bufferCountdownInterval);
            bufferCountdownInterval = null;
        }

        bufferCountdownInterval = setInterval(() => {
            const remaining = Math.max(0, bufferTargetTime - Date.now());
            const seconds = Math.ceil(remaining / 1000);

            if (countdownEl) {
                countdownEl.textContent = `${seconds}s`;
            }

            if (remaining <= 0) {
                clearInterval(bufferCountdownInterval);
                bufferCountdownInterval = null;
                isBuffering = false;

                if (countdownEl) countdownEl.style.display = 'none';

                if (currentRoomData.videoState && currentRoomData.videoState.isPlaying) {
                    videoElement.play().catch(() => {});
                    videoElement.playbackRate = 1.0;
                    debugLog(`Buffer complete - auto-started`);
                }
            }
        }, 100);
    }
}


function listenKeyframes() {
    const ref = db.ref('rooms/' + currentRoomId + '/keyframes').limitToLast(1);
    trackListener(ref);

    ref.on('child_added', snapshot => {
        const keyframe = snapshot.val();
        if (!videoElement) return;

        // ✅ YENİ: P2P indirme tamamlanmadıysa keyframe sync yapma
        const isP2PMode = currentRoomData && currentRoomData.p2p && currentRoomData.p2p.magnetURI;
        if (isP2PMode && !isP2PDownloadComplete) {
            debugLog('⚠️ Keyframe sync disabled - P2P downloading');
            return;
        }

        if (syncState || isBuffering || isSeeking || isHardSeeking) return;


        const drift = Math.abs(videoElement.currentTime - keyframe.time) * 1000;

        if (drift > LARGE_DRIFT_THRESHOLD) {
            if (isSeeking || isHardSeeking) return;

            const now = Date.now();
            if (now - lastHardSeekTime > HARD_SEEK_MIN_INTERVAL) {
                isHardSeeking = true;
                lastHardSeekTime = now;
                
                const onKeyframeSeeked = () => {
                    videoElement.removeEventListener('seeked', onKeyframeSeeked);
                    isHardSeeking = false;
                    debugLog('✅ Keyframe seek completed');
                };
                videoElement.addEventListener('seeked', onKeyframeSeeked);
                
                videoElement.currentTime = keyframe.time;
                lastSyncedPosition = keyframe.time;
                debugLog('🔁 Keyframe sync', keyframe.time);
                
                trackTimeout(setTimeout(() => {
                    if (isHardSeeking) {
                        videoElement.removeEventListener('seeked', onKeyframeSeeked);
                        isHardSeeking = false;
                        debugLog('⚠️ Keyframe seek timeout');
                    }
                }, 3000));
            }
        }
    });
}


        function listenVideoState() {
            const ref = db.ref(`rooms/${currentRoomId}/videoState`);
            trackListener(ref);

            ref.on('value', snapshot => {
                const newState = snapshot.val();
                if (!newState) return;

                if (syncModeActive) {
                    debugLog('Ignoring video state update - sync mode active');
                    return;
                }

                if (lastCommandSource === 'self') {
                    debugLog('Ignoring self-triggered video state update');
                    return;
                }

                const oldState = previousVideoState;

                if (oldState &&
                    oldState.isPlaying === newState.isPlaying &&
                    Math.abs(oldState.currentTime - newState.currentTime) < 0.1 &&
                    oldState.startTimestamp === newState.startTimestamp) {
                    return;
                }

                // ✅ FIX: JSON.parse/stringify yerine shallow copy (daha hızlı)
                previousVideoState = {
                    isPlaying: newState.isPlaying,
                    currentTime: newState.currentTime,
                    startTimestamp: newState.startTimestamp,
                    lastUpdate: newState.lastUpdate
                };
                currentRoomData.videoState = newState;

                if (!isRoomOwner) {
                    const now = Date.now();

                    if (oldState && oldState.isPlaying && !newState.isPlaying) {
                        debugLog('Pause command detected - syncing immediately (bypass throttle)');
                        lastVideoStateUpdate = now;
                        syncVideo();
                        return;
                    }

                    if (now - lastVideoStateUpdate < SYNCCHECKINTERVAL) return;

                    lastVideoStateUpdate = now;
                    syncVideo();
                }
            });
        }


        function sendKeyframe() {
            // ✅ FIX: isHardSeeking kontrolü eklendi
            if (!videoElement || !isRoomOwner || isSeeking || isHardSeeking) return;

            try {
                const ref = db.ref('rooms/' + currentRoomId + '/keyframes').push({
                    time: videoElement.currentTime,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                trackTimeout(setTimeout(() => ref.remove().catch(() => {}), 30000));
            } catch (error) {
                console.warn('Keyframe send error:', error);
            }
        }

        


        
        function trackDrift() {
            // ✅ FIX: isHardSeeking kontrolü eklendi
            if (!videoElement || !currentRoomData || !currentRoomData.videoState || isSeeking || isHardSeeking) return;

            try {
                const state = currentRoomData.videoState;
                const serverTime = getServerTime();
                const expectedTime = state.isPlaying 
                    ? state.currentTime + (serverTime - state.startTimestamp) / 1000 
                    : state.currentTime;

                const drift = (videoElement.currentTime - expectedTime) * 1000;

                if (lastDriftValue === null || Math.abs(drift - lastDriftValue) > 1000) {
                    if (shouldUpdateFirebase()) {
                        queueFirebaseUpdate('activeViewers/' + currentUser.uid + '/currentDrift', drift);
                    }
                    lastDriftValue = drift;
                }
            } catch (error) {
                console.warn('Drift tracking error:', error);
            }
        }

        
        function updatePresence() {
            if (!currentUser || !currentRoomId) return;
            
            try {
                queueFirebaseUpdate(
                    'activeViewers/' + currentUser.uid + '/lastSeen',
                    firebase.database.ServerValue.TIMESTAMP
                );
            } catch (error) {
                console.warn('Presence update error:', error);
            }
        }
        
        function checkOwnerPresence() {
            if (!isRoomOwner && currentRoomData && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentRoomData.owner).once('value')
                    .then(snapshot => {
                        const ownerData = snapshot.val();
                        if (!ownerData || (Date.now() - ownerData.lastSeen > OWNER_PRESENCE_TIMEOUT)) {
                            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                                .then(viewersSnapshot => {
                                    const viewers = viewersSnapshot.val();
                                    if (viewers) {
                                        const newOwner = Object.keys(viewers)[0];
                                        if (newOwner === currentUser.uid) {
                                            db.ref('rooms/' + currentRoomId).update({ owner: newOwner });
                                            isRoomOwner = true;
                                            debugLog('👑 Ownership transferred to you');
                                        }
                                    }
                                });
                        }
                    })
                    .catch(() => {});
            }
        }
        
        // ==================== UI UPDATES (DEBOUNCED) ====================
        function updateRoomInfoDisplay() {
            if (!currentRoomData) return;
            getCachedElement('room-name-display').textContent = currentRoomData.name + (isRoomOwner ? ' 👑' : '');
            updateViewerCount();
        }
        
        // ✅ FIX #12: DOM thrashing azaltma - queueRAF kullan
        function updateViewerCount() {
            if (!currentRoomId || !shouldUpdateUI()) return;
            
            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                .then(snapshot => {
                    const count = snapshot.numChildren();
                    queueRAF(() => {
                        const viewerElement = getCachedElement('viewer-count');
                        if (viewerElement) {
                            viewerElement.textContent = `👥 ${count} izleyici`;
                        }
                    });
                })
                .catch(() => {});
        }
        
        function cleanupOldData() {
            if (!currentRoomId || !isRoomOwner) return;
            
            try {
                const cutoffTime = Date.now() - 60000;
                
                db.ref('rooms/' + currentRoomId + '/keyframes').once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            snapshot.forEach(child => {
                                const data = child.val();
                                if (data.timestamp && data.timestamp < cutoffTime) {
                                    child.ref.remove().catch(() => {});
                                }
                            });
                        }
                    })
                    .catch(() => {});
                
                db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                    .then(snapshot => {
                        if (snapshot.exists()) {
                            snapshot.forEach(child => {
                                const viewer = child.val();
                                if (viewer.lastSeen && (Date.now() - viewer.lastSeen > 60000)) {
                                    child.ref.remove().catch(() => {});
                                }
                            });
                        }
                    })
                    .catch(() => {});
                
                debugLog('🧹 Cleanup old data');
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }
        
        // ✅ FIX #12: updateSyncStatus - queueRAF ile DOM thrashing önle
        function updateSyncStatus(drift) {
            if (!shouldUpdateUI()) return;
            
            queueRAF(() => {
                const statusText = getCachedElement('sync-text');
                if (!statusText) return;
                
                if (drift < TIER1_THRESHOLD) {
                    statusText.textContent = '✅ Senkronize';
                    statusText.className = 'status-good';
                } else if (drift < TIER2_THRESHOLD) {
                    statusText.textContent = '⚠️ Hafif sapma';
                    statusText.className = 'status-warning';
                } else {
                    statusText.textContent = '❌ Senkronizasyon kaybı';
                    statusText.className = 'status-error';
                }
            });
        }
        
        // ==================== PERIODIC TASKS ====================
        function startPeriodicTasks() {
            trackInterval(setInterval(initClockSync, CLOCK_SYNC_INTERVAL));
            trackInterval(setInterval(trackDrift, DRIFT_UPDATE_INTERVAL));
            trackInterval(setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL));
            trackInterval(setInterval(updateViewerCount, 10000));
            trackInterval(setInterval(updateViewerPosition, 5000));
            
            if (!isRoomOwner) {
                trackInterval(setInterval(checkOwnerPresence, 30000));
            }
            
            debugLog('✅ Periodic tasks started');
        }
        
        // ✅ FIX: Owner interval ID'lerini ayrı track et (birikim önleme)
        let ownerKeyframeInterval = null;
        let ownerCleanupInterval = null;
        
        function clearOwnerTasks() {
            if (ownerKeyframeInterval) {
                clearInterval(ownerKeyframeInterval);
                ownerKeyframeInterval = null;
            }
            if (ownerCleanupInterval) {
                clearInterval(ownerCleanupInterval);
                ownerCleanupInterval = null;
            }
            debugLog('🧹 Owner tasks cleared');
        }
        
        function startOwnerTasks() {
            // ✅ FIX: Önce mevcut owner interval'larını temizle (birikim önleme)
            clearOwnerTasks();
            
            ownerKeyframeInterval = setInterval(sendKeyframe, KEYFRAME_INTERVAL);
            ownerCleanupInterval = setInterval(cleanupOldData, 30000);
            
            trackInterval(ownerKeyframeInterval);
            trackInterval(ownerCleanupInterval);
            
            debugLog('👑 Owner tasks started');
        }
        

// DOMContentLoaded'dan ÖNCE, script içinde ekle:
// ✅ FIX: video-texture-fix artık throttled - her frame yerine 100ms'de bir
AFRAME.registerComponent('video-texture-fix', {
    schema: { type: 'selector' },
    init: function () {
        this.videoEl = this.data;
        this.material = null;
        this.lastUpdate = 0;
        this.updateInterval = 100; // ms - 10 FPS yeterli texture update için
    },
    tick: function (time) {
        if (!this.videoEl) return;
        
        // Throttle: sadece 100ms'de bir güncelle
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;
        
        // readyState >= 2 means HAVE_CURRENT_DATA or higher
        // Sadece video oynatılıyorken güncelle
        if (this.videoEl.readyState >= 2 && !this.videoEl.paused) {
            if (!this.material) {
                const mesh = this.el.getObject3D('mesh');
                if (mesh && mesh.material) {
                    this.material = mesh.material;
                }
            }
            
            if (this.material && this.material.map) {
                this.material.map.needsUpdate = true;
            }
        }
    }
});


        // ==================== INIT ====================
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🎬 VR Cinema ULTRA - Optimized v3.7 (P2P WebTorrent Support)');
            updateQualityCapUI();
            setupFileInput(); // P2P dosya seçim event'lerini kur
            
            const scene = document.querySelector('a-scene');
            if (scene) {
                // ✅ FIX: Listener'ları referansla kaydet (cleanup için)
                sceneEnterVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'true');
                        debugLog('👓 VR mode: Raycaster enabled');
                    }
                };
                
                sceneExitVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'false');
                        debugLog('👓 VR mode exit: Raycaster disabled');
                    }
                };
                
                scene.addEventListener('enter-vr', sceneEnterVRHandler);
                scene.addEventListener('exit-vr', sceneExitVRHandler);
            }
            
            // ✅ FIX: Keyboard listener'ı referansla kaydet (cleanup için)
            keydownHandler = (e) => {
                if (!currentRoomId || !isRoomOwner) return;
                
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        if (videoElement && videoElement.paused) {
                            playVideo();
                        } else {
                            pauseVideo();
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        seekBackward();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        seekForward();
                        break;
                }
            };
            
            document.addEventListener('keydown', keydownHandler);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            fullCleanup();
        });
