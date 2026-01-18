
// ============================================
// 3D SAHNE OLUŞTURMA
// ============================================

async function create3DScene(roomData) {
  const scene = document.querySelector('a-scene');
  
  // Eski video ekranını temizle
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
  if (roomData.subtitleUrl) {
    loadSubtitle(roomData.subtitleUrl);
  }
  
  // VR UI panelini oluştur
  if (typeof createVRUIPanel === 'function') {
    createVRUIPanel();
  }
  
  if (DEBUG_MODE) console.log('✅ 3D sahne oluşturuldu');
}

// ============================================
// ALTYAZI YÖNETİMİ
// ============================================

function loadSubtitle(url) {
  fetch(url)
    .then(res => res.text())
    .then(data => {
      subtitleData = parseSRT(data);
      updateSubtitle();
      if (DEBUG_MODE) console.log('✅ Altyazı yüklendi:', subtitleData.length, 'satır');
    })
    .catch(err => {
      if (DEBUG_MODE) console.warn('⚠️ Altyazı yüklenemedi:', err);
    });
}

function parseSRT(data) {
  const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
  const subtitles = [];
  let match;
  
  while ((match = regex.exec(data)) !== null) {
    subtitles.push({
      start: srtTimeToSeconds(match[2]),
      end: srtTimeToSeconds(match[3]),
      text: match[4].trim()
    });
  }
  
  return subtitles;
}

function srtTimeToSeconds(time) {
  const parts = time.split(':');
  const seconds = parts[2].split(',');
  return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(seconds[0]) + parseInt(seconds[1]) / 1000;
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
    document.querySelector('#camera-rig').appendChild(subtitleElement);
  }
  
  subtitleElement.setAttribute('value', current ? current.text : '');
}

// ============================================
// OPTİMİZE EDİLMİŞ: DRIFT TRACKING (2s → 5s)
// + Keyframe içine drift bilgisi eklendi
// ============================================

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
    if (Math.abs(drift - lastDrift) > DRIFT_TOLERANCE_MS || 
        Math.abs(rate - lastPlaybackRate) > DRIFT_TOLERANCE_RATE) {
      
      roomRef.child('activeViewers/' + auth.currentUser.uid).update({
        currentDrift: Math.round(drift),
        playbackRate: rate,
        lastSeen: firebase.database.ServerValue.TIMESTAMP
      }).catch(err => {
        if (DEBUG_MODE) console.warn('⚠️ Drift güncelleme hatası:', err);
      });
      
      lastDrift = drift;
      lastPlaybackRate = rate;
      
      if (DEBUG_MODE) console.log(`📊 Drift: ${Math.round(drift)}ms, Rate: ${rate.toFixed(2)}x`);
    }
  }, DRIFT_UPDATE_INTERVAL)); // 5000ms (OPTİMİZE EDİLDİ)
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

// ============================================
// VİDEO KONTROL FONKSİYONLARI
// ============================================

async function playVideo() {
  if (!videoElement) return;
  
  if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
    const startTimestamp = getServerTime() + SYNC_DELAY;
    
    await roomRef.child('videoState').update({
      isPlaying: true,
      currentTime: videoElement.currentTime,
      startTimestamp: startTimestamp,
      lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    await roomRef.child('urgentUpdates').push({
      action: 'play',
      timestamp: getServerTime(),
      processed: false,
      currentTime: videoElement.currentTime,
      startTimestamp: startTimestamp
    });
    
    showSyncStatus(`▶ ${SYNC_DELAY / 1000} saniye sonra başlayacak...`);
    
    setTimeout(() => {
      if (videoElement) {
        videoElement.play().catch(err => {
          if (DEBUG_MODE) console.warn('⚠️ Play hatası:', err);
        });
      }
      
    }, SYNC_DELAY);
    
  } else {
    requestVideoControl('play');
  }
}

async function pauseVideo() {
  if (!videoElement) return;
  
  if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
    await roomRef.child('videoState').update({
      isPlaying: false,
      currentTime: videoElement.currentTime,
      startTimestamp: null,
      lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    await roomRef.child('urgentUpdates').push({
      action: 'pause',
      timestamp: getServerTime(),
      processed: false,
      currentTime: videoElement.currentTime
    });
    
    videoElement.pause();
    
  } else {
    requestVideoControl('pause');
  }
}

async function stopVideo() {
  if (!videoElement) return;
  
  if (isRoomOwner || currentRoomData.controlMode === 'everyone') {
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
