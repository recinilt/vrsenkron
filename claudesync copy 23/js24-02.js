// ==================== YOUTUBE 2D SCENE ====================
async function createYouTube2DScene() {
    debugLog('🎬 Creating YouTube 2D scene...');
    
    // YouTube video ID'yi al
    youtubeVideoId = currentRoomData.youtube?.videoId || '';
    
    // 2D container oluştur
    createYouTube2DContainer();
    
    // Room info güncelle
    updateYouTubeRoomInfo();
    
    // Video ID yoksa sadece arama UI göster
    if (!youtubeVideoId) {
        debugLog('ℹ️ No video ID - showing search UI only');
        
        // Kontrolleri ayarla
        updateYouTubeControls();
        
        // Video değişikliği dinle (video seçildiğinde başlasın)
        if (typeof listenYouTubeVideoChange === 'function') {
            listenYouTubeVideoChange();
        }
        
        return; // Player oluşturma, kullanıcı arama yapacak
    }
    
    // YouTube player oluştur
    try {
        await createYouTubePlayer(youtubeVideoId, 'youtube-player-container');
        
        // Kontrolleri ayarla
        updateYouTubeControls();
        
        // Sync interval başlat
        startYouTubeSyncInterval();
        
        // Video değişikliği dinle (tüm kullanıcılar için)
        if (typeof listenYouTubeVideoChange === 'function') {
            listenYouTubeVideoChange();
        }
        
        debugLog('✅ YouTube 2D scene created successfully');
        
    } catch (error) {
        console.error('YouTube player creation failed:', error);
        showYouTubeError(error.message);
    }
}

// ✅ YENİ: Kontrolleri devre dışı bırak
function disableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-stop', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
        }
    });
    debugLog('🔒 Controls disabled - P2P downloading');
}

// ✅ YENİ: Kontrolleri aktif et
function enableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-stop', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    debugLog('✅ Controls enabled - P2P ready');
}