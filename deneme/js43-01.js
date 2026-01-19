// ============================================
// SPATIAL AUDIO SİSTEMİ
// Web Audio API ile 3D pozisyonel ses
// Video ekranının pozisyonuna göre ses yönü
// ============================================

// ==================== SPATIAL AUDIO STATE ====================
let audioContext = null;
let audioSource = null;
let pannerNode = null;
let gainNode = null;
let spatialAudioEnabled = false;
let spatialUpdateInterval = null;

// ==================== SPATIAL AUDIO INIT ====================
function initSpatialAudio(videoEl) {
    if (!videoEl) {
        debugLog('⚠️ Spatial Audio: Video element yok');
        return false;
    }
    
    // Önceki instance'ı temizle
    cleanupSpatialAudio();
    
    try {
        // AudioContext oluştur
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Video elementinden audio source oluştur
        audioSource = audioContext.createMediaElementSource(videoEl);
        
        // Panner node oluştur (3D pozisyonel ses için)
        pannerNode = audioContext.createPanner();
        pannerNode.panningModel = 'HRTF'; // Head-Related Transfer Function - gerçekçi 3D ses
        pannerNode.distanceModel = 'inverse';
        pannerNode.refDistance = 1;
        pannerNode.maxDistance = 100;
        pannerNode.rolloffFactor = 1;
        pannerNode.coneInnerAngle = 360;
        pannerNode.coneOuterAngle = 360;
        pannerNode.coneOuterGain = 0;
        
        // Gain node (ses seviyesi kontrolü için)
        gainNode = audioContext.createGain();
        gainNode.gain.value = 1.0;
        
        // Bağlantıları kur: source -> panner -> gain -> destination
        audioSource.connect(pannerNode);
        pannerNode.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // İlk pozisyonu ayarla
        updatePannerPosition();
        
        // Periyodik güncelleme başlat (kamera hareketi için)
        spatialUpdateInterval = setInterval(updateSpatialAudio, 50); // 20 FPS
        trackInterval(spatialUpdateInterval);
        
        spatialAudioEnabled = true;
        debugLog('✅ Spatial Audio başlatıldı (HRTF)');
        
        return true;
        
    } catch (error) {
        console.error('Spatial Audio init hatası:', error);
        cleanupSpatialAudio();
        return false;
    }
}

// ==================== SPATIAL AUDIO UPDATE ====================
function updateSpatialAudio() {
    if (!spatialAudioEnabled || !audioContext || !pannerNode) return;
    
    // AudioContext suspended ise resume et (autoplay policy)
    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }
    
    updatePannerPosition();
    updateListenerPosition();
}

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