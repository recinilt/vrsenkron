
// ✅ YENİ: Kontrolleri devre dışı bırak
function disableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
        }
    });
    debugLog('🔒 Controls disabled - P2P downloading');
}

// ✅ YENİ: Kontrolleri aktif et
function enableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    debugLog('✅ Controls enabled - P2P ready');
}

        function handleVRButton(action) {
            if (!isRoomOwner) return;
            
            switch(action) {
                case 'play':
                    playVideo();
                    break;
                case 'pause':
                    pauseVideo();
                    break;
                case 'rewind':
                    seekBackward();
                    break;
                case 'forward':
                    seekForward();
                    break;
            }
        }
        
        // ==================== VIDEO CONTROLS (OWNER ONLY) ====================
        let playPromisePending = false;
