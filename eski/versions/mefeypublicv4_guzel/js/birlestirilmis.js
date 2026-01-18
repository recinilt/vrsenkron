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


// ============================================
// FİREBASE SENKRONİZASYON SİSTEMİ - OPTİMİZE EDİLMİŞ
// ============================================

function listenToRoomUpdates() {
    if (!roomRef) return;
    
    // Video durumu değişikliklerini dinle
    roomRef.child('videoState').on('value', (snapshot) => {
        if (!videoElement) return;
        
        const state = snapshot.val();
        if (!state) return;
        
        const now = Date.now();
        
        // Video durduruldu
        if (!state.isPlaying && !videoElement.paused) {
            videoElement.pause();
            videoElement.currentTime = state.currentTime;
            console.log('⏸️ Video durduruldu');
            return;
        }
        
        // Video başlatılacak
        if (state.isPlaying && videoElement.paused && state.startTimestamp) {
            const waitTime = state.startTimestamp - now;
            
            if (waitTime > 0) {
                // Henüz başlama zamanı gelmedi
                console.log(`⏱️ ${(waitTime/1000).toFixed(1)}s sonra başlayacak`);
                showSyncStatus(`⏱️ ${Math.ceil(waitTime/1000)}s sonra başlıyor...`);
                
                if (syncTimeout) clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    videoElement.currentTime = state.currentTime;
                    videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                    console.log('▶️ Video başlatıldı (sync)');
                }, waitTime);
            } else {
                // Başlama zamanı geçmiş, gecikmeli başlat
                const elapsedSeconds = Math.abs(waitTime) / 1000;
                const newSeek = state.currentTime + elapsedSeconds;
                
                videoElement.currentTime = newSeek;
                videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                console.log(`▶️ Video başlatıldı (${elapsedSeconds.toFixed(1)}s gecikmeli)`);
            }
        }
    });
    
    // İzleyici sayısı değişikliklerini dinle (throttled)
    const throttledViewerUpdate = throttle(() => {
        updateViewerCount();
    }, 5000);  // 5 saniyede bir
    
    roomRef.child('viewers').on('value', throttledViewerUpdate);
    
    // Oda sahibi değişikliklerini dinle
    roomRef.child('owner').on('value', (snapshot) => {
        const newOwner = snapshot.val();
        if (newOwner === auth.currentUser.uid && !isRoomOwner) {
            isRoomOwner = true;
            console.log('✓ Oda sahipliği size devredildi!');
            alert('🎉 Oda sahipliği size devredildi! Artık video kontrollerini kullanabilirsiniz.');
        }
    });
    
    // ❌ PERİYODİK UPDATE KALDIRILDI
    // Artık sadece önemli olaylarda (play/pause/seek) güncelleme yapılıyor
    console.log('✓ Olay bazlı senkronizasyon aktif (Periyodik update yok)');
}

// Throttled versiyon
const updateViewerCount = throttle(function() {
    if (roomRef) {
        roomRef.child('viewers').once('value', (snapshot) => {
            const count = snapshot.val() || 0;
            const viewersCountElement = document.getElementById('viewers-count');
            if (viewersCountElement) {
                viewersCountElement.textContent = count;
            }
        });
    }
}, 5000);

function syncVideoState() {
    if (!roomRef || !videoElement) return;
    
    roomRef.child('videoState').once('value', (snapshot) => {
        const state = snapshot.val();
        if (!state) return;
        
        videoElement.currentTime = state.currentTime;
        
        if (state.isPlaying && videoElement.paused) {
            videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
        } else if (!state.isPlaying && !videoElement.paused) {
            videoElement.pause();
        }
        
        console.log('✓ Video durumu senkronize edildi');
    });
}

console.log('✓ Firebase senkronizasyon sistemi yüklendi (Optimize Edilmiş)');


// ============================================
// ALTYAZI SİSTEMİ
// ============================================

function loadSubtitle(subtitleUrl) {
    if (!subtitleUrl) return;
    
    fetch(subtitleUrl)
        .then(response => response.text())
        .then(text => {
            const fileExtension = subtitleUrl.split('.').pop().toLowerCase();
            
            if (fileExtension === 'srt') {
                subtitleData = parseSRT(text);
            } else if (fileExtension === 'vtt') {
                subtitleData = parseVTT(text);
            } else if (fileExtension === 'ass' || fileExtension === 'ssa') {
                subtitleData = parseASS(text);
            }
            
            console.log('✓ Altyazı yüklendi:', subtitleData.length, 'satır');
            startSubtitleUpdate();
        })
        .catch(error => {
            console.error('❌ Altyazı yükleme hatası:', error);
        });
}

function parseSRT(srtText) {
    const subtitles = [];
    const blocks = srtText.trim().split(/\n\s*\n/);
    
    blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const timeLine = lines[1];
            const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            
            if (timeMatch) {
                const startTime = parseFloat(timeMatch[1]) * 3600 + 
                                parseFloat(timeMatch[2]) * 60 + 
                                parseFloat(timeMatch[3]) + 
                                parseFloat(timeMatch[4]) / 1000;
                
                const endTime = parseFloat(timeMatch[5]) * 3600 + 
                              parseFloat(timeMatch[6]) * 60 + 
                              parseFloat(timeMatch[7]) + 
                              parseFloat(timeMatch[8]) / 1000;
                
                const text = lines.slice(2).join('\n');
                
                subtitles.push({ startTime, endTime, text });
            }
        }
    });
    
    return subtitles;
}

function parseVTT(vttText) {
    const subtitles = [];
    const lines = vttText.split('\n');
    let currentSubtitle = null;
    
    lines.forEach(line => {
        line = line.trim();
        
        if (line.includes('-->')) {
            const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
            
            if (timeMatch) {
                const startTime = parseFloat(timeMatch[1]) * 3600 + 
                                parseFloat(timeMatch[2]) * 60 + 
                                parseFloat(timeMatch[3]) + 
                                parseFloat(timeMatch[4]) / 1000;
                
                const endTime = parseFloat(timeMatch[5]) * 3600 + 
                              parseFloat(timeMatch[6]) * 60 + 
                              parseFloat(timeMatch[7]) + 
                              parseFloat(timeMatch[8]) / 1000;
                
                currentSubtitle = { startTime, endTime, text: '' };
            }
        } else if (currentSubtitle && line && !line.startsWith('WEBVTT')) {
            currentSubtitle.text += line + '\n';
            if (line === '' || lines[lines.indexOf(line) + 1] === '') {
                subtitles.push(currentSubtitle);
                currentSubtitle = null;
            }
        }
    });
    
    return subtitles;
}

function parseASS(assText) {
    const subtitles = [];
    const lines = assText.split('\n');
    
    lines.forEach(line => {
        if (line.startsWith('Dialogue:')) {
            const parts = line.substring(9).split(',');
            if (parts.length >= 10) {
                const startTime = parseAssTime(parts[1].trim());
                const endTime = parseAssTime(parts[2].trim());
                const text = parts.slice(9).join(',').replace(/\{[^}]*\}/g, '');
                
                subtitles.push({ startTime, endTime, text });
            }
        }
    });
    
    return subtitles;
}

function parseAssTime(timeStr) {
    const parts = timeStr.split(':');
    return parseFloat(parts[0]) * 3600 + 
           parseFloat(parts[1]) * 60 + 
           parseFloat(parts[2]);
}

function startSubtitleUpdate() {
    if (subtitleUpdateInterval) {
        clearInterval(subtitleUpdateInterval);
    }
    
    if (!subtitleElement) {
        createSubtitleElement();
    }
    
    subtitleUpdateInterval = setInterval(() => {
        if (!videoElement || !subtitleData) return;
        
        const currentTime = videoElement.currentTime;
        const currentSub = subtitleData.find(sub => 
            currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        
        if (currentSub) {
            subtitleElement.setAttribute('value', currentSub.text.trim());
            subtitleElement.setAttribute('visible', 'true');
        } else {
            subtitleElement.setAttribute('visible', 'false');
        }
    }, 100);
}

function createSubtitleElement() {
    const scene = document.querySelector('a-scene');
    
    subtitleElement = document.createElement('a-text');
    subtitleElement.setAttribute('id', 'subtitle-text');
    subtitleElement.setAttribute('value', '');
    subtitleElement.setAttribute('align', 'center');
    subtitleElement.setAttribute('width', 20);
    subtitleElement.setAttribute('position', '0 -3 -10');
    subtitleElement.setAttribute('color', '#FFFFFF');
    subtitleElement.setAttribute('shader', 'msdf');
    subtitleElement.setAttribute('background', 'color: rgba(0, 0, 0, 0.7); padding: 0.2');
    subtitleElement.setAttribute('visible', 'false');
    
    scene.appendChild(subtitleElement);
    console.log('✓ Altyazı elementi oluşturuldu');
}

function removeSubtitle() {
    if (subtitleUpdateInterval) {
        clearInterval(subtitleUpdateInterval);
        subtitleUpdateInterval = null;
    }
    
    if (subtitleElement) {
        subtitleElement.setAttribute('visible', 'false');
    }
    
    subtitleData = null;
    console.log('✓ Altyazı kaldırıldı');
}

console.log('✓ Altyazı sistemi yüklendi');



// ============================================
// VR UI PANEL SİSTEMİ (Sol Tarafta Kontroller)
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    const camera = document.querySelector('#camera-rig');
    
    // Ana Panel Container
    vrUIPanel = document.createElement('a-entity');
    vrUIPanel.setAttribute('id', 'vr-ui-panel');
    vrUIPanel.setAttribute('position', `${VR_UI_CONFIG.position.x} ${VR_UI_CONFIG.position.y} ${VR_UI_CONFIG.position.z}`);
    
    // Panel Arka Plan
    const panelBg = document.createElement('a-plane');
    panelBg.setAttribute('width', '2.5');
    panelBg.setAttribute('height', '3');
    panelBg.setAttribute('color', '#222222');
    panelBg.setAttribute('opacity', '0.9');
    panelBg.setAttribute('shader', 'flat');
    vrUIPanel.appendChild(panelBg);
    
    // Başlık
    const title = document.createElement('a-text');
    title.setAttribute('value', 'EKRAN KONTROLÜ');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '2');
    title.setAttribute('position', '0 1.3 0.01');
    title.setAttribute('color', '#00ff00');
    vrUIPanel.appendChild(title);
    
    // Ekran Kontrol Butonları
    createScreenControlButtons(vrUIPanel);
    
    // Video Kontrol Butonları
    createVideoControlButtons(vrUIPanel);
    
    // Seek Bar
    createVRSeekBar(vrUIPanel);
    
    // Camera rig'e ekle (her zaman görünür olsun)
    camera.appendChild(vrUIPanel);
    
    console.log('✓ VR UI Panel oluşturuldu');
}

function createScreenControlButtons(panel) {
    const buttonSize = VR_UI_CONFIG.buttonSize;
    const positions = {
        // Yukarı/Aşağı/Sol/Sağ
        up:    { x: 0,     y: 0.8,  label: '↑' },
        down:  { x: 0,     y: 0.2,  label: '↓' },
        left:  { x: -0.4,  y: 0.5,  label: '←' },
        right: { x: 0.4,   y: 0.5,  label: '→' },
        // İleri/Geri
        forward:  { x: -0.8, y: 0.5, label: '+' },
        backward: { x: 0.8,  y: 0.5, label: '-' },
        // Sıfırla
        reset: { x: 0, y: -0.2, label: '⟲', size: 0.4 }
    };
    
    Object.entries(positions).forEach(([action, pos]) => {
        const btn = createVRButton(
            pos.x, pos.y, 0.02,
            pos.label,
            pos.size || buttonSize,
            () => moveScreen(action)
        );
        panel.appendChild(btn);
    });
}

function createVideoControlButtons(panel) {
    const buttonSize = 0.25;
    const y = -0.8;
    
    const buttons = [
        { x: -0.6, label: '⏮', action: () => seekVideo(-10) },
        { x: -0.3, label: '⏯', action: () => togglePlayPause() },
        { x: 0,    label: '⏹', action: () => stopVideo() },
        { x: 0.3,  label: '⏭', action: () => seekVideo(10) }
    ];
    
    buttons.forEach(btn => {
        const element = createVRButton(btn.x, y, 0.02, btn.label, buttonSize, btn.action);
        panel.appendChild(element);
    });
}

function createVRButton(x, y, z, label, size, onClick) {
    const button = document.createElement('a-entity');
    button.setAttribute('position', `${x} ${y} ${z}`);
    
    // Buton arka plan
    const bg = document.createElement('a-circle');
    bg.setAttribute('radius', size / 2);
    bg.setAttribute('color', '#4444ff');
    bg.setAttribute('shader', 'flat');
    bg.setAttribute('class', 'clickable');
    button.appendChild(bg);
    
    // Buton metni
    const text = document.createElement('a-text');
    text.setAttribute('value', label);
    text.setAttribute('align', 'center');
    text.setAttribute('width', size * 2);
    text.setAttribute('position', `0 0 0.01`);
    text.setAttribute('color', '#ffffff');
    button.appendChild(text);
    
    // Click event
    bg.addEventListener('click', onClick);
    
    // Hover effect
    bg.addEventListener('mouseenter', () => {
        bg.setAttribute('color', '#6666ff');
        bg.setAttribute('radius', size / 2 * 1.1);
    });
    
    bg.addEventListener('mouseleave', () => {
        bg.setAttribute('color', '#4444ff');
        bg.setAttribute('radius', size / 2);
    });
    
    return button;
}

function createVRSeekBar(panel) {
    vrSeekBar = document.createElement('a-entity');
    vrSeekBar.setAttribute('position', '0 -1.2 0.02');
    
    // Seek bar arka plan
    const bgBar = document.createElement('a-plane');
    bgBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth);
    bgBar.setAttribute('height', '0.1');
    bgBar.setAttribute('color', '#555555');
    bgBar.setAttribute('shader', 'flat');
    vrSeekBar.appendChild(bgBar);
    
    // Progress bar
    const progressBar = document.createElement('a-plane');
    progressBar.setAttribute('id', 'vr-progress-bar');
    progressBar.setAttribute('width', '0');
    progressBar.setAttribute('height', '0.1');
    progressBar.setAttribute('color', '#00ff00');
    progressBar.setAttribute('shader', 'flat');
    progressBar.setAttribute('position', `-${VR_UI_CONFIG.seekBarWidth / 2} 0 0.01`);
    vrSeekBar.appendChild(progressBar);
    
    // Time text
    const timeText = document.createElement('a-text');
    timeText.setAttribute('id', 'vr-time-text');
    timeText.setAttribute('value', '0:00 / 0:00');
    timeText.setAttribute('align', 'center');
    timeText.setAttribute('width', '2');
    timeText.setAttribute('position', '0 -0.15 0.01');
    timeText.setAttribute('color', '#ffffff');
    vrSeekBar.appendChild(timeText);
    
    // Seek bar update loop
    setInterval(updateVRSeekBar, 500);
    
    panel.appendChild(vrSeekBar);
}

function updateVRSeekBar() {
    if (!videoElement) return;
    
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;
    
    if (duration > 0) {
        const progress = currentTime / duration;
        const progressBar = document.querySelector('#vr-progress-bar');
        const timeText = document.querySelector('#vr-time-text');
        
        if (progressBar) {
            progressBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth * progress);
            progressBar.setAttribute('position', 
                `${-VR_UI_CONFIG.seekBarWidth / 2 + (VR_UI_CONFIG.seekBarWidth * progress) / 2} 0 0.01`
            );
        }
        
        if (timeText) {
            timeText.setAttribute('value', 
                `${formatTime(currentTime)} / ${formatTime(duration)}`
            );
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function moveScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.5;
    
    switch(direction) {
        case 'up':
            screenPosition.y += step;
            break;
        case 'down':
            screenPosition.y -= step;
            break;
        case 'left':
            screenPosition.x -= step;
            break;
        case 'right':
            screenPosition.x += step;
            break;
        case 'forward':
            screenPosition.z += step;
            break;
        case 'backward':
            screenPosition.z -= step;
            break;
        case 'reset':
            screenPosition = { x: 0, y: 2, z: -10 };
            break;
    }
    
    screen.setAttribute('position', 
        `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`
    );
    
    console.log('✓ Ekran pozisyonu:', screenPosition);
}

console.log('✓ VR UI Panel sistemi yüklendi');




// ============================================
// YOUTUBE & GOOGLE DRIVE API SİSTEMİ
// ============================================

// YouTube Video Bilgisi Al
async function getYouTubeVideoInfo(videoId) {
    if (API_KEYS.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        console.warn('⚠️ YouTube API Key girilmemiş, direkt embed kullanılacak');
        return null;
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?` +
            `part=snippet,contentDetails&id=${videoId}&key=${API_KEYS.YOUTUBE_API_KEY}`
        );
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            return {
                title: video.snippet.title,
                duration: parseYouTubeDuration(video.contentDetails.duration),
                thumbnail: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle
            };
        }
        
        return null;
    } catch (error) {
        console.error('❌ YouTube API hatası:', error);
        return null;
    }
}

function parseYouTubeDuration(duration) {
    // PT1H2M10S formatını parse et
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

// YouTube Search
async function searchYouTube(query, maxResults = 10) {
    if (API_KEYS.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        alert('⚠️ YouTube API Key girilmemiş! 1-config.js dosyasından API key ekleyin.');
        return [];
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${API_KEYS.YOUTUBE_API_KEY}`
        );
        
        const data = await response.json();
        
        if (data.items) {
            return data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ YouTube Search hatası:', error);
        return [];
    }
}

// Google Drive File Info
async function getGoogleDriveFileInfo(fileId) {
    if (API_KEYS.GOOGLE_DRIVE_API_KEY === 'YOUR_GOOGLE_DRIVE_API_KEY_HERE') {
        console.warn('⚠️ Google Drive API Key girilmemiş, direkt link kullanılacak');
        return null;
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?` +
            `fields=name,mimeType,size,thumbnailLink&key=${API_KEYS.GOOGLE_DRIVE_API_KEY}`
        );
        
        const data = await response.json();
        
        return {
            name: data.name,
            mimeType: data.mimeType,
            size: data.size,
            thumbnail: data.thumbnailLink
        };
    } catch (error) {
        console.error('❌ Google Drive API hatası:', error);
        return null;
    }
}

// Google Drive Video Stream URL
function getGoogleDriveStreamUrl(fileId) {
    // Direkt stream için API key gerekmiyor
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Video URL İşleme (YouTube & Google Drive desteği ile)
async function processVideoUrl(url) {
    // YouTube
    const youtubeMatch = url.match(/(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (youtubeMatch) {
        const videoId = youtubeMatch[3];
        const info = await getYouTubeVideoInfo(videoId);
        
        return {
            type: 'youtube',
            videoId: videoId,
            url: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1`,
            info: info
        };
    }
    
    // Google Drive
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        const fileId = driveMatch[1];
        const info = await getGoogleDriveFileInfo(fileId);
        
        return {
            type: 'googledrive',
            fileId: fileId,
            url: getGoogleDriveStreamUrl(fileId),
            previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
            info: info
        };
    }
    
    // Direkt video link
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
        return {
            type: 'direct',
            url: url,
            format: extension
        };
    }
    
    return {
        type: 'unknown',
        url: url
    };
}

// YouTube Search UI
function showYouTubeSearchModal() {
    const query = prompt('🔍 YouTube\'da ara:');
    if (!query) return;
    
    searchYouTube(query).then(results => {
        if (results.length === 0) {
            alert('❌ Sonuç bulunamadı!');
            return;
        }
        
        let html = '<h2>🔍 YouTube Arama Sonuçları</h2><div style="max-height: 400px; overflow-y: auto;">';
        
        results.forEach(video => {
            html += `
                <div class="youtube-result" style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer;" 
                     onclick="selectYouTubeVideo('${video.url}')">
                    <img src="${video.thumbnail}" style="width: 120px; float: left; margin-right: 10px;">
                    <strong>${escapeHtml(video.title)}</strong><br>
                    <small>${escapeHtml(video.channelTitle)}</small>
                </div>
            `;
        });
        
        html += '</div><br><button onclick="showMainMenu()">◀ Geri</button>';
        
        document.getElementById('ui-overlay').classList.remove('hidden');
        document.querySelector('.ui-container').innerHTML = html;
    });
}

function selectYouTubeVideo(url) {
    document.getElementById('video-url-input').value = url;
    document.getElementById('create-room').style.display = 'block';
    document.getElementById('ui-overlay').querySelector('.ui-container').innerHTML = '';
    showCreateRoom();
}

console.log('✓ YouTube & Google Drive API sistemi yüklendi');




// ============================================
// BAŞLATMA VE İNİTİALİZATİON - ULTIMATE VERSİYON
// ============================================

// Konsol logları
console.log('🎬 VR Sosyal Sinema - Ultimate Versiyon v4.0');
console.log('📍 Yeni Özellikler:');
console.log('   ✅ Çok formatlı video desteği (mp4, webm, ogg, mkv, avi, vb.)');
console.log('   ✅ Altyazı desteği (SRT, VTT, ASS, SSA)');
console.log('   ✅ VR\'da sol tarafta kontrol paneli');
console.log('   ✅ Ekranı hareket ettirme butonları');
console.log('   ✅ VR\'da seek bar ve video kontrolleri');
console.log('   ✅ YouTube API entegrasyonu');
console.log('   ✅ Google Drive video desteği');
console.log('⚙️ Özellikler:');
console.log('   • 5 Hafif Sinema Ortamı');
console.log('   • Oda Sahipliği Transferi');
console.log('   • 3 Saniye Tam Senkronizasyon');
console.log('   • Kontrol Modu Seçimi');
console.log('   • Şifreli Oda Desteği');
console.log('Firebase:', firebase.app().name ? 'Bağlı ✓' : 'Bağlı Değil ✗');

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ DOM yüklendi');
    
    // UI elementlerini al
    uiOverlay = document.getElementById('ui-overlay');
    vrControls = document.getElementById('vr-controls');
    roomInfoDisplay = document.getElementById('room-info-display');
    
    // A-Frame sahne yüklendiğinde
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', () => {
            console.log('✓ VR sahnesi yüklendi');
        });
        
        scene.addEventListener('enter-vr', () => {
            console.log('✓ VR moduna girildi');
            hideVRControls();
            // VR UI Panel zaten görünür
        });
        
        scene.addEventListener('exit-vr', () => {
            console.log('✓ VR modundan çıkıldı');
            if (currentRoomId) {
                showVRControls();
            }
        });
    }
    
    // Oda listesini yükle
    const roomsListElement = document.getElementById('rooms-list');
    if (roomsListElement) {
        listRooms();
        console.log('✓ Manuel refresh aktif');
    }
    
    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
        if (!currentRoomId || !videoElement) return;
        
        // Space: Oynat/Duraklat
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            togglePlayPause();
        }
        
        // Arrow keys: İleri/Geri
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            seekVideo(10);
        }
        
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            seekVideo(-10);
        }
        
        // Arrow Up/Down: Ekran yukarı/aşağı
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            moveScreen('up');
        }
        
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            moveScreen('down');
        }
        
        // WASD: Ekran hareketi
        if (e.code === 'KeyW') moveScreen('up');
        if (e.code === 'KeyS') moveScreen('down');
        if (e.code === 'KeyA') moveScreen('left');
        if (e.code === 'KeyD') moveScreen('right');
        if (e.code === 'KeyQ') moveScreen('backward');
        if (e.code === 'KeyE') moveScreen('forward');
        
        // R: Ekran pozisyonu sıfırla
        if (e.code === 'KeyR') {
            moveScreen('reset');
        }
        
        // M: Sessiz
        if (e.code === 'KeyM') {
            e.preventDefault();
            videoElement.muted = !videoElement.muted;
            console.log('🔇 Sessiz:', videoElement.muted);
        }
        
        // F: Tam ekran
        if (e.code === 'KeyF') {
            e.preventDefault();
            const sceneEl = document.querySelector('a-scene');
            if (sceneEl) {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    sceneEl.requestFullscreen();
                }
            }
        }
        
        // C: Altyazı aç/kapa
        if (e.code === 'KeyC') {
            e.preventDefault();
            if (subtitleElement) {
                const isVisible = subtitleElement.getAttribute('visible') === 'true';
                subtitleElement.setAttribute('visible', !isVisible);
                console.log('📝 Altyazı:', !isVisible ? 'Açık' : 'Kapalı');
            }
        }
    });
    
    console.log('✓ Tüm event listener\'lar kuruldu');
    console.log('🎮 Klavye Kısayolları:');
    console.log('   Space: Oynat/Duraklat');
    console.log('   ←/→: 10sn Geri/İleri');
    console.log('   ↑/↓ veya W/S: Ekran Yukarı/Aşağı');
    console.log('   A/D: Ekran Sol/Sağ');
    console.log('   Q/E: Ekran İleri/Geri');
    console.log('   R: Ekran Pozisyonu Sıfırla');
    console.log('   C: Altyazı Aç/Kapa');
    console.log('   M: Sessiz');
    console.log('   F: Tam Ekran');
});

// Sayfa kapatılmadan önce
window.addEventListener('beforeunload', () => {
    if (viewerPresenceRef) {
        viewerPresenceRef.off();
    }
    
    if (roomRef) {
        roomRef.off();
    }
    
    // Video elementi temizle
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
    }
    
    // Altyazı temizle
    removeSubtitle();
    
    console.log('👋 Bağlantı kesiliyor...');
});

// Hata yakalama
window.addEventListener('error', (e) => {
    console.error('❌ Global hata:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise hatası:', e.reason);
});

console.log('✓ Uygulama başlatıldı - Ultimate Versiyon - Hazır! 🚀');





