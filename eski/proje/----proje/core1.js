// ============================================
// CORE.JS - OPTİMİZE EDİLMİŞ VERSİYON V5
// Drift tracking 5s, Keyframe'e drift dahil
// ============================================

// ============================================
// INTERVAL TRACKING (Memory Leak Prevention)
// ============================================
const activeIntervals = new Set();

function trackInterval(intervalId) {
    activeIntervals.add(intervalId);
    return intervalId;
}

function clearTrackedInterval(intervalId) {
    if (intervalId) {
        clearInterval(intervalId);
        activeIntervals.delete(intervalId);
    }
}

function clearAllIntervals() {
    activeIntervals.forEach(id => clearInterval(id));
    activeIntervals.clear();
    if (DEBUG_MODE) console.log('✅ Tüm interval\'lar temizlendi');
}

// ============================================
// CLOCK SYNC
// ============================================
function initClockSync() {
    if (DEBUG_MODE) console.log('⏰ Clock sync başlatılıyor...');
    syncServerTime().then(() => {
        clockSyncReady = true;
        if (DEBUG_MODE) console.log(`✅ Clock sync: ${clockOffset}ms offset`);
        if (clockSyncInterval) clearInterval(clockSyncInterval);
        clockSyncInterval = trackInterval(setInterval(() => {
            syncServerTime();
        }, CLOCK_SYNC_INTERVAL));
    });
}

async function syncServerTime() {
    if (!roomRef) {
        if (DEBUG_MODE) console.warn('⚠️ roomRef null - clock sync atlanıyor');
        return;
    }
    
    const samples = [];
    for (let i = 0; i < 2; i++) {
        const t0 = Date.now();
        await roomRef.child('serverTimestamp').set(firebase.database.ServerValue.TIMESTAMP);
        const snapshot = await roomRef.child('serverTimestamp').once('value');
        const serverTime = snapshot.val();
        const t1 = Date.now();
        const rtt = t1 - t0;
        const offset = serverTime - (t0 + rtt / 2);
        samples.push(offset);
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    clockOffset = Math.round(samples.reduce((a, b) => a + b) / samples.length);
    if (DEBUG_MODE) console.log(`⏰ Clock offset: ${clockOffset}ms`);
}

function getServerTime() {
    return Date.now() + clockOffset;
}

// ============================================
// PRELOAD WAITING SİSTEMİ
// ============================================
function startPreloadWaiting(targetTime) {
    stopPreloadWaiting(); // Önce mevcut temizle
    preloadTargetTime = targetTime;
    if (DEBUG_MODE) console.log(`🔄 Preload waiting başladı: ${targetTime.toFixed(1)}s hedef`);
    
    // Polling: Her 500ms owner pozisyonunu kontrol et
    preloadWaitingInterval = setInterval(() => {
        if (!videoElement || !roomRef) {
            stopPreloadWaiting();
            return;
        }
        
        // videoState'den owner pozisyonunu al
        roomRef.child('videoState').once('value', (snapshot) => {
            const state = snapshot.val();
            if (!state) return;
            
            let ownerCurrentTime = state.currentTime;
            if (state.isPlaying && state.startTimestamp) {
                const elapsed = (getServerTime() - state.startTimestamp) / 1000;
                ownerCurrentTime = state.currentTime + elapsed;
            }
            
            // Owner hedef pozisyona geldi mi?
            if (ownerCurrentTime >= preloadTargetTime) {
                if (DEBUG_MODE) console.log(`✅ Owner hedefe ulaştı: ${ownerCurrentTime.toFixed(1)}s`);
                if (videoElement.paused && state.isPlaying) {
                    videoElement.play().catch(err => {
                        if (DEBUG_MODE) console.warn('⚠️ Preload play hatası:', err);
                    });
                }
                stopPreloadWaiting();
            } else {
                const remaining = preloadTargetTime - ownerCurrentTime;
                showSyncStatus(`Buffering... (${remaining.toFixed(0)}s kaldı)`);
            }
        });
    }, PRELOAD_POLLING_INTERVAL);
    
    // Timeout: 30 saniye sonra zorla play (owner donmuş olabilir)
    preloadTimeout = setTimeout(() => {
        if (DEBUG_MODE) console.log('⏰ Preload timeout - zorla play');
        if (videoElement && videoElement.paused) {
            videoElement.play().catch(err => {
                if (DEBUG_MODE) console.warn('⚠️ Preload timeout play hatası:', err);
            });
        }
        stopPreloadWaiting();
    }, PRELOAD_WAITING_TIMEOUT);
}

function stopPreloadWaiting() {
    if (preloadWaitingInterval) {
        clearInterval(preloadWaitingInterval);
        preloadWaitingInterval = null;
    }
    if (preloadTimeout) {
        clearTimeout(preloadTimeout);
        preloadTimeout = null;
    }
    preloadTargetTime = null;
    if (DEBUG_MODE) console.log('🛑 Preload waiting durduruldu');
}

// ============================================
// OWNER PRESENCE SİSTEMİ
// ============================================
function setupOwnerPresence() {
    if (!auth.currentUser || !roomRef) return;
    
    const userId = auth.currentUser.uid;
    ownerPresenceRef = roomRef.child(`activeViewers/${userId}`);
    
    // Connected state dinle
    database.ref('.info/connected').on('value', (snapshot) => {
        if (snapshot.val() === true) {
            // Bağlandı - lastSeen güncelle
            ownerPresenceRef.update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP,
                isOwner: isRoomOwner,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Disconnect durumunda temizle
            ownerPresenceRef.onDisconnect().remove();
        }
    });
    
    // Her 5 saniyede lastSeen güncelle
    if (ownerPresenceInterval) clearInterval(ownerPresenceInterval);
    ownerPresenceInterval = setInterval(() => {
        if (ownerPresenceRef && auth.currentUser) {
            ownerPresenceRef.update({
                lastSeen: firebase.database.ServerValue.TIMESTAMP
            }).catch(err => {
                if (DEBUG_MODE) console.warn('⚠️ LastSeen güncelleme hatası:', err);
            });
        }
    }, OWNER_PRESENCE_UPDATE_INTERVAL);
    
    // Eğer viewer isen, owner presence kontrol et
    if (!isRoomOwner) {
        monitorOwnerPresence();
    }
    
    if (DEBUG_MODE) console.log('👁️ Owner presence aktif');
}

function monitorOwnerPresence() {
    // Her 10 saniyede owner'ın lastSeen'ini kontrol et
    if (ownerMonitorInterval) clearInterval(ownerMonitorInterval);
    
    ownerMonitorInterval = setInterval(() => {
        if (!roomRef) return;
        
        roomRef.child('activeViewers').once('value', (snapshot) => {
            const viewers = snapshot.val() || {};
            const ownerEntry = Object.entries(viewers).find(([uid, v]) => v.isOwner);
            
            if (!ownerEntry) {
                if (DEBUG_MODE) console.log('⚠️ Owner bulunamadı');
                return;
            }
            
            const [ownerUid, ownerData] = ownerEntry;
            if (!ownerData.lastSeen) return;
            
            const timeSinceLastSeen = getServerTime() - ownerData.lastSeen;
            if (timeSinceLastSeen > OWNER_PRESENCE_TIMEOUT) {
                if (DEBUG_MODE) console.log('🔴 Owner kayboldu - transfer başlatılıyor');
                attemptOwnerTransfer();
            }
        }).catch(err => {
            if (DEBUG_MODE) console.warn('⚠️ Owner presence kontrol hatası:', err);
        });
    }, OWNER_PRESENCE_CHECK_INTERVAL);
}

async function attemptOwnerTransfer() {
    if (!auth.currentUser || !roomRef) return;
    
    try {
        // Atomic transaction ile owner transfer
        const result = await roomRef.child('owner').transaction((currentOwner) => {
            // Eğer owner zaten değiştiyse veya ben zaten owner'sam, abort
            if (!currentOwner || currentOwner === auth.currentUser.uid) {
                return undefined; // Abort transaction
            }
            
            // currentRoomData'daki owner ile eşleşiyor mu kontrol et
            if (currentRoomData && currentOwner !== currentRoomData.owner) {
                return undefined; // Abort - başka biri almış
            }
            
            // Ben yeni owner oluyorum
            return auth.currentUser.uid;
        });
        
        if (result.committed) {
            if (DEBUG_MODE) console.log('✅ Owner transfer başarılı - Ben yeni owner\'ım');
            isRoomOwner = true;
            currentRoomData.owner = auth.currentUser.uid;
            
            // Owner presence güncelle
            if (ownerPresenceRef) {
                ownerPresenceRef.update({ isOwner: true });
            }
            
            // Monitor'u durdur
            if (ownerMonitorInterval) {
                clearInterval(ownerMonitorInterval);
                ownerMonitorInterval = null;
            }
            
            // Owner görevlerini başlat
            startKeyframeSending();
            processControlRequests();
        }
    } catch (err) {
        if (DEBUG_MODE) console.warn('⚠️ Owner transfer hatası:', err);
    }
}

function cleanupOwnerPresence() {
    if (ownerPresenceInterval) {
        clearInterval(ownerPresenceInterval);
        ownerPresenceInterval = null;
    }
    
    if (ownerMonitorInterval) {
        clearInterval(ownerMonitorInterval);
        ownerMonitorInterval = null;
    }
    
    if (ownerPresenceRef) {
        ownerPresenceRef.off();
        ownerPresenceRef = null;
    }
    
    database.ref('.info/connected').off();
    
    if (DEBUG_MODE) console.log('🧹 Owner presence temizlendi');
}

// ============================================
// ODAYA KATILMA
// ============================================
async function joinRoom(roomId) {
    try {
        if (DEBUG_MODE) console.log('🚪 Odaya katılınıyor:', roomId);
        
        currentRoomId = roomId;
        roomRef = database.ref('rooms/' + roomId);
        
        // Oda verilerini oku
        const snapshot = await roomRef.once('value');
        if (!snapshot.exists()) {
            alert('Oda bulunamadı!');
            return;
        }
        
        currentRoomData = snapshot.val();
        
        // Owner kontrolü
        isRoomOwner = (currentRoomData.owner === auth.currentUser.uid);
        
        // İzleyiciyi kaydet
        const viewerRef = roomRef.child('activeViewers/' + auth.currentUser.uid);
        await viewerRef.set({
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            lastSeen: firebase.database.ServerValue.TIMESTAMP,
            isOwner: isRoomOwner,
            currentDrift: 0,
            playbackRate: 1.0
        });
        
        // Disconnect durumunda temizle
        viewerRef.onDisconnect().remove();
        
        // Clock sync başlat
        initClockSync();
        
        // UI güncelle - showSection kullan (ui2.js'de tanımlı)
        showSection('room-section');
        updateRoomInfo();
        
        // 3D sahneyi oluştur
        await create3DScene(currentRoomData);
        
        // Video yüklenince başlat
        videoElement.addEventListener('loadedmetadata', () => {
            if (DEBUG_MODE) console.log('🎬 Video metadata yüklendi');
            
            // Listener'ları başlat
            listenVideoState();
            listenUrgentUpdates();
            
            if (isRoomOwner) {
                // Owner: Keyframe gönderimi başlat + drift tracking
                startKeyframeSending();
                startDriftTracking(); // OPTİMİZE EDİLDİ: 5 saniyede bir
                processControlRequests();
            } else {
                // Viewer: Keyframe dinle + drift tracking
                listenKeyframes();
                startDriftTracking(); // OPTİMİZE EDİLDİ: 5 saniyede bir
            }
            
            // Owner presence başlat
            setupOwnerPresence();
            
            if (DEBUG_MODE) console.log(isRoomOwner ? '👑 Owner olarak katıldınız' : '👤 Viewer olarak katıldınız');
        });
        
    } catch (error) {
        console.error('❌ Odaya katılma hatası:', error);
        alert('Odaya katılınamadı: ' + error.message);
        showSection('lobby-section');
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function updateRoomInfo() {
    if (currentRoomData && roomRef) {
        updateRoomInfoDisplay();
        updateRoomControls();
    }
}

debugLog('✅ Core yüklendi - V5 OPTİMİZE (Drift 5s + Keyframe içinde drift)');
