        
        function listenSyncState() {
            const ref = db.ref('rooms/' + currentRoomId + '/syncState');
            trackListener(ref);
            
            ref.on('value', (snapshot) => {
                const state = snapshot.val();
                
                if (state) {
                    applySyncState(state);
                } else {
                    if (syncState) {
                        clearSyncState();
                    }
                }
            });
        }
        
        function updateViewerPosition() {
            if (!currentUser || !currentRoomId || !videoElement) return;
            
            try {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid + '/currentPosition')
                    .set(videoElement.currentTime)
                    .catch(() => {});
            } catch (error) {
                console.warn('Position update error:', error);
            }
        }
        
        // ✅ FIX #10: syncVideoState - recursive trigger önleme
        let isSyncingVideoState = false;
        
        

function syncVideoState() {
    if (!isRoomOwner || !videoElement) return;

    if (isSyncingVideoState) {
        debugLog('⚠️ syncVideoState already in progress, skipping');
        return;
    }

    isSyncingVideoState = true;
    const serverTime = getServerTime();

    db.ref(`rooms/${currentRoomId}/videoState`).update({
        isPlaying: !videoElement.paused,
        currentTime: videoElement.currentTime,
        startTimestamp: serverTime,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    })
    .then(() => {
        isSyncingVideoState = false;
    })
    .catch((err) => {
        console.warn('Sync update error:', err);
        isSyncingVideoState = false;
    });
}

        // ==================== VIDEO SYNC (OPTIMIZED) ====================
        let lastVideoStateUpdate = 0;
        let previousVideoState = null;
