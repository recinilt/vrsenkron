
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