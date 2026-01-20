function checkOwnerPresence() {
            if (!isRoomOwner && currentRoomData && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentRoomData.owner).once('value')
                    .then(snapshot => {
                        const ownerData = snapshot.val();
                        if (!ownerData || (Date.now() - ownerData.lastSeen > OWNER_PRESENCE_TIMEOUT)) {
                            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                                .then(viewersSnapshot => {
                                    const viewers = viewersSnapshot.val();
                                    if (viewers) {
                                        const newOwner = Object.keys(viewers)[0];
                                        if (newOwner === currentUser.uid) {
                                            db.ref('rooms/' + currentRoomId).update({ owner: newOwner });
                                            isRoomOwner = true;
                                            debugLog('👑 Ownership transferred to you');
                                        }
                                    }
                                });
                        }
                    })
                    .catch(() => {});
            }
        }
        
        // ==================== UI UPDATES (DEBOUNCED) ====================
        function updateRoomInfoDisplay() {
            if (!currentRoomData) return;
            
            // VR modu
            const vrRoomName = getCachedElement('room-name-display');
            if (vrRoomName) {
                vrRoomName.textContent = currentRoomData.name + (isRoomOwner ? ' 👑' : '');
            }
            
            // YouTube modu
            const ytRoomName = document.getElementById('youtube-room-name');
            if (ytRoomName) {
                ytRoomName.textContent = currentRoomData.name + (isRoomOwner ? ' 👑' : '');
            }
            
            updateViewerCount();
        }
        
        // ✅ FIX #12: DOM thrashing azaltma - queueRAF kullan
        function updateViewerCount() {
            if (!currentRoomId || !shouldUpdateUI()) return;
            
            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                .then(snapshot => {
                    const count = snapshot.numChildren();
                    queueRAF(() => {
                        const viewerElement = getCachedElement('viewer-count');
                        if (viewerElement) {
                            viewerElement.textContent = `👥 ${count} izleyici`;
                        }
                    });
                })
                .catch(() => {});
        }