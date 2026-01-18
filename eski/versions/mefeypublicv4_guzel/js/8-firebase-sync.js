// ============================================
// FİREBASE SENKRONİZASYON SİSTEMİ - TAM SENKRON
// ============================================

function listenToRoomUpdates() {
    if (!roomRef) return;
    
    // Video durumu değişikliklerini dinle
    roomRef.child('videoState').on('value', (snapshot) => {
        if (!videoElement) return;
        
        const state = snapshot.val();
        if (!state) return;
        
        const now = Date.now();
        
        // Video durduruldu veya seek yapıldı (oynatma yok)
        if (!state.isPlaying) {
            if (!videoElement.paused) {
                videoElement.pause();
                console.log('⏸️ Video durduruldu (sync)');
            }
            
            // Seek değişikliği varsa güncelle
            if (Math.abs(videoElement.currentTime - state.currentTime) > 0.5) {
                videoElement.currentTime = state.currentTime;
                console.log(`🎯 Pozisyon senkronize: ${state.currentTime.toFixed(1)}s`);
            }
            return;
        }
        
        // Video başlatılacak (SENKRON)
        if (state.isPlaying && state.startTimestamp) {
            const waitTime = state.startTimestamp - now;
            
            if (waitTime > 100) {
                // Henüz başlama zamanı gelmedi - BEKLENİYOR
                console.log(`⏱️ ${(waitTime/1000).toFixed(1)}s sonra başlayacak`);
                showSyncStatus(`⏱️ ${Math.ceil(waitTime/1000)}s sonra başlıyor...`);
                
                // Pozisyonu hemen ayarla
                if (Math.abs(videoElement.currentTime - state.currentTime) > 0.5) {
                    videoElement.currentTime = state.currentTime;
                }
                
                // Videoyu durdur (henüz başlamadı)
                if (!videoElement.paused) {
                    videoElement.pause();
                }
                
                // Timer kur
                if (syncTimeout) clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    videoElement.currentTime = state.currentTime;
                    videoElement.play().then(() => {
                        console.log('▶️ Video başlatıldı (SENKRON)');
                        console.log(`   → Türkiye: ${new Date().toLocaleTimeString('tr-TR')}`);
                        console.log(`   → İngiltere: ${new Date().toLocaleTimeString('en-GB', {timeZone: 'Europe/London'})}`);
                        console.log(`   → UTC: ${new Date().toISOString()}`);
                    }).catch(err => {
                        console.log('Auto-play engellendi:', err);
                    });
                }, waitTime);
                
            } else if (waitTime > -1000) {
                // Tam şimdi başlamalı (±1 saniye tolerans)
                videoElement.currentTime = state.currentTime;
                videoElement.play().then(() => {
                    console.log('▶️ Video başlatıldı (ANINDA SENKRON)');
                }).catch(err => {
                    console.log('Auto-play engellendi:', err);
                });
                
            } else {
                // Geç kalındı - Gecikmeli başlatma
                const elapsedSeconds = Math.abs(waitTime) / 1000;
                const catchupTime = state.currentTime + elapsedSeconds;
                
                videoElement.currentTime = catchupTime;
                videoElement.play().then(() => {
                    console.log(`▶️ Video başlatıldı (${elapsedSeconds.toFixed(1)}s GECİKMELİ)`);
                    console.log(`   → Hedef: ${state.currentTime.toFixed(1)}s`);
                    console.log(`   → Gerçek: ${catchupTime.toFixed(1)}s`);
                }).catch(err => {
                    console.log('Auto-play engellendi:', err);
                });
            }
        }
    });
    
    // İzleyici sayısı değişikliklerini dinle (throttled)
    const throttledViewerUpdate = throttle(() => {
        updateViewerCount();
    }, 5000);
    
    roomRef.child('viewers').on('value', throttledViewerUpdate);
    
    // Oda sahibi değişikliklerini dinle
    roomRef.child('owner').on('value', (snapshot) => {
        const newOwner = snapshot.val();
        if (newOwner === auth.currentUser.uid && !isRoomOwner) {
            isRoomOwner = true;
            console.log('✓ Oda sahipliği size devredildi!');
            alert('🎉 Oda sahipliği size devredildi! Artık video kontrollerini kullanabilirsiniz.');
        }
    });
    
    console.log('✓ Tam senkron sistem aktif');
    console.log('   → Tüm dünya aynı anda başlar');
    console.log('   → UTC timestamp tabanlı');
    console.log('   → ±1 saniye tolerans');
}

// Throttled versiyon
const updateViewerCount = throttle(function() {
    if (roomRef) {
        roomRef.child('viewers').once('value', (snapshot) => {
            const count = snapshot.val() || 0;
            const viewersCountElement = document.getElementById('viewers-count');
            if (viewersCountElement) {
                viewersCountElement.textContent = count;
            }
        });
    }
}, 5000);

function syncVideoState() {
    if (!roomRef || !videoElement) return;
    
    roomRef.child('videoState').once('value', (snapshot) => {
        const state = snapshot.val();
        if (!state) return;
        
        videoElement.currentTime = state.currentTime;
        
        if (state.isPlaying && videoElement.paused) {
            videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
        } else if (!state.isPlaying && !videoElement.paused) {
            videoElement.pause();
        }
        
        console.log('✓ Video durumu senkronize edildi');
    });
}

console.log('✓ Firebase senkronizasyon sistemi yüklendi');
console.log('   → Timezone-aware (UTC)');
console.log('   → 2sn debounce');
console.log('   → 4sn geri sarma');
console.log('   → Tam senkron başlatma');