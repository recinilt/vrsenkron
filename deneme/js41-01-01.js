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