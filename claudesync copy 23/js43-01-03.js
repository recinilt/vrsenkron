
function toggleSpatialAudio() {
    setSpatialAudioEnabled(!spatialAudioEnabled);
    return spatialAudioEnabled;
}

function isSpatialAudioEnabled() {
    return spatialAudioEnabled;
}

// ==================== SPATIAL AUDIO CLEANUP ====================
function cleanupSpatialAudio() {
    if (spatialUpdateInterval) {
        clearInterval(spatialUpdateInterval);
        spatialUpdateInterval = null;
    }
    
    if (audioSource) {
        try {
            audioSource.disconnect();
        } catch (e) {}
        audioSource = null;
    }
    
    if (pannerNode) {
        try {
            pannerNode.disconnect();
        } catch (e) {}
        pannerNode = null;
    }
    
    if (gainNode) {
        try {
            gainNode.disconnect();
        } catch (e) {}
        gainNode = null;
    }
    
    if (audioContext) {
        try {
            audioContext.close();
        } catch (e) {}
        audioContext = null;
    }
    
    spatialAudioEnabled = false;
    debugLog('🧹 Spatial Audio temizlendi');
}

// ==================== RESUME AUDIO CONTEXT ====================
// Kullanıcı etkileşimi sonrası AudioContext'i resume et
function resumeSpatialAudio() {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            debugLog('🔊 AudioContext resumed');
        }).catch(err => {
            console.warn('AudioContext resume hatası:', err);
        });
    }
}

// İlk kullanıcı etkileşiminde resume et
document.addEventListener('click', resumeSpatialAudio, { once: true });
document.addEventListener('touchstart', resumeSpatialAudio, { once: true });
document.addEventListener('keydown', resumeSpatialAudio, { once: true });

// ==================== SPATIAL AUDIO UI BUTTON ====================
function toggleSpatialAudioBtn() {
    const enabled = toggleSpatialAudio();
    updateSpatialAudioButton(enabled);
}