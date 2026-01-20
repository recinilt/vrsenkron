// ============================================
// VR KONTROL PANELİ + SEEK BAR
// Sol tarafta (kullanıcı sola dönüp bakar)
// Ekran hareket, boyut, ses, video kontrolleri
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    const camera = document.querySelector('a-camera');
    if (!camera) return;

    // Eski paneli temizle
    const oldPanel = document.getElementById('vr-ui-panel');
    if (oldPanel) oldPanel.remove();

    // Ana Panel - Camera'nın parent'ına ekle (takip etmesi için)
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
    // VİDEO KONTROL BUTONLARI (STOP EKLENDİ)
    // ========================================
    const videoBtns = [
        { x: -0.1, y: -0.5, label: '<<', desc: '-10SN', action: () => seekVideoVR(-10) },
        { x: 0.2, y: -0.5, label: '>', desc: 'OYNAT', action: () => togglePlayPause() },
        { x: 0.5, y: -0.5, label: '||', desc: 'DUR', action: () => pauseVideo() },
        { x: 0.8, y: -0.5, label: 'S', desc: 'STOP', action: () => stopVideo() },
        { x: 1.1, y: -0.5, label: '>>', desc: '+10SN', action: () => seekVideoVR(10) }
    ];

    videoBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.desc, 0.27, btn.action);
        panel.appendChild(b);
    });

    // Hassas Seek Bar
    createVRSeekBar(panel);

    scene.appendChild(panel);
    debugLog('✅ VR Panel oluşturuldu (Sol taraf - Büyük Yazılar)');
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
// STOP VIDEO FONKSİYONU (2D + VR için ortak)
// pause → 0.5sn → seek 0 → 0.5sn → pause
// ========================================
function stopVideo() {
    if (!isRoomOwner || !videoElement) return;
    
    // 1. Önce pause
    lastCommandSource = 'self';
    videoElement.pause();
    
    // 2. 0.5 saniye bekle, sonra başa sar
    trackTimeout(setTimeout(() => {
        videoElement.currentTime = 0;
        
        // 3. 0.5 saniye bekle, sonra tekrar pause + Firebase güncelle
        trackTimeout(setTimeout(() => {
            videoElement.pause();
            
            const serverTime = getServerTime();
            db.ref('rooms/' + currentRoomId + '/videoState').update({
                isPlaying: false,
                currentTime: 0,
                startTimestamp: serverTime,
                lastUpdate: firebase.database.ServerValue.TIMESTAMP
            });
            
            // Keyframes ve syncState temizle
            db.ref('rooms/' + currentRoomId + '/keyframes').remove();
            db.ref('rooms/' + currentRoomId + '/syncState').remove();
            
            debugLog('⏹️ Stop: Video başa sarıldı');
            
            trackTimeout(setTimeout(() => {
                lastCommandSource = null;
            }, 300));
        }, 500));
    }, 500));
}

// ========================================
// SES KONTROL FONKSİYONLARI
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
// EKRAN BOYUT FONKSİYONLARI
// ========================================
function scaleScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.15;
    
    if (direction === 'up') {
        currentScreenScale = Math.min(3.0, currentScreenScale + step);
    } else if (direction === 'down') {
        currentScreenScale = Math.max(0.3, currentScreenScale - step);
    }
    
    screen.setAttribute('scale', `${currentScreenScale} ${currentScreenScale} ${currentScreenScale}`);
    debugLog('📐 Ekran boyutu:', currentScreenScale.toFixed(2) + 'x');
}