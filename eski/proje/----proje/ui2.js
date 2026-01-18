

function updateRoomControls() {
  const controlButtons = document.querySelectorAll('.control-button');
  const canControl = isRoomOwner || currentRoomData?.controlMode === 'everyone';
  
  controlButtons.forEach(button => {
    if (canControl) {
      button.classList.remove('disabled');
      button.disabled = false;
    } else {
      button.classList.add('disabled');
      button.disabled = false; // Request için aktif bırak
    }
  });
  
  // Owner badge güncelle
  const ownerBadge = document.getElementById('owner-badge');
  if (ownerBadge) {
    ownerBadge.style.display = isRoomOwner ? 'block' : 'none';
  }
}

function listRooms() {
  roomsRef.once('value').then((snapshot) => {
    const rooms = snapshot.val();
    const list = document.getElementById('rooms-list');
    list.innerHTML = '';
    
    if (!rooms) {
      list.innerHTML = '<div class="loading">Henüz aktif oda yok</div>';
      return;
    }
    
    Object.entries(rooms).forEach(([id, room]) => {
      const item = document.createElement('div');
      item.className = 'room-item';
      
      const name = document.createElement('div');
      name.className = 'room-name';
      name.textContent = room.isPrivate ? `🔒 ${escapeHtml(room.name)}` : escapeHtml(room.name);
      
      const info = document.createElement('div');
      info.className = 'room-info';
      
      // ✅ YENİ: activeViewers sayısını al
      database.ref(`rooms/${id}/activeViewers`).once('value', (snapshot) => {
        const viewerCount = snapshot.numChildren();
        info.textContent = `${viewerCount} kişi • ${ENVIRONMENTS[room.environment]?.name || 'Klasik'}`;
      });
      
      item.appendChild(name);
      item.appendChild(info);
      
      item.addEventListener('click', () => {
        if (room.isPrivate) {
          const pw = prompt('Oda şifresi:');
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
// VİDEO KURULUM (ESKİ OLAN FONKSİYON!)
// ============================================

function setupVideo(videoUrl, screenSize) {
  const url = getVideoUrl(videoUrl);
  if (!url) {
    alert('❌ Video URL hatası!');
    return;
  }
  
  setupVideoTexture(url, screenSize);
  
  // Ortam ayarla
  const scene = document.querySelector('a-scene');
  const env = scene.querySelector('[environment]');
  if (env) {
    env.setAttribute('environment', `preset: ${currentEnvironment}; lighting: distant`);
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
    screen.setAttribute('visible', false);
    scene.appendChild(screen);
  }
  
  // Boyut ayarları
  const sizes = {
    'small': { width: 8, height: 4.5 },
    'medium': { width: 16, height: 9 },
    'large': { width: 24, height: 13.5 },
    'huge': { width: 32, height: 18 },
    'flat': { width: 16, height: 9 },
    '360': { width: 100, height: 100 },
    '180': { width: 50, height: 50 }
  };
  
  const size = sizes[screenSize] || sizes['medium'];
  
  // Geometry ayarla
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
    debugLog('▶️ Oynatmaya hazır');
    screen.setAttribute('visible', true);
  });
  
  videoElement.addEventListener('error', (e) => {
    console.error('❌ Video hatası:', e);
    alert('❌ Video yüklenemedi!');
  });
  
  // Video kaynağını ayarla
  videoElement.src = videoUrl;
  videoElement.load();
  
  // Ekrana video texture'ı bağla
  screen.setAttribute('src', '#video-src');
  
  debugLog('🎬 Video kuruldu:', videoUrl);
}

// ============================================
// ALTYAZI (ESKİ OLAN FONKSİYON!)
// ============================================

function loadSubtitles(url) {
  if (!url) return;
  
  fetch(url)
    .then(r => r.text())
    .then(text => {
      subtitleData = parseSRT(text);
      debugLog('📝 Altyazı:', subtitleData.length, 'satır');
      startSubtitleUpdate();
    })
    .catch(err => console.warn('⚠️ Altyazı hatası:', err));
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
        subs.push({ start, end, text: lines.slice(2).join('\n') });
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
    subtitleElement.setAttribute('visible', false);
    scene.appendChild(subtitleElement);
  }
  
  // Subtitle update interval (100ms yeterli)
  setInterval(() => {
    if (!videoElement || !subtitleData) return;
    
    const t = videoElement.currentTime;
    const sub = subtitleData.find(s => t >= s.start && t <= s.end);
    
    if (sub) {
      subtitleElement.setAttribute('value', sub.text);
      subtitleElement.setAttribute('visible', true);
    } else {
      subtitleElement.setAttribute('visible', false);
    }
  }, 100);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function updateRoomInfo(roomData) {
  currentRoomData = roomData;
  
  // Realtime listener ekle
  roomRef.on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      currentRoomData = data;
      updateRoomInfoDisplay();
    }
  });
  
  updateRoomInfoDisplay();
}

function loadRoomList() {
  listRooms();
}

function showSection(sectionId) {
  const uiOverlay = document.getElementById('ui-overlay');
  const vrControls = document.getElementById('vr-controls');
  const roomInfo = document.getElementById('room-info-display');
  
  if (sectionId === 'room-section') {
    // Odaya giriliyor - UI overlay'i gizle, VR sahneyi göster
    if (uiOverlay) uiOverlay.classList.add('hidden');
    if (vrControls) vrControls.classList.add('visible');
    if (roomInfo) roomInfo.classList.add('visible');
    
    debugLog('🎬 VR sahneye geçildi');
  } else if (sectionId === 'lobby-section') {
    // Lobby'ye dönülüyor - UI overlay'i göster, VR sahneyi gizle
    if (uiOverlay) uiOverlay.classList.remove('hidden');
    if (vrControls) vrControls.classList.remove('visible');
    if (roomInfo) roomInfo.classList.remove('visible');
    
    loadRoomList();
    debugLog('🏠 Lobby\'ye dönüldü');
  }
}

async function loadVideo(videoUrl, screenSize) {
  return new Promise((resolve, reject) => {
    try {
      setupVideo(videoUrl, screenSize);
      
      // Video yüklenene kadar bekle
      if (videoElement) {
        videoElement.addEventListener('canplay', () => resolve(), { once: true });
        videoElement.addEventListener('error', (e) => reject(e), { once: true });
      } else {
        reject(new Error('Video element oluşturulamadı'));
      }
    } catch (error) {
      reject(error);
    }
  });
}

function changeEnvironment(envName) {
  currentEnvironment = envName;
  const scene = document.querySelector('a-scene');
  const env = scene.querySelector('[environment]');
  
  if (env) {
    if (envName === 'none') {
      env.removeAttribute('environment');
    } else {
      env.setAttribute('environment', `preset: ${envName}; lighting: distant`);
    }
  }
  
  debugLog('🌍 Environment:', envName);
}

// ============================================
// SAYFA YÜKLENİNCE
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  debugLog('🎬 UI Yüklendi');
  
  // Video kütüphanesini yükle
  loadVideoLibrary();
  
  // Video library dropdown değişimini dinle
  const videoLibrarySelect = document.getElementById('video-library-select');
  if (videoLibrarySelect) {
    videoLibrarySelect.addEventListener('change', (e) => {
      const videoUrlInput = document.getElementById('video-url-input');
      if (videoUrlInput) {
        if (e.target.value) {
          videoUrlInput.value = e.target.value;
          videoUrlInput.disabled = true;
        } else {
          if (videoUrlInput) videoUrlInput.disabled = false;
        }
      }
    });
  }
  
  debugLog('✅ UI yüklendi - V4 Preload + Owner Presence + Viewers Fix');
});