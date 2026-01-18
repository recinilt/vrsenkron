// ===========================
// SYNC CORRECTION
// ===========================

function applySyncCorrection(targetTime, shouldPlay, isUrgent = false) {
    if (!videoElement) return;
    
    const diff = targetTime - videoElement.currentTime;
    const absDiff = Math.abs(diff);
    
    if (DEBUGMODE) console.log(`Sync - target:${targetTime.toFixed(1)}s, current:${videoElement.currentTime.toFixed(1)}s, diff:${diff.toFixed(1)}s`);
    
    // Tier sistemi
    if (absDiff < 0.5) {
        // Tier 1: Çok küçük fark, sadece play/pause ayarla
        if (shouldPlay && videoElement.paused) {
            videoElement.play().catch(err => {
                if (DEBUGMODE) console.warn('Play hatası:', err);
            });
        } else if (!shouldPlay && !videoElement.paused) {
            videoElement.pause();
        }
        
        videoElement.playbackRate = 1.0;
    } else if (absDiff < 2.0) {
        // Tier 2: Küçük fark, hafif hızlanma/yavaşlama
        const rate = diff > 0 ? 1.1 : 0.9;
        videoElement.playbackRate = rate;
        
        if (shouldPlay && videoElement.paused) {
            videoElement.play().catch(err => {
                if (DEBUGMODE) console.warn('Play hatası:', err);
            });
        }
    } else {
        // Tier 3: Büyük fark, seek gerekli
        if (isUrgent) {
            videoElement.currentTime = Math.max(0, targetTime - SEEKREWINDSECONDS);
        } else {
            videoElement.currentTime = targetTime;
        }
        
        videoElement.playbackRate = 1.0;
        
        if (shouldPlay) {
            videoElement.play().catch(err => {
                if (DEBUGMODE) console.warn('Play hatası:', err);
            });
        } else {
            videoElement.pause();
        }
    }
}

// ===========================
// LİSTENER FONKSİYONLARI
// ===========================

function listenVideoState() {
    if (videoStateListener) roomRef.child('videoState').off('value', videoStateListener);
    
    videoStateListener = roomRef.child('videoState').on('value', snapshot => {
        const state = snapshot.val();
        if (!state || !videoElement) return;
        
        currentRoomData.videoState = state;
        
        let targetTime = state.currentTime;
        if (state.isPlaying && state.startTimestamp) {
            const elapsed = (getServerTime() - state.startTimestamp) / 1000;
            targetTime = state.currentTime + elapsed;
        }
        
        applySyncCorrection(targetTime, state.isPlaying, false);
    });
}

// ===========================
// OPTİMİZE EDİLMİŞ KEYFRAME GÖNDERİMİ
// Drift bilgisi keyframe içinde taşınıyor
// ===========================

function startKeyframeSending() {
    if (keyframeInterval) clearInterval(keyframeInterval);
    
    keyframeInterval = trackInterval(setInterval(() => {
        if (!videoElement || !roomRef || !auth.currentUser) return;
        
        const now = getServerTime();
        if (now - lastKeyframeTimestamp < KEYFRAMEINTERVAL - 500) return;
        
        lastKeyframeTimestamp = now;
        
        // OPTİMİZASYON: Drift bilgisi keyframe'e eklendi
        const keyframe = {
            timestamp: now,
            currentTime: videoElement.currentTime,
            isPlaying: !videoElement.paused,
            playbackRate: videoElement.playbackRate,
            startTimestamp: !videoElement.paused ? now : null,
            currentDrift: Math.round(calculateDrift()), // YENİ: Drift dahil
            viewerCount: Object.keys(currentRoomData.activeViewers || {}).length // YENİ: İzleyici sayısı
        };
        
        roomRef.child('keyframes').push(keyframe);
        
        // Eski keyframe'leri temizle (2 dakikadan eski)
        const twoMinutesAgo = now - 120000;
        roomRef.child('keyframes')
            .orderByChild('timestamp')
            .endAt(twoMinutesAgo)
            .once('value', snapshot => {
                snapshot.forEach(child => child.ref.remove());
            });
        
        if (DEBUGMODE) console.log(`Keyframe: ${keyframe.currentTime.toFixed(1)}s, drift: ${keyframe.currentDrift}ms`);
    }, KEYFRAMEINTERVAL));
    
    if (DEBUGMODE) console.log('Keyframe gönderimi başlatıldı (drift dahil)');
}

function listenKeyframes() {
    if (keyframesListener) roomRef.child('keyframes').off('child_added', keyframesListener);
    
    keyframesListener = roomRef.child('keyframes')
        .orderByChild('timestamp')
        .limitToLast(1)
        .on('child_added', snapshot => {
            const keyframe = snapshot.val();
            if (!keyframe || !videoElement) return;
            
            const age = getServerTime() - keyframe.timestamp;
            if (age > 10000) {
                if (DEBUGMODE) console.log(`Keyframe çok eski: ${(age / 1000).toFixed(1)}s`);
                return;
            }
            
            let targetTime = keyframe.currentTime;
            if (keyframe.isPlaying && keyframe.startTimestamp) {
                const elapsed = (getServerTime() - keyframe.startTimestamp) / 1000;
                targetTime = keyframe.currentTime + elapsed;
            }
            
            if (DEBUGMODE) console.log(`Keyframe alındı: ${targetTime.toFixed(1)}s (drift: ${keyframe.currentDrift || 0}ms)`);
            applySyncCorrection(targetTime, keyframe.isPlaying, false);
        });
}

// ===========================
// V7 GÜNCELLENMİŞ: URGENT UPDATES LISTENER
// Sadece en yeni timestamp'li işlemi işler
// ===========================

function listenUrgentUpdates() {
    if (urgentUpdatesListener) roomRef.child('urgentUpdates').off('child_added', urgentUpdatesListener);
    
    let lastProcessedTimestamp = 0;
    
    urgentUpdatesListener = roomRef.child('urgentUpdates')
        .orderByChild('timestamp')
        .startAt(getServerTime())
        .limitToLast(5)
        .on('child_added', snapshot => {
            const update = snapshot.val();
            if (!update || !videoElement || update.processed) return;
            
            const age = getServerTime() - update.timestamp;
            if (age > 10000) {
                snapshot.ref.remove();
                return;
            }
            
            // V6: Sadece daha yeni timestamp'leri işle
            if (update.timestamp <= lastProcessedTimestamp) {
                if (DEBUGMODE) console.log(`⏭️ Eski update atlandı (${update.action})`);
                snapshot.ref.update({ processed: true });
                return;
            }
            
            lastProcessedTimestamp = update.timestamp;
            if (DEBUGMODE) console.log('✅ Urgent update:', update.action);
            
            // V7 YENİ: reportPosition komutu
            if (update.action === 'reportPosition') {
                // Kendi pozisyonumuzu yaz
                if (auth.currentUser) {
                    roomRef.child('activeViewers').child(auth.currentUser.uid).update({
                        pausePosition: videoElement.currentTime,
                        pauseReportTime: getServerTime()
                    }).catch(err => {
                        if (DEBUGMODE) console.warn('Position yazma hatası:', err);
                    });
                }
                
                snapshot.ref.update({ processed: true });
                return;
            }
            
            if (update.action === 'play') {
                // V7: Buffer preload'u durdur
                stopBufferPreload();
                
                const delay = update.startTimestamp - getServerTime();
                
                if (delay > 0) {
                    const preloadTime = Math.min(
                        update.currentTime - PRELOADBUFFERSECONDS,
                        (videoElement.duration || update.currentTime) - PRELOADBUFFERSECONDS
                    );
                    
                    if (DEBUGMODE) console.log(`Play preload: ${update.currentTime.toFixed(1)}s → ${preloadTime.toFixed(1)}s, delay: ${delay}ms`);
                    
                    videoElement.currentTime = preloadTime;
                    videoElement.pause();
                    
                    setTimeout(() => {
                        if (videoElement) startPreloadWaiting(update.currentTime);
                    }, Math.max(0, delay - 1000));
                } else {
                    const elapsed = (getServerTime() - update.startTimestamp) / 1000;
                    const targetTime = update.currentTime + elapsed;
                    applySyncCorrection(targetTime, true, true);
                }
                
            } else if (update.action === 'pause') {
                // V7 DEĞİŞTİ: stopPreloadWaiting() KALDIRILMADI (play için gerekli)
                
                applySyncCorrection(update.currentTime, false, true);
                
                // V7 YENİ: Pause'tan sonra buffer preload başlat
                startBufferPreload(update.currentTime + PAUSE_REWIND_BUFFER);
                
            } else if (update.action === 'seek') {
                if (update.shouldPlay && update.currentTime > 0) {
                    const preloadTime = Math.min(
                        update.currentTime - PRELOADBUFFERSECONDS,
                        (videoElement.duration || update.currentTime) - PRELOADBUFFERSECONDS
                    );
                    
                    if (DEBUGMODE) console.log(`Seek preload: ${update.currentTime.toFixed(1)}s → ${preloadTime.toFixed(1)}s`);
                    
                    videoElement.currentTime = preloadTime;
                    videoElement.pause();
                    videoElement.playbackRate = 1.0;
                    
                    startPreloadWaiting(update.currentTime);
                } else {
                    applySyncCorrection(update.currentTime, update.shouldPlay || false, true);
                }
            }
            
            snapshot.ref.update({ processed: true });
            setTimeout(() => snapshot.ref.remove(), 30000);
        });
}

// ===========================
// REQUEST VIDEO CONTROL
// ===========================

function requestVideoControl(action, params) {
    if (!roomRef || !auth.currentUser) return;
    
    if (DEBUGMODE) console.log('Kontrol isteği:', action);
    
    const request = {
        userId: auth.currentUser.uid,
        action: action,
        timestamp: getServerTime(),
        processed: false,
        params: params || {}
    };
    
    roomRef.child('requests').push(request);
    alert(`${action.toUpperCase()} isteği gönderildi!`);
}

function processControlRequests() {
    if (requestsListener) roomRef.child('requests').off('child_added', requestsListener);
    
    requestsListener = roomRef.child('requests')
        .orderByChild('processed')
        .equalTo(false)
        .limitToLast(5)
        .on('child_added', snapshot => {
            const request = snapshot.val();
            if (!request || request.processed) return;
            
            const age = getServerTime() - request.timestamp;
            if (age > 30000) {
                snapshot.ref.remove();
                return;
            }
            
            if (DEBUGMODE) console.log('İstek alındı:', request.action);
            
            const response = confirm(`Kullanıcı "${request.action}" isteği gönderdi. Kabul ediyor musunuz?`);
            
            if (response) {
                if (request.action === 'play') playVideo();
                else if (request.action === 'pause') pauseVideo();
                else if (request.action === 'stop') stopVideo();
                else if (request.action === 'seek' && request.params) {
                    if (request.params.seconds) seekVideo(request.params.seconds);
                    else if (request.params.percentage) seekToPosition(request.params.percentage);
                }
            }
            
            snapshot.ref.update({ processed: true });
            setTimeout(() => snapshot.ref.remove(), 60000);
        });
}

// ===========================
// ODADAN ÇIKMA
// ===========================

async function leaveRoom() {
    if (!currentRoomId || !roomRef) return;
    
    try {
        // V6: Timeout'ları temizle
        cancelPendingOperations();
        
        // İzleyici sayısını azalt
        await roomRef.child('viewers').transaction(current => {
            return Math.max(0, (current || 1) - 1);
        });
        
        // Aktif izleyici kaydını sil
        if (auth.currentUser) {
            await roomRef.child('activeViewers').child(auth.currentUser.uid).remove();
        }
        
        // Listener'ları temizle
        if (videoStateListener) roomRef.child('videoState').off('value', videoStateListener);
        if (urgentUpdatesListener) roomRef.child('urgentUpdates').off('child_added', urgentUpdatesListener);
        if (keyframesListener) roomRef.child('keyframes').off('child_added', keyframesListener);
        if (requestsListener) roomRef.child('requests').off('child_added', requestsListener);
        
        // Interval'ları temizle
        clearAllIntervals();
        
        // V7: Buffer preload'u durdur
        stopBufferPreload();
        
        if (clockSyncInterval) clearInterval(clockSyncInterval);
        if (ownerPresenceInterval) clearInterval(ownerPresenceInterval);
        if (ownerMonitorInterval) clearInterval(ownerMonitorInterval);
        if (seekBarUpdateInterval) clearInterval(seekBarUpdateInterval);
        
        // Preload waiting durdur
        stopPreloadWaiting();
        
        // Videoyu durdur
        if (videoElement) {
            videoElement.pause();
            videoElement.src = '';
        }
        
        // Sahneyi temizle
        const screen = document.getElementById('video-screen');
        if (screen) screen.remove();
        
        const env = document.getElementById('environment');
        if (env) env.remove();
        
        const panel = document.getElementById('vr-ui-panel');
        if (panel) panel.remove();
        
        // Değişkenleri sıfırla
        currentRoomId = null;
        currentRoomData = null;
        isRoomOwner = false;
        roomRef = null;
        videoElement = null;
        
        // UI göster
        showSection('lobby-section');
        listRooms();
        
        if (DEBUGMODE) console.log('🏠 Odadan çıkıldı');
    } catch (error) {
        console.error('❌ Odadan çıkma hatası:', error);
    }
}

// ===========================
// KLAVYE KISAYOLLARI
// ===========================

document.addEventListener('keydown', (e) => {
    if (!videoElement) return;
    
    if (e.code === 'Space') {
        e.preventDefault();
        if (videoElement.paused) playVideo();
        else pauseVideo();
    } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekVideo(-10);
    } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekVideo(10);
    } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        moveScreen('up');
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        moveScreen('down');
    } else if (e.code === 'KeyA') {
        e.preventDefault();
        moveScreen('left');
    } else if (e.code === 'KeyD') {
        e.preventDefault();
        moveScreen('right');
    } else if (e.code === 'KeyR') {
        e.preventDefault();
        moveScreen('reset');
    } else if (e.code === 'KeyM') {
        e.preventDefault();
        videoElement.muted = !videoElement.muted;
    } else if (e.code === 'KeyF') {
        e.preventDefault();
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
});

if (DEBUGMODE) console.log('Core yüklendi - V7 - PAUSE SYNC + BUFFER PRELOAD');
