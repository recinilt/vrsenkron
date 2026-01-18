        
        // Ã¢Å“â€¦ FIX #7 & #8: hashchange ve onDisconnect temizleme
        function fullCleanup() {
            // Ã¢Å“â€¦ ABR cleanup
            destroyAdaptiveStreaming();
            
            // Ã¢Å“â€¦ P2P cleanup
            destroyP2PClient();

            // Flush pending Firebase updates first
            if (firebaseBatchTimeout) {
                clearTimeout(firebaseBatchTimeout);
                flushFirebaseUpdates();
            }
            
            // Ã¢Å“â€¦ FIX: Owner task'larÃ„Â±nÃ„Â± temizle
            clearOwnerTasks();
            
            clearAllIntervals();
            clearAllTimeouts();
            clearAllListeners();
            clearElementCache();
            
            // Ã¢Å“â€¦ FIX #7: hashchange listener kaldÃ„Â±r
            if (hashChangeHandler) {
                window.removeEventListener('hashchange', hashChangeHandler);
                hashChangeHandler = null;
            }
            
            // Ã¢Å“â€¦ FIX: Scene listener'larÃ„Â± kaldÃ„Â±r
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
            
            // Ã¢Å“â€¦ FIX: Keyboard listener kaldÃ„Â±r
            if (keydownHandler) {
                document.removeEventListener('keydown', keydownHandler);
                keydownHandler = null;
            }
            
            // Ã¢Å“â€¦ FIX #8: onDisconnect referansÃ„Â±nÃ„Â± iptal et
            if (currentOnDisconnectRef) {
                currentOnDisconnectRef.cancel().catch(() => {});
                currentOnDisconnectRef = null;
            }
            
            // Ã¢Å“â€¦ MEMORY LEAK FIX: Object URL temizle
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
            isHardSeeking = false; // Ã¢Å“â€¦ FIX: Reset isHardSeeking
            ownerTransferInProgress = false;
            selectedLocalFile = null;
            currentVideoSourceType = 'url';
            
            debugLog('ÄŸÅ¸Â§Â¹ Full cleanup completed');
        }
