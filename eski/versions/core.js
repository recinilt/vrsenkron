// ============================================
// CORE.JS - OPTİMİZE EDİLMİŞ VERSİYON V2
// FIX 1: lastSeekTime → getServerTime()
// FIX 2: Group status cache (race condition)
// FIX 3: Auto-reconnect (critical tier)
// ============================================

// ============================================
// CLOCK SYNC
// ============================================

function initClockSync() {
  if (DEBUG_MODE) console.log('⏰ Clock sync başlatılıyor...');

  syncServerTime().then(() => {
    clockSyncReady = true;
    if (DEBUG_MODE) console.log(`✅ Clock sync: ${clockOffset}ms offset`);

    if (clockSyncInterval) clearInterval(clockSyncInterval);
    clockSyncInterval = setInterval(() => {
      syncServerTime();
    }, CLOCK_SYNC_INTERVAL);
  });
}

async function syncServerTime() {
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
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  clockOffset = Math.round(samples.reduce((a, b) => a + b) / samples.length);
  if (DEBUG_MODE) console.log(`⏰ Clock offset: ${clockOffset}ms`);
}

function getServerTime() {
  return Date.now() + clockOffset;
}

// ============================================
// GRUP DURUMU TAKİBİ - FIX 2: Cache eklendi
// ============================================

async function getGroupSyncStatus() {
  try {
    // Cache kontrolü (race condition önleme)
    const now = getServerTime();
    if (groupStatusCache && (now - groupStatusCacheTime < GROUP_STATUS_CACHE_MS)) {
      if (DEBUG_MODE) console.log('📦 Grup durumu cache\'den alındı');
      return groupStatusCache;
    }

    const snapshot = await roomRef.child('activeViewers').once('value');
    const viewers = snapshot.val() || {};
    
    const drifts = Object.entries(viewers)
      .filter(([uid, v]) => !v.isOwner && v.currentDrift !== undefined)
      .map(([uid, v]) => ({
        uid: uid,
        drift: v.currentDrift,
        playbackRate: v.playbackRate || 1.0
      }));

    const laggingUsers = drifts.filter(d => d.drift > TIER_3_THRESHOLD);
    const averageDrift = drifts.length > 0
      ? drifts.reduce((a, b) => a + b.drift, 0) / drifts.length
      : 0;
    const maxDrift = drifts.length > 0
      ? Math.max(...drifts.map(d => d.drift))
      : 0;

    const result = {
      totalViewers: drifts.length,
      laggingCount: laggingUsers.length,
      averageDrift: averageDrift,
      maxDrift: maxDrift,
      laggingUsers: laggingUsers
    };

    // Cache'e kaydet
    groupStatusCache = result;
    groupStatusCacheTime = now;

    return result;
  } catch (error) {
    if (DEBUG_MODE) console.warn('⚠️ Grup durumu alınamadı:', error);
    return {
      totalViewers: 0,
      laggingCount: 0,
      averageDrift: 0,
      maxDrift: 0,
      laggingUsers: []
    };
  }
}

function updateMyDrift(drift, playbackRate) {
  if (!auth.currentUser || !roomRef || !auth.currentUser.uid) return;
  const userId = auth.currentUser.uid;
  const driftMs = Math.round(drift * 1000);

  if (Math.abs(driftMs - lastDrift) < DRIFT_TOLERANCE_MS &&
      Math.abs(playbackRate - lastPlaybackRate) < DRIFT_TOLERANCE_RATE) {
    return;
  }

  lastDrift = driftMs;
  lastPlaybackRate = playbackRate;

  roomRef.child(`activeViewers/${userId}`).update({
    currentDrift: driftMs,
    playbackRate: playbackRate,
    timestamp: getServerTime()
  }).catch(err => {
    if (DEBUG_MODE) console.warn('⚠️ Drift güncelleme hatası:', err);
  });
}

function startDriftTracking() {
  if (driftUpdateInterval) {
    clearInterval(driftUpdateInterval);
  }

  driftUpdateInterval = setInterval(() => {
    if (!videoElement || !roomRef) return;
    const currentRate = videoElement.playbackRate || 1.0;
    updateMyDrift(lastDrift / 1000, currentRate);
  }, DRIFT_UPDATE_INTERVAL);

  if (DEBUG_MODE) console.log('📊 Drift tracking başlatıldı');
}

function stopDriftTracking() {
  if (driftUpdateInterval) {
    clearInterval(driftUpdateInterval);
    driftUpdateInterval = null;
  }
}

// ============================================
// VİDEO KONTROL
// ============================================

function playVideo() {
  if (!videoElement || !roomRef) return;
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  if (!canControl) {
    requestVideoControl('play');
    return;
  }

  if (DEBUG_MODE) console.log('▶️ Play - ' + SYNC_DELAY + 'ms bekleniyor...');
  const startTime = getServerTime() + SYNC_DELAY;
  const currentTime = videoElement.currentTime;

  roomRef.child('videoState').update({
    isPlaying: false,
    currentTime: currentTime,
    startTimestamp: startTime,
    lastUpdate: getServerTime()
  });

  const urgentUpdate = {
    action: 'play',
    timestamp: getServerTime(),
    currentTime: currentTime,
    startTimestamp: startTime,
    processed: false
  };
  roomRef.child('urgentUpdates').push(urgentUpdate);

  setTimeout(() => {
    if (videoElement) {
      videoElement.play().catch(err => {
        console.error('❌ Play hatası:', err);
        alert('⚠️ Oynatma hatası! Ekrana tıklayın.');
      });
    }
  }, SYNC_DELAY);
}

function pauseVideo() {
  if (!videoElement || !roomRef) return;
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  if (!canControl) {
    requestVideoControl('pause');
    return;
  }

  if (DEBUG_MODE) console.log('⏸️ Pause');
  videoElement.pause();

  roomRef.child('videoState').update({
    isPlaying: false,
    currentTime: videoElement.currentTime,
    startTimestamp: null,
    lastUpdate: getServerTime()
  });

  const urgentUpdate = {
    action: 'pause',
    timestamp: getServerTime(),
    currentTime: videoElement.currentTime,
    processed: false
  };
  roomRef.child('urgentUpdates').push(urgentUpdate);
}

function stopVideo() {
  if (!videoElement || !roomRef) return;
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  if (!canControl) {
    requestVideoControl('stop');
    return;
  }

  if (DEBUG_MODE) console.log('⏹️ Stop');
  videoElement.pause();
  videoElement.currentTime = 0;

  roomRef.child('videoState').update({
    isPlaying: false,
    currentTime: 0,
    startTimestamp: null,
    lastUpdate: getServerTime()
  });
}

// FIX 1: lastSeekTime artık getServerTime() kullanıyor
function seekVideo(seconds) {
  if (!videoElement || !roomRef) return;
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  if (!canControl) {
    requestVideoControl('seek', { seconds });
    return;
  }

  const now = getServerTime(); // FIX: Date.now() → getServerTime()
  if (now - lastSeekTime < SEEK_DEBOUNCE_DELAY) {
    if (DEBUG_MODE) console.log('⏭️ Seek debounced');
    return;
  }

  lastSeekTime = now;
  const newTime = Math.max(0, Math.min(videoElement.duration, videoElement.currentTime + seconds));
  if (DEBUG_MODE) console.log(`⏭️ Seek: ${seconds > 0 ? '+' : ''}${seconds}s → ${newTime.toFixed(1)}s`);

  // Drift tracking'i durdur
  stopDriftTracking();

  // Sync correction'ı devre dışı bırak
  const tempDisable = getServerTime(); // FIX: Date.now() → getServerTime()
  lastSyncDisableTime = tempDisable;

  // Video'yu hemen seek et
  videoElement.currentTime = newTime;
  const isPlaying = !videoElement.paused;

  // Firebase'e async gönder
  Promise.all([
    roomRef.child('videoState').update({
      isPlaying: isPlaying,
      currentTime: newTime,
      startTimestamp: isPlaying ? getServerTime() : null,
      lastUpdate: getServerTime()
    }),
    roomRef.child('urgentUpdates').push({
      action: 'seek',
      timestamp: getServerTime(),
      currentTime: newTime,
      startTimestamp: isPlaying ? getServerTime() : null,
      shouldPlay: isPlaying,
      processed: false
    })
  ]).catch(err => {
    if (DEBUG_MODE) console.warn('⚠️ Seek Firebase hatası:', err);
  });

  // 1000ms sonra sync'i tekrar aç ve drift tracking'i başlat
  setTimeout(() => {
    if (lastSyncDisableTime === tempDisable) {
      lastSyncDisableTime = 0;
      startDriftTracking();
    }
  }, 1000);
}

function seekToPosition(percentage) {
  if (!videoElement || !videoElement.duration) return;
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  if (!canControl) {
    requestVideoControl('seek', { percentage });
    return;
  }

  const targetTime = videoElement.duration * percentage;
  const seekAmount = targetTime - videoElement.currentTime;
  seekVideo(seekAmount);
}

// ============================================
// SENKRONIZASYON MANTIĞI
// ============================================

async function applySyncCorrection(targetTime, targetPlaying, urgentUpdate = false) {
  if (!videoElement) return;

  // Kendi seek'imizden gelen sync'i atla
  if (getServerTime() - lastSyncDisableTime < 1000) { // FIX: Date.now() → getServerTime()
    if (DEBUG_MODE) console.log('⏭️ Sync disabled (own seek)');
    return;
  }

  const currentTime = videoElement.currentTime;
  const drift = Math.abs(targetTime - currentTime);
  const driftMs = drift * 1000;

  if (DEBUG_MODE) console.log(`📊 Drift: ${drift.toFixed(2)}s (${driftMs.toFixed(0)}ms)`);

  // URGENT UPDATE - Tier bypass
  if (urgentUpdate) {
    if (DEBUG_MODE) console.log('⚡ Urgent update - Tier bypass');
    videoElement.currentTime = Math.max(0, targetTime - SEEK_REWIND_SECONDS); // FIX: SEEK_REWIND_SECONDS kullanıldı
    if (targetPlaying) {
      videoElement.play().catch(err => {
        if (DEBUG_MODE) console.warn('⚠️ Play hatası:', err);
      });
    } else {
      videoElement.pause();
    }
    videoElement.playbackRate = 1.0;
    updateMyDrift(0, 1.0);
    return;
  }

  // Grup durumunu al (cache ile race condition fix)
  const groupStatus = await getGroupSyncStatus();
  if (DEBUG_MODE) console.log(`👥 Grup: ${groupStatus.totalViewers} izleyici | ${groupStatus.laggingCount} geride`);

  // TIER 1: Normal (0-3sn)
  if (driftMs < TIER_1_THRESHOLD) {
    if (videoElement.playbackRate !== 1.0) {
      if (DEBUG_MODE) console.log('✅ Tier 1: Normal hız');
      videoElement.playbackRate = 1.0;
    }
    updateMyDrift(drift, 1.0);
  }

  // TIER 2: Hafif catch-up (3-7sn)
  else if (driftMs < TIER_2_THRESHOLD) {
    if (DEBUG_MODE) console.log(`⚡ Tier 2: Hafif hızlanma (${TIER_2_LAGGING_SPEED}x)`);
    videoElement.playbackRate = TIER_2_LAGGING_SPEED;
    updateMyDrift(drift, TIER_2_LAGGING_SPEED);
    showSyncStatus(`⚡ Hızlanıyorsunuz... (${drift.toFixed(1)}sn geride)`);
  }

  // TIER 3: Grup yavaşlama (7-15sn)
  else if (driftMs < TIER_3_THRESHOLD) {
    const isLagging = driftMs > TIER_2_THRESHOLD;
    if (groupStatus.laggingCount >= GROUP_LAGGING_MIN_COUNT) {
      if (isLagging) {
        if (DEBUG_MODE) console.log(`🚀 Tier 3: Hızlanma (${TIER_3_LAGGING_SPEED}x)`);
        videoElement.playbackRate = TIER_3_LAGGING_SPEED;
        showSyncStatus(`🚀 Hızlanıyorsunuz... (${groupStatus.laggingCount} kişi geride)`);
      } else {
        if (DEBUG_MODE) console.log(`⏳ Tier 3: Grup bekliyor (${TIER_3_GROUP_SPEED}x)`);
        videoElement.playbackRate = TIER_3_GROUP_SPEED;
        showSyncStatus(`⏳ Grup bekliyor... (${groupStatus.laggingCount} kişi geride)`);
      }
    } else {
      if (isLagging) {
        if (DEBUG_MODE) console.log(`⚡ Tier 3: Solo hızlanma (${TIER_3_LAGGING_SPEED}x)`);
        videoElement.playbackRate = TIER_3_LAGGING_SPEED;
        showSyncStatus(`⚡ Hızlanıyorsunuz... (${drift.toFixed(1)}sn geride)`);
      } else {
        videoElement.playbackRate = 1.0;
      }
    }
    updateMyDrift(drift, videoElement.playbackRate);
  }

  // TIER CRITICAL: Otomatik senkronizasyon (15sn+) - FIX 3
  else {
    console.error(`❌ Tier Critical: ${drift.toFixed(1)}sn gecikme`);
    
    if (AUTO_RECONNECT_ENABLED && driftMs >= AUTO_RECONNECT_THRESHOLD) {
      if (DEBUG_MODE) console.log('🔄 Otomatik senkronizasyon başlatılıyor...');
      videoElement.currentTime = targetTime - SEEK_REWIND_SECONDS;
      videoElement.playbackRate = 1.0;
      updateMyDrift(0, 1.0);
      showSyncStatus('🔄 Otomatik senkronizasyon yapıldı');
    } else {
      videoElement.playbackRate = 1.0;
      updateMyDrift(drift, 0);
      showSyncStatus('❌ Bağlantı sorunu! Lütfen yeniden katılın (15sn+ gecikme)');
    }
  }

  // Play/Pause durumu
  if (targetPlaying && videoElement.paused) {
    videoElement.play().catch(err => {
      if (DEBUG_MODE) console.warn('⚠️ Play hatası:', err);
    });
  } else if (!targetPlaying && !videoElement.paused) {
    videoElement.pause();
  }
}

// ============================================
// HİBRİT SENKRONIZASYON
// ============================================

function initHybridSync() {
  if (DEBUG_MODE) console.log('🔄 Hibrit senkronizasyon başlatılıyor...');

  initClockSync();
  listenVideoState();
  listenUrgentUpdates();

  if (isRoomOwner) {
    startKeyframeSending();
    processControlRequests();
  } else {
    listenKeyframes();
  }

  startDriftTracking();
  if (DEBUG_MODE) console.log('✅ Hibrit senkronizasyon aktif');
}

function cleanupHybridSync() {
  if (DEBUG_MODE) console.log('🧹 Senkronizasyon temizleniyor...');

  if (clockSyncInterval) {
    clearInterval(clockSyncInterval);
    clockSyncInterval = null;
  }

  if (keyframeInterval) {
    clearInterval(keyframeInterval);
    keyframeInterval = null;
  }

  if (driftUpdateInterval) {
    clearInterval(driftUpdateInterval);
    driftUpdateInterval = null;
  }

  if (roomRef) {
    if (videoStateListener) {
      roomRef.child('videoState').off();
      videoStateListener = null;
    }

    if (urgentUpdatesListener) {
      roomRef.child('urgentUpdates').off();
      urgentUpdatesListener = null;
    }

    if (keyframesListener) {
      roomRef.child('keyframes').off();
      keyframesListener = null;
    }

    if (requestsListener) {
      roomRef.child('requests').off();
      requestsListener = null;
    }
  }

  // Cache temizle
  groupStatusCache = null;
  groupStatusCacheTime = 0;

  if (DEBUG_MODE) console.log('✅ Temizlik tamamlandı');
}

function listenVideoState() {
  if (videoStateListener) roomRef.child('videoState').off();

  videoStateListener = roomRef.child('videoState').on('value', (snapshot) => {
    const state = snapshot.val();
    if (!state || !videoElement) return;

    const { isPlaying, currentTime, startTimestamp } = state;
    let targetTime = currentTime;

    if (isPlaying && startTimestamp) {
      const elapsed = (getServerTime() - startTimestamp) / 1000;
      targetTime = currentTime + elapsed;
    }

    applySyncCorrection(targetTime, isPlaying, false);
  });
}

function startKeyframeSending() {
  if (keyframeInterval) {
    clearInterval(keyframeInterval);
  }

  keyframeInterval = setInterval(() => {
    if (!videoElement || !roomRef) return;

    const now = getServerTime();
    if (now - lastKeyframeTimestamp < KEYFRAME_INTERVAL - 500) {
      return;
    }

    lastKeyframeTimestamp = now;

    const keyframe = {
      timestamp: now,
      currentTime: videoElement.currentTime,
      isPlaying: !videoElement.paused,
      playbackRate: videoElement.playbackRate,
      startTimestamp: !videoElement.paused ? now : null
    };

    roomRef.child('keyframes').push(keyframe);

    const twoMinutesAgo = now - 120000;
    roomRef.child('keyframes').orderByChild('timestamp').endAt(twoMinutesAgo).once('value', (snapshot) => {
      snapshot.forEach((child) => {
        child.ref.remove();
      });
    });

    if (DEBUG_MODE) console.log('📸 Keyframe:', keyframe.currentTime.toFixed(1) + 's');
  }, KEYFRAME_INTERVAL);

  if (DEBUG_MODE) console.log('📸 Keyframe gönderimi başlatıldı');
}

function listenKeyframes() {
  if (keyframesListener) roomRef.child('keyframes').off();

  keyframesListener = roomRef.child('keyframes')
    .orderByChild('timestamp')
    .limitToLast(1)
    .on('child_added', (snapshot) => {
      const keyframe = snapshot.val();
      if (!keyframe || !videoElement) return;

      const age = getServerTime() - keyframe.timestamp;
      if (age > 10000) {
        if (DEBUG_MODE) console.log('📸 Keyframe çok eski:', (age / 1000).toFixed(1) + 's');
        return;
      }

      let targetTime = keyframe.currentTime;
      if (keyframe.isPlaying && keyframe.startTimestamp) {
        const elapsed = (getServerTime() - keyframe.startTimestamp) / 1000;
        targetTime = keyframe.currentTime + elapsed;
      }

      if (DEBUG_MODE) console.log('📸 Keyframe alındı:', targetTime.toFixed(1) + 's');
      applySyncCorrection(targetTime, keyframe.isPlaying, false);
    });
}

function listenUrgentUpdates() {
  if (urgentUpdatesListener) roomRef.child('urgentUpdates').off();

  urgentUpdatesListener = roomRef.child('urgentUpdates')
    .orderByChild('timestamp')
    .startAt(getServerTime())
    .limitToLast(5)
    .on('child_added', (snapshot) => {
      const update = snapshot.val();
      if (!update || !videoElement || update.processed) return;

      const age = getServerTime() - update.timestamp;
      if (age > 10000) {
        snapshot.ref.remove();
        return;
      }

      if (DEBUG_MODE) console.log('⚡ Urgent update:', update.action);

      if (update.action === 'play') {
        const delay = update.startTimestamp - getServerTime();
        if (delay > 0) {
          setTimeout(() => {
            if (videoElement) {
              videoElement.currentTime = update.currentTime;
              videoElement.play().catch(err => {
                if (DEBUG_MODE) console.warn('⚠️ Play hatası:', err);
              });
            }
          }, delay);
        } else {
          const elapsed = (getServerTime() - update.startTimestamp) / 1000;
          const targetTime = update.currentTime + elapsed;
          applySyncCorrection(targetTime, true, true);
        }
      } else if (update.action === 'pause') {
        applySyncCorrection(update.currentTime, false, true);
      } else if (update.action === 'seek') {
        applySyncCorrection(update.currentTime, update.shouldPlay || false, true);
      }

      snapshot.ref.update({ processed: true });
      setTimeout(() => {
        snapshot.ref.remove();
      }, 30000);
    });
}

function requestVideoControl(action, params = {}) {
  if (!roomRef || !auth.currentUser) return;

  if (DEBUG_MODE) console.log('📨 Kontrol isteği:', action);

  const request = {
    userId: auth.currentUser.uid,
    action: action,
    timestamp: getServerTime(),
    processed: false,
    params: params
  };

  roomRef.child('requests').push(request);
  alert(`📨 ${action.toUpperCase()} isteği gönderildi!`);
}

function processControlRequests() {
  if (requestsListener) roomRef.child('requests').off();

  requestsListener = roomRef.child('requests')
    .orderByChild('processed')
    .equalTo(false)
    .limitToLast(5)
    .on('child_added', (snapshot) => {
      const request = snapshot.val();
      if (!request || request.processed) return;

      const age = getServerTime() - request.timestamp;
      if (age > 30000) {
        snapshot.ref.remove();
        return;
      }

      if (DEBUG_MODE) console.log('📨 İstek alındı:', request.action);

      const response = confirm(`📨 Kullanıcı "${request.action}" isteği gönderdi. Kabul ediyor musunuz?`);
      if (response) {
        if (request.action === 'play') {
          playVideo();
        } else if (request.action === 'pause') {
          pauseVideo();
        } else if (request.action === 'stop') {
          stopVideo();
        } else if (request.action === 'seek' && request.params) {
          if (request.params.seconds) {
            seekVideo(request.params.seconds);
          } else if (request.params.percentage) {
            seekToPosition(request.params.percentage);
          }
        }
      }

      snapshot.ref.update({ processed: true });
      setTimeout(() => {
        snapshot.ref.remove();
      }, 60000);
    });
}

// ============================================
// KLAVYE KISAYOLLARI
// ============================================

document.addEventListener('keydown', (e) => {
  if (!videoElement) return;

  if (e.code === 'Space') {
    e.preventDefault();
    if (videoElement.paused) {
      playVideo();
    } else {
      pauseVideo();
    }
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

if (DEBUG_MODE) console.log('✅ Core yüklendi - V2 Fixed Version');
