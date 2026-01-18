
        
        function listenKeyframes() {
            const ref = db.ref('rooms/' + currentRoomId + '/keyframes').limitToLast(1);
            trackListener(ref);

            ref.on('child_added', snapshot => {
                const keyframe = snapshot.val();
                if (!videoElement) return;

                // âœ… FIX: isHardSeeking kontrolÃ¼ eklendi
                if (syncState || isBuffering || isSeeking || isHardSeeking) return;

                const drift = Math.abs(videoElement.currentTime - keyframe.time) * 1000;

                if (drift > LARGE_DRIFT_THRESHOLD) {
                    if (isSeeking || isHardSeeking) return; // âœ… FIX: Ã‡ift kontrol

                    const now = Date.now();
                    if (now - lastHardSeekTime > HARD_SEEK_MIN_INTERVAL) {
                        isHardSeeking = true; // âœ… FIX: Hard seek baÅŸlÄ±yor
                        lastHardSeekTime = now;
                        
                        // âœ… FIX: seeked event ile isHardSeeking'i temizle
                        const onKeyframeSeeked = () => {
                            videoElement.removeEventListener('seeked', onKeyframeSeeked);
                            isHardSeeking = false;
                            debugLog('âœ… Keyframe seek completed');
                        };
                        videoElement.addEventListener('seeked', onKeyframeSeeked);
                        
                        videoElement.currentTime = keyframe.time;
                        lastSyncedPosition = keyframe.time;
                        debugLog('ğŸ” Keyframe sync', keyframe.time);
                        
                        // âœ… FIX: Timeout fallback - TRACKED
                        trackTimeout(setTimeout(() => {
                            if (isHardSeeking) {
                                videoElement.removeEventListener('seeked', onKeyframeSeeked);
                                isHardSeeking = false;
                                debugLog('âš ï¸ Keyframe seek timeout');
                            }
                        }, 3000));
                    }
                }
            });
        }
