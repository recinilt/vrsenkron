        
        // Ã¢Å“â€¦ YENÃ„Â°: Oda sahibi ayrÃ„Â±ldÃ„Â±Ã„Å¸Ã„Â±nda yeni sahip atama
        function listenOwnerLeft() {
            const viewersRef = db.ref('rooms/' + currentRoomId + '/activeViewers');
            trackListener(viewersRef);
            
            viewersRef.on('value', async (snapshot) => {
                if (!currentRoomId || !currentUser || ownerTransferInProgress) return;
                
                const viewers = snapshot.val();
                if (!viewers) return;
                
                // GÃƒÂ¼ncel oda verisini al
                const roomSnapshot = await db.ref('rooms/' + currentRoomId).once('value');
                const roomData = roomSnapshot.val();
                if (!roomData) return;
                
                const currentOwnerUid = roomData.owner;
                
                // Mevcut sahip hala odada mÃ„Â±?
                const ownerStillHere = viewers[currentOwnerUid] !== undefined;
                
                if (!ownerStillHere && Object.keys(viewers).length > 0) {
                    // Sahip ayrÃ„Â±lmÃ„Â±Ã…Å¸, yeni sahip ata
                    // En eski katÃ„Â±lÃ„Â±mcÃ„Â±yÃ„Â± bul (en dÃƒÂ¼Ã…Å¸ÃƒÂ¼k joinedAt)
                    let oldestViewer = null;
                    let oldestTime = Infinity;
                    
                    Object.keys(viewers).forEach(uid => {
                        const viewer = viewers[uid];
                        if (viewer.joinedAt && viewer.joinedAt < oldestTime) {
                            oldestTime = viewer.joinedAt;
                            oldestViewer = uid;
                        }
                    });
                    
                    // EÃ„Å¸er en eski katÃ„Â±lÃ„Â±mcÃ„Â± bensem, sahipliÃ„Å¸i al
                    if (oldestViewer === currentUser.uid) {
                        ownerTransferInProgress = true;
                        
                        try {
                            // Atomik gÃƒÂ¼ncelleme: owner'Ã„Â± ve viewer'Ã„Â±mÃ„Â± gÃƒÂ¼ncelle
                            await db.ref('rooms/' + currentRoomId).update({
                                owner: currentUser.uid
                            });
                            
                            await db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).update({
                                isOwner: true
                            });
                            
                            // Lokal state gÃƒÂ¼ncelle
                            isRoomOwner = true;
                            currentRoomData.owner = currentUser.uid;
                            
                            // Owner task'larÃ„Â±nÃ„Â± baÃ…Å¸lat
                            startOwnerTasks();
                            
                            // Keyframe listener'Ã„Â± kapat (artÃ„Â±k owner'Ã„Â±z)
                            // Not: listenKeyframes zaten trackListener ile eklendi, 
                            // ama owner olunca keyframe dinlemeye gerek yok
                            
                            console.log('ÄŸÅ¸â€˜â€˜ Sahiplik size devredildi!');
                            debugLog('ÄŸÅ¸â€˜â€˜ Ownership transferred to:', currentUser.uid);
                            
                            // UI gÃƒÂ¼ncelle
                            updateRoomInfoDisplay();
                            
                        } catch (error) {
                            console.error('Sahiplik transfer hatasÃ„Â±:', error);
                        } finally {
                            ownerTransferInProgress = false;
                        }
                    }
                }
            });
        }
