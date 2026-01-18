        
        // ==================== SYNC MECHANISM ====================
        
        function initiateSync() {
            if (!currentRoomId || !videoElement) return;
            
            debugLog('ÄŸÅ¸â€â€ Sync initiated by user');
            
            const syncBtn = getCachedElement('btn-sync');
            if (syncBtn) syncBtn.disabled = true;
            
            db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
                .then(snapshot => {
                    const viewers = snapshot.val();
                    if (!viewers) return;
                    
                    const positions = [];
                    
                    positions.push(videoElement.currentTime);
                    
                    Object.keys(viewers).forEach(uid => {
                        if (uid !== currentUser.uid && viewers[uid].currentPosition !== undefined) {
                            positions.push(viewers[uid].currentPosition);
                        }
                    });
                    
                    let minPosition = Math.min(...positions);
                    // Ã¢Å“â€¦ FIX: NaN/Infinity validation
                    if (!isFinite(minPosition) || isNaN(minPosition)) {
                        minPosition = videoElement.currentTime || 0;
                    }
                    const targetPosition = Math.max(0, minPosition - 4);
                    
                    debugLog('ÄŸÅ¸â€œÂ Positions:', positions, 'Ã¢â€ â€™ Target:', targetPosition);
                    
                    const currentPos = videoElement.currentTime;
                    if (Math.abs(currentPos - targetPosition) > 1) {
                        db.ref('rooms/' + currentRoomId + '/syncState').set({
                            isBuffering: true,
                            syncedSeekPosition: targetPosition,
                            syncedPlayTime: null,
                            initiatedBy: currentUser.uid,
                            initiatedAt: firebase.database.ServerValue.TIMESTAMP
                        });
                    }
                    
                    applySyncState({
                        isBuffering: true,
                        syncedSeekPosition: targetPosition,
                        syncedPlayTime: null
                    });
                })
                .catch(error => {
                    console.error('Sync error:', error);
                    if (syncBtn) syncBtn.disabled = false;
                });
        }
