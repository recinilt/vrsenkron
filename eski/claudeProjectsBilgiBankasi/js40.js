        
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
                
                debugLog('ÄŸÅ¸Â§Â¹ Cleanup old data');
            } catch (error) {
                console.warn('Cleanup error:', error);
            }
        }
        
        // Ã¢Å“â€¦ FIX #12: updateSyncStatus - queueRAF ile DOM thrashing ÃƒÂ¶nle
        function updateSyncStatus(drift) {
            if (!shouldUpdateUI()) return;
            
            queueRAF(() => {
                const statusText = getCachedElement('sync-text');
                if (!statusText) return;
                
                if (drift < TIER1_THRESHOLD) {
                    statusText.textContent = 'Ã¢Å“â€¦ Senkronize';
                    statusText.className = 'status-good';
                } else if (drift < TIER2_THRESHOLD) {
                    statusText.textContent = 'Ã¢Å¡Â Ã¯Â¸Â Hafif sapma';
                    statusText.className = 'status-warning';
                } else {
                    statusText.textContent = 'Ã¢ÂÅ’ Senkronizasyon kaybÃ„Â±';
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
            
            debugLog('Ã¢Å“â€¦ Periodic tasks started');
        }
        
        // Ã¢Å“â€¦ FIX: Owner interval ID'lerini ayrÃ„Â± track et (birikim ÃƒÂ¶nleme)
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
            debugLog('ÄŸÅ¸Â§Â¹ Owner tasks cleared');
        }
        
        function startOwnerTasks() {
            // Ã¢Å“â€¦ FIX: Ãƒâ€“nce mevcut owner interval'larÃ„Â±nÃ„Â± temizle (birikim ÃƒÂ¶nleme)
            clearOwnerTasks();
            
            ownerKeyframeInterval = setInterval(sendKeyframe, KEYFRAME_INTERVAL);
            ownerCleanupInterval = setInterval(cleanupOldData, 30000);
            
            trackInterval(ownerKeyframeInterval);
            trackInterval(ownerCleanupInterval);
            
            debugLog('ÄŸÅ¸â€˜â€˜ Owner tasks started');
        }
        

// DOMContentLoaded'dan Ãƒâ€“NCE, script iÃƒÂ§inde ekle:
// Ã¢Å“â€¦ FIX: video-texture-fix artÃ„Â±k throttled - her frame yerine 100ms'de bir
AFRAME.registerComponent('video-texture-fix', {
    schema: { type: 'selector' },
    init: function () {
        this.videoEl = this.data;
        this.material = null;
        this.lastUpdate = 0;
        this.updateInterval = 100; // ms - 10 FPS yeterli texture update iÃƒÂ§in
    },
    tick: function (time) {
        if (!this.videoEl) return;
        
        // Throttle: sadece 100ms'de bir gÃƒÂ¼ncelle
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;
        
        // readyState >= 2 means HAVE_CURRENT_DATA or higher
        // Sadece video oynatÃ„Â±lÃ„Â±yorken gÃƒÂ¼ncelle
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
            console.log('ÄŸÅ¸ÂÂ¬ VR Cinema ULTRA - Optimized v3.7 (P2P WebTorrent Support)');
            updateQualityCapUI();
            setupFileInput(); // P2P dosya seÃƒÂ§im event'lerini kur
            
            const scene = document.querySelector('a-scene');
            if (scene) {
                // Ã¢Å“â€¦ FIX: Listener'larÃ„Â± referansla kaydet (cleanup iÃƒÂ§in)
                sceneEnterVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'true');
                        debugLog('ÄŸÅ¸â€˜â€œ VR mode: Raycaster enabled');
                    }
                };
                
                sceneExitVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'false');
                        debugLog('ÄŸÅ¸â€˜â€œ VR mode exit: Raycaster disabled');
                    }
                };
                
                scene.addEventListener('enter-vr', sceneEnterVRHandler);
                scene.addEventListener('exit-vr', sceneExitVRHandler);
            }
            
            // Ã¢Å“â€¦ FIX: Keyboard listener'Ã„Â± referansla kaydet (cleanup iÃƒÂ§in)
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
