// ============================================
// BAŞLATMA VE İNİTİALİZATİON - ULTIMATE VERSİYON
// ============================================

// Konsol logları
console.log('🎬 VR Sosyal Sinema - Ultimate Versiyon v4.0');
console.log('📍 Yeni Özellikler:');
console.log('   ✅ Çok formatlı video desteği (mp4, webm, ogg, mkv, avi, vb.)');
console.log('   ✅ Altyazı desteği (SRT, VTT, ASS, SSA)');
console.log('   ✅ VR\'da sol tarafta kontrol paneli');
console.log('   ✅ Ekranı hareket ettirme butonları');
console.log('   ✅ VR\'da seek bar ve video kontrolleri');
console.log('   ✅ YouTube API entegrasyonu');
console.log('   ✅ Google Drive video desteği');
console.log('⚙️ Özellikler:');
console.log('   • 5 Hafif Sinema Ortamı');
console.log('   • Oda Sahipliği Transferi');
console.log('   • 1 Saniye Tam Senkronizasyon');
console.log('   • Kontrol Modu Seçimi');
console.log('   • Şifreli Oda Desteği');
console.log('Firebase:', firebase.app().name ? 'Bağlı ✓' : 'Bağlı Değil ✗');

// DOM yüklendiğinde
document.addEventListener('DOMContentLoaded', () => {
    console.log('✓ DOM yüklendi');
    
    // UI elementlerini al
    uiOverlay = document.getElementById('ui-overlay');
    vrControls = document.getElementById('vr-controls');
    roomInfoDisplay = document.getElementById('room-info-display');
    
    // A-Frame sahne yüklendiğinde
    const scene = document.querySelector('a-scene');
    if (scene) {
        scene.addEventListener('loaded', () => {
            console.log('✓ VR sahnesi yüklendi');
        });
        
        scene.addEventListener('enter-vr', () => {
            console.log('✓ VR moduna girildi');
            hideVRControls();
            // VR UI Panel zaten görünür
        });
        
        scene.addEventListener('exit-vr', () => {
            console.log('✓ VR modundan çıkıldı');
            if (currentRoomId) {
                showVRControls();
            }
        });
    }
    
    // Oda listesini yükle
    const roomsListElement = document.getElementById('rooms-list');
    if (roomsListElement) {
        listRooms();
        console.log('✓ Manuel refresh aktif');
    }
    
    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
        if (!currentRoomId || !videoElement) return;
        
        // Space: Oynat/Duraklat
        if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
            togglePlayPause();
        }
        
        // Arrow keys: İleri/Geri
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            seekVideo(10);
        }
        
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            seekVideo(-10);
        }
        
        // Arrow Up/Down: Ekran yukarı/aşağı
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            moveScreen('up');
        }
        
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            moveScreen('down');
        }
        
        // WASD: Ekran hareketi
        if (e.code === 'KeyW') moveScreen('up');
        if (e.code === 'KeyS') moveScreen('down');
        if (e.code === 'KeyA') moveScreen('left');
        if (e.code === 'KeyD') moveScreen('right');
        if (e.code === 'KeyQ') moveScreen('backward');
        if (e.code === 'KeyE') moveScreen('forward');
        
        // R: Ekran pozisyonu sıfırla
        if (e.code === 'KeyR') {
            moveScreen('reset');
        }
        
        // M: Sessiz
        if (e.code === 'KeyM') {
            e.preventDefault();
            videoElement.muted = !videoElement.muted;
            console.log('🔇 Sessiz:', videoElement.muted);
        }
        
        // F: Tam ekran
        if (e.code === 'KeyF') {
            e.preventDefault();
            const sceneEl = document.querySelector('a-scene');
            if (sceneEl) {
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    sceneEl.requestFullscreen();
                }
            }
        }
        
        // C: Altyazı aç/kapa
        if (e.code === 'KeyC') {
            e.preventDefault();
            if (subtitleElement) {
                const isVisible = subtitleElement.getAttribute('visible') === 'true';
                subtitleElement.setAttribute('visible', !isVisible);
                console.log('📝 Altyazı:', !isVisible ? 'Açık' : 'Kapalı');
            }
        }
    });
    
    console.log('✓ Tüm event listener\'lar kuruldu');
    console.log('🎮 Klavye Kısayolları:');
    console.log('   Space: Oynat/Duraklat');
    console.log('   ←/→: 10sn Geri/İleri');
    console.log('   ↑/↓ veya W/S: Ekran Yukarı/Aşağı');
    console.log('   A/D: Ekran Sol/Sağ');
    console.log('   Q/E: Ekran İleri/Geri');
    console.log('   R: Ekran Pozisyonu Sıfırla');
    console.log('   C: Altyazı Aç/Kapa');
    console.log('   M: Sessiz');
    console.log('   F: Tam Ekran');
});

// Sayfa kapatılmadan önce
window.addEventListener('beforeunload', () => {
    if (viewerPresenceRef) {
        viewerPresenceRef.off();
    }
    
    if (roomRef) {
        roomRef.off();
    }
    
    // Video elementi temizle
    if (videoElement) {
        videoElement.pause();
        videoElement.src = '';
    }
    
    // Altyazı temizle
    removeSubtitle();
    
    console.log('👋 Bağlantı kesiliyor...');
});

// Hata yakalama
window.addEventListener('error', (e) => {
    console.error('❌ Global hata:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('❌ Promise hatası:', e.reason);
});

// ============================================
// OTOMATİK TEMİZLEME SİSTEMİ
// ============================================
let consoleLogCount = 0;
const originalConsoleLog = console.log;
const MAX_CONSOLE_LOGS = 1000;

// Console.log sayacı
console.log = function(...args) {
    consoleLogCount++;
    originalConsoleLog.apply(console, args);
};

// Her 2 dakikada bir temizlik
setInterval(() => {
    // Console temizleme
    if (consoleLogCount > MAX_CONSOLE_LOGS) {
        console.clear();
        consoleLogCount = 0;
        console.log('🧹 Console temizlendi (2 dakika geçti)');
    }
    
    // Firebase eski verileri temizle (sadece oda sahibi)
    if (isRoomOwner && roomRef) {
        // Eski urgent updates temizle (10 saniyeden eski)
        const tenSecondsAgo = Date.now() - 10000;
        roomRef.child('urgentUpdates').once('value', (snapshot) => {
            if (!snapshot.exists()) return;
            
            const updates = snapshot.val();
            Object.keys(updates).forEach(key => {
                if (updates[key].timestamp < tenSecondsAgo) {
                    roomRef.child('urgentUpdates').child(key).remove();
                }
            });
        });
        
        // Eski keyframes temizle (30 saniyeden eski)
        const thirtySecondsAgo = Date.now() - 30000;
        roomRef.child('keyframes').once('value', (snapshot) => {
            if (!snapshot.exists()) return;
            
            const keyframes = snapshot.val();
            Object.keys(keyframes).forEach(key => {
                if (keyframes[key].timestamp < thirtySecondsAgo) {
                    roomRef.child('keyframes').child(key).remove();
                }
            });
        });
        
        console.log('🧹 Firebase eski veriler temizlendi');
    }
}, 120000); // 2 dakika = 120000ms

console.log('✓ Otomatik temizleme sistemi aktif (2 dakikada bir)');
console.log('✓ Uygulama başlatıldı - Ultimate Versiyon - Hazır! 🚀');
