
        
        function listenKeyframes() {
            const ref = db.ref('rooms/' + currentRoomId + '/keyframes').limitToLast(1);
            trackListener(ref);

            ref.on('child_added', snapshot => {
                const keyframe = snapshot.val();
                if (!videoElement) return;

                // Ã¢Å“â€¦ FIX: isHardSeeking kontrolÃƒÂ¼ eklendi
                if (syncState || isBuffering || isSeeking || isHardSeeking) return;

                const drift = Math.abs(videoElement.currentTime - keyframe.time) * 1000;

                if (drift > LARGE_DRIFT_THRESHOLD) {
                    if (isSeeking || isHardSeeking) return; // Ã¢Å“â€¦ FIX: Ãƒâ€¡ift kontrol

                    const now = Date.now();
                    if (now - lastHardSeekTime > HARD_SEEK_MIN_INTERVAL) {
                        isHardSeeking = true; // Ã¢Å“â€¦ FIX: Hard seek baÃ…Å¸lÃ„Â±yor
                        lastHardSeekTime = now;
                        
                        // Ã¢Å“â€¦ FIX: seeked event ile isHardSeeking'i temizle
                        const onKeyframeSeeked = () => {
                            videoElement.removeEventListener('seeked', onKeyframeSeeked);
                            isHardSeeking = false;
                            debugLog('Ã¢Å“â€¦ Keyframe seek completed');
                        };
                        videoElement.addEventListener('seeked', onKeyframeSeeked);
                        
                        videoElement.currentTime = keyframe.time;
                        lastSyncedPosition = keyframe.time;
                        debugLog('ÄŸÅ¸â€Â Keyframe sync', keyframe.time);
                        
                        // Ã¢Å“â€¦ FIX: Timeout fallback - TRACKED
                        trackTimeout(setTimeout(() => {
                            if (isHardSeeking) {
                                videoElement.removeEventListener('seeked', onKeyframeSeeked);
                                isHardSeeking = false;
                                debugLog('Ã¢Å¡Â Ã¯Â¸Â Keyframe seek timeout');
                            }
                        }, 3000));
                    }
                }
            });
        }
