// ============================================
// UI & ODA YÖNETİMİ - OPTİMİZE EDİLMİŞ V4
// Video Library + Preload + Owner Presence + Viewers Fix
// ============================================

function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showSyncStatus(msg) {
    const el = document.getElementById('sync-status');
    if (el) {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    }
}

const updateRoomInfoDisplay = throttle(function() {
    if (!currentRoomData || !roomRef) return;
    
    const rn = document.getElementById('room-name');
    const vc = document.getElementById('viewers-count');
    const cm = document.getElementById('control-mode');
    
    if (rn) rn.textContent = currentRoomData.name;
    
    // ✅ YENİ: activeViewers node'undan count al
    if (vc) {
        roomRef.child('activeViewers').once('value', (snapshot) => {
            vc.textContent = snapshot.numChildren();
        });
    }
    
    if (cm) cm.textContent = currentRoomData.controlMode === 'owner' ? 'Sadece Sahip' : 'Herkes';
}, 3000);

// ============================================
// VİDEO KÜTÜPHANESİ YÖNETİMİ
// ============================================

async function loadVideoLibrary() {
    try {
        const snapshot = await videoLibraryRef.once('value');
        const libraryData = snapshot.val();
        let videoList = [...DEFAULTVIDEOLIBRARY];
        
        // Firebase'den linkleri ekle
        if (libraryData) {
            Object.values(libraryData).forEach(item => {
                if (item.url && item.title) {
                    videoList.push(item);
                }
            });
        }
        
        populateVideoSelect(videoList);
        debugLog('📚 Video kütüphanesi yüklendi:', videoList.length, 'video');
    } catch (error) {
        console.warn('⚠️ Video kütüphanesi yüklenemedi, sadece varsayılan linkler kullanılacak');
        populateVideoSelect(DEFAULTVIDEOLIBRARY);
    }
}

function populateVideoSelect(videoList) {
    const select = document.getElementById('video-library-select');
    if (!select) return;
    
    select.innerHTML = '<option value="">-- Film Seç veya Manuel Gir --</option>';
    videoList.forEach((video, index) => {
        const option = document.createElement('option');
        option.value = video.url;
        option.textContent = video.title;
        select.appendChild(option);
    });
}

async function saveVideoToLibrary(url, title) {
    try {
        // Aynı URL zaten var mı kontrol et
        const snapshot = await videoLibraryRef.orderByChild('url').equalTo(url).once('value');
        if (snapshot.exists()) {
            debugLog('📚 Video zaten kütüphanede mevcut');
            return;
        }
        
        // Yeni video ekle
        await videoLibraryRef.push({
            url: url,
            title: title,
            addedAt: Date.now()
        });
        
        debugLog('✅ Video kütüphaneye eklendi:', title);
        
        // Dropdown'u güncelle
        loadVideoLibrary();
    } catch (error) {
        console.warn('⚠️ Video kütüphaneye eklenemedi:', error);
    }
}

// ============================================
// VIDEO ALGILAMA
// ============================================

function detectVideoService(url) {
    if (!url) return 'unknown';
    
    for (const [service, config] of Object.entries(VIDEOSERVICES)) {
        if (config.pattern.test(url)) return service;
    }
    
    return 'direct';
}

function getVideoUrl(inputUrl) {
    if (!inputUrl) return null;
    
    const service = detectVideoService(inputUrl);
    if (service === 'direct') return inputUrl;
    
    if (VIDEOSERVICES[service]) {
        const config = VIDEOSERVICES[service];
        const match = inputUrl.match(config.pattern);
        if (match) return config.transform(match.input || inputUrl);
    }
    
    return inputUrl;
}

// ============================================
// ODA YÖNETİMİ
// ============================================

function createRoom() {
    const roomName = document.getElementById('room-name-input').value.trim();
    const videoUrlInput = document.getElementById('video-url-input').value.trim();
    const subtitleUrl = document.getElementById('subtitle-url-input').value.trim();
    const environment = document.getElementById('environment-select').value;
    const screenSize = document.getElementById('screen-size').value;
    const isPrivate = document.getElementById('private-room').checked;
    const roomPassword = document.getElementById('room-password').value.trim();
    const controlMode = document.querySelector('input[name="control-mode"]:checked').value;
    
    // Film seçimi kontrolü (dropdown veya manuel input)
    const videoLibrarySelect = document.getElementById('video-library-select');
    const selectedFromLibrary = videoLibrarySelect ? videoLibrarySelect.value : '';
    const videoUrl = selectedFromLibrary || videoUrlInput;
    
    if (!roomName || !videoUrl) {
        alert('⚠️ Oda adı ve video URL gerekli!');
        return;
    }
    
    auth.signInAnonymously().then(() => {
        const userId = auth.currentUser.uid;
        const newRoomRef = roomsRef.push();
        
        const roomData = {
            name: roomName,
            videoUrl: videoUrl,
            subtitleUrl: subtitleUrl || null,
            environment: environment,
            screenSize: screenSize,
            owner: userId,
            isPrivate: isPrivate,
            password: isPrivate ? roomPassword : null,
            controlMode: controlMode,
            createdAt: Date.now(),
            videoState: {
                isPlaying: false,
                currentTime: 0,
                startTimestamp: null,
                lastUpdate: Date.now()
            }
        };
        
        newRoomRef.set(roomData).then(() => {
            // Manuel girilen URL'yi kütüphaneye ekle (dropdown'dan seçilmediyse)
            if (videoUrlInput && !selectedFromLibrary) {
                const videoTitle = extractVideoTitle(videoUrl) || `Video - ${new Date().toLocaleDateString('tr-TR')}`;
                saveVideoToLibrary(videoUrl, videoTitle);
            }
            
            joinRoom(newRoomRef.key, roomPassword);
        });
    });
}

function extractVideoTitle(url) {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        const filename = pathParts[pathParts.length - 1];
        return decodeURIComponent(filename.replace(/\.(mp4|webm|ogg|mov|mkv|m3u8|ts)$/i, ''));
    } catch {
        return null;
    }
}

function showSection(sectionId) {
    ['lobby-section', 'room-section'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = (id === sectionId) ? 'block' : 'none';
    });
}

function updateRoomInfo(roomData) {
    if (!roomData) return;
    updateRoomInfoDisplay();
}

function updateRoomControls() {
    const controls = document.querySelectorAll('.video-controls button');
    const canControl = isRoomOwner || (currentRoomData && currentRoomData.controlMode === 'everyone');
    
    controls.forEach(btn => {
        if (canControl) {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    });
}

debugLog('🎬 UI Yüklendi');
