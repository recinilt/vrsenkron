// ============================================
// VİDEO KONTROL FONKSİYONLARI
// ============================================

function canControlVideo() {
    if (!currentRoomData) return false;
    
    if (currentRoomData.controlMode === 'everyone') {
        return true;
    }
    
    return isRoomOwner;
}

function togglePlayPause() {
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

function stopVideo() {
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

function seekVideo(seconds) {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    const newTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
    videoElement.currentTime = newTime;
    
    roomRef.child('videoState').update({
        currentTime: newTime,
        lastUpdate: Date.now()
    });
    
    console.log(`⏩ Video ${seconds > 0 ? 'ileri' : 'geri'} alındı: ${newTime.toFixed(1)}s`);
}

function setPlaybackRate(rate) {
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    videoElement.playbackRate = rate;
    console.log('🎚️ Oynatma hızı:', rate);
}

console.log('✓ Video kontrol fonksiyonları yüklendi');
