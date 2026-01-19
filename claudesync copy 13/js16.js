// ✅ FIX #7 & #8: hashchange ve onDisconnect temizleme
        function fullCleanup() {
            // ✅ ABR cleanup
            destroyAdaptiveStreaming();
            
            // ✅ P2P cleanup
            destroyP2PClient();

            // ✅ VR UI Panel cleanup
            if (typeof cleanupVRUIPanel === 'function') {
                cleanupVRUIPanel();
            }
            
            // ✅ YENİ: Ownership request cleanup
            if (typeof cleanupOwnershipRequests === 'function') {
                cleanupOwnershipRequests();
            }
            
            // ✅ YENİ: Spatial Audio cleanup
            if (typeof cleanupSpatialAudio === 'function') {
                cleanupSpatialAudio();
            }
            
            // ✅ YENİ: YouTube player cleanup
            if (typeof destroyYouTubePlayer === 'function') {
                destroyYouTubePlayer();
            }

            // Flush pending Firebase updates first
            if (firebaseBatchTimeout) {
                clearTimeout(firebaseBatchTimeout);
                flushFirebaseUpdates();
            }
            
            // ✅ FIX: Owner task'larını temizle
            clearOwnerTasks();
            
            clearAllIntervals();
            clearAllTimeouts();
            clearAllListeners();
            clearElementCache();
            
            // ✅ FIX #7: hashchange listener kaldır
            if (hashChangeHandler) {
                window.removeEventListener('hashchange', hashChangeHandler);
                hashChangeHandler = null;
            }
            
            // ✅ FIX: Scene listener'ları kaldır
            const scene = document.querySelector('a-scene');
            if (scene) {
                if (sceneEnterVRHandler) {
                    scene.removeEventListener('enter-vr', sceneEnterVRHandler);
                    sceneEnterVRHandler = null;
                }
                if (sceneExitVRHandler) {
                    scene.removeEventListener('exit-vr', sceneExitVRHandler);
                    sceneExitVRHandler = null;
                }
            }
            
            // ✅ FIX: Keyboard listener kaldır
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler);
                keydownHandler = null;
            }
            
            // ✅ FIX #8: onDisconnect referansını iptal et
            if (currentOnDisconnectRef) {
                currentOnDisconnectRef.cancel().catch(() => {});
                currentOnDisconnectRef = null;
            }
            
            // ✅ MEMORY LEAK FIX: Object URL temizle
            revokeCurrentVideoURL();
            
            // Remove from active viewers
            if (currentRoomId && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).remove().catch(() => {});
            }
            
            pendingFirebaseUpdates = {};
            
            // Reset tracking variables
            lastHardSeekTime = 0;
            lastSyncedPosition = 0;
            isJoiningRoom = false;
            isHardSeeking = false; // ✅ FIX: Reset isHardSeeking
            ownerTransferInProgress = false;
            selectedLocalFile = null;
            currentVideoSourceType = 'url';
            
            // ✅ VR Panel değişkenlerini sıfırla
            screenPosition = { x: 0, y: 2, z: -10 };
            currentScreenScale = 1.0;
            
            // ✅ YENİ: Ownership request değişkenlerini sıfırla
            lastOwnershipRequestTime = 0;
            pendingOwnershipRequest = null;
            
            // ✅ YENİ: YouTube değişkenlerini sıfırla
            isYouTubeMode = false;
            youtubeVideoId = null;
            ytPlayerReady = false;
            lastYTSyncTime = 0;
            
            debugLog('🧹 Full cleanup completed');
        }