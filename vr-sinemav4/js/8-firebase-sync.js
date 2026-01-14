// ============================================
// FİREBASE SENKRONİZASYON SİSTEMİ - OPTİMİZE EDİLMİŞ
// ============================================

function listenToRoomUpdates() {
    if (!roomRef) return;
    
    // Video durumu değişikliklerini dinle
    roomRef.child('videoState').on('value', (snapshot) => {
        if (!videoElement) return;
        
        const state = snapshot.val();
        if (!state) return;
        
        const now = Date.now();
        
        // Video durduruldu
        if (!state.isPlaying && !videoElement.paused) {
            videoElement.pause();
            videoElement.currentTime = state.currentTime;
            console.log('⏸️ Video durduruldu');
            return;
        }
        
        // Video başlatılacak
        if (state.isPlaying && videoElement.paused && state.startTimestamp) {
            const waitTime = state.startTimestamp - now;
            
            if (waitTime > 0) {
                // Henüz başlama zamanı gelmedi
                console.log(`⏱️ ${(waitTime/1000).toFixed(1)}s sonra başlayacak`);
                showSyncStatus(`⏱️ ${Math.ceil(waitTime/1000)}s sonra başlıyor...`);
                
                if (syncTimeout) clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    videoElement.currentTime = state.currentTime;
                    videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                    console.log('▶️ Video başlatıldı (sync)');
                }, waitTime);
            } else {
                // Başlama zamanı geçmiş, gecikmeli başlat
                const elapsedSeconds = Math.abs(waitTime) / 1000;
                const newSeek = state.currentTime + elapsedSeconds;
                
                videoElement.currentTime = newSeek;
                videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                console.log(`▶️ Video başlatıldı (${elapsedSeconds.toFixed(1)}s gecikmeli)`);
            }
        }
    });
    
    // İzleyici sayısı değişikliklerini dinle (throttled)
    const throttledViewerUpdate = throttle(() => {
        updateViewerCount();
    }, 5000);  // 5 saniyede bir
    
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
    
    // ❌ PERİYODİK UPDATE KALDIRILDI
    // Artık sadece önemli olaylarda (play/pause/seek) güncelleme yapılıyor
    console.log('✓ Olay bazlı senkronizasyon aktif (Periyodik update yok)');
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

console.log('✓ Firebase senkronizasyon sistemi yüklendi (Optimize Edilmiş)');
