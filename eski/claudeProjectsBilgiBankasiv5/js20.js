        
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
