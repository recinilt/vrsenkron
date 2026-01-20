
function updatePannerPosition() {
    if (!pannerNode) return;
    
    // Video ekranının pozisyonunu al
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const screenPos = screen.getAttribute('position');
    if (!screenPos) return;
    
    // Panner pozisyonunu ekran pozisyonuna ayarla
    if (pannerNode.positionX) {
        // Modern API
        pannerNode.positionX.setValueAtTime(screenPos.x, audioContext.currentTime);
        pannerNode.positionY.setValueAtTime(screenPos.y, audioContext.currentTime);
        pannerNode.positionZ.setValueAtTime(screenPos.z, audioContext.currentTime);
    } else {
        // Legacy API
        pannerNode.setPosition(screenPos.x, screenPos.y, screenPos.z);
    }
}

function updateListenerPosition() {
    if (!audioContext || !audioContext.listener) return;
    
    const camera = document.querySelector('a-camera');
    if (!camera) return;
    
    // Kamera pozisyonunu al
    const camPos = camera.getAttribute('position') || { x: 0, y: 1.6, z: 0 };
    
    // Kamera rotasyonunu al (derece cinsinden)
    const camRot = camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
    
    // Rotasyonu radyana çevir
    const yawRad = THREE.MathUtils.degToRad(camRot.y);
    const pitchRad = THREE.MathUtils.degToRad(camRot.x);
    
    // Forward vektörü hesapla (bakış yönü)
    const forwardX = -Math.sin(yawRad) * Math.cos(pitchRad);
    const forwardY = Math.sin(pitchRad);
    const forwardZ = -Math.cos(yawRad) * Math.cos(pitchRad);
    
    // Up vektörü (basitleştirilmiş - her zaman yukarı)
    const upX = 0;
    const upY = 1;
    const upZ = 0;
    
    const listener = audioContext.listener;
    
    // Listener pozisyonunu ayarla
    if (listener.positionX) {
        // Modern API
        listener.positionX.setValueAtTime(camPos.x, audioContext.currentTime);
        listener.positionY.setValueAtTime(camPos.y, audioContext.currentTime);
        listener.positionZ.setValueAtTime(camPos.z, audioContext.currentTime);
        
        listener.forwardX.setValueAtTime(forwardX, audioContext.currentTime);
        listener.forwardY.setValueAtTime(forwardY, audioContext.currentTime);
        listener.forwardZ.setValueAtTime(forwardZ, audioContext.currentTime);
        
        listener.upX.setValueAtTime(upX, audioContext.currentTime);
        listener.upY.setValueAtTime(upY, audioContext.currentTime);
        listener.upZ.setValueAtTime(upZ, audioContext.currentTime);
    } else {
        // Legacy API
        listener.setPosition(camPos.x, camPos.y, camPos.z);
        listener.setOrientation(forwardX, forwardY, forwardZ, upX, upY, upZ);
    }
}

// ==================== SPATIAL AUDIO CONTROLS ====================
function setSpatialAudioEnabled(enabled) {
    spatialAudioEnabled = enabled;
    
    if (!enabled && audioContext) {
        // Spatial audio kapatıldığında stereo'ya dön
        // Panner'ı bypass et
        if (audioSource && gainNode) {
            try {
                audioSource.disconnect();
                audioSource.connect(gainNode);
                debugLog('🔊 Spatial Audio kapatıldı - Stereo mod');
            } catch (e) {}
        }
    } else if (enabled && audioContext && audioSource && pannerNode && gainNode) {
        // Spatial audio açıldığında panner'ı tekrar bağla
        try {
            audioSource.disconnect();
            audioSource.connect(pannerNode);
            pannerNode.connect(gainNode);
            debugLog('🎧 Spatial Audio açıldı - 3D mod');
        } catch (e) {}
    }
}