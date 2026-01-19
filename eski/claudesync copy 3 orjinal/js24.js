        
        // ==================== 3D SCENE ====================
        // ✅ FIX #1 & #2: Video listener'ları düzgün yönetim
        async function create3DScene() {
    const scene = document.querySelector('a-scene');
    const assets = document.querySelector('a-assets');

    revokeCurrentVideoURL();

    videoElement = document.createElement('video');
    videoElement.setAttribute('id', 'video-source');
    videoElement.setAttribute('crossorigin', 'anonymous');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    videoElement.setAttribute('preload', 'auto');

    videoElement.listeners = [];

    const handleLoadedMetadata = () => {
        debugLog('📹 Video metadata loaded, duration:', videoElement.duration);
    };

    const handleError = (e) => {
        console.error('Video error:', e);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    videoElement.listeners.push(
        { event: 'loadedmetadata', handler: handleLoadedMetadata },
        { event: 'error', handler: handleError }
    );

    // P2P mi yoksa URL mi kontrol et
    const isP2PRoom = currentRoomData.p2p && currentRoomData.p2p.magnetURI;
    
    if (isP2PRoom && !isRoomOwner) {
        // İzleyici: P2P'den indir
        try {
            showP2PStatus('🔍 P2P bağlantısı kuruluyor...', 0);
            const videoFile = await joinP2PTorrent(currentRoomData.p2p.magnetURI);
            
            // WebTorrent file'ı video element'e bağla
            videoFile.renderTo(videoElement, { autoplay: false }, (err) => {
                if (err) {
                    console.error('Render error:', err);
                    updateP2PStatus('❌ Video yüklenemedi', 0);
                } else {
                    debugLog('✅ P2P video rendered to element');
                }
            });
        } catch (e) {
            console.error('P2P join error:', e);
            updateP2PStatus('❌ P2P hatası: ' + e.message, 0);
        }
    } else if (isP2PRoom && isRoomOwner) {
        // Sahip: Zaten seed ediyoruz, lokal dosyayı kullan
        if (selectedLocalFile) {
            const objectURL = URL.createObjectURL(selectedLocalFile);
            currentVideoObjectURL = objectURL;
            videoElement.src = objectURL;
            showP2PStatus('📤 Paylaşılıyor...', 100);
        }
    } else {
        // Normal URL modu
        setupAdaptiveSource(currentRoomData.videoUrl);
    }

    const playListener = () => {
        if (syncState) return;
        if (currentRoomData.videoState && !currentRoomData.videoState.isPlaying) {
            syncVideoState();
        }
    };

    const pauseListener = () => {
        if (syncState) return;
        if (currentRoomData.videoState && currentRoomData.videoState.isPlaying) {
            syncVideoState();
        }
    };

    const seekedListener = () => {
        if (syncState || isSeeking) return;
        syncVideoState();
    };

    if (isRoomOwner) {
        videoElement.addEventListener('play', playListener);
        videoElement.addEventListener('pause', pauseListener);
        videoElement.addEventListener('seeked', seekedListener);

        videoElement.listeners.push(
            { event: 'play', handler: playListener },
            { event: 'pause', handler: pauseListener },
            { event: 'seeked', handler: seekedListener }
        );
    }

    assets.appendChild(videoElement);

    if (currentRoomData.environment === 'minimal') {
        const sky = document.createElement('a-sky');
        sky.setAttribute('color', '#000');
        scene.appendChild(sky);
    }

    const screenSizes = {
        medium: { width: 8, height: 4.5 },
        large: { width: 10, height: 4.76 },
        imax: { width: 7, height: 10 }
    };
    const size = screenSizes[currentRoomData.screenSize] || screenSizes.medium;

    const videoScreen = document.createElement('a-plane');
    videoScreen.setAttribute('id', 'video-screen');
    videoScreen.setAttribute('position', '0 2 -5');
    videoScreen.setAttribute('width', size.width);
    videoScreen.setAttribute('height', size.height);
    videoScreen.setAttribute('material', 'src: #video-source; shader: flat');
    videoScreen.setAttribute('video-texture-fix', '#video-source');
    scene.appendChild(videoScreen);

    if (isRoomOwner) {
        const panel = document.createElement('a-entity');
        panel.setAttribute('id', 'vr-panel');
        panel.setAttribute('position', '0 1 -2');

        const buttons = [
            { text: '▶', position: '-0.6 0 0', event: 'play' },
            { text: '⏸', position: '-0.2 0 0', event: 'pause' },
            { text: '⏪', position: '0.2 0 0', event: 'rewind' },
            { text: '⏩', position: '0.6 0 0', event: 'forward' }
        ];

        // ✅ FIX: VR button listener'larını track et (cleanup için)
        panel._buttonListeners = [];

        buttons.forEach(btn => {
            const button = document.createElement('a-text');
            button.setAttribute('value', btn.text);
            button.setAttribute('position', btn.position);
            button.setAttribute('align', 'center');
            button.setAttribute('color', '#4ade80');
            button.setAttribute('width', 4);
            button.setAttribute('class', 'clickable');
            
            const clickHandler = () => handleVRButton(btn.event);
            button.addEventListener('click', clickHandler);
            
            // ✅ FIX: Listener'ı kaydet
            panel._buttonListeners.push({ element: button, handler: clickHandler });
            
            panel.appendChild(button);
        });

        scene.appendChild(panel);
    }
}
