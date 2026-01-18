        
        // âœ… FIX #3: joinRoom race condition Ã¶nleme
        async function joinRoom(roomId) {
            // âœ… FIX #3: YarÄ±ÅŸma Ã¶nleme - zaten katÄ±lÄ±m varsa Ã§Ä±k
            if (isJoiningRoom) {
                debugLog('âš ï¸ Already joining a room, skipping duplicate call');
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
                
                // âœ… FIX #8: Ã–nceki onDisconnect'i iptal et
                if (currentOnDisconnectRef) {
                    await currentOnDisconnectRef.cancel().catch(() => {});
                    currentOnDisconnectRef = null;
                }
                
                currentRoomId = roomId;
                const roomSnapshot = await db.ref('rooms/' + roomId).once('value');
                currentRoomData = roomSnapshot.val();
                
                if (!currentRoomData) {
                    alert('Oda bulunamadÄ±!');
                    isJoiningRoom = false;
                    return;
                }
                
                // âœ… Sahiplik kontrolÃ¼: Mevcut owner ile karÅŸÄ±laÅŸtÄ±r
                isRoomOwner = currentUser.uid === currentRoomData.owner;
                
                // Add to active viewers
                const viewerRef = db.ref('rooms/' + roomId + '/activeViewers/' + currentUser.uid);
                await viewerRef.set({
                    joinedAt: firebase.database.ServerValue.TIMESTAMP,
                    lastSeen: firebase.database.ServerValue.TIMESTAMP,
                    isOwner: isRoomOwner,
                    currentDrift: 0
                });
                
                // âœ… FIX #8: onDisconnect referansÄ±nÄ± sakla
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
                
                // âœ… Sahip ayrÄ±lma listener'Ä± - herkes iÃ§in
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
                console.error('âŒ Odaya katÄ±lma hatasÄ±:', error);
                alert('Odaya katÄ±lÄ±namadÄ±: ' + error.message);
                isJoiningRoom = false;
            }
        }
