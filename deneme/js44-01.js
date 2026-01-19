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
                        
                        // ✅ FIX: Sadece kontrolleri güncelle, state sync'i interval'a bırak
                        updateYouTubeControls();
                        
                        // ✅ FIX: Unmute overlay'i göster (user gesture için)
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

// ✅ FIX: Seek throttle için değişken
let lastYTSeekTime = 0;
const YT_SEEK_COOLDOWN = 3000; // 3 saniye

// YouTube player state değişikliği
function onYTPlayerStateChange(event) {
    if (!ytPlayer || !ytPlayerReady) return;
    
    // State değerleri:
    // -1: unstarted, 0: ended, 1: playing, 2: paused, 3: buffering, 5: video cued
    
    const state = event.data;
    debugLog('🎬 YouTube state:', state);
    
    // ✅ FIX: Player PLAYING veya PAUSED durumuna geçtiğinde ilk sync yap
    if (!isRoomOwner && (state === YT.PlayerState.PLAYING || state === YT.PlayerState.PAUSED)) {
        // State değiştiğinde hemen bir sync dene
        lastYTSeekTime = 0; // Cooldown'ı sıfırla
        syncYouTubeVideo();
    }
    
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
    
    // ✅ FIX: Firebase'e isPlaying: true yaz
    const currentTime = ytPlayer.getCurrentTime();
    const serverTime = getServerTime();
    
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: true,
        currentTime: currentTime,
        startTimestamp: serverTime,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    debugLog('▶️ YouTube play command sent to Firebase');
    
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