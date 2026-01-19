// ==================== YOUTUBE UI ====================

// YouTube 2D container oluştur
function createYouTube2DContainer() {
    // Mevcut container'ı temizle
    const existing = document.getElementById('youtube-2d-container');
    if (existing) existing.remove();
    
    const container = document.createElement('div');
    container.id = 'youtube-2d-container';
    container.innerHTML = `
        <div class="youtube-header">
            <div class="youtube-room-info">
                <span id="youtube-room-name"></span>
                <span id="youtube-viewer-count"></span>
            </div>
            <div class="youtube-vr-warning">
                ⚠️ YouTube modu: VR desteklenmiyor (2D Watch Party)
            </div>
        </div>
        
        <!-- ✅ YENİ: YouTube Arama Bölümü (Sadece Oda Sahibi) -->
        <div id="yt-search-container" class="yt-search-container" style="display: none;">
            <div class="yt-search-input-wrapper">
                <input type="text" id="yt-search-input" placeholder="Video ara... (karaoke, müzik, film...)" onkeydown="handleYTSearchKeydown(event)">
                <button id="yt-search-btn" onclick="handleYTSearchClick()">🔍</button>
            </div>
            <div id="yt-search-results" class="yt-search-results"></div>
        </div>
        
        <div class="youtube-player-wrapper">
            <div id="youtube-player-container"></div>
        </div>
        <div class="youtube-controls">
            <div class="youtube-progress-bar" id="youtube-progress-bar">
                <div class="youtube-progress-fill" id="youtube-progress-fill"></div>
            </div>
            <div class="youtube-control-buttons">
                <button id="yt-btn-play" onclick="ytPlayVideo()">▶️ Oynat</button>
                <button id="yt-btn-pause" onclick="ytPauseVideo()">⏸️ Duraklat</button>
                <button id="yt-btn-stop" onclick="ytStopVideo()">⏹️ Stop</button>
                <button id="yt-btn-rewind" onclick="ytSeekBackward()">⏪ -10s</button>
                <button id="yt-btn-forward" onclick="ytSeekForward()">⏩ +10s</button>
                <button id="yt-btn-sync" onclick="initiateSync()">🔄 Sync</button>
                <button id="yt-btn-request-ownership" onclick="sendOwnershipRequest()">🙋 Sahiplik İste</button>
                <button onclick="leaveRoom()">🚪 Çık</button>
            </div>
            <div class="youtube-time-info">
                <span id="youtube-time-display">0:00 / 0:00</span>
                <span id="youtube-sync-status" class="status-good">✅ Senkronize</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(container);
    
    // A-Frame sahnesini gizle
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.style.display = 'none';
    }
    
    // Normal VR kontrollerini gizle
    const vrControls = getCachedElement('vr-controls');
    if (vrControls) vrControls.style.display = 'none';
    
    const roomInfo = getCachedElement('room-info');
    if (roomInfo) roomInfo.style.display = 'none';
    
    const syncStatus = getCachedElement('sync-status');
    if (syncStatus) syncStatus.style.display = 'none';
    
    debugLog('✅ YouTube 2D container created');
    return container;
}

// YouTube hata göster
function showYouTubeError(message) {
    const container = document.getElementById('youtube-player-container');
    if (container) {
        container.innerHTML = `
            <div class="youtube-error">
                <h3>❌ YouTube Hatası</h3>
                <p>${message}</p>
                <p style="font-size: 12px; opacity: 0.7;">Video gömülmeye izin vermiyor olabilir veya bölgenizde kısıtlı olabilir.</p>
            </div>
        `;
    }
}

// YouTube room info güncelle
function updateYouTubeRoomInfo() {
    const roomName = document.getElementById('youtube-room-name');
    const viewerCount = document.getElementById('youtube-viewer-count');
    
    if (roomName && currentRoomData) {
        roomName.textContent = currentRoomData.name + (isRoomOwner ? ' 👑' : '');
    }
    
    if (viewerCount && currentRoomId) {
        db.ref('rooms/' + currentRoomId + '/activeViewers').once('value')
            .then(snapshot => {
                const count = snapshot.numChildren();
                viewerCount.textContent = `👥 ${count} izleyici`;
            })
            .catch(() => {});
    }
    
    // ✅ YENİ: Arama bölümünü owner'a göster
    updateYTSearchVisibility();
}

// ✅ YENİ: Arama bölümü görünürlüğünü ayarla
function updateYTSearchVisibility() {
    const searchContainer = document.getElementById('yt-search-container');
    if (searchContainer) {
        if (isRoomOwner) {
            searchContainer.style.display = 'block';
        } else {
            searchContainer.style.display = 'none';
        }
    }
}

// YouTube kontrol butonlarını owner/viewer'a göre ayarla
function updateYouTubeControls() {
    const ownerOnlyButtons = ['yt-btn-play', 'yt-btn-pause', 'yt-btn-stop', 'yt-btn-rewind', 'yt-btn-forward'];
    
    ownerOnlyButtons.forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.disabled = !isRoomOwner;
            btn.style.opacity = isRoomOwner ? '1' : '0.5';
            btn.style.cursor = isRoomOwner ? 'pointer' : 'not-allowed';
        }
    });
    
    // Sahiplik iste butonu
    const requestBtn = document.getElementById('yt-btn-request-ownership');
    if (requestBtn) {
        requestBtn.disabled = isRoomOwner;
        requestBtn.style.opacity = isRoomOwner ? '0.5' : '1';
        requestBtn.textContent = isRoomOwner ? '👑 Oda Sahibisin' : '🙋 Sahiplik İste';
    }
    
    // ✅ YENİ: Arama görünürlüğünü güncelle
    updateYTSearchVisibility();
}

// ==================== YOUTUBE CLEANUP ====================

// ✅ FIX: Sadece player'ı temizle, container'ı silme
function cleanupYouTubePlayerOnly() {
    if (ytPlayerStateInterval) {
        clearInterval(ytPlayerStateInterval);
        ytPlayerStateInterval = null;
    }
    
    if (ytPlayer) {
        try {
            ytPlayer.destroy();
        } catch (e) {
            console.warn('YouTube player destroy error:', e);
        }
        ytPlayer = null;
    }
    
    ytPlayerReady = false;
    lastYTSeekTime = 0; // ✅ FIX: Seek cooldown'ı sıfırla
    debugLog('🧹 YouTube player only cleanup (container preserved)');
}

// YouTube player ve container'ı tamamen temizle
function destroyYouTubePlayer() {
    // Önce player'ı temizle
    cleanupYouTubePlayerOnly();
    
    // 2D container'ı kaldır
    const container = document.getElementById('youtube-2d-container');
    if (container) {
        container.remove();
    }
    
    // A-Frame sahnesini tekrar göster
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.style.display = 'block';
    }
    
    debugLog('🧹 YouTube player destroyed');
}

// YouTube modu aktif mi kontrol et
function checkYouTubeMode() {
    if (!currentRoomData) return false;
    return currentRoomData.youtube && currentRoomData.youtube.videoId;
}

// ==================== UNMUTE OVERLAY (User Gesture için) ====================

// "Sesi Aç" overlay'ini göster
function showUnmuteOverlay() {
    // Mevcut overlay varsa kaldır
    hideUnmuteOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'youtube-unmute-overlay';
    overlay.innerHTML = `
        <div class="unmute-content">
            <div class="unmute-icon">🔊</div>
            <div class="unmute-text">Sesi Açmak İçin Dokunun</div>
            <div class="unmute-subtext">Video sessiz oynatılıyor</div>
        </div>
    `;
    
    // Tıklama event'i - user gesture ile unmute
    overlay.addEventListener('click', handleUnmuteClick);
    overlay.addEventListener('touchstart', handleUnmuteClick);
    
    // Overlay stillerini ekle (inline)
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        cursor: pointer;
    `;
    
    const content = overlay.querySelector('.unmute-content');
    if (content) {
        content.style.cssText = `
            text-align: center;
            color: white;
            padding: 40px;
            background: rgba(102, 126, 234, 0.9);
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;
    }
    
    const icon = overlay.querySelector('.unmute-icon');
    if (icon) {
        icon.style.cssText = `
            font-size: 80px;
            margin-bottom: 20px;
        `;
    }
    
    const text = overlay.querySelector('.unmute-text');
    if (text) {
        text.style.cssText = `
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
        `;
    }
    
    const subtext = overlay.querySelector('.unmute-subtext');
    if (subtext) {
        subtext.style.cssText = `
            font-size: 16px;
            opacity: 0.8;
        `;
    }
    
    document.body.appendChild(overlay);
    debugLog('🔊 Unmute overlay shown');
}