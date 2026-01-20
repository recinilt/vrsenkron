// ✅ FIX #3: joinRoom race condition önleme
        async function joinRoom(roomId) {
            // ✅ FIX #3: Yarışma önleme - zaten katılım varsa çık
            if (isJoiningRoom) {
                debugLog('⚠️ Already joining a room, skipping duplicate call');
                return;
            }
            isJoiningRoom = true;
            
            try {
                if (!auth.currentUser) {
                    const userCredential = await auth.signInAnonymously();
                    currentUser = userCredential.user;
                } else {
                    currentUser = auth.currentUser;
                }
                
                // ✅ FIX #8: Önceki onDisconnect'i iptal et
                if (currentOnDisconnectRef) {
                    await currentOnDisconnectRef.cancel().catch(() => {});
                    currentOnDisconnectRef = null;
                }
                
                currentRoomId = roomId;
                const roomSnapshot = await db.ref('rooms/' + roomId).once('value');
                currentRoomData = roomSnapshot.val();
                
                if (!currentRoomData) {
                    alert('Oda bulunamadı!');
                    isJoiningRoom = false;
                    return;
                }
                
                // ✅ Sahiplik kontrolü: Mevcut owner ile karşılaştır
                isRoomOwner = currentUser.uid === currentRoomData.owner;
                
                // Add to active viewers
                const viewerRef = db.ref('rooms/' + roomId + '/activeViewers/' + currentUser.uid);
                await viewerRef.set({
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    isOwner: isRoomOwner,
                    currentDrift: 0
                });
                
                // ✅ FIX #8: onDisconnect referansını sakla
                currentOnDisconnectRef = viewerRef.onDisconnect();
                currentOnDisconnectRef.remove();
                
                await initClockSync();
                await create3DScene();
                
                getCachedElement('ui-overlay').classList.add('hidden');
                getCachedElement('vr-controls').style.display = 'flex';
                getCachedElement('room-info').style.display = 'block';
                getCachedElement('sync-status').style.display = 'block';
                
                updateRoomInfoDisplay();
                listenVideoState();
                listenSyncState();
                
                // ✅ YENİ: Owner değişikliğini dinle (race condition önleme)
                listenOwnerChange();
                
                // ✅ Sahip ayrılma listener'ı - herkes için
                listenOwnerLeft();
                
                if (isRoomOwner) {
                    startOwnerTasks();
                    // ✅ YENİ: Sync isteklerini dinle
                    listenSyncRequests();
                    // ✅ YENİ: Ownership isteklerini dinle
                    listenOwnershipRequests();
                } else {
                    listenKeyframes();
                    // ✅ YENİ: Kendi sync isteğimin durumunu dinle
                    listenMySyncRequestStatus();
                    // ✅ YENİ: Kendi ownership isteğimin durumunu dinle
                    listenMyOwnershipRequestStatus();
                }
                
                // Start all periodic tasks
                startPeriodicTasks();
                
                // ✅ YENİ: Ownership request sistemini başlat
                initOwnershipRequestSystem();
                
                isJoiningRoom = false;
                
            } catch (error) {
                console.error('❌ Odaya katılma hatası:', error);
                alert('Odaya katılınamadı: ' + error.message);
                isJoiningRoom = false;
            }
        }
        
        // ==================== OWNER CHANGE LISTENER ====================
        // ✅ YENİ: Owner field'ını doğrudan dinle - race condition önleme
        let ownerChangeListener = null;
        
        function listenOwnerChange() {
            if (!currentRoomId) return;
            
            // Önceki listener'ı temizle
            if (ownerChangeListener) {
                ownerChangeListener.off();
                ownerChangeListener = null;
            }
            
            ownerChangeListener = db.ref('rooms/' + currentRoomId + '/owner');
            trackListener(ownerChangeListener);
            
            ownerChangeListener.on('value', (snapshot) => {
                const newOwnerUid = snapshot.val();
                if (!newOwnerUid || !currentUser) return;
                
                const wasOwner = isRoomOwner;
                const isNowOwner = newOwnerUid === currentUser.uid;
                
                // Değişiklik yoksa çık
                if (wasOwner === isNowOwner) return;
                
                debugLog('👑 Owner changed:', newOwnerUid, 'I am now owner:', isNowOwner);
                
                // State güncelle
                isRoomOwner = isNowOwner;
                currentRoomData.owner = newOwnerUid;
                
                if (isNowOwner && !wasOwner) {
                    // ✅ YENİ OWNER OLDUM
                    debugLog('🎉 I am now the owner!');
                    
                    // Owner task'larını başlat
                    startOwnerTasks();
                    
                    // Ownership request listener'ı başlat
                    listenOwnershipRequests();
                    
                    // Sync request listener'ı başlat
                    listenSyncRequests();
                    
                    // Keyframe listener'ı kapat (artık owner)
                    db.ref('rooms/' + currentRoomId + '/keyframes').off();
                    
                    // Pending ownership request temizle
                    pendingOwnershipRequest = null;
                    
                } else if (!isNowOwner && wasOwner) {
                    // ✅ ARTIK OWNER DEĞİLİM
                    debugLog('😔 I am no longer the owner');
                    
                    // Owner task'larını durdur
                    clearOwnerTasks();
                    
                    // Ownership request listener'ı durdur
                    if (ownershipRequestListener) {
                        ownershipRequestListener.off();
                        ownershipRequestListener = null;
                    }
                    
                    if (ownershipRequestTimeoutInterval) {
                        clearInterval(ownershipRequestTimeoutInterval);
                        ownershipRequestTimeoutInterval = null;
                    }
                    
                    // Sync request listener'ı durdur
                    cleanupSyncRequests();
                    
                    // Keyframe listener'ı başlat (artık viewer)
                    listenKeyframes();
                    
                    // Sync isteği dinle (artık viewer)
                    listenMySyncRequestStatus();
                    
                    // Ownership isteği dinle (artık viewer)
                    listenMyOwnershipRequestStatus();
                }
                
                // UI güncelle
                updateRoomInfoDisplay();
                updateOwnershipRequestButton();
                updateControlsForSync(false);
                
                // YouTube modundaysa ek kontrolleri güncelle
                if (isYouTubeMode) {
                    updateYouTubeControls();
                }
                
                // ActiveViewers'da isOwner güncelle
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid + '/isOwner')
                    .set(isNowOwner)
                    .catch(() => {});
            });
            
            debugLog('✅ Owner change listener started');
        }
        
        // Cleanup için
        function cleanupOwnerChangeListener() {
            if (ownerChangeListener) {
                ownerChangeListener.off();
                ownerChangeListener = null;
            }
        }