// ============================================
// VR CONTROLS - MOBILE + DESKTOP + VR SUPPORT
// Cursor otomatik gizleme/gösterme ile
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    // VR CURSOR EKLE (akıllı gizleme ile)
    const cameraRig = document.querySelector('camera-rig') || document.querySelector('[camera]');
    if (cameraRig) {
        let cursor = document.querySelector('#vr-cursor');
        if (!cursor) {
            cursor = document.createElement('a-cursor');
            cursor.setAttribute('id', 'vr-cursor');
            cursor.setAttribute('color', '#00FF00');
            cursor.setAttribute('opacity', '0');
            cursor.setAttribute('fuse', 'false');
            cursor.setAttribute('raycaster', 'objects: .clickable; far: 100');
            
            // Cursor davranışı: sadece clickable objelere yaklaşınca görünsün
            cursor.addEventListener('raycaster-intersected', (evt) => {
                cursor.setAttribute('opacity', '0.8');
            });
            
            cursor.addEventListener('raycaster-intersected-cleared', (evt) => {
                cursor.setAttribute('opacity', '0');
            });
            
            cameraRig.appendChild(cursor);
            debugLog('✅ VR Cursor eklendi (akıllı gizleme aktif)');
        }
    }

    // Eski paneli temizle
    const oldPanel = document.getElementById('vr-ui-panel');
    if (oldPanel) oldPanel.remove();

    const panel = document.createElement('a-entity');
    panel.setAttribute('id', 'vr-ui-panel');
    panel.setAttribute('position', `${VRUICONFIG.position.x} ${VRUICONFIG.position.y} ${VRUICONFIG.position.z}`);
    panel.setAttribute('rotation', `${VRUICONFIG.rotation.x} ${VRUICONFIG.rotation.y} ${VRUICONFIG.rotation.z}`);
    panel.setAttribute('scale', `${VRUICONFIG.scale} ${VRUICONFIG.scale} ${VRUICONFIG.scale}`);

    // ============================================
    // BAŞLIK
    // ============================================
    const title = document.createElement('a-text');
    title.setAttribute('value', 'VR KONTROL PANELI');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '3');
    title.setAttribute('position', '0 1.8 0.01');
    title.setAttribute('color', '#0ff');
    panel.appendChild(title);

    // ============================================
    // BUTONLAR
    // ============================================
    const buttonSpacing = 0.35;
    let yPos = 1.3;

    // Play Button
    const playBtn = createVRButton('PLAY', '#4CAF50', `0 ${yPos} 0.01`, () => {
        playVideo();
        showSyncStatus('▶️ Oynatılıyor');
    });
    panel.appendChild(playBtn);
    yPos -= buttonSpacing;

    // Pause Button
    const pauseBtn = createVRButton('DURDUR', '#FF9800', `0 ${yPos} 0.01`, () => {
        pauseVideo();
        showSyncStatus('⏸️ Duraklatıldı');
    });
    panel.appendChild(pauseBtn);
    yPos -= buttonSpacing;

    // Stop Button
    const stopBtn = createVRButton('BITIR', '#F44336', `0 ${yPos} 0.01`, () => {
        stopVideo();
        showSyncStatus('⏹️ Durduruldu');
    });
    panel.appendChild(stopBtn);
    yPos -= buttonSpacing;

    // Seek Buttons
    const seekBackBtn = createVRButton('-10s', '#2196F3', `-${buttonSpacing} ${yPos} 0.01`, () => {
        seekVideo(-10);
        showSyncStatus('⏪ 10 saniye geri');
    });
    panel.appendChild(seekBackBtn);

    const seekForwardBtn = createVRButton('+10s', '#2196F3', `${buttonSpacing} ${yPos} 0.01`, () => {
        seekVideo(10);
        showSyncStatus('⏩ 10 saniye ileri');
    });
    panel.appendChild(seekForwardBtn);
    yPos -= buttonSpacing;

    // Volume Buttons
    const volDownBtn = createVRButton('SES-', '#9C27B0', `-${buttonSpacing} ${yPos} 0.01`, () => {
        adjustVolume(-0.1);
    });
    panel.appendChild(volDownBtn);

    const volUpBtn = createVRButton('SES+', '#9C27B0', `${buttonSpacing} ${yPos} 0.01`, () => {
        adjustVolume(0.1);
    });
    panel.appendChild(volUpBtn);
    yPos -= buttonSpacing;

    // Mute Button
    const muteBtn = createVRButton('SESİZ', '#607D8B', `0 ${yPos} 0.01`, () => {
        toggleMute();
    });
    panel.appendChild(muteBtn);
    yPos -= buttonSpacing * 1.5;

    // Screen Position Controls
    const upBtn = createVRButton('↑', '#00BCD4', `0 ${yPos} 0.01`, () => {
        moveScreen('up');
    });
    panel.appendChild(upBtn);

    yPos -= buttonSpacing;
    const leftBtn = createVRButton('←', '#00BCD4', `-${buttonSpacing} ${yPos} 0.01`, () => {
        moveScreen('left');
    });
    panel.appendChild(leftBtn);

    const resetBtn = createVRButton('⟲', '#FF5722', `0 ${yPos} 0.01`, () => {
        moveScreen('reset');
        showSyncStatus('🔄 Ekran sıfırlandı');
    });
    panel.appendChild(resetBtn);

    const rightBtn = createVRButton('→', '#00BCD4', `${buttonSpacing} ${yPos} 0.01`, () => {
        moveScreen('right');
    });
    panel.appendChild(rightBtn);

    yPos -= buttonSpacing;
    const downBtn = createVRButton('↓', '#00BCD4', `0 ${yPos} 0.01`, () => {
        moveScreen('down');
    });
    panel.appendChild(downBtn);

    yPos -= buttonSpacing * 1.5;

    // Scale Buttons
    const scaleDownBtn = createVRButton('KÜÇÜLT', '#795548', `-${buttonSpacing} ${yPos} 0.01`, () => {
        scaleScreen(-0.1);
    });
    panel.appendChild(scaleDownBtn);

    const scaleUpBtn = createVRButton('BÜYÜT', '#795548', `${buttonSpacing} ${yPos} 0.01`, () => {
        scaleScreen(0.1);
    });
    panel.appendChild(scaleUpBtn);

    // ============================================
    // SEEK BAR - MOBILE + DESKTOP + VR DESTEĞİ
    // ============================================
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
    bgBar.setAttribute('width', VRUICONFIG.seekBarWidth);
    bgBar.setAttribute('height', '0.15');
    bgBar.setAttribute('color', '#555');
    bgBar.setAttribute('class', 'clickable');
    bgBar.setAttribute('id', 'vr-seekbar-bg');

    // Ortak handler fonksiyonu
    function handleSeekBarClick(intersection, bgBar) {
        if (!videoElement || !videoElement.duration) return;
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
        const seekBarWidth = VRUICONFIG.seekBarWidth;
        
        // Yüzdeyi hesapla
        const percentage = (relativeX + seekBarWidth / 2) / seekBarWidth;
        const clamped = Math.max(0, Math.min(1, percentage));
        
        debugLog('🎯 Hassas Seek:', (clamped * 100).toFixed(2), '%', '| X:', relativeX.toFixed(3));
        seekToPosition(clamped);
    }

    // VR CLICK EVENT (VR gözlük için)
    bgBar.addEventListener('click', (evt) => {
        const intersection = evt.detail.intersection;
        handleSeekBarClick(intersection, bgBar);
    });

    // MOUSE CLICK EVENT (Bilgisayar için)
    bgBar.addEventListener('mousedown', (evt) => {
        if (!videoElement || !videoElement.duration) return;
        
        evt.preventDefault();
        evt.stopPropagation();
        
        // Canvas ve kamera bilgilerini al
        const canvas = document.querySelector('a-scene').canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const camera = document.querySelector('[camera]').getObject3D('camera');
        
        // Normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = ((evt.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((evt.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
        
        // Raycasting
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObject(bgBar.object3D, true);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            handleSeekBarClick(intersection, bgBar);
        }
    });

    // TOUCH EVENT (Mobil için)
    bgBar.addEventListener('touchstart', (evt) => {
        if (!videoElement || !videoElement.duration) return;
        
        evt.preventDefault();
        evt.stopPropagation();
        
        const touch = evt.touches[0] || evt.changedTouches[0];
        
        // Canvas ve kamera bilgilerini al
        const canvas = document.querySelector('a-scene').canvas;
        const canvasRect = canvas.getBoundingClientRect();
        const camera = document.querySelector('[camera]').getObject3D('camera');
        
        // Normalized device coordinates (-1 to +1)
        const mouse = new THREE.Vector2();
        mouse.x = ((touch.clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
        mouse.y = -((touch.clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
        
        // Raycasting
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        
        const intersects = raycaster.intersectObject(bgBar.object3D, true);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            handleSeekBarClick(intersection, bgBar);
        }
    });

    seekBar.appendChild(bgBar);

    // Progress bar
    const progressBar = document.createElement('a-plane');
    progressBar.setAttribute('id', 'vr-progress-bar');
    progressBar.setAttribute('width', '0');
    progressBar.setAttribute('height', '0.15');
    progressBar.setAttribute('color', '#0f0');
    progressBar.setAttribute('position', `-${VRUICONFIG.seekBarWidth / 2} 0 0.01`);
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
    if (seekBarUpdateInterval) clearInterval(seekBarUpdateInterval);
    seekBarUpdateInterval = setInterval(updateVRSeekBar, 500);

    panel.appendChild(seekBar);

    scene.appendChild(panel);
}

function createVRButton(label, color, position, onClick) {
    const button = document.createElement('a-box');
    button.setAttribute('width', VRUICONFIG.buttonSize);
    button.setAttribute('height', VRUICONFIG.buttonSize);
    button.setAttribute('depth', '0.05');
    button.setAttribute('color', color);
    button.setAttribute('position', position);
    button.setAttribute('class', 'clickable');

    const text = document.createElement('a-text');
    text.setAttribute('value', label);
    text.setAttribute('align', 'center');
    text.setAttribute('width', '1.5');
    text.setAttribute('position', '0 0 0.03');
    text.setAttribute('color', '#000');
    button.appendChild(text);

    // VR CLICK EVENT (VR gözlük için)
    button.addEventListener('click', onClick);
    
    // MOUSE CLICK EVENT (Bilgisayar için)
    button.addEventListener('mousedown', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onClick(evt);
    });
    
    // TOUCH EVENT (Mobil için)
    button.addEventListener('touchstart', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        onClick(evt);
    });

    return button;
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
            progressBar.setAttribute('width', VRUICONFIG.seekBarWidth * progress);
            progressBar.setAttribute('position',
                `${-VRUICONFIG.seekBarWidth / 2 + (VRUICONFIG.seekBarWidth * progress) / 2} 0 0.01`
            );
        }
        if (timeText) {
            timeText.setAttribute('value',
                `${formatTime(current)} / ${formatTime(duration)}`
            );
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

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
        currentScale = 1.0;
        screen.setAttribute('scale', '1 1 1');
    }
    screen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
    debugLog('📺 Ekran pozisyon:', screenPosition);
}

function scaleScreen(delta) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    currentScale = Math.max(0.5, Math.min(3.0, currentScale + delta));
    screen.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
    debugLog('🔍 Ekran ölçek:', currentScale.toFixed(2));
}

function adjustVolume(delta) {
    if (!videoElement) return;
    videoElement.volume = Math.max(0, Math.min(1, videoElement.volume + delta));
    const volumeIndicator = document.querySelector('#vr-volume-indicator');
    if (volumeIndicator) {
        volumeIndicator.setAttribute('value', `SES: ${Math.round(videoElement.volume * 100)}%`);
    }
    debugLog('🔊 Ses seviyesi:', Math.round(videoElement.volume * 100) + '%');
}

function toggleMute() {
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
    const volumeIndicator = document.querySelector('#vr-volume-indicator');
    if (volumeIndicator) {
        volumeIndicator.setAttribute('value', videoElement.muted ? 'SESİZ' : `SES: ${Math.round(videoElement.volume * 100)}%`);
    }
    debugLog('🔇 Sessiz mod:', videoElement.muted ? 'Açık' : 'Kapalı');
}

debugLog('✅ VR Controls yüklendi - MOBILE + DESKTOP + VR FULL SUPPORT + AKILLI CURSOR');
