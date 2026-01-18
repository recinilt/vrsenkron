// ============================================
// VİDEO KONTROL FONKSİYONLARI - TAM SENKRON
// ============================================

// Debounce için son tıklama zamanı
let lastSeekTime = 0;
let seekDebounceTimeout = null;
const SEEK_DEBOUNCE_DELAY = 2000; // 2 saniye
const SEEK_REWIND_SECONDS = 4;    // 4 saniye geri sar

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

// Debounced Seek - 4 saniye öncesinden senkron başlatma
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
    
    // Hedef zamanı hesapla
    const targetTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
    
    // Geçici olarak hedef zamanı göster (senkron olmadan)
    videoElement.currentTime = targetTime;
    console.log(`⏩ Geçici seek: ${seconds > 0 ? 'ileri' : 'geri'} ${Math.abs(seconds)}sn → ${targetTime.toFixed(1)}s`);
    showSyncStatus(`⏩ ${seconds > 0 ? '+' : ''}${seconds}sn (2sn bekleniyor...)`);
    
    // 2 saniye sonra senkron başlatma
    seekDebounceTimeout = setTimeout(() => {
        const finalTargetTime = videoElement.currentTime;
        
        // 4 saniye geri sar (ama minimum 0)
        const rewindTime = Math.max(0, finalTargetTime - SEEK_REWIND_SECONDS);
        
        // 3 saniye sonra başlatma zamanı
        const startTimestamp = Date.now() + SYNC_DELAY;
        
        // Video duruyorsa durdur, oynatılacaksa oynat
        const wasPlaying = !videoElement.paused;
        videoElement.pause();
        videoElement.currentTime = rewindTime;
        
        roomRef.child('videoState').update({
            isPlaying: wasPlaying,
            currentTime: rewindTime,
            startTimestamp: wasPlaying ? startTimestamp : null,
            lastUpdate: Date.now()
        }).then(() => {
            console.log(`✓ Senkron seek: ${rewindTime.toFixed(1)}s → ${finalTargetTime.toFixed(1)}s`);
            console.log(`✓ 4 saniye geri sarıldı: ${finalTargetTime.toFixed(1)}s - 4s = ${rewindTime.toFixed(1)}s`);
            
            if (wasPlaying) {
                showSyncStatus(`⏱️ 3 saniyede ${formatTime(rewindTime)} başlıyor`);
            } else {
                showSyncStatus(`✓ Senkronize: ${formatTime(rewindTime)}`);
            }
        });
    }, SEEK_DEBOUNCE_DELAY);
}

// Seek bar ile pozisyon değiştirme - 4 saniye öncesinden senkron
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
    
    // Hedef zamanı hesapla
    const targetTime = videoElement.duration * percentage;
    
    // Geçici olarak hedef zamanı göster
    videoElement.currentTime = targetTime;
    console.log(`🎯 Seek bar: %${(percentage * 100).toFixed(1)} → ${targetTime.toFixed(1)}s`);
    showSyncStatus(`🎯 ${formatTime(targetTime)} (2sn bekleniyor...)`);
    
    // 2 saniye sonra senkron başlatma
    seekDebounceTimeout = setTimeout(() => {
        const finalTargetTime = videoElement.currentTime;
        
        // 4 saniye geri sar (ama minimum 0)
        const rewindTime = Math.max(0, finalTargetTime - SEEK_REWIND_SECONDS);
        
        // 3 saniye sonra başlatma zamanı
        const startTimestamp = Date.now() + SYNC_DELAY;
        
        // Video duruyorsa durdur, oynatılacaksa oynat
        const wasPlaying = !videoElement.paused;
        videoElement.pause();
        videoElement.currentTime = rewindTime;
        
        roomRef.child('videoState').update({
            isPlaying: wasPlaying,
            currentTime: rewindTime,
            startTimestamp: wasPlaying ? startTimestamp : null,
            lastUpdate: Date.now()
        }).then(() => {
            console.log(`✓ Senkron seek bar: ${rewindTime.toFixed(1)}s → ${finalTargetTime.toFixed(1)}s`);
            console.log(`✓ 4 saniye geri sarıldı: ${finalTargetTime.toFixed(1)}s - 4s = ${rewindTime.toFixed(1)}s`);
            
            if (wasPlaying) {
                showSyncStatus(`⏱️ 3 saniyede ${formatTime(rewindTime)} başlıyor`);
            } else {
                showSyncStatus(`✓ Senkronize: ${formatTime(rewindTime)}`);
            }
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

console.log('✓ Video kontrol fonksiyonları yüklendi');
console.log('   → 2 saniyelik debounce');
console.log('   → 4 saniye geri sarma');
console.log('   → Tam senkron başlatma');