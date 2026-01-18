// ===========================
// CORE.JS - V6 GÜNCELLENMIŞ
// ===========================

// INTERVAL TRACKING (Memory Leak Prevention)
const activeIntervals = new Set();

function trackInterval(intervalId) {
  activeIntervals.add(intervalId);
  return intervalId;
}

function clearTrackedInterval(intervalId) {
  if (intervalId) clearInterval(intervalId);
  activeIntervals.delete(intervalId);
}

function clearAllIntervals() {
  activeIntervals.forEach(id => clearInterval(id));
  activeIntervals.clear();
  if (DEBUGMODE) console.log('Tüm intervallar temizlendi');
}

// ===========================
// CLOCK SYNC
// ===========================
function initClockSync() {
  if (DEBUGMODE) console.log('⏰ Clock sync başlatılıyor...');
  
  syncServerTime().then(() => {
    clockSyncReady = true;
    if (DEBUGMODE) console.log(`✅ Clock sync: ${clockOffset}ms offset`);
    
    if (clockSyncInterval) clearInterval(clockSyncInterval);
    clockSyncInterval = trackInterval(setInterval(syncServerTime, CLOCKSYNCINTERVAL)); // DÜZELTİLDİ
  });
}

async function syncServerTime() {
  if (!roomRef) {
    if (DEBUGMODE) console.warn('roomRef null - clock sync atlanıyor');
    return;
  }
  
  const samples = [];
  for (let i = 0; i < 3; i++) {
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
  if (DEBUGMODE) console.log(`⏰ Clock offset: ${clockOffset}ms`);
}

function getServerTime() {
  return Date.now() + clockOffset;
}

// ===========================
// PRELOAD WAITING SİSTEMİ
// ===========================
function startPreloadWaiting(targetTime) {
  stopPreloadWaiting();
  
  preloadTargetTime = targetTime;
  if (DEBUGMODE) console.log(`Preload waiting başladı: ${targetTime.toFixed(1)}s hedef`);
  
  preloadWaitingInterval = setInterval(() => {
    if (!videoElement || !roomRef) {
      stopPreloadWaiting();
      return;
    }
    
    roomRef.child('videoState').once('value', snapshot => {
      const state = snapshot.val();
      if (!state) return;
      
      let ownerCurrentTime = state.currentTime;
      if (state.isPlaying && state.startTimestamp) {
        const elapsed = (getServerTime() - state.startTimestamp) / 1000;
        ownerCurrentTime = state.currentTime + elapsed;
      }
      
      if (ownerCurrentTime >= preloadTargetTime) {
        if (DEBUGMODE) console.log(`Owner hedefe ulaştı: ${ownerCurrentTime.toFixed(1)}s`);
        
        if (videoElement.paused && state.isPlaying) {
          videoElement.play().catch(err => {
            if (DEBUGMODE) console.warn('Preload play hatası:', err);
          });
        }
        
        stopPreloadWaiting();
      } else {
        const remaining = preloadTargetTime - ownerCurrentTime;
        showSyncStatus(`Buffering... ${remaining.toFixed(0)}s kaldı`);
      }
    });
  }, PRELOADPOLLINGINTERVAL);
  
  preloadTimeout = setTimeout(() => {
    if (DEBUGMODE) console.log('Preload timeout - zorla play');
    if (videoElement && videoElement.paused) {
      videoElement.play().catch(err => {
        if (DEBUGMODE) console.warn('Preload timeout play hatası:', err);
      });
    }
    stopPreloadWaiting();
  }, PRELOADWAITINGTIMEOUT);
}

function stopPreloadWaiting() {
  if (preloadWaitingInterval) clearInterval(preloadWaitingInterval);
  preloadWaitingInterval = null;
  
  if (preloadTimeout) clearTimeout(preloadTimeout);
  preloadTimeout = null;
  
  preloadTargetTime = null;
  
  if (DEBUGMODE) console.log('Preload waiting durduruldu');
}

// ===========================
// OWNER PRESENCE SİSTEMİ
// ===========================
function setupOwnerPresence() {
  if (!auth.currentUser || !roomRef) return;
  
  const userId = auth.currentUser.uid;
  ownerPresenceRef = roomRef.child('activeViewers').child(userId);
  
  database.ref('.info/connected').on('value', snapshot => {
    if (snapshot.val() === true) {
      ownerPresenceRef.update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP,
        isOwner: isRoomOwner,
        timestamp: firebase.database.ServerValue.TIMESTAMP
      });
      
      ownerPresenceRef.onDisconnect().remove();
    }
  });
  
  if (ownerPresenceInterval) clearInterval(ownerPresenceInterval);
  ownerPresenceInterval = setInterval(() => {
    if (ownerPresenceRef && auth.currentUser) {
      ownerPresenceRef.update({
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      }).catch(err => {
        if (DEBUGMODE) console.warn('LastSeen güncelleme hatası:', err);
      });
    }
  }, OWNERPRESENCEUPDATEINTERVAL);
  
  if (!isRoomOwner) {
    monitorOwnerPresence();
  }
  
  if (DEBUGMODE) console.log('Owner presence aktif');
}

function monitorOwnerPresence() {
  if (ownerMonitorInterval) clearInterval(ownerMonitorInterval);
  
  ownerMonitorInterval = setInterval(() => {
    if (!roomRef) return;
    
    roomRef.child('activeViewers').once('value', snapshot => {
      const viewers = snapshot.val();
      const ownerEntry = Object.entries(viewers || {}).find(([uid, v]) => v.isOwner);
      
      if (!ownerEntry) {
        if (DEBUGMODE) console.log('Owner bulunamadı');
        return;
      }
      
      const [ownerUid, ownerData] = ownerEntry;
      if (!ownerData.lastSeen) return;
      
      const timeSinceLastSeen = getServerTime() - ownerData.lastSeen;
      if (timeSinceLastSeen > OWNERPRESENCETIMEOUT) {
        if (DEBUGMODE) console.log('Owner kayboldu - transfer başlatılıyor');
        attemptOwnerTransfer();
      }
    }).catch(err => {
      if (DEBUGMODE) console.warn('Owner presence kontrol hatası:', err);
    });
  }, OWNERPRESENCECHECKINTERVAL);
}

async function attemptOwnerTransfer() {
  if (!auth.currentUser || !roomRef) return;
  
  try {
    const result = await roomRef.child('owner').transaction(currentOwner => {
      if (!currentOwner || currentOwner === auth.currentUser.uid) {
        return undefined;
      }
      
      if (currentRoomData && currentOwner !== currentRoomData.owner) {
        return undefined;
      }
      
      return auth.currentUser.uid;
    });
    
    if (result.committed) {
      if (DEBUGMODE) console.log('Owner transfer başarılı - Ben yeni ownerım');
      
      isRoomOwner = true;
      currentRoomData.owner = auth.currentUser.uid;
      
      if (ownerPresenceRef) {
        ownerPresenceRef.update({ isOwner: true });
      }
      
      if (ownerMonitorInterval) {
        clearInterval(ownerMonitorInterval);
        ownerMonitorInterval = null;
      }
      
      startKeyframeSending();
      processControlRequests();
    }
  } catch (err) {
    if (DEBUGMODE) console.warn('Owner transfer hatası:', err);
  }
}

function cleanupOwnerPresence() {
  if (ownerPresenceInterval) clearInterval(ownerPresenceInterval);
  ownerPresenceInterval = null;
  
  if (ownerMonitorInterval) clearInterval(ownerMonitorInterval);
  ownerMonitorInterval = null;
  
  if (ownerPresenceRef) {
    ownerPresenceRef.off();
    ownerPresenceRef = null;
  }
  
  database.ref('.info/connected').off();
  
  if (DEBUGMODE) console.log('Owner presence temizlendi');
}

// ===========================
// ODAYA KATILMA
// ===========================
async function joinRoom(roomId) {
  try {
    if (DEBUGMODE) console.log('🚪 Odaya katılınıyor:', roomId);
    
    currentRoomId = roomId;
    roomRef = database.ref('rooms').child(roomId);
    
    const snapshot = await roomRef.once('value');
    if (!snapshot.exists()) {
      alert('Oda bulunamadı!');
      return;
    }
    
    currentRoomData = snapshot.val();
    isRoomOwner = currentRoomData.owner === auth.currentUser.uid;
    
    const viewerRef = roomRef.child('activeViewers').child(auth.currentUser.uid);
    await viewerRef.set({
      timestamp: firebase.database.ServerValue.TIMESTAMP,
      lastSeen: firebase.database.ServerValue.TIMESTAMP,
      isOwner: isRoomOwner,
      currentDrift: 0,
      playbackRate: 1.0
    });
    
    viewerRef.onDisconnect().remove();
    
    initClockSync();
    
    showSection('room-section');
    updateRoomInfo();
    
    await create3DScene(currentRoomData);
    
    videoElement.addEventListener('loadedmetadata', () => {
      if (DEBUGMODE) console.log('Video metadata yüklendi');
    });
    
    listenVideoState();
    listenUrgentUpdates();
    
    if (isRoomOwner) {
      startKeyframeSending();
      startDriftTracking();
      processControlRequests();
    } else {
      listenKeyframes();
      startDriftTracking();
    }
    
    setupOwnerPresence();
    
    if (DEBUGMODE) console.log(isRoomOwner ? 'Owner olarak katıldınız' : 'Viewer olarak katıldınız');
    
  } catch (error) {
    console.error('❌ Odaya katılma hatası:', error);
    alert('Odaya katılanamadı: ' + error.message);
    showSection('lobby-section');
  }
}

// ===========================
// HELPER FUNCTIONS
// ===========================
function updateRoomInfo() {
  if (currentRoomData && roomRef) {
    updateRoomInfoDisplay();
    updateRoomControls();
  }
}

debugLog('✅ Core yüklendi - V5 OPTİMİZE (Drift 5s + Keyframe içinde drift)');
