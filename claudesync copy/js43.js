
// ========================================
// GELİŞTİRİLMİŞ SEEK BAR (HASSAS TIKLAMA)
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
    bgBar.setAttribute('width', '1.8');
    bgBar.setAttribute('height', '0.15');
    bgBar.setAttribute('color', '#555');
    bgBar.setAttribute('class', 'clickable');
    bgBar.setAttribute('id', 'vr-seekbar-bg');
    
    // GELİŞTİRİLMİŞ TIKLAMA - Lokal koordinat kullanımı
    bgBar.addEventListener('click', (evt) => {
        if (!videoElement || !videoElement.duration) return;
        
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
        const seekBarWidth = 1.8;
        
        // Yüzdeyi hesapla
        const percentage = (relativeX + seekBarWidth / 2) / seekBarWidth;
        const clamped = Math.max(0, Math.min(1, percentage));
        
        debugLog('🎯 Hassas Seek:', (clamped * 100).toFixed(2), '%', '| X:', relativeX.toFixed(3));
        seekToPositionVR(clamped);
    });
    
    seekBar.appendChild(bgBar);

    // Progress bar
    const progressBar = document.createElement('a-plane');
    progressBar.setAttribute('id', 'vr-progress-bar');
    progressBar.setAttribute('width', '0');
    progressBar.setAttribute('height', '0.15');
    progressBar.setAttribute('color', '#0f0');
    progressBar.setAttribute('position', '-0.9 0 0.01');
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
    if (vrSeekBarUpdateInterval) clearInterval(vrSeekBarUpdateInterval);
    vrSeekBarUpdateInterval = setInterval(updateVRSeekBar, 500);

    panel.appendChild(seekBar);
}

function updateVRSeekBar() {
    if (!videoElement) return;

    const current = videoElement.currentTime;
    const duration = videoElement.duration;

    if (duration > 0) {
        const progress = current / duration;
        const progressBar = document.querySelector('#vr-progress-bar');
        const timeText = document.querySelector('#vr-time-text');

        if (progressBar) {
            progressBar.setAttribute('width', 1.8 * progress);
            progressBar.setAttribute('position',
                `${-0.9 + (1.8 * progress) / 2} 0 0.01`
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
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function seekToPositionVR(percentage) {
    if (!videoElement || !isRoomOwner) return;
    
    const targetTime = videoElement.duration * percentage;
    
    if (isSeeking || isHardSeeking) return;
    if (videoElement.readyState < 1) return;

    isSeeking = true;

    const clampedTime = Math.max(0, Math.min(videoElement.duration || Infinity, targetTime));

    lastCommandSource = 'self';
    videoElement.pause();

    let seekCompleted = false;

    const onSeeked = () => {
        if (seekCompleted) return;
        seekCompleted = true;
        videoElement.removeEventListener('seeked', onSeeked);

        const newPos = videoElement.currentTime;
        const updates = {
            'videoState/isPlaying': false,
            'videoState/currentTime': newPos,
            'videoState/startTimestamp': getServerTime(),
            'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
            'keyframes': null,
            'syncState': null
        };

        db.ref(`rooms/${currentRoomId}`).update(updates)
            .then(() => {
                debugLog(`Seek VR complete, paused at`, newPos);
                isSeeking = false;
            })
            .catch(err => {
                console.warn('Seek update error:', err);
                isSeeking = false;
            });

        trackTimeout(setTimeout(() => { lastCommandSource = null; }, 2500));
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = clampedTime;

    trackTimeout(setTimeout(() => {
        if (!seekCompleted) {
            isSeeking = false;
            debugLog('Seek timeout - forcing completion');
            onSeeked();
        }
    }, 2000));
}

function moveScreen(dir) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;

    const currentPos = screen.getAttribute('position');
    let x = currentPos.x;
    let y = currentPos.y;
    let z = currentPos.z;

    const step = 0.5;

    if (dir === 'up') y += step;
    else if (dir === 'down') y -= step;
    else if (dir === 'left') x -= step;
    else if (dir === 'right') x += step;
    else if (dir === 'forward') z += step;
    else if (dir === 'backward') z -= step;
    else if (dir === 'reset') {
        // Ekranı orijinal pozisyonuna getir
        const size = currentRoomData.screenSize;
        const screenSizes = {
            medium: { width: 8, height: 4.5 },
            large: { width: 10, height: 4.76 },
            imax: { width: 7, height: 10 }
        };
        
        screen.setAttribute('position', '0 2 -5');
        currentVRScale = 1.0;
        screen.setAttribute('scale', '1 1 1');
        debugLog('🔄 Ekran sıfırlandı');
        return;
    }

    screen.setAttribute('position', `${x} ${y} ${z}`);
    debugLog('📺 Ekran pozisyon:', { x, y, z });
}

debugLog('✅ VR Controls yüklendi - Büyük Yazılar + Ortalanmış Versiyon');