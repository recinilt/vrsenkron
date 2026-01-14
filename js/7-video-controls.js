// ============================================
// VİDEO KONTROL FONKSİYONLARI - DEBOUNCE İLE
// ============================================

// Debounce için son tıklama zamanı
let lastSeekTime = 0;
let seekDebounceTimeout = null;
const SEEK_DEBOUNCE_DELAY = 2000; // 2 saniye

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

// Debounced Seek - 2 saniye içinde tekrar tıklanırsa sayım sıfırlanır
function seekVideo(seconds) {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    const now = Date.now();
    
    // 2 saniye içinde tekrar tıklanırsa timeout'u sıfırla
    if (now - lastSeekTime < SEEK_DEBOUNCE_DELAY) {
        clearTimeout(seekDebounceTimeout);
        console.log('⏱️ Seek debounce sıfırlandı (2sn dolmadı)');
    }
    
    lastSeekTime = now;
    
    // Lokal olarak hemen seek yap (gecikme olmasın)
    const newTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
    videoElement.currentTime = newTime;
    
    console.log(`⏩ Lokal seek: ${seconds > 0 ? 'ileri' : 'geri'} ${Math.abs(seconds)}sn → ${newTime.toFixed(1)}s`);
    showSyncStatus(`⏩ ${seconds > 0 ? '+' : ''}${seconds}sn (bekleniyor...)`);
    
    // 2 saniye sonra Firebase'e gönder
    seekDebounceTimeout = setTimeout(() => {
        const finalTime = videoElement.currentTime;
        
        roomRef.child('videoState').update({
            currentTime: finalTime,
            lastUpdate: Date.now()
        }).then(() => {
            console.log(`✓ Firebase senkronize edildi: ${finalTime.toFixed(1)}s`);
            showSyncStatus('✓ Senkronize edildi');
        });
    }, SEEK_DEBOUNCE_DELAY);
}

// Seek bar ile pozisyon değiştirme (VR için)
function seekToPosition(percentage) {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement || !videoElement.duration) {
        console.log('❌ Video henüz hazır değil');
        return;
    }
    
    const now = Date.now();
    
    // 2 saniye içinde tekrar tıklanırsa timeout'u sıfırla
    if (now - lastSeekTime < SEEK_DEBOUNCE_DELAY) {
        clearTimeout(seekDebounceTimeout);
        console.log('⏱️ Seek bar debounce sıfırlandı (2sn dolmadı)');
    }
    
    lastSeekTime = now;
    
    // Lokal olarak hemen seek yap
    const newTime = videoElement.duration * percentage;
    videoElement.currentTime = newTime;
    
    console.log(`🎯 Seek bar tıklandı: %${(percentage * 100).toFixed(1)} → ${newTime.toFixed(1)}s`);
    showSyncStatus(`🎯 ${formatTime(newTime)} (bekleniyor...)`);
    
    // 2 saniye sonra Firebase'e gönder
    seekDebounceTimeout = setTimeout(() => {
        const finalTime = videoElement.currentTime;
        
        roomRef.child('videoState').update({
            currentTime: finalTime,
            lastUpdate: Date.now()
        }).then(() => {
            console.log(`✓ Firebase senkronize edildi: ${finalTime.toFixed(1)}s`);
            showSyncStatus('✓ Senkronize edildi');
        });
    }, SEEK_DEBOUNCE_DELAY);
}

function setPlaybackRate(rate) {
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    videoElement.playbackRate = rate;
    console.log('🎚️ Oynatma hızı:', rate);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

console.log('✓ Video kontrol fonksiyonları yüklendi (2 saniyelik debounce ile)');