// ============================================
// VR KONTROL PANELİ + SEEK BAR
// ============================================

function createVRUIPanel() {
    const scene = document.querySelector('a-scene');
    const cameraRig = document.querySelector('#camera-rig');
    
    // Ana Panel
    const panel = document.createElement('a-entity');
    panel.setAttribute('id', 'vr-ui-panel');
    panel.setAttribute('position', `${VR_UI_CONFIG.position.x} ${VR_UI_CONFIG.position.y} ${VR_UI_CONFIG.position.z}`);
    panel.setAttribute('rotation', `${VR_UI_CONFIG.rotation.x} ${VR_UI_CONFIG.rotation.y} ${VR_UI_CONFIG.rotation.z}`);
    
    // Arka Plan
    const bg = document.createElement('a-plane');
    bg.setAttribute('width', '2.5');
    bg.setAttribute('height', '3');
    bg.setAttribute('color', '#222');
    bg.setAttribute('opacity', '0.9');
    panel.appendChild(bg);
    
    // Başlık
    const title = document.createElement('a-text');
    title.setAttribute('value', 'KONTROL');
    title.setAttribute('align', 'center');
    title.setAttribute('width', '2');
    title.setAttribute('position', '0 1.3 0.01');
    title.setAttribute('color', '#0f0');
    panel.appendChild(title);
    
    // Ekran Kontrol Butonları
    const screenBtns = [
        { x: 0, y: 0.8, label: '↑', action: () => moveScreen('up') },
        { x: 0, y: 0.2, label: '↓', action: () => moveScreen('down') },
        { x: -0.4, y: 0.5, label: '←', action: () => moveScreen('left') },
        { x: 0.4, y: 0.5, label: '→', action: () => moveScreen('right') },
        { x: -0.8, y: 0.5, label: '+', action: () => moveScreen('forward') },
        { x: 0.8, y: 0.5, label: '-', action: () => moveScreen('backward') },
        { x: 0, y: -0.2, label: '⟲', action: () => moveScreen('reset'), size: 0.4 }
    ];
    
    screenBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, btn.size || VR_UI_CONFIG.buttonSize, btn.action);
        panel.appendChild(b);
    });
    
    // Video Kontrol Butonları
    const videoBtns = [
        { x: -0.6, y: -0.8, label: '⮜', action: () => seekVideo(-10) },
        { x: -0.3, y: -0.8, label: '▶', action: () => videoElement && videoElement.paused ? playVideo() : pauseVideo() },
        { x: 0, y: -0.8, label: '■', action: () => stopVideo() },
        { x: 0.3, y: -0.8, label: '⮞', action: () => seekVideo(10) }
    ];
    
    videoBtns.forEach(btn => {
        const b = createVRButton(btn.x, btn.y, 0.02, btn.label, 0.25, btn.action);
        panel.appendChild(b);
    });
    
    // Seek Bar
    createVRSeekBar(panel);
    
    cameraRig.appendChild(panel);
    
    console.log('✓ VR Panel oluşturuldu');
}

function createVRButton(x, y, z, label, size, onClick) {
    const btn = document.createElement('a-entity');
    btn.setAttribute('position', `${x} ${y} ${z}`);
    
    const circle = document.createElement('a-circle');
    circle.setAttribute('radius', size / 2);
    circle.setAttribute('color', '#44f');
    circle.setAttribute('class', 'clickable');
    btn.appendChild(circle);
    
    const text = document.createElement('a-text');
    text.setAttribute('value', label);
    text.setAttribute('align', 'center');
    text.setAttribute('width', size * 2);
    text.setAttribute('position', '0 0 0.01');
    text.setAttribute('color', '#fff');
    btn.appendChild(text);
    
    circle.addEventListener('mouseenter', () => {
        circle.setAttribute('color', '#66f');
        circle.setAttribute('radius', size / 2 * 1.1);
    });
    
    circle.addEventListener('mouseleave', () => {
        circle.setAttribute('color', '#44f');
        circle.setAttribute('radius', size / 2);
    });
    
    circle.addEventListener('click', onClick);
    
    return btn;
}

function createVRSeekBar(panel) {
    const seekBar = document.createElement('a-entity');
    seekBar.setAttribute('position', '0 -1.2 0.02');
    
    // Arka plan (tıklanabilir)
    const bgBar = document.createElement('a-plane');
    bgBar.setAttribute('width', VR_UI_CONFIG.seekBarWidth);
    bgBar.setAttribute('height', '0.15');
    bgBar.setAttribute('color', '#555');
    bgBar.setAttribute('class', 'clickable');
    bgBar.setAttribute('id', 'vr-seekbar-bg');
    
    bgBar.addEventListener('click', (evt) => {
        if (!videoElement || !videoElement.duration) return;
        
        const intersection = evt.detail.intersection;
        if (!intersection) return;
        
        const localPoint = intersection.point;
        const seekBarWidth = VR_UI_CONFIG.seekBarWidth;
        
        const seekBarWorldPos = new THREE.Vector3();
        bgBar.object3D.getWorldPosition(seekBarWorldPos);
        
        const relativeX = localPoint.x - seekBarWorldPos.x;
        const percentage = (relativeX + seekBarWidth / 2) / seekBarWidth;
        const clamped = Math.max(0, Math.min(1, percentage));
        
        console.log('🎯 Seek bar:', (clamped * 100).toFixed(1), '%');
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
    timeText.setAttribute('width', '2');
    timeText.setAttribute('position', '0 -0.2 0.01');
    timeText.setAttribute('color', '#fff');
    seekBar.appendChild(timeText);
    
    // Update loop
    setInterval(updateVRSeekBar, 500);
    
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
    else if (dir === 'reset') screenPosition = { x: 0, y: 2, z: -10 };
    
    screen.setAttribute('position', `${screenPosition.x} ${screenPosition.y} ${screenPosition.z}`);
    
    console.log('✓ Ekran:', screenPosition);
}

console.log('✓ VR Controls yüklendi');
