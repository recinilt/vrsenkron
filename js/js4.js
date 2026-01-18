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
                listenP2PMagnetURI();
                
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
        
        // ✅ YENİ: Oda sahibi ayrıldığında yeni sahip atama
        function listenOwnerLeft() {
            const viewersRef = db.ref('rooms/' + currentRoomId + '/activeViewers');
            trackListener(viewersRef);
            
            viewersRef.on('value', async (snapshot) => {
                if (!currentRoomId || !currentUser || ownerTransferInProgress) return;
                
                const viewers = snapshot.val();
                if (!viewers) return;
                
                // Güncel oda verisini al
                const roomSnapshot = await db.ref('rooms/' + currentRoomId).once('value');
                const roomData = roomSnapshot.val();
                if (!roomData) return;
                
                const currentOwnerUid = roomData.owner;
                
                // Mevcut sahip hala odada mı?
                const ownerStillHere = viewers[currentOwnerUid] !== undefined;
                
                if (!ownerStillHere && Object.keys(viewers).length > 0) {
                    // Sahip ayrılmış, yeni sahip ata
                    // En eski katılımcıyı bul (en düşük joinedAt)
                    let oldestViewer = null;
                    let oldestTime = Infinity;
                    
                    Object.keys(viewers).forEach(uid => {
                        const viewer = viewers[uid];
                        if (viewer.joinedAt && viewer.joinedAt < oldestTime) {
                            oldestTime = viewer.joinedAt;
                            oldestViewer = uid;
                        }
                    });
                    
                    // Eğer en eski katılımcı bensem, sahipliği al
                    if (oldestViewer === currentUser.uid) {
                        ownerTransferInProgress = true;
                        
                        try {
                            // Atomik güncelleme: owner'ı ve viewer'ımı güncelle
                            await db.ref('rooms/' + currentRoomId).update({
                                owner: currentUser.uid
                            });
                            
                            await db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).update({
                                isOwner: true
                            });
                            
                            // Lokal state güncelle
                            isRoomOwner = true;
                            currentRoomData.owner = currentUser.uid;
                            
                            // Owner task'larını başlat
                            startOwnerTasks();
                            
                            // Keyframe listener'ı kapat (artık owner'ız)
                            // Not: listenKeyframes zaten trackListener ile eklendi, 
                            // ama owner olunca keyframe dinlemeye gerek yok
                            
                            console.log('👑 Sahiplik size devredildi!');
                            debugLog('👑 Ownership transferred to:', currentUser.uid);
                            
                            // UI güncelle
                            updateRoomInfoDisplay();
                            
                        } catch (error) {
                            console.error('Sahiplik transfer hatası:', error);
                        } finally {
                            ownerTransferInProgress = false;
                        }
                    }
                }
            });
        }
        
        // ✅ FIX #7: leaveRoom - tüm temizlikler
        function leaveRoom() {
            if (currentRoomId && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).remove();
            }
            
            // Clear sync state
            clearSyncState();
            
            // ✅ FIX #1: Video listener'larını temizle
            clearVideoListeners();
            
            // Full cleanup (includes FIX #7 & #8)
            fullCleanup();
            
            // Clean up video element
            if (videoElement) {
                videoElement.pause();
                videoElement.removeAttribute('src');
                videoElement.load();
                videoElement.remove();
                videoElement = null;
            }
            
            // Remove scene elements with A-Frame cleanup
            const scene = document.querySelector('a-scene');
            const videoScreen = document.getElementById('video-screen');
            const vrPanel = document.getElementById('vr-panel');
            
            if (videoScreen) {
                const material = videoScreen.components.material;
                if (material && material.material && material.material.map) {
                    material.material.map.dispose();
                    material.material.dispose();
                }
                videoScreen.remove();
            }
            
            // ✅ FIX: VR panel button listener'larını temizle
            if (vrPanel && vrPanel._buttonListeners) {
                vrPanel._buttonListeners.forEach(({ element, handler }) => {
                    element.removeEventListener('click', handler);
                });
                vrPanel._buttonListeners = [];
            }
            if (vrPanel) vrPanel.remove();
            
            getCachedElement('ui-overlay').classList.remove('hidden');
            getCachedElement('vr-controls').style.display = 'none';
            getCachedElement('room-info').style.display = 'none';
            getCachedElement('sync-status').style.display = 'none';
            const p2pEl = getCachedElement('p2p-status');
            if (p2pEl) p2pEl.style.display = 'none';
            
            const bufferEl = getCachedElement('buffer-countdown');
            if (bufferEl) bufferEl.style.display = 'none';
            
            isBuffering = false;
            bufferTargetTime = null;
            
            currentRoomId = null;
            currentRoomData = null;
            isRoomOwner = false;
            lastDriftValue = null;
        }
        
        async function showRoomList() {
            try {
                if (!auth.currentUser) {
                    await auth.signInAnonymously();
                }
                
                const roomsSnapshot = await db.ref('rooms').limitToLast(20).once('value');
                const roomList = getCachedElement('room-list');
                roomList.innerHTML = '';
                
                const rooms = [];
                const roomsToDelete = [];
                
                roomsSnapshot.forEach(child => {
                    const roomData = child.val();
                    const viewerCount = roomData.activeViewers ? Object.keys(roomData.activeViewers).length : 0;
                    
                    if (viewerCount === 0) {
                        roomsToDelete.push(child.key);
                    } else {
                        rooms.push({ id: child.key, data: roomData, viewers: viewerCount });
                    }
                });
                
                roomsToDelete.forEach(roomId => {
                    db.ref('rooms/' + roomId).remove();
                });
                
                if (rooms.length === 0) {
                    roomList.innerHTML = '<p style="text-align: center; opacity: 0.7;">Aktif oda bulunamadı</p>';
                } else {
                    rooms.forEach(room => {
                        const roomDiv = document.createElement('div');
                        roomDiv.className = 'room-item';
                        roomDiv.innerHTML = `
                            <div class="room-name">${room.data.name}</div>
                            <div class="room-details">👥 ${room.viewers} izleyici</div>
                        `;
                        roomDiv.onclick = () => joinRoom(room.id);
                        roomList.appendChild(roomDiv);
                    });
                }
                
                getCachedElement('create-room-section').classList.add('hidden');
                getCachedElement('room-list-section').classList.remove('hidden');
                
            } catch (error) {
                console.error('❌ Oda listesi hatası:', error);
                alert('Odalar yüklenirken hata oluştu: ' + error.message + '\n\nLütfen Firebase Rules ayarlarınızı kontrol edin.');
            }
        }
