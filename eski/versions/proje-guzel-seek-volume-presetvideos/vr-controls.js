// ============================================
// VR KONTROL PANELİ + SEEK BAR - GELİŞTİRİLMİŞ
// Büyük yazılar + ortalanmış + ses kontrolü + ekran boyutu + hassas seek bar
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    const cameraRig = document.querySelector('#camera-rig');

    // Eski paneli temizle
    const oldPanel = document.getElementById('vr-ui-panel');
    if (oldPanel) oldPanel.remove();

    // Ana Panel
    const panel = document.createElement('a-entity');
    panel.setAttribute('id', 'vr-ui-panel');
    panel.setAttribute('position', `${VR_UI_CONFIG.position.x} ${VR_UI_CONFIG.position.y} ${VR_UI_CONFIG.position.z}`);
    panel.setAttribute('rotation', `${VR_UI_CONFIG.rotation.x} ${VR_UI_CONFIG.rotation.y} ${VR_UI_CONFIG.rotation.z}`);

    // Arka Plan (daha büyük panel)
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '3.2');
    bg.setAttribute('height', '4.2');
    bg.setAttribute('color', '#222');
    bg.setAttribute('opacity', '0.9');
    panel.appendChild(bg);

    // Başlık
    const title = document.createElement('a-text');
    title.setAttribute('value', 'KONTROL PANELI');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '3');
    title.setAttribute('position', '0 1.9 0.01');
    title.setAttribute('color', '#0f0');
    panel.appendChild(title);

    // ========================================
    // EKRAN KONTROL BUTONLARI
    // ========================================
    const screenBtns = [
        { x: 0, y: 1.35, label: '^', desc: 'YUKARI', action: () => moveScreen('up') },
        { x: 0, y: 0.75, label: 'v', desc: 'ASAGI', action: () => moveScreen('down') },
        { x: -0.5, y: 1.05, label: '<', desc: 'SOL', action: () => moveScreen('left') },
        { x: 0.5, y: 1.05, label: '>', desc: 'SAG', action: () => moveScreen('right') },
        { x: -1, y: 1.05, label: '+', desc: 'YAKIN', action: () => moveScreen('forward'), size: 0.4 },
        { x: 1, y: 1.05, label: '-', desc: 'UZAK', action: () => moveScreen('backward'), size: 0.4 },
        { x: 0, y: 0.35, label: 'O', desc: 'SIFIRLA', action: () => moveScreen('reset'), size: 0.4 }
    ];

    screenBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.desc, btn.size || VR_UI_CONFIG.buttonSize, btn.action);
        panel.appendChild(b);
    });

    // ========================================
    // EKRAN BOYUT BUTONLARI
    // ========================================
    const scaleBtns = [
        { x: -0.7, y: -0.05, label: '+', desc: 'BUYUT', action: () => scaleScreen('up') },
        { x: 0.7, y: -0.05, label: '-', desc: 'KUCULT', action: () => scaleScreen('down') }
    ];

    scaleBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.desc, 0.3, btn.action);
        panel.appendChild(b);
    });

    // ========================================
    // SES KONTROL BUTONLARI
    // ========================================
    const volumeBtns = [
        { x: -1.1, y: -0.5, label: '-', desc: 'SES-', action: () => adjustVolume(-0.1) },
        { x: -0.7, y: -0.5, label: '+', desc: 'SES+', action: () => adjustVolume(0.1) },
        { x: -0.3, y: -0.5, label: 'M', desc: 'SESSIZ', action: () => toggleMute() }
    ];

    volumeBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.desc, 0.27, btn.action);
        panel.appendChild(b);
    });

    // ========================================
    // VİDEO KONTROL BUTONLARI
    // ========================================
    const videoBtns = [
        { x: 0.2, y: -0.5, label: '<<', desc: '-10SN', action: () => seekVideo(-10) },
        { x: 0.5, y: -0.5, label: '>', desc: 'OYNAT', action: () => videoElement && videoElement.paused ? playVideo() : pauseVideo() },
        { x: 0.8, y: -0.5, label: 'X', desc: 'DUR', action: () => stopVideo() },
        { x: 1.1, y: -0.5, label: '>>', desc: '+10SN', action: () => seekVideo(10) }
    ];

    videoBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.desc, 0.27, btn.action);
        panel.appendChild(b);
    });

    // Hassas Seek Bar
    createVRSeekBar(panel);

    cameraRig.appendChild(panel);
    debugLog('✅ VR Panel oluşturuldu (Büyük Yazılar + Ortalanmış)');
}

function createVRButton(x, y, z, symbol, description, size, onClick) {
    const btn = document.createElement('a-entity');
    btn.setAttribute('position', `${x} ${y} ${z}`);

    // Arka plan daire
    const circle = document.createElement('a-circle');
    circle.setAttribute('radius', size / 2);
    circle.setAttribute('color', '#44f');
    circle.setAttribute('class', 'clickable');
    btn.appendChild(circle);

    // Ana sembol (büyük ve ortalanmış)
    const symbolText = document.createElement('a-text');
    symbolText.setAttribute('value', symbol);
    symbolText.setAttribute('align', 'center');
    symbolText.setAttribute('width', size * 1.8);
    symbolText.setAttribute('position', '0 0.02 0.01');
    symbolText.setAttribute('color', '#fff');
    btn.appendChild(symbolText);

    // Açıklama yazısı (daha büyük ve ortalanmış)
    const descText = document.createElement('a-text');
    descText.setAttribute('value', description);
    descText.setAttribute('align', 'center');
    descText.setAttribute('width', size * 3.5);
    descText.setAttribute('position', '0 -0.15 0.01');
    descText.setAttribute('color', '#aaa');
    btn.appendChild(descText);

    // Hover efektleri
    circle.addEventListener('mouseenter', () => {
        circle.setAttribute('color', '#66f');
        circle.setAttribute('radius', size / 2 * 1.15);
        descText.setAttribute('color', '#fff');
    });

    circle.addEventListener('mouseleave', () => {
        circle.setAttribute('color', '#44f');
        circle.setAttribute('radius', size / 2);
        descText.setAttribute('color', '#aaa');
    });

    circle.addEventListener('click', onClick);

    return btn;
}

// ========================================
// YENİ FONKSİYONLAR: SES KONTROLÜ
// ========================================
function adjustVolume(delta) {
    if (!videoElement) return;
    
    // Mute durumundan çık
    if (videoElement.muted) {
        videoElement.muted = false;
    }
    
    const newVolume = Math.max(0, Math.min(1, videoElement.volume + delta));
    videoElement.volume = newVolume;
    
    debugLog('🔊 Ses:', Math.round(newVolume * 100) + '%');
    showVolumeIndicator(newVolume);
}

function toggleMute() {
    if (!videoElement) return;
    
    videoElement.muted = !videoElement.muted;
    debugLog('🔇 Sessiz:', videoElement.muted);
    
    if (videoElement.muted) {
        showVolumeIndicator(0);
    } else {
        showVolumeIndicator(videoElement.volume);
    }
}

function showVolumeIndicator(volume) {
    const indicator = document.getElementById('vr-volume-indicator');
    if (indicator) {
        const percentage = Math.round(volume * 100);
        indicator.setAttribute('value', `SES: ${percentage}%`);
    }
}

// ========================================
// YENİ FONKSİYONLAR: EKRAN BOYUTU
// ========================================
let currentScale = 1.0;

function scaleScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.15;
    
    if (direction === 'up') {
        currentScale = Math.min(3.0, currentScale + step);
    } else if (direction === 'down') {
        currentScale = Math.max(0.3, currentScale - step);
    }
    
    screen.setAttribute('scale', `${currentScale} ${currentScale} ${currentScale}`);
    debugLog('🔍 Ekran boyutu:', currentScale.toFixed(2) + 'x');
}

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
    bgBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth);
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
    if (seekBarUpdateInterval) clearInterval(seekBarUpdateInterval);
    seekBarUpdateInterval = setInterval(updateVRSeekBar, 500);

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
            progressBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth * progress);
            progressBar.setAttribute('position',
                `${-VR_UI_CONFIG.seekBarWidth / 2 + (VR_UI_CONFIG.seekBarWidth * progress) / 2} 0 0.01`
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

debugLog('✅ VR Controls yüklendi - Büyük Yazılar + Ortalanmış Versiyonu');
