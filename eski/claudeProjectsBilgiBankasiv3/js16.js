        
        // âœ… FIX #7 & #8: hashchange ve onDisconnect temizleme
        function fullCleanup() {
            // âœ… ABR cleanup
            destroyAdaptiveStreaming();
            
            // âœ… P2P cleanup
            destroyP2PClient();

            // Flush pending Firebase updates first
            if (firebaseBatchTimeout) {
                clearTimeout(firebaseBatchTimeout);
                flushFirebaseUpdates();
            }
            
            // âœ… FIX: Owner task'larÄ±nÄ± temizle
            clearOwnerTasks();
            
            clearAllIntervals();
            clearAllTimeouts();
            clearAllListeners();
            clearElementCache();
            
            // âœ… FIX #7: hashchange listener kaldÄ±r
            if (hashChangeHandler) {
                window.removeEventListener('hashchange', hashChangeHandler);
                hashChangeHandler = null;
            }
            
            // âœ… FIX: Scene listener'larÄ± kaldÄ±r
            const scene = document.querySelector('a-scene');
            if (scene) {
                if (sceneEnterVRHandler) {
                    scene.removeEventListener('enter-vr', sceneEnterVRHandler);
                    sceneEnterVRHandler = null;
                }
                if (sceneExitVRHandler) {
                    scene.removeEventListener('exit-vr', sceneExitVRHandler);
                    sceneExitVRHandler = null;
                }
            }
            
            // âœ… FIX: Keyboard listener kaldÄ±r
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler);
                keydownHandler = null;
            }
            
            // âœ… FIX #8: onDisconnect referansÄ±nÄ± iptal et
            if (currentOnDisconnectRef) {
                currentOnDisconnectRef.cancel().catch(() => {});
                currentOnDisconnectRef = null;
            }
            
            // âœ… MEMORY LEAK FIX: Object URL temizle
            revokeCurrentVideoURL();
            
            // Remove from active viewers
            if (currentRoomId && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).remove().catch(() => {});
            }
            
            pendingFirebaseUpdates = {};
            
            // Reset tracking variables
            lastHardSeekTime = 0;
            lastSyncedPosition = 0;
            isJoiningRoom = false;
            isHardSeeking = false; // âœ… FIX: Reset isHardSeeking
            ownerTransferInProgress = false;
            selectedLocalFile = null;
            currentVideoSourceType = 'url';
            
            debugLog('ğŸ§¹ Full cleanup completed');
        }
