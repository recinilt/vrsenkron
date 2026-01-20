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