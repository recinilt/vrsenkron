
// ========================================
// SES KONTROL FONKSİYONLARI
// ========================================
function adjustVolume(delta) {
    if (!videoElement) return;
    
    // Mute durumundan çık
    if (videoElement.muted) {
        videoElement.muted = false;
    }
    
    const newVolume = Math.max(0, Math.min(1, videoElement.volume + delta));
    videoElement.volume = newVolume;
    
    debugLog('🔊 Ses:', Math.round(newVolume * 100) + '%');
    showVolumeIndicator(newVolume);
}

function toggleMute() {
    if (!videoElement) return;
    
    videoElement.muted = !videoElement.muted;
    debugLog('🔇 Sessiz:', videoElement.muted);
    
    if (videoElement.muted) {
        showVolumeIndicator(0);
    } else {
        showVolumeIndicator(videoElement.volume);
    }
}

function showVolumeIndicator(volume) {
    const indicator = document.getElementById('vr-volume-indicator');
    if (indicator) {
        const percentage = Math.round(volume * 100);
        indicator.setAttribute('value', `SES: ${percentage}%`);
    }
}

// ========================================
// EKRAN BOYUT FONKSİYONLARI
// ========================================
function scaleScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.15;
    
    if (direction === 'up') {
        currentScreenScale = Math.min(3.0, currentScreenScale + step);
    } else if (direction === 'down') {
        currentScreenScale = Math.max(0.3, currentScreenScale - step);
    }
    
    screen.setAttribute('scale', `${currentScreenScale} ${currentScreenScale} ${currentScreenScale}`);
    debugLog('📐 Ekran boyutu:', currentScreenScale.toFixed(2) + 'x');
}