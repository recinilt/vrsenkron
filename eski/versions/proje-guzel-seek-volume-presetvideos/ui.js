// ============================================
// UI & ODA YÖNETİMİ - OPTİMİZE EDİLMİŞ V2
// Video Library + Dropdown Desteği
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
    if (!currentRoomData) return;

    const rn = document.getElementById('room-name');
    const vc = document.getElementById('viewers-count');
    const cm = document.getElementById('control-mode');

    if (rn) rn.textContent = currentRoomData.name;
    if (vc) vc.textContent = currentRoomData.viewers || 0;
    if (cm) cm.textContent = currentRoomData.controlMode === 'owner' ? 'Sadece Sahip' : 'Herkes';
}, 3000);

// ============================================
// VİDEO KÜTÜPHANESİ YÖNETİMİ (YENİ)
// ============================================

async function loadVideoLibrary() {
    try {
        const snapshot = await videoLibraryRef.once('value');
        const libraryData = snapshot.val();
        
        let videoList = [...DEFAULT_VIDEO_LIBRARY];
        
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
        populateVideoSelect(DEFAULT_VIDEO_LIBRARY);
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

    for (const [service, config] of Object.entries(VIDEO_SERVICES)) {
        if (config.pattern.test(url)) return service;
    }

    return 'direct';
}

function getVideoUrl(inputUrl) {
    if (!inputUrl) return null;

    const service = detectVideoService(inputUrl);

    if (service === 'direct') return inputUrl;

    if (VIDEO_SERVICES[service]) {
        const config = VIDEO_SERVICES[service];
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
            viewers: 1,
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
        
        // Dosya adından .mp4 vb. uzantıyı kaldır
        return decodeURIComponent(filename.replace(/\.(mp4|webm|ogg|mov|mkv|m3u8|ts)$/i, ''));
    } catch {
        return null;
    }
}

function joinRoom(roomId, password = null) {
    // Eski odadan çık
    if (currentRoomId && currentRoomId !== roomId) {
        leaveRoom();
    }

    roomsRef.child(roomId).once('value').then((snapshot) => {
        const room = snapshot.val();

        if (!room) {
            alert('⚠️ Oda bulunamadı!');
            return;
        }

        if (room.isPrivate && room.password !== password) {
            const pw = prompt('🔒 Şifre:');
            if (pw !== room.password) {
                alert('❌ Yanlış şifre!');
                return;
            }
        }

        auth.signInAnonymously().then(() => {
            const userId = auth.currentUser.uid;

            currentRoomId = roomId;
            currentRoomData = room;
            roomRef = roomsRef.child(roomId);
            isRoomOwner = (room.owner === userId);

            if (room.password) roomRef.child('password').remove();

            roomRef.child('viewers').transaction((c) => (c || 0) + 1);

            // Presence listener'ı sakla
            if (presenceListener) presenceListener.off();
            presenceListener = database.ref('.info/connected');
            presenceListener.on('value', (snap) => {
                if (snap.val()) {
                    const myPresence = roomRef.child('activeViewers').child(userId);
                    myPresence.onDisconnect().remove();
                    myPresence.set({
                        timestamp: Date.now(),
                        isOwner: isRoomOwner,
                        currentDrift: 0,
                        playbackRate: 1.0
                    });

                    roomRef.child('viewers').onDisconnect().set(firebase.database.ServerValue.increment(-1));

                    if (isRoomOwner) roomRef.child('owner').onDisconnect().remove();
                }
            });

            currentEnvironment = room.environment;

            setupVideo(room.videoUrl, room.screenSize);
            if (room.subtitleUrl) loadSubtitle(room.subtitleUrl);

            createVRUIPanel();

            document.getElementById('ui-overlay').classList.add('hidden');
            document.getElementById('vr-controls').classList.add('visible');
            document.getElementById('room-info-display').classList.add('visible');

            updateRoomInfoDisplay();

            if (typeof initHybridSync === 'function') initHybridSync();

            debugLog('✅ Odaya katıldı:', roomId, '| Sahip:', isRoomOwner);
        });
    });
}

function leaveRoom() {
    debugLog('🚪 Odadan çıkılıyor...');

    // Senkronizasyonu temizle
    if (typeof cleanupHybridSync === 'function') {
        cleanupHybridSync();
    }

    // Presence listener'ı kapat
    if (presenceListener) {
        presenceListener.off();
        presenceListener = null;
    }

    // Firebase presence temizliği
    if (auth.currentUser && roomRef) {
        const userId = auth.currentUser.uid;
        roomRef.child(`activeViewers/${userId}`).remove();
        roomRef.child('viewers').transaction((c) => Math.max(0, (c || 1) - 1));
    }

    // Seek bar interval'ı temizle
    if (seekBarUpdateInterval) {
        clearInterval(seekBarUpdateInterval);
        seekBarUpdateInterval = null;
    }

    // Video durdur ve temizle
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
        videoElement = null;
    }

    // Altyazı temizle
    if (subtitleElement) {
        subtitleElement.remove();
        subtitleElement = null;
    }
    subtitleData = null;

    // UI'ı sıfırla
    document.getElementById('ui-overlay').classList.remove('hidden');
    document.getElementById('vr-controls').classList.remove('visible');
    document.getElementById('room-info-display').classList.remove('visible');

    // Referansları sıfırla
    currentRoomId = null;
    currentRoomData = null;
    roomRef = null;
    isRoomOwner = false;

    debugLog('✅ Odadan çıkıldı');
}

function listRooms() {
    roomsRef.once('value').then((snapshot) => {
        const rooms = snapshot.val();
        const list = document.getElementById('rooms-list');

        list.innerHTML = '';

        if (!rooms) {
            list.innerHTML = '<div class="loading">🏠 Henüz aktif oda yok</div>';
            return;
        }

        Object.entries(rooms).forEach(([id, room]) => {
            const item = document.createElement('div');
            item.className = 'room-item';

            const name = document.createElement('div');
            name.className = 'room-name';
            name.textContent = `${room.isPrivate ? '🔒' : '🏠'} ${escapeHtml(room.name)}`;

            const info = document.createElement('div');
            info.className = 'room-info';
            info.textContent = `👥 ${room.viewers || 0} kişi | 🎬 ${ENVIRONMENTS[room.environment]?.name || 'Klasik'}`;

            item.appendChild(name);
            item.appendChild(info);

            item.addEventListener('click', () => {
                if (room.isPrivate) {
                    const pw = prompt('🔒 Oda şifresi:');
                    joinRoom(id, pw);
                } else {
                    joinRoom(id);
                }
            });

            list.appendChild(item);
        });
    });
}

// ============================================
// VİDEO KURULUM (EKSİK OLAN FONKSİYON!)
// ============================================

function setupVideo(videoUrl, screenSize) {
    const url = getVideoUrl(videoUrl);
    if (!url) {
        alert('⚠️ Video URL hatası!');
        return;
    }

    setupVideoTexture(url, screenSize);

    // Ortam ayarla
    const scene = document.querySelector('a-scene');
    const env = scene.querySelector('[environment]');
    if (env) {
        env.setAttribute('environment', { preset: currentEnvironment, lighting: 'distant' });
    }
}

function setupVideoTexture(videoUrl, screenSize) {
    const scene = document.querySelector('a-scene');
    let screen = document.getElementById('video-screen');

    // Ekran yoksa oluştur
    if (!screen) {
        screen = document.createElement('a-video');
        screen.setAttribute('id', 'video-screen');
        screen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
        screen.setAttribute('visible', 'false');
        scene.appendChild(screen);
    }

    // Boyut ayarları
    const sizes = {
        small: { width: 8, height: 4.5 },
        medium: { width: 16, height: 9 },
        large: { width: 24, height: 13.5 },
        huge: { width: 32, height: 18 },
        flat: { width: 16, height: 9 },
        '360': { width: 100, height: 100 },
        '180': { width: 50, height: 50 }
    };

    const size = sizes[screenSize] || sizes['medium'];

    // Geometry ayarla
    if (screenSize === '360') {
        screen.setAttribute('geometry', { primitive: 'sphere', radius: 50 });
        screen.setAttribute('material', { side: 'back' });
        screen.setAttribute('scale', '-1 1 1');
    } else if (screenSize === '180') {
        screen.setAttribute('geometry', { primitive: 'sphere', radius: 25, thetaLength: 180 });
        screen.setAttribute('material', { side: 'back' });
        screen.setAttribute('scale', '-1 1 1');
    } else {
        screen.setAttribute('geometry', { primitive: 'plane', width: size.width, height: size.height });
        screen.removeAttribute('scale');
    }

    // Assets oluştur
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }

    // Eski video elementini temizle
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = '';
        oldVideo.remove();
    }

    // Yeni video elementi oluştur
    const video = document.createElement('video');
    video.id = 'video-src';
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.loop = false;
    video.playsInline = true;
    video.muted = false;
    assets.appendChild(video);

    videoElement = video;

    // Video event listeners
    videoElement.addEventListener('loadedmetadata', () => {
        debugLog('📹 Metadata:', videoElement.duration.toFixed(1), 's');
    });

    videoElement.addEventListener('canplay', () => {
        debugLog('✅ Oynatmaya hazır');
        screen.setAttribute('visible', 'true');
    });

    videoElement.addEventListener('error', (e) => {
        console.error('❌ Video hatası:', e);
        alert('⚠️ Video yüklenemedi!');
    });

    // Video kaynağını ayarla
    videoElement.src = videoUrl;
    videoElement.load();

    // Ekrana video texture'ını bağla
    screen.setAttribute('src', '#video-src');

    debugLog('🎬 Video kuruldu:', videoUrl);
}

// ============================================
// ALTYAZI (EKSİK OLAN FONKSİYON!)
// ============================================

function loadSubtitle(url) {
    if (!url) return;

    fetch(url)
        .then(r => r.text())
        .then(text => {
            subtitleData = parseSRT(text);
            debugLog('📝 Altyazı:', subtitleData.length, 'satır');
            startSubtitleUpdate();
        })
        .catch(err => {
            console.warn('⚠️ Altyazı hatası:', err);
        });
}

function parseSRT(srt) {
    const subs = [];
    const blocks = srt.trim().split('\n\n');

    blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const time = lines[1];
            const match = time.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);

            if (match) {
                const start = parseFloat(match[1]) * 3600 + parseFloat(match[2]) * 60 + parseFloat(match[3]) + parseFloat(match[4]) / 1000;
                const end = parseFloat(match[5]) * 3600 + parseFloat(match[6]) * 60 + parseFloat(match[7]) + parseFloat(match[8]) / 1000;

                subs.push({
                    start,
                    end,
                    text: lines.slice(2).join('\n')
                });
            }
        }
    });

    return subs;
}

function startSubtitleUpdate() {
    if (!subtitleElement) {
        const scene = document.querySelector('a-scene');
        subtitleElement = document.createElement('a-text');
        subtitleElement.setAttribute('id', 'subtitle');
        subtitleElement.setAttribute('value', '');
        subtitleElement.setAttribute('align', 'center');
        subtitleElement.setAttribute('width', '20');
        subtitleElement.setAttribute('position', '0 -3 -10');
        subtitleElement.setAttribute('color', '#FFF');
        subtitleElement.setAttribute('visible', 'false');
        scene.appendChild(subtitleElement);
    }

    // Subtitle update interval (100ms yeterli)
    setInterval(() => {
        if (!videoElement || !subtitleData) return;

        const t = videoElement.currentTime;
        const sub = subtitleData.find(s => t >= s.start && t <= s.end);

        if (sub) {
            subtitleElement.setAttribute('value', sub.text);
            subtitleElement.setAttribute('visible', 'true');
        } else {
            subtitleElement.setAttribute('visible', 'false');
        }
    }, 100);
}

// ============================================
// SAYFA YÜKLENİNCE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    debugLog('🚀 UI Yüklendi');
    
    // Video kütüphanesini yükle
    loadVideoLibrary();
    
    // Video library dropdown değişimini dinle
    const videoLibrarySelect = document.getElementById('video-library-select');
    if (videoLibrarySelect) {
        videoLibrarySelect.addEventListener('change', (e) => {
            const videoUrlInput = document.getElementById('video-url-input');
            if (videoUrlInput && e.target.value) {
                videoUrlInput.value = e.target.value;
                videoUrlInput.disabled = true;
            } else if (videoUrlInput) {
                videoUrlInput.disabled = false;
            }
        });
    }
});

debugLog('✅ UI yüklendi - Video Library Desteği V2 (Eksiksiz)');
