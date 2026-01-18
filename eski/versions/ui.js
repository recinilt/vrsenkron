// ============================================
// UI & ODA YÖNETİMİ - OPTİMİZE EDİLMİŞ
// Listener Cleanup + Debug Mode
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
    const videoUrl = document.getElementById('video-url-input').value.trim();
    const subtitleUrl = document.getElementById('subtitle-url-input').value.trim();
    const environment = document.getElementById('environment-select').value;
    const screenSize = document.getElementById('screen-size').value;
    const isPrivate = document.getElementById('private-room').checked;
    const roomPassword = document.getElementById('room-password').value.trim();
    const controlMode = document.querySelector('input[name="control-mode"]:checked').value;
    
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
            joinRoom(newRoomRef.key, roomPassword);
        });
    });
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
            list.innerHTML = '<div class="room-item">Açık oda yok</div>';
            return;
        }
        
        let count = 0;
        Object.entries(rooms).forEach(([rid, room]) => {
            if (room.isPrivate) return;
            count++;
            
            const div = document.createElement('div');
            div.className = 'room-item';
            div.onclick = () => joinRoom(rid);
            div.innerHTML = `
                <strong>${escapeHtml(room.name)}</strong><br>
                <small>👥 ${room.viewers || 0} izleyici</small>
            `;
            list.appendChild(div);
        });
        
        if (count === 0) {
            list.innerHTML = '<div class="room-item">Açık oda yok</div>';
        }
    });
}

// ============================================
// VİDEO KURULUM
// ============================================
function setupVideo(videoUrl, screenSize) {
    const url = getVideoUrl(videoUrl);
    if (!url) {
        alert('❌ Video URL hatası!');
        return;
    }
    
    setupVideoTexture(url, screenSize);
    
    const scene = document.querySelector('a-scene');
    const env = scene.querySelector('[environment]');
    if (env) {
        env.setAttribute('environment', {
            preset: currentEnvironment,
            lighting: 'distant'
        });
    }
}

function setupVideoTexture(videoUrl, screenSize) {
    const scene = document.querySelector('a-scene');
    const screen = document.getElementById('video-screen');
    
    const sizes = {
        'flat': { width: 16, height: 9 },
        '360': { width: 100, height: 100 },
        '180': { width: 50, height: 50 }
    };
    const size = sizes[screenSize] || sizes['flat'];
    
    if (screenSize === '360') {
        screen.setAttribute('geometry', 'primitive: sphere; radius: 50');
        screen.setAttribute('material', 'side: back');
        screen.setAttribute('scale', '-1 1 1');
    } else if (screenSize === '180') {
        screen.setAttribute('geometry', 'primitive: sphere; radius: 25; thetaLength: 180');
        screen.setAttribute('material', 'side: back');
        screen.setAttribute('scale', '-1 1 1');
    } else {
        screen.setAttribute('geometry', `primitive: plane; width: ${size.width}; height: ${size.height}`);
        screen.removeAttribute('scale');
    }
    
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }
    
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = '';
        oldVideo.remove();
    }
    
    const video = document.createElement('video');
    video.id = 'video-src';
    video.crossOrigin = 'anonymous';
    video.preload = 'metadata';
    video.loop = false;
    video.playsInline = true;
    video.muted = false;
    assets.appendChild(video);
    
    videoElement = video;
    
    videoElement.addEventListener('loadedmetadata', () => {
        debugLog('✅ Metadata:', videoElement.duration.toFixed(1), 's');
    });
    
    videoElement.addEventListener('canplay', () => {
        debugLog('✅ Oynatmaya hazır');
        screen.setAttribute('visible', 'true');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('❌ Video hatası:', e);
        alert('❌ Video yüklenemedi!');
    });
    
    videoElement.src = videoUrl;
    videoElement.load();
    screen.setAttribute('src', '#video-src');
}

// ============================================
// ALTYAZI
// ============================================
function loadSubtitle(url) {
    if (!url) return;
    
    fetch(url)
        .then(r => r.text())
        .then(text => {
            subtitleData = parseSRT(text);
            debugLog('✅ Altyazı:', subtitleData.length, 'satır');
            startSubtitleUpdate();
        })
        .catch(err => {
            console.warn('⚠️ Altyazı hatası:', err);
        });
}

function parseSRT(srt) {
    const subs = [];
    const blocks = srt.trim().split(/\n\s*\n/);
    
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
        subtitleElement.setAttribute('width', 20);
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

debugLog('✅ UI yüklendi - Optimize Edilmiş Versiyon');
