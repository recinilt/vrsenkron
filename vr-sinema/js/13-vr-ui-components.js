// ============================================
// VR UI A-FRAME COMPONENT'LERİ
// ============================================

// VR UI handler component
AFRAME.registerComponent('vr-ui-handler', {
    init: function() {
        const scene = this.el;
        
        // VR moduna geçiş
        scene.addEventListener('enter-vr', () => {
            document.getElementById('vr-ui-panel').setAttribute('visible', 'true');
            document.getElementById('vr-chat-panel').setAttribute('visible', 'true');
            console.log('✓ VR moduna geçildi, UI gösteriliyor');
        });
        
        // VR modundan çıkış
        scene.addEventListener('exit-vr', () => {
            document.getElementById('vr-ui-panel').setAttribute('visible', 'false');
            document.getElementById('vr-chat-panel').setAttribute('visible', 'false');
            console.log('✓ VR modundan çıkıldı');
        });
    }
});

// VR buton handler component
AFRAME.registerComponent('vr-button-handler', {
    init: function() {
        this.el.addEventListener('click', () => {
            // CRITICAL FIX: Henüz odaya katılmadıysak hiçbir şey yapma
            if (!currentRoomId || !currentRoomData) {
                console.log('⚠️ VR buton tıklandı ama henüz odaya katılınmadı, görmezden gelindi');
                return;
            }

            const buttonId = this.el.id;
            
            switch(buttonId) {
                case 'vr-play-pause-btn':
                    togglePlayPause();
                    updateVRButtonState();
                    break;
                case 'vr-stop-btn':
                    stopVideo();
                    break;
                case 'vr-change-video-btn':
                    showChangeVideoModal();
                    break;
                case 'vr-screen-up':
                    moveScreen('up');
                    break;
                case 'vr-screen-down':
                    moveScreen('down');
                    break;
                case 'vr-screen-left':
                    moveScreen('left');
                    break;
                case 'vr-screen-right':
                    moveScreen('right');
                    break;
                case 'vr-screen-reset':
                    resetScreenPosition();
                    break;
            }
        });
        
        // Hover efekti
        this.el.addEventListener('mouseenter', () => {
            this.el.setAttribute('color', '#764ba2');
        });
        
        this.el.addEventListener('mouseleave', () => {
            const originalColors = {
                'vr-play-pause-btn': '#667eea',
                'vr-stop-btn': '#ff9800',
                'vr-change-video-btn': '#f093fb',
                'vr-screen-up': '#555555',
                'vr-screen-down': '#555555',
                'vr-screen-left': '#555555',
                'vr-screen-right': '#555555',
                'vr-screen-reset': '#444444'
            };
            this.el.setAttribute('color', originalColors[this.el.id] || '#667eea');
        });
    }
});

// Proximity UI component (Hover ile göster/gizle)
AFRAME.registerComponent('proximity-ui', {
    init: function() {
        const panel = this.el;
        let hideTimeout = null;
        
        const cursor = document.getElementById('cursor');
        
        cursor.addEventListener('raycaster-intersection', (evt) => {
            const intersectedEls = evt.detail.els;
            
            // Panel veya panel içindeki bir elemente bakıyorsa
            const lookingAtPanel = intersectedEls.some(el => {
                return el === panel || el.parentElement === panel || 
                       el.classList.contains('clickable');
            });
            
            if (lookingAtPanel) {
                panel.setAttribute('visible', 'true');
                
                // Önceki timeout'u temizle
                if (hideTimeout) clearTimeout(hideTimeout);
                
                // 5 saniye sonra gizle
                hideTimeout = setTimeout(() => {
                    panel.setAttribute('visible', 'false');
                }, 5000);
            }
        });
        
        // Başlangıçta 3 saniye göster
        setTimeout(() => {
            panel.setAttribute('visible', 'true');
            hideTimeout = setTimeout(() => {
                panel.setAttribute('visible', 'false');
            }, 5000);
        }, 1000);
    }
});

// VR Seekbar handler component
AFRAME.registerComponent('vr-seekbar-handler', {
    init: function() {
        this.el.addEventListener('click', (evt) => {
            // Henüz odaya katılmadıysak sessizce çık
            if (!currentRoomId || !currentRoomData) {
                return;
            }
            
            if (!canControlVideo() || !videoElement) return;
            
            const intersection = evt.detail.intersection;
            if (!intersection) return;
            
            const localX = intersection.point.x;
            const barWidth = 2.2;
            const barStartX = -1.1;
            
            // Yüzde hesapla
            const percent = (localX - barStartX) / barWidth;
            const clampedPercent = Math.max(0, Math.min(1, percent));
            
            // Videoyu bu noktaya atla
            const newTime = clampedPercent * videoElement.duration;
            videoElement.currentTime = newTime;
            
            // Firebase'e kaydet
            if (isRoomOwner) {
                roomRef.child('videoState').update({
                    currentTime: newTime,
                    lastUpdate: Date.now()
                });
            }
            
            console.log(`⏩ Seek: ${formatTime(newTime)}`);
        });
    }
});

// VR Chat Icon Handler
AFRAME.registerComponent('vr-chat-icon-handler', {
    init: function() {
        this.el.addEventListener('click', () => {
            toggleVRChat();
        });
        
        // Hover efekti
        this.el.addEventListener('mouseenter', () => {
            this.el.setAttribute('color', '#5a7fd9');
        });
        
        this.el.addEventListener('mouseleave', () => {
            this.el.setAttribute('color', '#4a90e2');
        });
    }
});

// VR Chat Input Handler
AFRAME.registerComponent('vr-chat-input-handler', {
    init: function() {
        this.el.addEventListener('click', () => {
            showVRKeyboard();
        });
        
        // Hover efekti
        this.el.addEventListener('mouseenter', () => {
            this.el.setAttribute('color', '#444444');
        });
        
        this.el.addEventListener('mouseleave', () => {
            this.el.setAttribute('color', '#333333');
        });
    }
});