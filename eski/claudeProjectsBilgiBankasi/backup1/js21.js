        
        // ✅ FIX #7: leaveRoom - tüm temizlikler
        function leaveRoom() {
            if (currentRoomId && currentUser) {
                db.ref('rooms/' + currentRoomId + '/activeViewers/' + currentUser.uid).remove();
            }
            
            // Clear sync state
            clearSyncState();
            
            // ✅ FIX #1: Video listener'larını temizle
            clearVideoListeners();
            
            // Full cleanup (includes FIX #7 & #8)
            fullCleanup();
            
            // Clean up video element
            if (videoElement) {
                videoElement.pause();
                videoElement.removeAttribute('src');
                videoElement.load();
                videoElement.remove();
                videoElement = null;
            }
            
            // Remove scene elements with A-Frame cleanup
            const scene = document.querySelector('a-scene');
            const videoScreen = document.getElementById('video-screen');
            const vrPanel = document.getElementById('vr-panel');
            
            if (videoScreen) {
                const material = videoScreen.components.material;
                if (material && material.material && material.material.map) {
                    material.material.map.dispose();
                    material.material.dispose();
                }
                videoScreen.remove();
            }
            
            // ✅ FIX: VR panel button listener'larını temizle
            if (vrPanel && vrPanel._buttonListeners) {
                vrPanel._buttonListeners.forEach(({ element, handler }) => {
                    element.removeEventListener('click', handler);
                });
                vrPanel._buttonListeners = [];
            }
            if (vrPanel) vrPanel.remove();
            
            getCachedElement('ui-overlay').classList.remove('hidden');
            getCachedElement('vr-controls').style.display = 'none';
            getCachedElement('room-info').style.display = 'none';
            getCachedElement('sync-status').style.display = 'none';
            
            const bufferEl = getCachedElement('buffer-countdown');
            if (bufferEl) bufferEl.style.display = 'none';
            
            hideP2PStatus();
            
            isBuffering = false;
            bufferTargetTime = null;
            
            currentRoomId = null;
            currentRoomData = null;
            isRoomOwner = false;
            lastDriftValue = null;
        }
