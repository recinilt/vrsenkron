// ============================================
// VİDEO KURULUM FONKSİYONLARI
// ============================================

// Ana video kurulum fonksiyonu
function setupVideo(videoUrl, screenSize, originalUrl) {
    const service = detectVideoService(originalUrl || videoUrl);
    
    if (service === 'youtube') {
        setupYouTubeVideo(originalUrl || videoUrl, screenSize);
        return;
    }
    
    if (service === 'hls-stream') {
        setupHLSVideo(videoUrl, screenSize, originalUrl);
        return;
    }
    
    // Normal video setup
    const scene = document.querySelector('a-scene');
    const screen = document.getElementById('cinema-screen');
    
    const sizes = {
        normal: { width: 16, height: 9 },
        large: { width: 24, height: 13.5 },
        xlarge: { width: 32, height: 18 },
        imax: { width: 40, height: 22.5 }
    };
    
    const size = sizes[screenSize] || sizes.large;
    screen.setAttribute('width', size.width);
    screen.setAttribute('height', size.height);
    
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }
    
    // Eski video varsa temizle
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) oldVideo.remove();
    
    const videoAsset = document.createElement('video');
    videoAsset.id = 'video-src';
    videoAsset.crossOrigin = 'anonymous';
    videoAsset.src = videoUrl;
    videoAsset.preload = 'auto';
    videoAsset.loop = false;
    videoAsset.playsInline = true;
    
    assets.appendChild(videoAsset);
    videoElement = videoAsset;
    
    screen.setAttribute('src', '#video-src');
    screen.setAttribute('visible', 'true');
    
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('✓ Video yüklendi:', videoElement.duration, 'saniye');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('❌ Video yükleme hatası:', e);
        showVideoError('Video yüklenemedi. Lütfen farklı bir video URL\'si deneyin veya video formatının desteklendiğinden emin olun.');
    });
}

// YouTube video kurulumu
function setupYouTubeVideo(url, screenSize) {
    const videoId = extractYouTubeId(url);
    if (!videoId) {
        showVideoError('Geçersiz YouTube URL\'si!');
        return;
    }
    
    console.log('📺 YouTube video hazırlanıyor, VR modunda desteklenmez uyarısı gösteriliyor...');
    
    // YouTube VR'da desteklenmediği için uyarı göster
    showVideoError('YouTube videoları VR modunda desteklenmemektedir. Lütfen normal tarayıcı modunda izleyin veya başka bir video kaynağı kullanın.');
    
    // Normal modda YouTube embed göster
    document.getElementById('cinema-screen').setAttribute('visible', 'false');
}

// HLS video kurulumu
function setupHLSVideo(url, screenSize, originalUrl) {
    const scene = document.querySelector('a-scene');
    const screen = document.getElementById('cinema-screen');
    
    const sizes = {
        normal: { width: 16, height: 9 },
        large: { width: 24, height: 13.5 },
        xlarge: { width: 32, height: 18 },
        imax: { width: 40, height: 22.5 }
    };
    
    const size = sizes[screenSize] || sizes.large;
    screen.setAttribute('width', size.width);
    screen.setAttribute('height', size.height);
    
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }
    
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) oldVideo.remove();
    
    const videoAsset = document.createElement('video');
    videoAsset.id = 'video-src';
    videoAsset.crossOrigin = 'anonymous';
    videoAsset.preload = 'auto';
    videoAsset.loop = false;
    videoAsset.playsInline = true;
    
    assets.appendChild(videoAsset);
    videoElement = videoAsset;
    
    if (Hls.isSupported()) {
        hlsPlayer = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90
        });
        
        hlsPlayer.loadSource(url);
        hlsPlayer.attachMedia(videoElement);
        
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('✓ HLS stream hazır');
        });
        
        hlsPlayer.on(Hls.Events.ERROR, function(event, data) {
            if (data.fatal) {
                console.error('❌ HLS Fatal Error:', data);
                showVideoError('HLS stream yüklenemedi: ' + data.type);
            }
        });
        
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari için native HLS desteği
        videoElement.src = url;
        videoElement.addEventListener('loadedmetadata', function() {
            console.log('✓ HLS video yüklendi (native)');
        });
    } else {
        showVideoError('Tarayıcınız HLS videolarını desteklemiyor!');
        return;
    }
    
    screen.setAttribute('src', '#video-src');
    screen.setAttribute('visible', 'true');
    
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('✓ HLS Video yüklendi:', videoElement.duration, 'saniye');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('❌ HLS Video hatası:', e);
        showVideoError('HLS video yüklenemedi. Lütfen farklı bir kaynak deneyin.');
    });
}

// Video hata gösterimi
function showVideoError(message) {
    document.getElementById('video-error-message').textContent = message;
    document.getElementById('video-error-overlay').classList.add('visible');
}

// Video hata overlay'ini kapat
function dismissVideoError() {
    document.getElementById('video-error-overlay').classList.remove('visible');
}

// Video değiştirme modalını göster
function showChangeVideoModal() {
    // Henüz odaya katılmadıysak sessizce çık
    if (!currentRoomId || !currentRoomData) {
        return;
    }
    
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video değiştirebilir!');
        return;
    }
    document.getElementById('change-video-modal').classList.add('active');
}

// Video değiştirme modalını kapat
function closeChangeVideoModal() {
    document.getElementById('change-video-modal').classList.remove('active');
}

// Video değişikliğini uygula
function applyVideoChange() {
    const newUrl = document.getElementById('new-video-url').value.trim();
    
    if (!newUrl) {
        alert('Lütfen bir video URL\'si girin!');
        return;
    }
    
    const processedUrl = processVideoUrl(newUrl);
    
    roomRef.update({
        videoUrl: processedUrl,
        originalUrl: newUrl,
        videoService: videoServiceType,
        videoState: {
            isPlaying: false,
            currentTime: 0,
            lastUpdate: Date.now(),
            startTimestamp: null
        }
    }).then(() => {
        console.log('✓ Video değiştirildi');
        closeChangeVideoModal();
        dismissVideoError();
        
        // Videoyu yeniden yükle
        setupVideo(processedUrl, currentRoomData.screenSize, newUrl);
    }).catch(error => {
        console.error('Video değiştirme hatası:', error);
        alert('Video değiştirilemedi: ' + error.message);
    });
}