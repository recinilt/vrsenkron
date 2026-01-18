// ==================== ROOM MANAGEMENT ====================
        async function createRoom() {
            const roomName = getCachedElement('room-name').value.trim();
            const videoUrl = getCachedElement('video-url').value.trim();
            const screenSize = getCachedElement('screen-size').value;
            const environment = getCachedElement('environment').value;
            
            // P2P modu kontrolü
            const isP2PMode = currentVideoSourceType === 'local';
            
            if (!roomName) {
                alert('Lütfen oda adı giriniz!');
                return;
            }
            
            if (!isP2PMode && !videoUrl) {
                alert('Lütfen video URL giriniz!');
                return;
            }
            
            if (isP2PMode && !selectedLocalFile) {
                alert('Lütfen bir video dosyası seçiniz!');
                return;
            }
            
            try {
                const userCredential = await auth.signInAnonymously();
                currentUser = userCredential.user;
                
                let finalVideoUrl = videoUrl;
                let magnetURI = null;
                
                // P2P modunda dosyayı seed et
                if (isP2PMode && selectedLocalFile) {
                    try {
                        magnetURI = await seedLocalVideo(selectedLocalFile);
                        finalVideoUrl = 'p2p://' + magnetURI; // P2P marker
                        debugLog('✅ Magnet URI created:', magnetURI);
                    } catch (e) {
                        console.error('Seed error:', e);
                        alert('Video paylaşımı başlatılamadı: ' + e.message);
                        return;
                    }
                }
                
                const roomRef = db.ref('rooms').push();
                currentRoomId = roomRef.key;
                
                const roomData = {
                    name: roomName,
                    owner: currentUser.uid,
                    videoUrl: finalVideoUrl,
                    screenSize: screenSize,
                    environment: environment,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    videoState: {
                        isPlaying: false,
                        currentTime: 0,
                        startTimestamp: 0,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    }
                };
                
                // P2P modunda magnet URI'yi ayrı kaydet
                if (magnetURI) {
                    roomData.p2p = {
                        magnetURI: magnetURI,
                        fileName: selectedLocalFile.name,
                        fileSize: selectedLocalFile.size
                    };
                }
                
                await roomRef.set(roomData);
                
                await joinRoom(currentRoomId);
            } catch (error) {
                console.error('❌ Oda oluşturma hatası:', error);
                alert('Oda oluşturulamadı: ' + error.message);
            }
        }
        
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
                
                // ✅ Sahip ayrılma listener'ı - herkes için
                listenOwnerLeft();
                
                if (isRoomOwner) {
                    startOwnerTasks();
                } else {
                    listenKeyframes();
                }
                
                // Start all periodic tasks
                startPeriodicTasks();
                
                isJoiningRoom = false;
                
            } catch (error) {
                console.error('❌ Odaya katılma hatası:', error);
                alert('Odaya katılınamadı: ' + error.message);
                isJoiningRoom = false;
            }
        }
