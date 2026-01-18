// DOM Element Caching
        function getCachedElement(id) {
            if (!cachedElements[id]) {
                cachedElements[id] = document.getElementById(id);
            }
            return cachedElements[id];
        }
        
        function clearElementCache() {
            cachedElements = {};
        }
        
        // ==================== MEMORY LEAK PREVENTION ====================
        function trackInterval(id) {
            if (id) activeIntervals.push(id);
            return id;
        }
        
        function trackTimeout(id) {
            if (id) activeTimeouts.push(id);
            return id;
        }
        
        function trackListener(ref) {
            if (ref) firebaseListeners.push(ref);
            return ref;
        }
        
        // ✅ FIX #7 & #11: Tüm interval'ları temizle
        function clearAllIntervals() {
            // Buffer countdown temizle
            if (bufferCountdownInterval) {
                clearInterval(bufferCountdownInterval);
                bufferCountdownInterval = null;
            }
            
            // Countdown interval temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            // Seek debounce timer temizle
            if (seekDebounceTimer) {
                clearTimeout(seekDebounceTimer);
                seekDebounceTimer = null;
            }
            
            activeIntervals.forEach(id => clearInterval(id));
            activeIntervals.length = 0;
        }
        
        function clearAllTimeouts() {
            // Sync timeout temizle
            if (syncTimeoutId) {
                clearTimeout(syncTimeoutId);
                syncTimeoutId = null;
            }
            
            // Command source timeout temizle
            if (commandSourceTimeoutId) {
                clearTimeout(commandSourceTimeoutId);
                commandSourceTimeoutId = null;
            }
            
            // Video state update debounce temizle
            if (videoStateUpdateDebounce) {
                clearTimeout(videoStateUpdateDebounce);
                videoStateUpdateDebounce = null;
            }
            
            // Firebase batch timeout temizle
            if (firebaseBatchTimeout) {
                clearTimeout(firebaseBatchTimeout);
                firebaseBatchTimeout = null;
            }
            
            activeTimeouts.forEach(id => clearTimeout(id));
            activeTimeouts.length = 0;
        }
        
        function clearAllListeners() {
            firebaseListeners.forEach(ref => {
                try {
                    ref.off();
                } catch (e) {
                    console.warn('Listener cleanup error:', e);
                }
            });
            firebaseListeners.length = 0;
        }
        
        // ✅ FIX #1: Video listener'larını temizle (ayrı fonksiyon)
        function clearVideoListeners() {
            if (!videoElement) return;
            
            if (videoElement._listeners && videoElement._listeners.length > 0) {
                videoElement._listeners.forEach(({ event, handler }) => {
                    videoElement.removeEventListener(event, handler);
                });
                videoElement._listeners = [];
                debugLog('🧹 Video listeners cleared:', videoElement._listeners.length);
            }
            
            // Legacy cleanup
            if (videoElement._eventListeners) {
                videoElement._eventListeners.forEach(([event, listener]) => {
                    videoElement.removeEventListener(event, listener);
                });
                videoElement._eventListeners = [];
            }
        }
        
        // ✅ MEMORY LEAK FIX: Object URL temizleme
        function revokeCurrentVideoURL() {
            if (currentVideoObjectURL) {
                URL.revokeObjectURL(currentVideoObjectURL);
                currentVideoObjectURL = null;
                debugLog('🧹 Object URL revoked');
            }
        }
        
        // ✅ FIX #7 & #8: hashchange ve onDisconnect temizleme
        function fullCleanup() {
            // ✅ ABR cleanup
            destroyAdaptiveStreaming();

            // ✅ P2P cleanup
            cleanupP2P();


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
        
        // ==================== ROOM MANAGEMENT ====================
        async function createRoom() {
            const roomName = getCachedElement('room-name').value.trim();
            const videoUrl = getCachedElement('video-url').value.trim();
            const videoFileInput = getCachedElement('video-file');
            const localFile = videoFileInput && videoFileInput.files ? videoFileInput.files[0] : null;
            const screenSize = getCachedElement('screen-size').value;
            const environment = getCachedElement('environment').value;
            
            if (!roomName || (!videoUrl && !localFile)) {
                alert('Lütfen oda adı ve video URL giriniz veya lokal dosya seçiniz!');
                return;
            }
            
            try {
                const userCredential = await auth.signInAnonymously();
                currentUser = userCredential.user;
                
                const roomRef = db.ref('rooms').push();
                currentRoomId = roomRef.key;
                
                await roomRef.set({
                    name: roomName,
                    owner: currentUser.uid,
                    videoUrl: videoUrl || '',
                    torrent: { magnetURI: null },
                    screenSize: screenSize,
                    environment: environment,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    videoState: {
                        isPlaying: false,
                        currentTime: 0,
                        startTimestamp: 0,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    }
                });
                
                await joinRoom(currentRoomId);
                if (localFile) {
                    await seedLocalVideo(localFile);
                }
            } catch (error) {
                console.error('❌ Oda oluşturma hatası:', error);
                alert('Oda oluşturulamadı: ' + error.message);
            }
        }
