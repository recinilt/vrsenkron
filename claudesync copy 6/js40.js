        
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
