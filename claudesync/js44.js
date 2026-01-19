
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