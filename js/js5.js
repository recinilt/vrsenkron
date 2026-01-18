function showCreateRoom() {
            getCachedElement('room-list-section').classList.add('hidden');
            getCachedElement('create-room-section').classList.remove('hidden');
        }
        
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

    const initialMagnetURI = currentRoomData && currentRoomData.torrent ? currentRoomData.torrent.magnetURI : null;
    if (initialMagnetURI) {
        joinP2PTorrent(initialMagnetURI);
    } else {
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

        function handleVRButton(action) {
            if (!isRoomOwner) return;
            
            switch(action) {
                case 'play':
                    playVideo();
                    break;
                case 'pause':
                    pauseVideo();
                    break;
                case 'rewind':
                    seekBackward();
                    break;
                case 'forward':
                    seekForward();
                    break;
            }
        }
        
        // ==================== VIDEO CONTROLS (OWNER ONLY) ====================
        let playPromisePending = false;
        
        function playVideo() {
            if (!isRoomOwner || !videoElement) return;
            
            // ✅ If room is in P2P mode, wait until WebTorrent attached a real media stream
            if (currentRoomData && typeof currentRoomData.videoUrl === 'string' && currentRoomData.videoUrl.startsWith('p2p://')) {
                if (!p2pTorrent || !p2pTorrent.files || p2pTorrent.files.length === 0 || videoElement.readyState < 2) {
                    updateSyncUI('⏳ Torrent hazırlanıyor...');
                    playPromisePending = false;
                    return;
                }
            }

            if (syncState && syncState.isBuffering) {
                startSyncCountdown();
                return;
            }
            
            if (playPromisePending) return;
            playPromisePending = true;
            
            lastCommandSource = 'self';
            
            const playPromise = videoElement.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    playPromisePending = false;
                    const serverTime = getServerTime();
                    
                    db.ref('rooms/' + currentRoomId + '/videoState').update({
                        isPlaying: true,
                        currentTime: videoElement.currentTime,
                        startTimestamp: serverTime,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    });
                    
                    // ✅ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        lastCommandSource = null;
                    }, 300));
                }).catch(error => {
                    playPromisePending = false;
                    lastCommandSource = null;
                    
                    if (error.name === 'NotAllowedError') {
                        console.warn('Autoplay blocked - user interaction required');
                    } else if (error.name !== 'AbortError') {
                        console.warn('Play error:', error);
                    }
                });
            } else {
                playPromisePending = false;
                const serverTime = getServerTime();
                db.ref('rooms/' + currentRoomId + '/videoState').update({
                    isPlaying: true,
                    currentTime: videoElement.currentTime,
                    startTimestamp: serverTime,
                    lastUpdate: firebase.database.ServerValue.TIMESTAMP
                });
                // ✅ FIX: Timeout'u track et
                trackTimeout(setTimeout(() => { lastCommandSource = null; }, 300));
            }
        }
        
        function pauseVideo() {
            if (!isRoomOwner || !videoElement) return;
            
            if (playPromisePending) {
                const checkAndPause = () => {
                    if (!playPromisePending) {
                        executePause();
                    } else {
                        setTimeout(checkAndPause, 50);
                    }
                };
                setTimeout(checkAndPause, 50);
                return;
            }
            
            executePause();
        }
        
        function executePause() {
            if (!videoElement) return;
            
            lastCommandSource = 'self';
            
            videoElement.pause();
            
            const currentPos = videoElement.currentTime;
            
            const updates = {
                'videoState/isPlaying': false,
                'videoState/currentTime': currentPos,
                'videoState/startTimestamp': getServerTime(),
                'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
                'keyframes': null,
                'syncState': null
            };
            
            db.ref('rooms/' + currentRoomId).update(updates).then(() => {
                debugLog('⏸️ Pause broadcasted, keyframes/syncState cleared');
            }).catch(err => console.warn('Pause update error:', err));
            
            // ✅ FIX: Timeout'u track et
            trackTimeout(setTimeout(() => {
                lastCommandSource = null;
            }, 300));
        }
