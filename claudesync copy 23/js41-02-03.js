
function updateVRSeekBar() {
    if (!videoElement) return;

    const current = videoElement.currentTime;
    const duration = videoElement.duration;

    if (duration > 0 && isFinite(duration)) {
        const progress = current / duration;
        const progressBar = document.querySelector('#vr-progress-bar');
        const timeText = document.querySelector('#vr-time-text');

        if (progressBar) {
            progressBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth * progress);
            progressBar.setAttribute('position',
                `${-VR_UI_CONFIG.seekBarWidth / 2 + (VR_UI_CONFIG.seekBarWidth * progress) / 2} 0 0.01`
            );
        }

        if (timeText) {
            timeText.setAttribute('value',
                `${formatTimeVR(current)} / ${formatTimeVR(duration)}`
            );
        }
    }
}

function formatTimeVR(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekToPosition(percentage) {
    if (!videoElement || !videoElement.duration || !isRoomOwner) return;
    
    const targetTime = videoElement.duration * percentage;
    
    // Mevcut seek mekanizmasını kullan
    lastCommandSource = 'self';
    videoElement.pause();
    videoElement.currentTime = targetTime;
    
    const serverTime = getServerTime();
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: targetTime,
        startTimestamp: serverTime,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    debugLog('⏩ Seek to:', targetTime.toFixed(2), 'saniye');
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 300));
}

// ========================================
// VR PANEL CLEANUP
// ========================================
function cleanupVRUIPanel() {
    if (seekBarUpdateInterval) {
        clearInterval(seekBarUpdateInterval);
        seekBarUpdateInterval = null;
    }
    
    const panel = document.getElementById('vr-ui-panel');
    if (panel) {
        panel.remove();
    }
    
    debugLog('🧹 VR UI Panel temizlendi');
}

debugLog('✅ VR Controls yüklendi - Büyük Yazılar + Ortalanmış Versiyonu');