// ===========================
// 3D SAHNE OLUŞTURMA
// ===========================

async function create3DScene(roomData) {
    const scene = document.querySelector('a-scene');
    
    // Eski video ekranı temizle
    const oldScreen = document.getElementById('video-screen');
    if (oldScreen) oldScreen.remove();
    
    // Ortam ayarla
    let env = document.getElementById('environment');
    if (env) env.remove();
    
    if (roomData.environment && roomData.environment !== 'none') {
        env = document.createElement('a-entity');
        env.setAttribute('id', 'environment');
        env.setAttribute('environment', `preset: ${roomData.environment}`);
        scene.appendChild(env);
    }
    
    // Video ekranı oluştur
    const videoScreen = document.createElement('a-video');
    videoScreen.setAttribute('id', 'video-screen');
    videoScreen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
    
    // Ekran boyutu
    const sizes = {
        small: { width: 8, height: 4.5 },
        medium: { width: 12, height: 6.75 },
        large: { width: 16, height: 9 },
        huge: { width: 20, height: 11.25 }
    };
    
    const size = sizes[roomData.screenSize] || sizes.medium;
    videoScreen.setAttribute('width', size.width);
    videoScreen.setAttribute('height', size.height);
    
    // Video elementi oluştur
    videoElement = document.createElement('video');
    videoElement.setAttribute('id', 'video-player');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElement.setAttribute('playsinline', '');
    videoElement.src = roomData.videoUrl;
    videoElement.load();
    
    const assets = document.querySelector('a-assets') || document.createElement('a-assets');
    if (!document.querySelector('a-assets')) scene.appendChild(assets);
    assets.appendChild(videoElement);
    
    videoScreen.setAttribute('src', '#video-player');
    scene.appendChild(videoScreen);
    
    // Altyazı varsa yükle
    if (roomData.subtitleUrl) loadSubtitle(roomData.subtitleUrl);
    
    // VR UI panelini oluştur
    if (typeof createVRUIPanel === 'function') createVRUIPanel();
    
    if (DEBUGMODE) console.log('3D sahne oluşturuldu');
}

// ===========================
// ALTYAZI YÖNETİMİ
// ===========================

function loadSubtitle(url) {
    fetch(url)
        .then(res => res.text())
        .then(data => {
            subtitleData = parseSRT(data);
            updateSubtitle();
            if (DEBUGMODE) console.log('Altyazı yüklendi:', subtitleData.length, 'satır');
        })
        .catch(err => {
            if (DEBUGMODE) console.warn('Altyazı yüklenemedi:', err);
        });
}

function parseSRT(data) {
    const regex = /(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
    const subtitles = [];
    let match;
    
    while ((match = regex.exec(data)) !== null) {
        subtitles.push({
            start: srtTimeToSeconds(match[1]),
            end: srtTimeToSeconds(match[2]),
            text: match[3].trim()
        });
    }
    
    return subtitles;
}

function srtTimeToSeconds(time) {
    const parts = time.split(':');
    const seconds = parts[2].split(',');
    return (parseInt(parts[0]) * 3600) + (parseInt(parts[1]) * 60) + parseInt(seconds[0]) + (parseInt(seconds[1]) / 1000);
}

function updateSubtitle() {
    if (!videoElement || !subtitleData) return;
    
    const currentTime = videoElement.currentTime;
    const current = subtitleData.find(s => currentTime >= s.start && currentTime <= s.end);
    
    if (!subtitleElement) {
        subtitleElement = document.createElement('a-text');
        subtitleElement.setAttribute('id', 'subtitle');
        subtitleElement.setAttribute('position', '0 -2 -8');
        subtitleElement.setAttribute('align', 'center');
        subtitleElement.setAttribute('width', '10');
        subtitleElement.setAttribute('color', '#fff');
        subtitleElement.setAttribute('shader', 'msdf');
        document.querySelector('camera-rig').appendChild(subtitleElement);
    }
    
    subtitleElement.setAttribute('value', current ? current.text : '');
}

// ===========================
// OPTİMİZE EDİLMİŞ DRIFT TRACKING (2s → 5s)
// Keyframe içine drift bilgisi eklendi
// ===========================

function startDriftTracking() {
    if (driftUpdateInterval) clearInterval(driftUpdateInterval);
    
    // OPTİMİZASYON: 5 saniyede bir güncelle (2s → 5s)
    driftUpdateInterval = trackInterval(setInterval(() => {
        if (!videoElement || !roomRef || !auth.currentUser) return;
        
        // Video duruyorsa drift güncelleme
        if (videoElement.paused) {
            lastDrift = 0;
            lastPlaybackRate = 1.0;
            return;
        }
        
        const drift = calculateDrift();
        const rate = videoElement.playbackRate;
        
        // Sadece değişim varsa yaz (Firebase write azaltma)
        if (Math.abs(drift - lastDrift) > DRIFTTOLERANCEMS || Math.abs(rate - lastPlaybackRate) > DRIFTTOLERANCERATE) {
            roomRef.child('activeViewers').child(auth.currentUser.uid).update({
                currentDrift: Math.round(drift),
                playbackRate: rate,
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(err => {
                if (DEBUGMODE) console.warn('Drift güncelleme hatası:', err);
            });
            
            lastDrift = drift;
            lastPlaybackRate = rate;
            if (DEBUGMODE) console.log(`Drift: ${Math.round(drift)}ms, Rate: ${rate.toFixed(2)}x`);
        }
    }, DRIFTUPDATEINTERVAL)); // 5000ms (OPTİMİZE EDİLDİ)
}

function calculateDrift() {
    if (!videoElement || !currentRoomData || !currentRoomData.videoState) return 0;
    
    const state = currentRoomData.videoState;
    if (!state.isPlaying || !state.startTimestamp) return 0;
    
    const elapsed = (getServerTime() - state.startTimestamp) / 1000;
    const expectedTime = state.currentTime + elapsed;
    const actualTime = videoElement.currentTime;
    
    return (actualTime - expectedTime) * 1000; // ms cinsinden
}

// ===========================
// VİDEO KONTROL FONKSİYONLARI - V7 GÜNCELLENMİŞ
// Önceki timeout'ları iptal eder
// ===========================

// YENİ V6: Tüm bekleyen işlemleri iptal et
function cancelPendingOperations() {
    if (currentPlayTimeout) {
        clearTimeout(currentPlayTimeout);
        currentPlayTimeout = null;
    }
    
    if (currentPauseTimeout) {
        clearTimeout(currentPauseTimeout);
        currentPauseTimeout = null;
    }
    
    if (currentSeekTimeout) {
        clearTimeout(currentSeekTimeout);
        currentSeekTimeout = null;
    }
    
    stopPreloadWaiting(); // Preload işlemini de iptal et
    if (DEBUGMODE) console.log('⏹️ Önceki tüm işlemler iptal edildi');
}

// YENİ V6: Eski urgentUpdates kayıtlarını processed=true yap
async function markOldUpdatesAsProcessed() {
    if (!roomRef) return;
    
    try {
        const snapshot = await roomRef.child('urgentUpdates')
            .orderByChild('processed')
            .equalTo(false)
            .once('value');
        
        const updates = {};
        snapshot.forEach(child => {
            updates[child.key] = { processed: true };
        });
        
        if (Object.keys(updates).length > 0) {
            await roomRef.child('urgentUpdates').update(updates);
            if (DEBUGMODE) console.log(`✅ ${Object.keys(updates).length} eski kayıt işaretlendi`);
        }
    } catch (err) {
        if (DEBUGMODE) console.warn('Eski kayıtlar temizlenirken hata:', err);
    }
}

async function playVideo() {
    if (!videoElement) return;
    
    if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
        // V6: Önceki işlemleri iptal et
        cancelPendingOperations();
        
        // V6: Eski kayıtları temizle
        await markOldUpdatesAsProcessed();
        
        // V7 YENİ: 5 saniye sonrası için hesaplama
        const currentTime = videoElement.currentTime;
        const startTimestamp = getServerTime() + PLAY_BUFFER_TIME;
        const playTargetTime = currentTime + (PLAY_BUFFER_TIME / 1000);
        
        await roomRef.child('videoState').update({
            isPlaying: true,
            currentTime: currentTime,
            startTimestamp: startTimestamp,
            playTargetTime: playTargetTime,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        await roomRef.child('urgentUpdates').push({
            action: 'play',
            timestamp: getServerTime(),
            processed: false,
            currentTime: currentTime,
            startTimestamp: startTimestamp,
            playTargetTime: playTargetTime
        });
        
        showSyncStatus(`${PLAY_BUFFER_TIME / 1000} saniye sonra başlayacak...`);
        
        // V6: Timeout'u takip et
        currentPlayTimeout = setTimeout(() => {
            if (videoElement) {
                videoElement.play().catch(err => {
                    if (DEBUGMODE) console.warn('Play hatası:', err);
                });
            }
            currentPlayTimeout = null;
        }, PLAY_BUFFER_TIME);
        
    } else {
        requestVideoControl('play');
    }
}

async function pauseVideo() {
    if (!videoElement) return;
    
    if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
        // V6: Önceki işlemleri iptal et
        cancelPendingOperations();
        
        // V6: Eski kayıtları temizle
        await markOldUpdatesAsProcessed();
        
        // V7 YENİ: Position reporting başlat
        await roomRef.child('urgentUpdates').push({
            action: 'reportPosition',
            timestamp: getServerTime(),
            processed: false
        });
        
        // V7 YENİ: Kendimiz de pozisyonumuzu yazalım
        if (auth.currentUser) {
            await roomRef.child('activeViewers').child(auth.currentUser.uid).update({
                pausePosition: videoElement.currentTime,
                pauseReportTime: getServerTime()
            });
        }
        
        // V7 YENİ: Owner ise pozisyonları topla ve minimum bul
        if (isRoomOwner) {
            setTimeout(async () => {
                try {
                    const snapshot = await roomRef.child('activeViewers').once('value');
                    const viewers = snapshot.val();
                    
                    if (!viewers) return;
                    
                    // Tüm pozisyonları topla
                    const positions = [];
                    Object.values(viewers).forEach(viewer => {
                        if (viewer.pausePosition !== undefined) {
                            positions.push(viewer.pausePosition);
                        }
                    });
                    
                    if (positions.length === 0) {
                        positions.push(videoElement.currentTime);
                    }
                    
                    // Minimum pozisyonu bul
                    const minPosition = Math.min(...positions);
                    const seekTarget = Math.max(0, minPosition - PAUSE_REWIND_BUFFER);
                    
                    if (DEBUGMODE) console.log(`Pause sync: En geri=${minPosition.toFixed(1)}s, Hedef=${seekTarget.toFixed(1)}s`);
                    
                    // Pause komutu gönder
                    await roomRef.child('videoState').update({
                        isPlaying: false,
                        currentTime: seekTarget,
                        startTimestamp: null,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    await roomRef.child('urgentUpdates').push({
                        action: 'pause',
                        timestamp: getServerTime(),
                        processed: false,
                        currentTime: seekTarget
                    });
                    
                    // Kendi videomuzda da uygula
                    videoElement.currentTime = seekTarget;
                    videoElement.pause();
                    
                    // V7: Preload başlat (buffer dolsun)
                    startBufferPreload(seekTarget + PAUSE_REWIND_BUFFER);
                    
                } catch (err) {
                    if (DEBUGMODE) console.warn('Position toplama hatası:', err);
                }
            }, POSITION_REPORT_TIMEOUT);
        }
        
    } else {
        requestVideoControl('pause');
    }
}

async function stopVideo() {
    if (!videoElement) return;
    
    if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
        // V6: Önceki işlemleri iptal et
        cancelPendingOperations();
        
        // V6: Eski kayıtları temizle
        await markOldUpdatesAsProcessed();
        
        await roomRef.child('videoState').update({
            isPlaying: false,
            currentTime: 0,
            startTimestamp: null,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        await roomRef.child('urgentUpdates').push({
            action: 'seek',
            timestamp: getServerTime(),
            processed: false,
            currentTime: 0,
            shouldPlay: false
        });
        
        videoElement.pause();
        videoElement.currentTime = 0;
    } else {
        requestVideoControl('stop');
    }
}

async function seekVideo(seconds) {
    if (!videoElement) return;
    
    const newTime = Math.max(0, Math.min(videoElement.duration || 0, videoElement.currentTime + seconds));
    
    if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
        // V6: Önceki işlemleri iptal et
        cancelPendingOperations();
        
        // V6: Eski kayıtları temizle
        await markOldUpdatesAsProcessed();
        
        const wasPlaying = !videoElement.paused;
        
        await roomRef.child('videoState').update({
            currentTime: newTime,
            startTimestamp: wasPlaying ? getServerTime() : null,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        await roomRef.child('urgentUpdates').push({
            action: 'seek',
            timestamp: getServerTime(),
            processed: false,
            currentTime: newTime,
            shouldPlay: wasPlaying
        });
        
        videoElement.currentTime = newTime;
    } else {
        requestVideoControl('seek', { seconds });
    }
}

async function seekToPosition(percentage) {
    if (!videoElement || !videoElement.duration) return;
    
    const newTime = videoElement.duration * percentage;
    
    if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
        // V6: Önceki işlemleri iptal et
        cancelPendingOperations();
        
        // V6: Eski kayıtları temizle
        await markOldUpdatesAsProcessed();
        
        const wasPlaying = !videoElement.paused;
        
        await roomRef.child('videoState').update({
            currentTime: newTime,
            startTimestamp: wasPlaying ? getServerTime() : null,
            lastUpdate: firebase.database.ServerValue.TIMESTAMP
        });
        
        await roomRef.child('urgentUpdates').push({
            action: 'seek',
            timestamp: getServerTime(),
            processed: false,
            currentTime: newTime,
            shouldPlay: wasPlaying
        });
        
        videoElement.currentTime = newTime;
    } else {
        requestVideoControl('seek', { percentage });
    }
}

// ===========================
// V7 YENİ: BUFFER PRELOAD (PAUSE DURUMUNDA)
// ===========================
let bufferPreloadInterval = null;

function startBufferPreload(targetTime) {
    stopBufferPreload();
    
    if (!videoElement) return;
    
    if (DEBUGMODE) console.log(`Buffer preload başladı: ${targetTime.toFixed(1)}s hedef`);
    
    // Video pause ama buffer dolsun
    videoElement.pause();
    
    bufferPreloadInterval = setInterval(() => {
        if (!videoElement) {
            stopBufferPreload();
            return;
        }
        
        // Buffered range kontrolü
        if (videoElement.buffered.length > 0) {
            const bufferedEnd = videoElement.buffered.end(videoElement.buffered.length - 1);
            const bufferedAmount = bufferedEnd - videoElement.currentTime;
            
            if (DEBUGMODE && bufferedAmount > 0) {
                console.log(`Buffer: ${bufferedAmount.toFixed(1)}s yüklendi`);
            }
            
            // Yeterince buffer doldu mu?
            if (bufferedEnd >= targetTime) {
                if (DEBUGMODE) console.log('Buffer hedefine ulaştı');
                stopBufferPreload();
            }
        }
    }, 1000); // Her saniyede kontrol et
}

function stopBufferPreload() {
    if (bufferPreloadInterval) {
        clearInterval(bufferPreloadInterval);
        bufferPreloadInterval = null;
        if (DEBUGMODE) console.log('Buffer preload durduruldu');
    }
}

debugLog('✅ Core yüklendi - V5 OPTİMİZE (Drift 5s + Keyframe içinde drift)');
