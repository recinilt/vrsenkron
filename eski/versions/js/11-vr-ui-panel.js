// ============================================
// VR UI PANEL SİSTEMİ (Sol Tarafta, 90 Derece Dönmüş)
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    const camera = document.querySelector('#camera-rig');
    
    // Ana Panel Container
    vrUIPanel = document.createElement('a-entity');
    vrUIPanel.setAttribute('id', 'vr-ui-panel');
    vrUIPanel.setAttribute('position', 
        `${VR_UI_CONFIG.position.x} ${VR_UI_CONFIG.position.y} ${VR_UI_CONFIG.position.z}`
    );
    vrUIPanel.setAttribute('rotation', 
        `${VR_UI_CONFIG.rotation.x} ${VR_UI_CONFIG.rotation.y} ${VR_UI_CONFIG.rotation.z}`
    );
    
    // Panel Arka Plan
    const panelBg = document.createElement('a-plane');
    panelBg.setAttribute('width', '2.5');
    panelBg.setAttribute('height', '3');
    panelBg.setAttribute('color', '#222222');
    panelBg.setAttribute('opacity', '0.9');
    panelBg.setAttribute('shader', 'flat');
    vrUIPanel.appendChild(panelBg);
    
    // Başlık
    const title = document.createElement('a-text');
    title.setAttribute('value', 'EKRAN KONTROLU');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '2');
    title.setAttribute('position', '0 1.3 0.01');
    title.setAttribute('color', '#00ff00');
    vrUIPanel.appendChild(title);
    
    // Ekran Kontrol Butonları
    createScreenControlButtons(vrUIPanel);
    
    // Video Kontrol Butonları
    createVideoControlButtons(vrUIPanel);
    
    // Seek Bar (Tıklanabilir)
    createVRSeekBar(vrUIPanel);
    
    // Camera rig'e ekle
    camera.appendChild(vrUIPanel);
    
    console.log('✓ VR UI Panel oluşturuldu (Sol tarafta, 90° dönük)');
}

function createScreenControlButtons(panel) {
    const buttonSize = VR_UI_CONFIG.buttonSize;
    const positions = {
        up:    { x: 0,     y: 0.8,  label: '↑', tooltip: 'Yukarı' },
        down:  { x: 0,     y: 0.2,  label: '↓', tooltip: 'Aşağı' },
        left:  { x: -0.4,  y: 0.5,  label: '←', tooltip: 'Sol' },
        right: { x: 0.4,   y: 0.5,  label: '→', tooltip: 'Sağ' },
        forward:  { x: -0.8, y: 0.5, label: '+', tooltip: 'İleri' },
        backward: { x: 0.8,  y: 0.5, label: '-', tooltip: 'Geri' },
        reset: { x: 0, y: -0.2, label: '⟲', size: 0.4, tooltip: 'Sıfırla' }
    };
    
    Object.entries(positions).forEach(([action, pos]) => {
        const btn = createVRButton(
            pos.x, pos.y, 0.02,
            pos.label,
            pos.size || buttonSize,
            () => moveScreen(action),
            pos.tooltip
        );
        panel.appendChild(btn);
    });
}

function createVideoControlButtons(panel) {
    const buttonSize = 0.25;
    const y = -0.8;
    
    const buttons = [
        { x: -0.6, label: '⮜', action: () => seekVideo(-10), tooltip: '-10sn' },
        { x: -0.3, label: '⯈', action: () => togglePlayPause(), tooltip: 'Oynat/Durdur' },
        { x: 0,    label: '⏹', action: () => stopVideo(), tooltip: 'Başa Sar' },
        { x: 0.3,  label: '⮞', action: () => seekVideo(10), tooltip: '+10sn' }
    ];
    
    buttons.forEach(btn => {
        const element = createVRButton(btn.x, y, 0.02, btn.label, buttonSize, btn.action, btn.tooltip);
        panel.appendChild(element);
    });
}

function createVRButton(x, y, z, label, size, onClick, tooltip = null) {
    const button = document.createElement('a-entity');
    button.setAttribute('position', `${x} ${y} ${z}`);
    
    // Buton arka plan
    const bg = document.createElement('a-circle');
    bg.setAttribute('radius', size / 2);
    bg.setAttribute('color', '#4444ff');
    bg.setAttribute('shader', 'flat');
    bg.setAttribute('class', 'clickable');
    button.appendChild(bg);
    
    // Buton metni
    const text = document.createElement('a-text');
    text.setAttribute('value', label);
    text.setAttribute('align', 'center');
    text.setAttribute('width', size * 2);
    text.setAttribute('position', `0 0 0.01`);
    text.setAttribute('color', '#ffffff');
    button.appendChild(text);
    
    // Tooltip (küçük açıklama)
    if (tooltip) {
        const tooltipText = document.createElement('a-text');
        tooltipText.setAttribute('value', tooltip);
        tooltipText.setAttribute('align', 'center');
        tooltipText.setAttribute('width', size * 3);
        tooltipText.setAttribute('position', `0 ${-size * 0.8} 0.01`);
        tooltipText.setAttribute('color', '#aaaaff');
        tooltipText.setAttribute('scale', '0.5 0.5 0.5');
        tooltipText.setAttribute('visible', 'false');
        button.appendChild(tooltipText);
        
        // Hover'da tooltip göster
        bg.addEventListener('mouseenter', () => {
            bg.setAttribute('color', '#6666ff');
            bg.setAttribute('radius', size / 2 * 1.1);
            tooltipText.setAttribute('visible', 'true');
        });
        
        bg.addEventListener('mouseleave', () => {
            bg.setAttribute('color', '#4444ff');
            bg.setAttribute('radius', size / 2);
            tooltipText.setAttribute('visible', 'false');
        });
    } else {
        // Hover effect (tooltip yoksa)
        bg.addEventListener('mouseenter', () => {
            bg.setAttribute('color', '#6666ff');
            bg.setAttribute('radius', size / 2 * 1.1);
        });
        
        bg.addEventListener('mouseleave', () => {
            bg.setAttribute('color', '#4444ff');
            bg.setAttribute('radius', size / 2);
        });
    }
    
    // Click event
    bg.addEventListener('click', onClick);
    
    return button;
}

function createVRSeekBar(panel) {
    vrSeekBar = document.createElement('a-entity');
    vrSeekBar.setAttribute('position', '0 -1.2 0.02');
    
    // Seek bar arka plan (TIKLANABILIR)
    const bgBar = document.createElement('a-plane');
    bgBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth);
    bgBar.setAttribute('height', '0.15');
    bgBar.setAttribute('color', '#555555');
    bgBar.setAttribute('shader', 'flat');
    bgBar.setAttribute('class', 'clickable');  // ← TIKLANABILIR
    bgBar.setAttribute('id', 'vr-seekbar-bg');
    
    // Seek bar click eventi
    bgBar.addEventListener('click', (evt) => {
        if (!videoElement || !videoElement.duration) return;
        
        // Tıklanan pozisyonu hesapla
        const intersection = evt.detail.intersection;
        if (!intersection) return;
        
        // Local koordinatlarda tıklanan X pozisyonu
        const localPoint = intersection.point;
        const seekBarWidth = VR_UI_CONFIG.seekBarWidth;
        
        // Seek bar'ın dünya pozisyonu
        const seekBarWorldPos = new THREE.Vector3();
        bgBar.object3D.getWorldPosition(seekBarWorldPos);
        
        // Relatif pozisyon hesapla (-width/2 ile +width/2 arası)
        const relativeX = localPoint.x - seekBarWorldPos.x;
        
        // Yüzde hesapla (0 ile 1 arası)
        const percentage = (relativeX + seekBarWidth / 2) / seekBarWidth;
        const clampedPercentage = Math.max(0, Math.min(1, percentage));
        
        console.log('🎯 Seek bar tıklandı:', {
            relativeX: relativeX.toFixed(2),
            percentage: (clampedPercentage * 100).toFixed(1) + '%'
        });
        
        seekToPosition(clampedPercentage);
    });
    
    vrSeekBar.appendChild(bgBar);
    
    // Progress bar
    const progressBar = document.createElement('a-plane');
    progressBar.setAttribute('id', 'vr-progress-bar');
    progressBar.setAttribute('width', '0');
    progressBar.setAttribute('height', '0.15');
    progressBar.setAttribute('color', '#00ff00');
    progressBar.setAttribute('shader', 'flat');
    progressBar.setAttribute('position', `-${VR_UI_CONFIG.seekBarWidth / 2} 0 0.01`);
    vrSeekBar.appendChild(progressBar);
    
    // Time text
    const timeText = document.createElement('a-text');
    timeText.setAttribute('id', 'vr-time-text');
    timeText.setAttribute('value', '0:00 / 0:00');
    timeText.setAttribute('align', 'center');
    timeText.setAttribute('width', '2');
    timeText.setAttribute('position', '0 -0.2 0.01');
    timeText.setAttribute('color', '#ffffff');
    vrSeekBar.appendChild(timeText);
    
    // Seek bar update loop
    setInterval(updateVRSeekBar, 500);
    
    panel.appendChild(vrSeekBar);
}

function updateVRSeekBar() {
    if (!videoElement) return;
    
    const currentTime = videoElement.currentTime;
    const duration = videoElement.duration;
    
    if (duration > 0) {
        const progress = currentTime / duration;
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
                `${formatTime(currentTime)} / ${formatTime(duration)}`
            );
        }
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function moveScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.5;
    
    switch(direction) {
        case 'up':
            screenPosition.y += step;
            break;
        case 'down':
            screenPosition.y -= step;
            break;
        case 'left':
            screenPosition.x -= step;
            break;
        case 'right':
            screenPosition.x += step;
            break;
        case 'forward':
            screenPosition.z += step;
            break;
        case 'backward':
            screenPosition.z -= step;
            break;
        case 'reset':
            screenPosition = { x: 0, y: 2, z: -10 };
            break;
    }
    
    screen.setAttribute('position', 
        `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`
    );
    
    console.log('✓ Ekran pozisyonu:', screenPosition);
}

console.log('✓ VR UI Panel sistemi yüklendi (Seek bar tıklanabilir, 2sn debounce)');