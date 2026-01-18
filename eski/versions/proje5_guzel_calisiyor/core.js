// ============================================
// CORE - HİBRİT SENKRONİZASYON SİSTEMİ
// 5sn Senkron | 7sn Keyframe | Full Hibrit
// RESUME ve SEEK'te de 5sn gecikme aktif!
// ============================================

// CLOCK DRIFT COMPENSATION
function syncClock() {
    if (!roomRef) return;
    const t1 = Date.now();
    roomRef.child('serverTimestamp').set(firebase.database.ServerValue.TIMESTAMP);
    roomRef.child('serverTimestamp').once('value', (snap) => {
        const t4 = Date.now();
        const t2 = snap.val();
        const roundTrip = t4 - t1;
        const newOffset = (t2 + roundTrip / 2) - t4;
        clockOffset = clockOffset === 0 ? newOffset : (clockOffset * 0.7) + (newOffset * 0.3);
        clockSyncReady = true;
        console.log('⏰ Clock:', Math.round(clockOffset), 'ms');
    });
}

function getAdjustedTime() {
    return clockSyncReady ? Date.now() + clockOffset : Date.now();
}

// KEYFRAME SİSTEMİ (7sn)
function sendKeyframe() {
    if (!isRoomOwner || !videoElement || !roomRef) return;
    const kf = {
        timestamp: getAdjustedTime(),
        currentTime: videoElement.currentTime,
        isPlaying: !videoElement.paused,
        playbackRate: videoElement.playbackRate || 1,
        startTimestamp: !videoElement.paused ? getAdjustedTime() : null
    };
    roomRef.child('keyframes').child(Math.floor(kf.timestamp).toString()).set(kf);
    console.log('📸 Keyframe:', kf.currentTime.toFixed(1), 's');
}

function startKeyframeInterval() {
    if (keyframeInterval) clearInterval(keyframeInterval);
    if (isRoomOwner) {
        keyframeInterval = setInterval(sendKeyframe, KEYFRAME_INTERVAL);
        console.log('✓ Keyframe başlatıldı: 7sn');
        
        // Eski keyframe'leri temizle (5dk öncesi)
        setInterval(() => {
            const fiveMinutesAgo = Date.now() - 300000;
            roomRef.child('keyframes')
                .orderByChild('timestamp')
                .endAt(fiveMinutesAgo)
                .once('value', snap => {
                    snap.forEach(child => child.ref.remove());
                });
        }, 60000);
    }
}

function listenToKeyframes() {
    if (!roomRef) return;
    roomRef.child('keyframes').on('child_added', (snapshot) => {
        const kf = snapshot.val();
        if (!kf || !videoElement || kf.timestamp <= lastKeyframeTimestamp) return;
        
        const now = getAdjustedTime();
        
        if (kf.isPlaying && kf.startTimestamp) {
            const elapsed = (now - kf.startTimestamp) / 1000;
            const predicted = kf.currentTime + elapsed;
            const drift = Math.abs(videoElement.currentTime - predicted);
            
            if (drift < SMOOTH_THRESHOLD / 1000) {
                console.log('✅ Smooth:', drift.toFixed(2), 's');
                lastKeyframeTimestamp = kf.timestamp;
                return;
            }
            
            videoElement.currentTime = predicted;
            console.log('🔄 Predictive:', predicted.toFixed(1), 's');
        }
        
        if (kf.isPlaying && videoElement.paused) {
            videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
        } else if (!kf.isPlaying && !videoElement.paused) {
            videoElement.pause();
        }
        
        lastKeyframeTimestamp = kf.timestamp;
    });
    console.log('✓ Keyframe listener aktif');
}

// URGENT UPDATE SİSTEMİ
function sendUrgentUpdate(action, params) {
    if (!roomRef) return;
    const ref = roomRef.child('urgentUpdates').push();
    ref.set({
        action: action,
        timestamp: getAdjustedTime(),
        ...params,
        processed: false
    });
    console.log('⚡ Urgent:', action);
}

function listenToUrgentUpdates() {
    if (!roomRef) return;
    roomRef.child('urgentUpdates').on('child_added', (snapshot) => {
        const upd = snapshot.val();
        if (!upd || !videoElement || upd.processed) return;
        snapshot.ref.update({ processed: true });
        handleUrgentUpdate(upd);
        setTimeout(() => snapshot.ref.remove(), 10000);
    });
    console.log('✓ Urgent listener aktif');
}

function handleUrgentUpdate(upd) {
    const now = getAdjustedTime();
    
    if (upd.action === 'play' && upd.startTimestamp) {
        const wait = upd.startTimestamp - now;
        videoElement.currentTime = upd.currentTime;
        
        if (wait > 0) {
            videoElement.pause();
            if (syncTimeout) clearTimeout(syncTimeout);
            syncTimeout = setTimeout(() => {
                videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
            }, wait);
            console.log('⏱️', (wait / 1000).toFixed(1), 'sn sonra başlıyor');
            showSyncStatus('⏱️ ' + (wait / 1000).toFixed(1) + 'sn sonra başlıyor');
        } else {
            videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
        }
    } else if (upd.action === 'pause') {
        videoElement.pause();
        if (upd.currentTime !== undefined) videoElement.currentTime = upd.currentTime;
        console.log('⏸️ Durduruldu (urgent)');
    } else if (upd.action === 'seek') {
        videoElement.currentTime = upd.currentTime;
        if (upd.shouldPlay && upd.startTimestamp) {
            const wait = upd.startTimestamp - now;
            if (wait > 0) {
                videoElement.pause();
                if (syncTimeout) clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
                }, wait);
                console.log('⏱️ Seek sonrası', (wait / 1000).toFixed(1), 'sn sonra başlıyor');
                showSyncStatus('⏱️ ' + (wait / 1000).toFixed(1) + 'sn sonra başlıyor');
            } else {
                videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
            }
        }
        console.log('⏩ Seek (urgent):', upd.currentTime.toFixed(1), 's');
    }
}

// REQUEST SİSTEMİ (Demokratik Kontrol)
function sendControlRequest(action, params = {}) {
    if (!roomRef || !auth.currentUser) return;
    roomRef.child('requests').push().set({
        userId: auth.currentUser.uid,
        action: action,
        params: params,
        timestamp: Date.now(),
        processed: false
    });
    console.log('📨 İstek:', action);
}

function listenToControlRequests() {
    if (!isRoomOwner || !roomRef) return;
    console.log('👑 İstek dinleniyor...');
    roomRef.child('requests').on('child_added', (snapshot) => {
        const req = snapshot.val();
        if (req.processed) return;
        console.log('📬 İstek alındı:', req.action);
        processControlRequest(req);
        snapshot.ref.update({ processed: true });
        setTimeout(() => snapshot.ref.remove(), 10000);
    });
}

function processControlRequest(req) {
    if (!videoElement) return;
    if (req.action === 'play') playVideo();
    else if (req.action === 'pause') pauseVideo();
    else if (req.action === 'seek' && req.params.currentTime !== undefined) {
        videoElement.currentTime = req.params.currentTime;
        if (req.params.shouldPlay) playVideo();
    }
}

// PROGRESSIVE LOADING
function performInitialSync() {
    if (!roomRef || !videoElement) return;
    roomRef.child('keyframes').limitToLast(1).once('value', (snapshot) => {
        if (!snapshot.exists()) return;
        const kf = Object.values(snapshot.val())[0];
        console.log('📦 Progressive loading...');
        
        videoElement.addEventListener('loadedmetadata', () => {
            console.log('✓ Metadata');
            const now = getAdjustedTime();
            
            if (kf.isPlaying && kf.startTimestamp) {
                const elapsed = (now - kf.startTimestamp) / 1000;
                const predicted = kf.currentTime + elapsed;
                videoElement.currentTime = predicted;
                
                videoElement.addEventListener('canplay', () => {
                    console.log('✓ Buffer hazır');
                    videoElement.play().catch(e => console.log('⚠️ Auto-play:', e));
                    videoElement.preload = 'auto';
                }, { once: true });
            } else {
                videoElement.currentTime = kf.currentTime;
                videoElement.preload = 'auto';
            }
        }, { once: true });
    });
}

// VİDEO KONTROL
function canControlVideo() {
    if (!currentRoomData) return false;
    return currentRoomData.controlMode === 'everyone' || isRoomOwner;
}

function playVideo() {
    if (!canControlVideo()) {
        sendControlRequest('play', { currentTime: videoElement.currentTime });
        alert('📢 Play isteği gönderildi!');
        return;
    }
    
    if (!videoElement || !videoElement.paused) return;
    
    // HER PLAY İŞLEMİNDE 5SN GECİKME (ilk play, resume, her şey!)
    const startTimestamp = getAdjustedTime() + SYNC_DELAY;
    const currentTime = videoElement.currentTime;
    
    sendUrgentUpdate('play', {
        currentTime: currentTime,
        startTimestamp: startTimestamp
    });
    
    sendKeyframe();
    
    roomRef.child('videoState').update({
        isPlaying: true,
        currentTime: currentTime,
        startTimestamp: startTimestamp,
        lastUpdate: getAdjustedTime()
    });
    
    console.log('▶️ Play:', currentTime.toFixed(1), 's → 5sn sonra');
    showSyncStatus('⏱️ 5sn sonra başlıyor');
}

function pauseVideo() {
    if (!canControlVideo()) {
        sendControlRequest('pause', { currentTime: videoElement.currentTime });
        alert('📢 Pause isteği gönderildi!');
        return;
    }
    
    if (!videoElement || videoElement.paused) return;
    
    videoElement.pause();
    
    sendUrgentUpdate('pause', { currentTime: videoElement.currentTime });
    sendKeyframe();
    
    roomRef.child('videoState').update({
        isPlaying: false,
        currentTime: videoElement.currentTime,
        startTimestamp: null,
        lastUpdate: getAdjustedTime()
    });
    
    console.log('⏸️ Durduruldu');
}

function stopVideo() {
    if (!canControlVideo()) {
        sendControlRequest('stop', {});
        alert('📢 Stop isteği gönderildi!');
        return;
    }
    
    if (!videoElement) return;
    
    videoElement.pause();
    videoElement.currentTime = 0;
    
    roomRef.child('videoState').set({
        isPlaying: false,
        currentTime: 0,
        startTimestamp: null,
        lastUpdate: null
    });
    
    roomRef.child('urgentUpdates').remove();
    roomRef.child('keyframes').remove();
    
    console.log('⏹ Başa sarıldı');
    showSyncStatus('⏹ Başa sarıldı');
}

function seekVideo(seconds) {
    if (!canControlVideo()) {
        const target = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
        sendControlRequest('seek', {
            currentTime: target,
            shouldPlay: !videoElement.paused
        });
        alert('📢 Seek isteği gönderildi!');
        return;
    }
    
    if (!videoElement) return;
    
    const now = Date.now();
    if (now - lastSeekTime < SEEK_DEBOUNCE_DELAY) clearTimeout(seekDebounceTimeout);
    lastSeekTime = now;
    
    const target = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
    videoElement.currentTime = target;
    showSyncStatus('⏩ ' + (seconds > 0 ? '+' : '') + seconds + 'sn (2sn bekle...)');
    
    seekDebounceTimeout = setTimeout(() => {
        const final = videoElement.currentTime;
        const rewind = Math.max(0, final - SEEK_REWIND_SECONDS);
        const wasPlaying = !videoElement.paused;
        
        videoElement.pause();
        videoElement.currentTime = rewind;
        
        // SEEK SONRASI OYNATIRKENde 5SN GECİKME!
        const startTs = wasPlaying ? getAdjustedTime() + SYNC_DELAY : null;
        
        sendUrgentUpdate('seek', {
            currentTime: rewind,
            shouldPlay: wasPlaying,
            startTimestamp: startTs
        });
        
        sendKeyframe();
        
        roomRef.child('videoState').update({
            isPlaying: wasPlaying,
            currentTime: rewind,
            startTimestamp: startTs,
            lastUpdate: getAdjustedTime()
        });
        
        if (wasPlaying) {
            // Seek sonrası 5sn buffer süresi
            showSyncStatus('⏱️ 5sn sonra devam ediyor');
            console.log('⏩ Seek tamamlandı, 5sn sonra devam');
        } else {
            console.log('⏩ Seek tamamlandı, duraklatıldı');
        }
    }, SEEK_DEBOUNCE_DELAY);
}

function seekToPosition(percentage) {
    if (!canControlVideo()) {
        const target = videoElement.duration * percentage;
        sendControlRequest('seek', {
            currentTime: target,
            shouldPlay: !videoElement.paused
        });
        alert('📢 Seek isteği gönderildi!');
        return;
    }
    
    if (!videoElement || !videoElement.duration) return;
    
    const target = videoElement.duration * percentage;
    videoElement.currentTime = target;
    
    const now = Date.now();
    if (now - lastSeekTime < SEEK_DEBOUNCE_DELAY) clearTimeout(seekDebounceTimeout);
    lastSeekTime = now;
    
    seekDebounceTimeout = setTimeout(() => {
        const final = videoElement.currentTime;
        const rewind = Math.max(0, final - SEEK_REWIND_SECONDS);
        const wasPlaying = !videoElement.paused;
        
        videoElement.pause();
        videoElement.currentTime = rewind;
        
        // SEEK SONRASI OYNATIRKENde 5SN GECİKME!
        const startTs = wasPlaying ? getAdjustedTime() + SYNC_DELAY : null;
        
        sendUrgentUpdate('seek', {
            currentTime: rewind,
            shouldPlay: wasPlaying,
            startTimestamp: startTs
        });
        
        sendKeyframe();
        
        roomRef.child('videoState').update({
            isPlaying: wasPlaying,
            currentTime: rewind,
            startTimestamp: startTs,
            lastUpdate: getAdjustedTime()
        });
        
        if (wasPlaying) {
            // Seek sonrası 5sn buffer süresi
            showSyncStatus('⏱️ 5sn sonra devam ediyor');
            console.log('⏩ Seek bar tamamlandı, 5sn sonra devam');
        } else {
            console.log('⏩ Seek bar tamamlandı, duraklatıldı');
        }
    }, SEEK_DEBOUNCE_DELAY);
}

// HİBRİT SİSTEM BAŞLATMA
function initHybridSync() {
    if (!roomRef || !videoElement) return;
    
    console.log('🚀 Hibrit sistem başlatılıyor...');
    
    syncClock();
    setInterval(syncClock, CLOCK_SYNC_INTERVAL);
    
    listenToKeyframes();
    listenToUrgentUpdates();
    
    if (isRoomOwner) {
        startKeyframeInterval();
        listenToControlRequests();
        
        // Eski urgentUpdates ve requests temizle
        setInterval(() => {
            const oneMinuteAgo = Date.now() - 60000;
            roomRef.child('urgentUpdates')
                .orderByChild('timestamp')
                .endAt(oneMinuteAgo)
                .once('value', snap => {
                    snap.forEach(child => child.ref.remove());
                });
            roomRef.child('requests')
                .orderByChild('timestamp')
                .endAt(oneMinuteAgo)
                .once('value', snap => {
                    snap.forEach(child => child.ref.remove());
                });
        }, 30000);
    }
    
    performInitialSync();
    
    console.log('✓ Hibrit sistem aktif');
    console.log('  → 5sn senkronizasyon (PLAY, RESUME, SEEK için)');
    console.log('  → 7sn keyframe');
    console.log('  → Request:', isRoomOwner ? 'Dinliyor' : 'Hazır');
}

// KLAVYE KISAYOLLARI
document.addEventListener('keydown', (e) => {
    if (!currentRoomId || !videoElement) return;
    
    if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        videoElement.paused ? playVideo() : pauseVideo();
    }
    if (e.code === 'ArrowRight') { e.preventDefault(); seekVideo(10); }
    if (e.code === 'ArrowLeft') { e.preventDefault(); seekVideo(-10); }
    if (e.code === 'ArrowUp') moveScreen('up');
    if (e.code === 'ArrowDown') moveScreen('down');
    if (e.code === 'KeyW') moveScreen('up');
    if (e.code === 'KeyS') moveScreen('down');
    if (e.code === 'KeyA') moveScreen('left');
    if (e.code === 'KeyD') moveScreen('right');
    if (e.code === 'KeyR') moveScreen('reset');
    if (e.code === 'KeyM') { e.preventDefault(); videoElement.muted = !videoElement.muted; }
    if (e.code === 'KeyF') {
        e.preventDefault();
        const scene = document.querySelector('a-scene');
        if (document.fullscreenElement) document.exitFullscreen();
        else scene.requestFullscreen();
    }
});

function moveScreen(dir) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    const step = 0.5;
    if (dir === 'up') screenPosition.y += step;
    else if (dir === 'down') screenPosition.y -= step;
    else if (dir === 'left') screenPosition.x -= step;
    else if (dir === 'right') screenPosition.x += step;
    else if (dir === 'reset') screenPosition = { x: 0, y: 2, z: -10 };
    screen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
}

// CLEANUP
window.addEventListener('beforeunload', () => {
    if (keyframeInterval) clearInterval(keyframeInterval);
    if (syncTimeout) clearTimeout(syncTimeout);
    if (seekDebounceTimeout) clearTimeout(seekDebounceTimeout);
    if (roomRef) roomRef.off();
    if (videoElement) { videoElement.pause(); videoElement.src = ''; }
});

console.log('✓ Core yüklendi: 5sn Senkron (PLAY/RESUME/SEEK) | 7sn Keyframe');