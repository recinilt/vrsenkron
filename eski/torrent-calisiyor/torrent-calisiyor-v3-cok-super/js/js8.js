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
            
            const bufferEl = getCachedElement('buffer-countdown');
            if (bufferEl) bufferEl.style.display = 'none';
            
            hideP2PStatus();
            
            isBuffering = false;
            bufferTargetTime = null;
            
            currentRoomId = null;
            currentRoomData = null;
            isRoomOwner = false;
            lastDriftValue = null;
        }
