// ============================================
// YOUTUBE IFRAME API WRAPPER
// 2D Watch Party modu için YouTube player
// VR desteği yok - sadece 2D senkronize izleme
// ============================================

// ==================== YOUTUBE API LOADING ====================

// YouTube IFrame API'yi yükle
function loadYouTubeAPI() {
    return new Promise((resolve, reject) => {
        if (ytApiLoaded) {
            resolve();
            return;
        }
        
        if (window.YT && window.YT.Player) {
            ytApiLoaded = true;
            resolve();
            return;
        }
        
        // Global callback fonksiyonu
        window.onYouTubeIframeAPIReady = () => {
            ytApiLoaded = true;
            debugLog('✅ YouTube IFrame API loaded');
            resolve();
        };
        
        // API script'ini yükle
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('YouTube API yüklenemedi'));
        
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Timeout
        setTimeout(() => {
            if (!ytApiLoaded) {
                reject(new Error('YouTube API yükleme zaman aşımı'));
            }
        }, 10000);
    });
}

// ==================== YOUTUBE PLAYER CREATION ====================

// YouTube player oluştur
async function createYouTubePlayer(videoId, containerId) {
    if (!videoId) {
        console.error('YouTube video ID gerekli');
        return null;
    }
    
    containerId = containerId || 'youtube-player-container';
    
    try {
        await loadYouTubeAPI();
        
        // ✅ FIX: Sadece player'ı temizle, container'ı silme!
        cleanupYouTubePlayerOnly();
        
        return new Promise((resolve, reject) => {
            // Container var mı kontrol et
            const container = document.getElementById(containerId);
            if (!container) {
                reject(new Error('YouTube player container bulunamadı: ' + containerId));
                return;
            }
            
            debugLog('🎬 Creating YT.Player for container:', containerId, 'videoId:', videoId);
            
            ytPlayer = new YT.Player(containerId, {
                height: '100%',
                width: '100%',
                videoId: videoId,
                playerVars: {
                    'autoplay': 1, // ✅ FIX: Muted autoplay için
                    'mute': 1, // ✅ KRİTİK: Muted başla - autoplay için zorunlu
                    'controls': 1,
                    'disablekb': 0, // Klavye kontrolleri açık
                    'enablejsapi': 1,
                    'fs': 1, // Fullscreen butonu açık
                    'iv_load_policy': 3, // Annotations kapalı
                    'modestbranding': 1,
                    'rel': 0, // İlgili videoları gösterme
                    'playsinline': 1,
                    'origin': window.location.origin
                },
                events: {
                    'onReady': (event) => {
                        ytPlayerReady = true;
                        debugLog('✅ YouTube player ready');
                        
                        // ✅ FIX: Kontrolleri güncelle
                        updateYouTubeControls();
                        
                        // ✅ FIX: Mevcut state'i uygula (muted autoplay sayesinde çalışacak)
                        if (currentRoomData && currentRoomData.videoState) {
                            debugLog('🔄 Applying current video state on player ready');
                            applyYouTubeVideoState(currentRoomData.videoState);
                        }
                        
                        // ✅ FIX: "Sesi Aç" overlay'i göster (user gesture için)
                        showUnmuteOverlay();
                        
                        resolve(ytPlayer);
                    },
                    'onStateChange': onYTPlayerStateChange,
                    'onError': (event) => {
                        console.error('YouTube player error:', event.data);
                        const errorMessages = {
                            2: 'Geçersiz video ID',
                            5: 'HTML5 player hatası',
                            100: 'Video bulunamadı veya özel',
                            101: 'Video gömülmeye izin vermiyor',
                            150: 'Video gömülmeye izin vermiyor'
                        };
                        const msg = errorMessages[event.data] || 'Bilinmeyen hata';
                        showYouTubeError(msg);
                    }
                }
            });
            
            // Timeout
            setTimeout(() => {
                if (!ytPlayerReady) {
                    reject(new Error('YouTube player oluşturma zaman aşımı'));
                }
            }, 15000);
        });
        
    } catch (error) {
        console.error('YouTube player creation error:', error);
        throw error;
    }
}

// ==================== YOUTUBE PLAYER EVENTS ====================

// YouTube player state değişikliği
function onYTPlayerStateChange(event) {
    if (!ytPlayer || !ytPlayerReady) return;
    
    // State değerleri:
    // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
    
    const state = event.data;
    debugLog('🎬 YouTube state:', state);
    
    // Sadece owner'ın aksiyonları Firebase'e gönderilir
    if (!isRoomOwner) return;
    
    // Kendi komutumuzdan gelen değişiklikse ignore et
    if (lastCommandSource === 'self') return;
    
    // Sync mode aktifse ignore et
    if (syncModeActive) return;
    
    if (state === YT.PlayerState.PLAYING) {
        // Video oynatıldı
        const serverTime = getServerTime();
        const currentTime = ytPlayer.getCurrentTime();
        
        db.ref('rooms/' + currentRoomId + '/videoState').update({
            isPlaying: true,
            currentTime: currentTime,
            startTimestamp: serverTime,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        debugLog('▶️ YouTube playing, time:', currentTime);
        
    } else if (state === YT.PlayerState.PAUSED) {
        // Video duraklatıldı
        const currentTime = ytPlayer.getCurrentTime();
        
        db.ref('rooms/' + currentRoomId + '/videoState').update({
            isPlaying: false,
            currentTime: currentTime,
            startTimestamp: getServerTime(),
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        debugLog('⏸️ YouTube paused, time:', currentTime);
    }
}

// ==================== YOUTUBE PLAYER CONTROLS ====================

// YouTube video oynat
function ytPlayVideo() {
    if (!isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    
    lastCommandSource = 'self';
    ytPlayer.playVideo();
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 500));
}

// YouTube video duraklat
function ytPauseVideo() {
    if (!isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    
    lastCommandSource = 'self';
    ytPlayer.pauseVideo();
    
    const currentTime = ytPlayer.getCurrentTime();
    
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: currentTime,
        startTimestamp: getServerTime(),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP,
        'keyframes': null,
        'syncState': null
    });
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 500));
}

// YouTube video stop (başa sar)
function ytStopVideo() {
    if (!isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    
    lastCommandSource = 'self';
    ytPlayer.pauseVideo();
    ytPlayer.seekTo(0, true);
    
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: 0,
        startTimestamp: getServerTime(),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 500));
}

// YouTube seek
function ytSeekTo(seconds, allowSeekAhead) {
    if (!ytPlayer || !ytPlayerReady) return;
    
    ytPlayer.seekTo(seconds, allowSeekAhead !== false);
}

// YouTube geri sar
function ytSeekBackward() {
    if (!isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    
    const currentTime = ytPlayer.getCurrentTime();
    const newTime = Math.max(0, currentTime - 10);
    
    lastCommandSource = 'self';
    ytPlayer.seekTo(newTime, true);
    ytPlayer.pauseVideo();
    
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: newTime,
        startTimestamp: getServerTime(),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    debugLog('⏪ YouTube seek backward to:', newTime);
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 500));
}

// YouTube ileri sar
function ytSeekForward() {
    if (!isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    
    const currentTime = ytPlayer.getCurrentTime();
    const duration = ytPlayer.getDuration();
    const newTime = Math.min(duration, currentTime + 10);
    
    lastCommandSource = 'self';
    ytPlayer.seekTo(newTime, true);
    ytPlayer.pauseVideo();
    
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: newTime,
        startTimestamp: getServerTime(),
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    debugLog('⏩ YouTube seek forward to:', newTime);
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 500));
}

// ==================== YOUTUBE SYNC ====================

// ✅ FIX: YouTube video state'ini uygula (onReady'de çağrılır)
function applyYouTubeVideoState(state) {
    if (!ytPlayer || !ytPlayerReady || !state) {
        debugLog('⚠️ applyYouTubeVideoState: player not ready or no state');
        return;
    }
    
    try {
        const serverTime = getServerTime();
        
        // Hedef pozisyonu hesapla
        let targetTime = state.currentTime || 0;
        if (state.isPlaying && state.startTimestamp) {
            const elapsed = (serverTime - state.startTimestamp) / 1000;
            if (isFinite(elapsed) && elapsed >= 0 && elapsed < 86400) {
                targetTime = state.currentTime + elapsed;
            }
        }
        
        // Pozisyona git
        if (targetTime > 0) {
            ytPlayer.seekTo(targetTime, true);
            debugLog('📍 YouTube seek to:', targetTime);
        }
        
        // Play/Pause durumu - NOT: muted autoplay ile video zaten oynuyor olabilir
        // Bu yüzden sadece pause gerekiyorsa pause yap
        if (!state.isPlaying) {
            ytPlayer.pauseVideo();
            debugLog('⏸️ YouTube paused (initial state)');
        }
        // isPlaying true ise video zaten autoplay ile oynuyor (muted)
        
    } catch (e) {
        console.warn('applyYouTubeVideoState error:', e);
    }
}

// YouTube video senkronizasyonu (viewer için)
function syncYouTubeVideo() {
    if (isRoomOwner || !ytPlayer || !ytPlayerReady) return;
    if (!currentRoomData || !currentRoomData.videoState) return;
    if (syncModeActive) return;
    
    const now = Date.now();
    if (now - lastYTSyncTime < 500) return; // Throttle
    lastYTSyncTime = now;
    
    const state = currentRoomData.videoState;
    const serverTime = getServerTime();
    
    let expectedTime = state.currentTime;
    if (state.isPlaying) {
        const elapsed = (serverTime - state.startTimestamp) / 1000;
        if (isFinite(elapsed) && elapsed >= 0 && elapsed < 86400) {
            expectedTime = state.currentTime + elapsed;
        }
    }
    
    const currentTime = ytPlayer.getCurrentTime();
    const drift = Math.abs(currentTime - expectedTime) * 1000;
    
    // Play/Pause senkronizasyonu
    const ytState = ytPlayer.getPlayerState();
    const isYTPlaying = ytState === YT.PlayerState.PLAYING;
    
    if (state.isPlaying && !isYTPlaying) {
        ytPlayer.playVideo();
    } else if (!state.isPlaying && isYTPlaying) {
        ytPlayer.pauseVideo();
    }
    
    // Pozisyon senkronizasyonu
    if (drift > 2000) {
        // 2 saniyeden fazla sapma varsa seek
        debugLog('🔄 YouTube sync seek, drift:', drift, 'ms');
        ytPlayer.seekTo(expectedTime, true);
    } else if (drift > 500) {
        // Küçük sapmalarda playback rate ayarla
        const behind = currentTime < expectedTime;
        ytPlayer.setPlaybackRate(behind ? 1.1 : 0.9);
        
        // 2 saniye sonra normale dön
        trackTimeout(setTimeout(() => {
            if (ytPlayer && ytPlayerReady) {
                ytPlayer.setPlaybackRate(1.0);
            }
        }, 2000));
    } else {
        ytPlayer.setPlaybackRate(1.0);
    }
    
    // Drift UI güncelle
    updateSyncStatus(drift);
}

// YouTube sync interval başlat
function startYouTubeSyncInterval() {
    if (ytPlayerStateInterval) {
        clearInterval(ytPlayerStateInterval);
    }
    
    ytPlayerStateInterval = setInterval(() => {
        if (!isRoomOwner && ytPlayer && ytPlayerReady) {
            syncYouTubeVideo();
        }
        updateYouTubeTimeDisplay();
    }, 500);
    
    trackInterval(ytPlayerStateInterval);
    debugLog('✅ YouTube sync interval started');
}

// YouTube zaman göstergesini güncelle
function updateYouTubeTimeDisplay() {
    if (!ytPlayer || !ytPlayerReady) return;
    
    const currentTime = ytPlayer.getCurrentTime();
    const duration = ytPlayer.getDuration();
    
    const timeDisplay = document.getElementById('youtube-time-display');
    if (timeDisplay) {
        timeDisplay.textContent = formatTimeVR(currentTime) + ' / ' + formatTimeVR(duration);
    }
    
    // Progress bar güncelle
    const progressBar = document.getElementById('youtube-progress-fill');
    if (progressBar && duration > 0) {
        const percent = (currentTime / duration) * 100;
        progressBar.style.width = percent + '%';
    }
}

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

// Unmute overlay'ini gizle
function hideUnmuteOverlay() {
    const overlay = document.getElementById('youtube-unmute-overlay');
    if (overlay) {
        overlay.removeEventListener('click', handleUnmuteClick);
        overlay.removeEventListener('touchstart', handleUnmuteClick);
        overlay.remove();
        debugLog('🔊 Unmute overlay hidden');
    }
}

// Unmute tıklama handler'ı (user gesture)
function handleUnmuteClick(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (ytPlayer && ytPlayerReady) {
        // ✅ User gesture ile unmute
        ytPlayer.unMute();
        ytPlayer.setVolume(100);
        
        // ✅ Eğer owner playing state'indeyse videoyu oynat
        if (currentRoomData && currentRoomData.videoState && currentRoomData.videoState.isPlaying) {
            ytPlayer.playVideo();
            debugLog('▶️ Video started with user gesture');
        }
        
        debugLog('🔊 Video unmuted with user gesture');
    }
    
    hideUnmuteOverlay();
}

debugLog('✅ YouTube IFrame API wrapper loaded');