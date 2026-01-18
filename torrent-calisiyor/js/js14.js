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
