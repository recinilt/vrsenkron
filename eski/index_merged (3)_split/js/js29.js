

function listenKeyframes() {
    const ref = db.ref('rooms/' + currentRoomId + '/keyframes').limitToLast(1);
    trackListener(ref);

    ref.on('child_added', snapshot => {
        const keyframe = snapshot.val();
        if (!videoElement) return;

        // ✅ YENİ: P2P indirme tamamlanmadıysa keyframe sync yapma
        const isP2PMode = currentRoomData && currentRoomData.p2p && currentRoomData.p2p.magnetURI;
        if (isP2PMode && !isP2PDownloadComplete) {
            debugLog('⚠️ Keyframe sync disabled - P2P downloading');
            return;
        }

        if (syncState || isBuffering || isSeeking || isHardSeeking) return;


        const drift = Math.abs(videoElement.currentTime - keyframe.time) * 1000;

        if (drift > LARGE_DRIFT_THRESHOLD) {
            if (isSeeking || isHardSeeking) return;

            const now = Date.now();
            if (now - lastHardSeekTime > HARD_SEEK_MIN_INTERVAL) {
                isHardSeeking = true;
                lastHardSeekTime = now;
                
                const onKeyframeSeeked = () => {
                    videoElement.removeEventListener('seeked', onKeyframeSeeked);
                    isHardSeeking = false;
                    debugLog('✅ Keyframe seek completed');
                };
                videoElement.addEventListener('seeked', onKeyframeSeeked);
                
                videoElement.currentTime = keyframe.time;
                lastSyncedPosition = keyframe.time;
                debugLog('🔁 Keyframe sync', keyframe.time);
                
                trackTimeout(setTimeout(() => {
                    if (isHardSeeking) {
                        videoElement.removeEventListener('seeked', onKeyframeSeeked);
                        isHardSeeking = false;
                        debugLog('⚠️ Keyframe seek timeout');
                    }
                }, 3000));
            }
        }
    });
}
