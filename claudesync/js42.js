
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
let currentVRScale = 1.0;

function scaleScreen(direction) {
    const screen = document.getElementById('video-screen');
    if (!screen) return;
    
    const step = 0.15;
    
    if (direction === 'up') {
        currentVRScale = Math.min(3.0, currentVRScale + step);
    } else if (direction === 'down') {
        currentVRScale = Math.max(0.3, currentVRScale - step);
    }
    
    screen.setAttribute('scale', `${currentVRScale} ${currentVRScale} ${currentVRScale}`);
    debugLog('🔍 Ekran boyutu:', currentVRScale.toFixed(2) + 'x');
}
