// ============================================
// PERFORMANS İZLEME
// ============================================

let fpsCounter = 0;
let lastFpsCheck = Date.now();

// FPS izleme fonksiyonu
function monitorPerformance() {
    fpsCounter++;
    
    const now = Date.now();
    if (now - lastFpsCheck >= 1000) {
        const fps = fpsCounter;
        fpsCounter = 0;
        lastFpsCheck = now;
        
        // FPS düşükse uyarı
        if (fps < 30 && performanceMode !== 'low') {
            console.warn(`⚠️ Düşük FPS tespit edildi: ${fps} FPS. Performans modunu "Düşük" olarak ayarlamayı düşünün.`);
        }
        
        // Debug için (opsiyonel)
        // console.log(`FPS: ${fps}`);
    }
    
    requestAnimationFrame(monitorPerformance);
}

// Performans izlemeyi başlat
if (typeof requestAnimationFrame !== 'undefined') {
    monitorPerformance();
}




// ============================================
// HATA YÖNETİMİ
// ============================================

// Global hata yakalama
window.addEventListener('error', (e) => {
    console.error('Global hata yakalandı:', e.error);
    
    // Kritik hatalarda kullanıcıyı bilgilendir
    if (e.message.includes('Firebase') || e.message.includes('database')) {
        console.error('Firebase bağlantı hatası! Lütfen internet bağlantınızı kontrol edin.');
    }
});

// Promise hatalarını yakalama
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise hatası:', e.reason);
});


// ============================================
// DEBUG ARAÇLARI
// ============================================

window.vrCinemaDebug = {
    // Mevcut oda bilgisi
    getRoomInfo: () => {
        return {
            roomId: currentRoomId,
            roomData: currentRoomData,
            isOwner: isRoomOwner,
            nickname: currentUserNickname,
            videoService: videoServiceType,
            screenPosition: screenPosition,
            performanceMode: performanceMode
        };
    },
    
    // Video durumu
    getVideoState: () => {
        if (!videoElement) return 'Video yüklenmedi';
        return {
            paused: videoElement.paused,
            currentTime: videoElement.currentTime,
            duration: videoElement.duration,
            readyState: videoElement.readyState,
            networkState: videoElement.networkState
        };
    },
    
    // Manuel senkronizasyon tetikle
    forceSync: () => {
        if (videoElement && roomRef) {
            roomRef.child('videoState').once('value', (snapshot) => {
                const state = snapshot.val();
                if (state) {
                    videoElement.currentTime = state.currentTime;
                    console.log('✓ Manuel senkronizasyon tamamlandı');
                }
            });
        }
    },
    
    // VR UI'yi zorla göster
    showVRUI: () => {
        document.getElementById('vr-ui-panel').setAttribute('visible', 'true');
        console.log('✓ VR UI gösterildi');
    },
    
    // Tüm dinleyicileri listele
    listListeners: () => {
        console.log('Aktif Firebase Dinleyiciler:');
        console.log('- videoState');
        console.log('- viewers');
        console.log('- owner');
        console.log('- screenPosition');
        console.log('- videoUrl');
        console.log('- messages');
    }
};