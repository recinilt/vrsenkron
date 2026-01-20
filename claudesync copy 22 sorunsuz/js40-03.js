

        // ==================== INIT ====================
        document.addEventListener('DOMContentLoaded', () => {
            console.log('🎬 VR Cinema ULTRA - Optimized v3.7 (P2P WebTorrent Support)');
            updateQualityCapUI();
            setupFileInput(); // P2P dosya seçim event'lerini kur
            
            const scene = document.querySelector('a-scene');
            if (scene) {
                // ✅ FIX: Listener'ları referansla kaydet (cleanup için)
                sceneEnterVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'true');
                        debugLog('👓 VR mode: Raycaster enabled');
                    }
                };
                
                sceneExitVRHandler = () => {
                    const cursor = getCachedElement('vr-cursor');
                    if (cursor) {
                        cursor.setAttribute('visible', 'false');
                        debugLog('👓 VR mode exit: Raycaster disabled');
                    }
                };
                
                scene.addEventListener('enter-vr', sceneEnterVRHandler);
                scene.addEventListener('exit-vr', sceneExitVRHandler);
            }
            
            // ✅ FIX: Keyboard listener'ı referansla kaydet (cleanup için)
            // ✅ FIX: Input focus ve YouTube modu kontrolü eklendi
            keydownHandler = (e) => {
                if (!currentRoomId || !isRoomOwner) return;
                
                // ✅ FIX: Input alanına focus varsa klavye kısayollarını devre dışı bırak
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                
                if (isInputFocused) {
                    return; // Input'a yazıyorken kısayolları çalıştırma
                }
                
                // ✅ FIX: YouTube modunda VR kısayollarını devre dışı bırak
                if (isYouTubeMode) {
                    return; // YouTube modunda klavye kısayolları yok
                }
                
                switch(e.key) {
                    case ' ':
                        e.preventDefault();
                        if (videoElement && videoElement.paused) {
                            playVideo();
                        } else {
                            pauseVideo();
                        }
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        seekBackward();
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        seekForward();
                        break;
                }
            };
            
            document.addEventListener('keydown', keydownHandler);
        });
        
        // Cleanup on page unload
        window.addEventListener('beforeunload', () => {
            fullCleanup();
        });