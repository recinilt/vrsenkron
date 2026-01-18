// ✅ FIX #7 & #8: hashchange ve onDisconnect temizleme
        function fullCleanup() {
            // ✅ ABR cleanup
            destroyAdaptiveStreaming();
            
            // ✅ P2P cleanup
            destroyP2PClient();

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
            
            debugLog('🧹 Full cleanup completed');
        }
        
        // ==================== FIREBASE BATCH UPDATES ====================
        function queueFirebaseUpdate(path, value) {
            pendingFirebaseUpdates[path] = value;
            
            if (!firebaseBatchTimeout) {
                firebaseBatchTimeout = setTimeout(() => {
                    flushFirebaseUpdates();
                }, 1000);
            }
        }
        
        function flushFirebaseUpdates() {
            if (Object.keys(pendingFirebaseUpdates).length > 0 && currentRoomId) {
                db.ref('rooms/' + currentRoomId)
                    .update(pendingFirebaseUpdates)
                    .catch(err => console.warn('Batch update error:', err));
                
                pendingFirebaseUpdates = {};
            }
            firebaseBatchTimeout = null;
        }
        
        function shouldUpdateFirebase() {
            const now = Date.now();
            if (now - lastFirebaseUpdate < 5000) {
                return false;
            }
            lastFirebaseUpdate = now;
            return true;
        }
        
        function shouldUpdateUI() {
            const now = Date.now();
            if (now - lastUIUpdate < 300) {
                return false;
            }
            lastUIUpdate = now;
            return true;
        }
        
        // ==================== CLOCK SYNC ====================
        async function initClockSync() {
            try {
                const samples = [];
                for (let i = 0; i < 3; i++) {
                    const t0 = Date.now();
                    const ref = db.ref('.info/serverTimeOffset');
                    const snapshot = await ref.once('value');
                    const offset = snapshot.val();
                    const t1 = Date.now();
                    const rtt = t1 - t0;
                    const serverTime = Date.now() + offset;
                    const calculatedOffset = serverTime - (t0 + rtt / 2);
                    samples.push(calculatedOffset);
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                clockOffset = samples.reduce((a, b) => a + b, 0) / samples.length;
                debugLog('🕐 Clock offset:', clockOffset, 'ms');
            } catch (error) {
                console.warn('Clock sync error:', error);
            }
        }
