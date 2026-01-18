

        function sendKeyframe() {
            // âœ… FIX: isHardSeeking kontrolÃ¼ eklendi
            if (!videoElement || !isRoomOwner || isSeeking || isHardSeeking) return;

            try {
                const ref = db.ref('rooms/' + currentRoomId + '/keyframes').push({
                    time: videoElement.currentTime,
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                });

                trackTimeout(setTimeout(() => ref.remove().catch(() => {}), 30000));
            } catch (error) {
                console.warn('Keyframe send error:', error);
            }
        }
