        
        // Ã¢Å“â€¦ FIX #3: joinRoom race condition ÃƒÂ¶nleme
        async function joinRoom(roomId) {
            // Ã¢Å“â€¦ FIX #3: YarÃ„Â±Ã…Å¸ma ÃƒÂ¶nleme - zaten katÃ„Â±lÃ„Â±m varsa ÃƒÂ§Ã„Â±k
            if (isJoiningRoom) {
                debugLog('Ã¢Å¡Â Ã¯Â¸Â Already joining a room, skipping duplicate call');
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
                
                // Ã¢Å“â€¦ FIX #8: Ãƒâ€“nceki onDisconnect'i iptal et
                if (currentOnDisconnectRef) {
                    await currentOnDisconnectRef.cancel().catch(() => {});
                    currentOnDisconnectRef = null;
                }
                
                currentRoomId = roomId;
                const roomSnapshot = await db.ref('rooms/' + roomId).once('value');
                currentRoomData = roomSnapshot.val();
                
                if (!currentRoomData) {
                    alert('Oda bulunamadÃ„Â±!');
                    isJoiningRoom = false;
                    return;
                }
                
                // Ã¢Å“â€¦ Sahiplik kontrolÃƒÂ¼: Mevcut owner ile karÃ…Å¸Ã„Â±laÃ…Å¸tÃ„Â±r
                isRoomOwner = currentUser.uid === currentRoomData.owner;
                
                // Add to active viewers
                const viewerRef = db.ref('rooms/' + roomId + '/activeViewers/' + currentUser.uid);
                await viewerRef.set({
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    isOwner: isRoomOwner,
                    currentDrift: 0
                });
                
                // Ã¢Å“â€¦ FIX #8: onDisconnect referansÃ„Â±nÃ„Â± sakla
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
                
                // Ã¢Å“â€¦ Sahip ayrÃ„Â±lma listener'Ã„Â± - herkes iÃƒÂ§in
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
                console.error('Ã¢ÂÅ’ Odaya katÃ„Â±lma hatasÃ„Â±:', error);
                alert('Odaya katÃ„Â±lÃ„Â±namadÃ„Â±: ' + error.message);
                isJoiningRoom = false;
            }
        }
