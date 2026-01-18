

        function listenVideoState() {
            const ref = db.ref(`rooms/${currentRoomId}/videoState`);
            trackListener(ref);

            ref.on('value', snapshot => {
                const newState = snapshot.val();
                if (!newState) return;

                if (syncModeActive) {
                    debugLog('Ignoring video state update - sync mode active');
                    return;
                }

                if (lastCommandSource === 'self') {
                    debugLog('Ignoring self-triggered video state update');
                    return;
                }

                const oldState = previousVideoState;

                if (oldState &&
                    oldState.isPlaying === newState.isPlaying &&
                    Math.abs(oldState.currentTime - newState.currentTime) < 0.1 &&
                    oldState.startTimestamp === newState.startTimestamp) {
                    return;
                }

                // âœ… FIX: JSON.parse/stringify yerine shallow copy (daha hÄ±zlÄ±)
                previousVideoState = {
                    isPlaying: newState.isPlaying,
                    currentTime: newState.currentTime,
                    startTimestamp: newState.startTimestamp,
                    lastUpdate: newState.lastUpdate
                };
                currentRoomData.videoState = newState;

                if (!isRoomOwner) {
                    const now = Date.now();

                    if (oldState && oldState.isPlaying && !newState.isPlaying) {
                        debugLog('Pause command detected - syncing immediately (bypass throttle)');
                        lastVideoStateUpdate = now;
                        syncVideo();
                        return;
                    }

                    if (now - lastVideoStateUpdate < SYNCCHECKINTERVAL) return;

                    lastVideoStateUpdate = now;
                    syncVideo();
                }
            });
        }
