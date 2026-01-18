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

    videoElement._listeners = [];

    const handleLoadedMetadata = () => {
        debugLog('📹 Video metadata loaded, duration:', videoElement.duration);
    };

    const handleError = (e) => {
        console.error('Video error:', e);
    };

    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    videoElement.addEventListener('error', handleError);

    videoElement._listeners.push(
        { event: 'loadedmetadata', handler: handleLoadedMetadata },
        { event: 'error', handler: handleError }
    );

    // P2P mi yoksa URL mi kontrol et
    const isP2PRoom = currentRoomData.p2p && currentRoomData.p2p.magnetURI;
    
    if (isP2PRoom && !isRoomOwner) {
        // ✅ İzleyici: P2P ile TÜM VIDEO'yu indir
        try {
            // ✅ Kontrolleri devre dışı bırak
            disableAllControls();
            
            showP2PStatus('🔗 P2P bağlantısı kuruluyor...', 0);
            const videoFile = await joinP2PTorrent(currentRoomData.p2p.magnetURI);
            
            debugLog('✅ Video file ready, starting full download...');
            
            // ✅ TÜM DOSYAYI İNDİRMEYİ ZORLA
            videoFile.select(0, videoFile.length, true);
            
            // ✅ Torrent download progress izle
            const progressInterval = setInterval(() => {
                if (!currentTorrent) {
                    clearInterval(progressInterval);
                    return;
                }
                
                const progress = Math.round(currentTorrent.progress * 100);
                const downloaded = currentTorrent.downloaded;
                const total = currentTorrent.length;
                
                updateP2PStatus(`📥 İndiriliyor: %${progress} (${formatBytes(downloaded)} / ${formatBytes(total)})`, progress);
                
                const stats = `📥 ${formatBytes(currentTorrent.downloadSpeed)}/s | 📤 ${formatBytes(currentTorrent.uploadSpeed)}/s | 👥 ${currentTorrent.numPeers}`;
                updateP2PStats(stats);
                
                // ✅ %100 indiğinde Blob URL oluştur
                if (currentTorrent.progress === 1 && !currentVideoObjectURL) {
                    clearInterval(progressInterval);
                    
                    debugLog('✅ Download complete, creating Blob URL...');
                    updateP2PStatus('✅ İndirme tamamlandı, hazırlanıyor...', 100);
                    
                    // Blob URL oluştur
                    videoFile.getBlobURL((err, blobURL) => {
                        if (err) {
                            console.error('Blob URL error:', err);
                            updateP2PStatus('❌ Video hazırlanamadı', 0);
                            enableAllControls(); // Hata durumunda kontrolleri aç
                            return;
                        }
                        
                        debugLog('✅ Blob URL created:', blobURL);
                        currentVideoObjectURL = blobURL;
                        videoElement.src = blobURL;
                        
                        // ✅ DOWNLOAD TAMAMLANDI - FLAG AKTİF
                        isP2PDownloadComplete = true;
                        
                        // ✅ Kontrolleri aktif et
                        enableAllControls();
                        
                        updateP2PStatus('✅ P2P video hazır! Artık tam kontrol!', 100);
                        
                        // Video hazır olduğunda Firebase state'e göre başlat
                        setTimeout(() => {
                            if (currentRoomData && currentRoomData.videoState && currentRoomData.videoState.isPlaying) {
                                videoElement.play().then(() => {
                                    debugLog('✅ P2P video auto-started');
                                }).catch(err => {
                                    console.warn('P2P autoplay failed:', err);
                                });
                            }
                        }, 1000);
                    });
                }
            }, 500);
            trackInterval(progressInterval);
            
        } catch (e) {
            console.error('P2P join error:', e);
            updateP2PStatus('❌ P2P hatası: ' + e.message, 0);
            enableAllControls(); // Hata durumunda kontrolleri aç
        }
    } else if (isP2PRoom && isRoomOwner) {
        // Sahip: Zaten seed ediyoruz, lokal dosyayı kullan
        if (selectedLocalFile) {
            const objectURL = URL.createObjectURL(selectedLocalFile);
            currentVideoObjectURL = objectURL;
            videoElement.src = objectURL;
            showP2PStatus('📤 Paylaşılıyor...', 100);
            
            // ✅ Owner için P2P complete (lokal dosya)
            isP2PDownloadComplete = true;
        }
    } else {
        // Normal URL modu - P2P yok
        setupAdaptiveSource(currentRoomData.videoUrl);
        isP2PDownloadComplete = true; // URL modunda her zaman aktif
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

        videoElement._listeners.push(
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
            { text: '⸮', position: '-0.2 0 0', event: 'pause' },
            { text: '⪻', position: '0.2 0 0', event: 'rewind' },
            { text: '⪼', position: '0.6 0 0', event: 'forward' }
        ];

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
            
            panel._buttonListeners.push({ element: button, handler: clickHandler });
            
            panel.appendChild(button);
        });

        scene.appendChild(panel);
    }
}

// ✅ YENİ: Kontrolleri devre dışı bırak
function disableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = true;
            btn.style.opacity = '0.4';
            btn.style.cursor = 'not-allowed';
        }
    });
    debugLog('🔒 Controls disabled - P2P downloading');
}

// ✅ YENİ: Kontrolleri aktif et
function enableAllControls() {
    const controls = ['btn-play', 'btn-pause', 'btn-rewind', 'btn-forward', 'btn-sync'];
    controls.forEach(id => {
        const btn = getCachedElement(id);
        if (btn) {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        }
    });
    debugLog('✅ Controls enabled - P2P ready');
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
