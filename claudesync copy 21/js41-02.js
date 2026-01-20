
// ========================================
// EKRAN HAREKET FONKSİYONLARI
// ========================================
function moveScreen(dir) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;

    const step = 0.5;

    if (dir === 'up') screenPosition.y += step;
    else if (dir === 'down') screenPosition.y -= step;
    else if (dir === 'left') screenPosition.x -= step;
    else if (dir === 'right') screenPosition.x += step;
    else if (dir === 'forward') screenPosition.z += step;
    else if (dir === 'backward') screenPosition.z -= step;
    else if (dir === 'reset') {
        screenPosition = { x: 0, y: 2, z: -10 };
        currentScreenScale = 1.0;
        screen.setAttribute('scale', '1 1 1');
    }

    screen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
    debugLog('📺 Ekran pozisyon:', screenPosition);
}

// ========================================
// VİDEO KONTROL FONKSİYONLARI (VR Panel için)
// ========================================
function togglePlayPause() {
    if (!videoElement) return;
    
    if (isRoomOwner) {
        if (videoElement.paused) {
            playVideo();
        } else {
            pauseVideo();
        }
    }
}

function seekVideoVR(seconds) {
    if (!videoElement || !isRoomOwner) return;
    
    if (seconds < 0) {
        seekBackward();
    } else {
        seekForward();
    }
}

function stopVideoVR() {
    // Bu fonksiyon artık stopVideo() kullanıyor
    stopVideo();
}

// ========================================
// SEEK BAR (HASSAS TIKLAMA)
// ========================================
function createVRSeekBar(panel) {
    const seekBar = document.createElement('a-entity');
    seekBar.setAttribute('position', '0 -1.1 0.02');

    // Başlık
    const seekTitle = document.createElement('a-text');
    seekTitle.setAttribute('value', 'ZAMAN CUBUGU');
    seekTitle.setAttribute('align', 'center');
    seekTitle.setAttribute('width', '2.5');
    seekTitle.setAttribute('position', '0 0.3 0.01');
    seekTitle.setAttribute('color', '#0ff');
    seekBar.appendChild(seekTitle);

    // Arka plan (tıklanabilir) - daha hassas
    const bgBar = document.createElement('a-plane');
    bgBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth);
    bgBar.setAttribute('height', '0.15');
    bgBar.setAttribute('color', '#555');
    bgBar.setAttribute('class', 'clickable');
    bgBar.setAttribute('id', 'vr-seekbar-bg');
    
    // Hassas tıklama - Lokal koordinat kullanımı
    bgBar.addEventListener('click', (evt) => {
        if (!videoElement || !videoElement.duration || !isRoomOwner) return;
        
        const intersection = evt.detail.intersection;
        if (!intersection) return;

        // Seek bar objesinin world pozisyonunu al
        const seekBarWorldPos = new THREE.Vector3();
        bgBar.object3D.getWorldPosition(seekBarWorldPos);
        
        // Tıklanan noktanın world pozisyonu
        const clickPoint = intersection.point;
        
        // Seek bar'ın world'deki rotasyonunu al
        const seekBarWorldQuaternion = new THREE.Quaternion();
        bgBar.object3D.getWorldQuaternion(seekBarWorldQuaternion);
        
        // Seek bar'ın lokal eksenlerine göre farkı hesapla
        const localClickPoint = clickPoint.clone().sub(seekBarWorldPos);
        localClickPoint.applyQuaternion(seekBarWorldQuaternion.clone().invert());
        
        // X eksenindeki pozisyonu al
        const relativeX = localClickPoint.x;
        const seekBarWidth = VR_UI_CONFIG.seekBarWidth;
        
        // Yüzdeyi hesapla
        const percentage = (relativeX + seekBarWidth / 2) / seekBarWidth;
        const clamped = Math.max(0, Math.min(1, percentage));
        
        debugLog('🎯 Hassas Seek:', (clamped * 100).toFixed(2), '%', '| X:', relativeX.toFixed(3));
        seekToPosition(clamped);
    });
    
    seekBar.appendChild(bgBar);

    // Progress bar
    const progressBar = document.createElement('a-plane');
    progressBar.setAttribute('id', 'vr-progress-bar');
    progressBar.setAttribute('width', '0');
    progressBar.setAttribute('height', '0.15');
    progressBar.setAttribute('color', '#0f0');
    progressBar.setAttribute('position', `-${VR_UI_CONFIG.seekBarWidth / 2} 0 0.01`);
    seekBar.appendChild(progressBar);

    // Time text
    const timeText = document.createElement('a-text');
    timeText.setAttribute('id', 'vr-time-text');
    timeText.setAttribute('value', '0:00 / 0:00');
    timeText.setAttribute('align', 'center');
    timeText.setAttribute('width', '2.5');
    timeText.setAttribute('position', '0 -0.3 0.01');
    timeText.setAttribute('color', '#fff');
    seekBar.appendChild(timeText);

    // Ses göstergesi
    const volumeIndicator = document.createElement('a-text');
    volumeIndicator.setAttribute('id', 'vr-volume-indicator');
    volumeIndicator.setAttribute('value', 'SES: 100%');
    volumeIndicator.setAttribute('align', 'center');
    volumeIndicator.setAttribute('width', '2.5');
    volumeIndicator.setAttribute('position', '0 -0.5 0.01');
    volumeIndicator.setAttribute('color', '#0ff');
    seekBar.appendChild(volumeIndicator);

    // Update loop
    if (seekBarUpdateInterval) {
        clearInterval(seekBarUpdateInterval);
        seekBarUpdateInterval = null;
    }
    seekBarUpdateInterval = setInterval(updateVRSeekBar, 500);
    trackInterval(seekBarUpdateInterval);

    panel.appendChild(seekBar);
}

function updateVRSeekBar() {
    if (!videoElement) return;

    const current = videoElement.currentTime;
    const duration = videoElement.duration;

    if (duration > 0 && isFinite(duration)) {
        const progress = current / duration;
        const progressBar = document.querySelector('#vr-progress-bar');
        const timeText = document.querySelector('#vr-time-text');

        if (progressBar) {
            progressBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth * progress);
            progressBar.setAttribute('position',
                `${-VR_UI_CONFIG.seekBarWidth / 2 + (VR_UI_CONFIG.seekBarWidth * progress) / 2} 0 0.01`
            );
        }

        if (timeText) {
            timeText.setAttribute('value',
                `${formatTimeVR(current)} / ${formatTimeVR(duration)}`
            );
        }
    }
}

function formatTimeVR(seconds) {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekToPosition(percentage) {
    if (!videoElement || !videoElement.duration || !isRoomOwner) return;
    
    const targetTime = videoElement.duration * percentage;
    
    // Mevcut seek mekanizmasını kullan
    lastCommandSource = 'self';
    videoElement.pause();
    videoElement.currentTime = targetTime;
    
    const serverTime = getServerTime();
    db.ref('rooms/' + currentRoomId + '/videoState').update({
        isPlaying: false,
        currentTime: targetTime,
        startTimestamp: serverTime,
        lastUpdate: firebase.database.ServerValue.TIMESTAMP
    });
    
    debugLog('⏩ Seek to:', targetTime.toFixed(2), 'saniye');
    
    trackTimeout(setTimeout(() => {
        lastCommandSource = null;
    }, 300));
}

// ========================================
// VR PANEL CLEANUP
// ========================================
function cleanupVRUIPanel() {
    if (seekBarUpdateInterval) {
        clearInterval(seekBarUpdateInterval);
        seekBarUpdateInterval = null;
    }
    
    const panel = document.getElementById('vr-ui-panel');
    if (panel) {
        panel.remove();
    }
    
    debugLog('🧹 VR UI Panel temizlendi');
}

debugLog('✅ VR Controls yüklendi - Büyük Yazılar + Ortalanmış Versiyonu');