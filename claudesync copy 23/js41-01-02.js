
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