
function seekForward() {
    if (!isRoomOwner || !videoElement) return;

    pendingSeekAmount += 10;

    if (seekDebounceTimer) {
        clearTimeout(seekDebounceTimer);
    }

    seekDebounceTimer = setTimeout(() => {
        executeSeek('forward', pendingSeekAmount);
        seekDebounceTimer = null;
        pendingSeekAmount = 0;
    }, 500);
}

function executeSeek(direction, totalAmount) {
    if (!videoElement || isSeeking) return;

    if (videoElement.readyState < 1) {
        console.warn('Video metadata not loaded yet');
        return;
    }

    isSeeking = true;

    const targetTime = Math.max(0, Math.min(videoElement.duration || Infinity, videoElement.currentTime + totalAmount));

    lastCommandSource = 'self';
    videoElement.pause();

    let seekCompleted = false;

    const onSeeked = () => {
        if (seekCompleted) return;
        seekCompleted = true;
        videoElement.removeEventListener('seeked', onSeeked);

        const newPos = videoElement.currentTime;
        const updates = {
            'videoState/isPlaying': false,
            'videoState/currentTime': newPos,
            'videoState/startTimestamp': getServerTime(),
            'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
            'keyframes': null,
            'syncState': null
        };

        db.ref(`rooms/${currentRoomId}`).update(updates)
            .then(() => {
                debugLog(`Seek ${direction} complete, paused at`, newPos);
                isSeeking = false;
            })
            .catch(err => {
                console.warn('Seek update error:', err);
                isSeeking = false;
            });

        // ✅ FIX: Timeout'u track et
        trackTimeout(setTimeout(() => { lastCommandSource = null; }, 2500));
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = targetTime;

    // ✅ FIX: Timeout'u track et
    trackTimeout(setTimeout(() => {
        if (!seekCompleted) {
            isSeeking = false;
            debugLog('Seek timeout - forcing completion');
            onSeeked();
        }
    }, 2000));
}



        // ==================== FIREBASE INIT ====================
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        
        // ==================== HELPER FUNCTIONS ====================
        function debugLog(...args) {
            if (DEBUG_MODE) console.log(...args);
        }
        

        // requestAnimationFrame queue limiter
        let rafQueue = [];
        let rafScheduled = false;
        
        function queueRAF(callback) {
            rafQueue.push(callback);
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(() => {
                    const callbacks = rafQueue.splice(0);
                    rafScheduled = false;
                    callbacks.forEach(cb => {
                        try { cb(); } catch(e) { console.warn('RAF callback error:', e); }
                    });
                });
            }
        }
        
        
        function getServerTime() {
            return Date.now() + clockOffset;
        }
