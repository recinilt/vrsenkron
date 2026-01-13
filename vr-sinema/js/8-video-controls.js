// ============================================
// VİDEO KONTROL FONKSİYONLARI
// ============================================

// Video kontrolü yapılabilir mi?
function canControlVideo() {
    if (!currentRoomData) return false;
    
    if (currentRoomData.controlMode === 'everyone') {
        return true;
    }
    
    return isRoomOwner;
}

// Play/Pause toggle
function togglePlayPause() {
    // Henüz odaya katılmadıysak sessizce çık
    if (!currentRoomId || !currentRoomData) {
        return;
    }

    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    if (videoElement.paused) {
        const startTimestamp = Date.now() + SYNC_DELAY;
        
        roomRef.child('videoState').update({
            isPlaying: true,
            currentTime: videoElement.currentTime,
            startTimestamp: startTimestamp,
            lastUpdate: Date.now()
        });
        
        showSyncStatus('⏱️ 3 saniye sonra başlıyor...');
        console.log('▶️ Video 3 saniye sonra başlatılacak:', new Date(startTimestamp).toLocaleTimeString());
    } else {
        videoElement.pause();
        roomRef.child('videoState').update({
            isPlaying: false,
            currentTime: videoElement.currentTime,
            startTimestamp: null,
            lastUpdate: Date.now()
        });
        console.log('⏸️ Video durduruldu');
    }
}

// Videoyu durdur ve başa sar
function stopVideo() {
    // Henüz odaya katılmadıysak sessizce çık
    if (!currentRoomId || !currentRoomData) {
        return;
    }
    
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    videoElement.pause();
    videoElement.currentTime = 0;
    
    roomRef.child('videoState').update({
        isPlaying: false,
        currentTime: 0,
        startTimestamp: null,
        lastUpdate: Date.now()
    });
    
    console.log('⏹ Video durduruldu ve başa sarıldı');
    showSyncStatus('⏹ Video başa sarıldı');
}

// VR UI buton durumunu güncelle
function updateVRButtonState() {
    if (!videoElement) return;
    
    const button = document.querySelector('#vr-play-pause-btn a-text');
    if (button) {
        button.setAttribute('value', videoElement.paused ? '▶️ Play' : '⏸️ Pause');
    }
}