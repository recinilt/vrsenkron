// ============================================
// BAŞLATMA VE KONSOL LOGOSU
// ============================================

// Component başlatma
document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    
    if (scene.hasLoaded) {
        initComponents();
    } else {
        scene.addEventListener('loaded', initComponents);
    }
});

function initComponents() {
    console.log('✓ VR sahnesi yüklendi, component\'ler başlatılıyor...');
    
    // VR UI handler'ı ekle
    const scene = document.querySelector('a-scene');
    scene.setAttribute('vr-ui-handler', '');
    
    // VR Panel'e proximity handler ekle
    const panel = document.getElementById('vr-ui-panel');
    panel.setAttribute('proximity-ui', '');
    
    // Tüm clickable butonlara handler ekle
    const clickables = document.querySelectorAll('.clickable');
    clickables.forEach(el => {
        el.setAttribute('vr-button-handler', '');
    });
    
    // Seek bar'a handler ekle
    const seekBarBg = document.getElementById('vr-seek-bar-bg');
    if (seekBarBg) {
        seekBarBg.setAttribute('vr-seekbar-handler', '');
        seekBarBg.classList.add('clickable');
    }
    
    // VR Chat Icon'a handler ekle
    const vrChatIcon = document.getElementById('vr-chat-icon');
    if (vrChatIcon) {
        vrChatIcon.setAttribute('vr-chat-icon-handler', '');
    }
    
    // VR Chat Input'a handler ekle
    const vrChatInput = document.getElementById('vr-chat-input-area');
    if (vrChatInput) {
        vrChatInput.setAttribute('vr-chat-input-handler', '');
    }
}

// ============================================
// MOBİL UYUMLULUK
// ============================================
if ('ontouchstart' in window) {
    console.log('📱 Mobil cihaz tespit edildi, touch optimizasyonları yapılıyor...');
    
    // Chat input için mobile keyboard fix
    const chatInput = document.getElementById('chat-message');
    if (chatInput) {
        chatInput.addEventListener('focus', () => {
            setTimeout(() => {
                chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }
    
    // VR butonu için mobil uyarı
    const scene = document.querySelector('a-scene');
    scene.addEventListener('enter-vr', () => {
        console.log('📱 Mobil VR modu aktif');
    });
}

// ============================================
// FIREBASE RECONNECT
// ============================================
database.ref('.info/connected').on('value', (snapshot) => {
    if (snapshot.val() === true) {
        console.log('✓ Firebase bağlantısı aktif');
        
        // Eğer odadaysak, presence'ı güncelle
        if (currentRoomId) {
            roomRef.child('viewers').transaction((current) => {
                return current; // Sadece okuma, değiştirme
            });
        }
    } else {
        console.warn('⚠️ Firebase bağlantısı kesildi, yeniden bağlanılıyor...');
    }
});

// ============================================
// EASTER EGG (KONAMI CODE)
// ============================================
let konamiCode = [];
const konamiSequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];

document.addEventListener('keydown', (e) => {
    konamiCode.push(e.code);
    konamiCode = konamiCode.slice(-10);
    
    if (konamiCode.join(',') === konamiSequence.join(',')) {
        console.log('%c🎮 KONAMI CODE ACTIVATED!', 'font-size: 30px; color: #ff00ff; font-weight: bold;');
        console.log('%c🎉 Tebrikler! Gizli kodu buldunuz!', 'font-size: 16px; color: #00ff00;');
        console.log('%c💡 Geliştirici: Bu projeyi beğendiyseniz yıldız vermeyi unutmayın! ⭐', 'font-size: 14px; color: #ffaa00;');
        
        if (currentRoomId) {
            alert('🎉 Gizli kod etkinleştirildi! Özel efektler aktif!');
        }
    }
});

// ============================================
// KONSOL LOGOSU
// ============================================
console.log('%c🎬 VR Sosyal Sinema - Full Edition', 'font-size: 20px; font-weight: bold; color: #667eea;');
console.log('%c╔════════════════════════════════════════════╗', 'color: #667eea;');
console.log('%cÖzellikler:', 'font-weight: bold; color: #764ba2;');
console.log('%c✓ YouTube Desteği', 'color: #4caf50;');
console.log('%c✓ Google Drive Desteği (API Key gerekli)', 'color: #4caf50;');
console.log('%c✓ HLS Stream Desteği (.m3u8, .ts)', 'color: #4caf50;');
console.log('%c✓ Çoklu Video Format Desteği', 'color: #4caf50;');
console.log('%c✓ 13 Sinema Ortamı (Kişiselleştirilebilir)', 'color: #4caf50;');
console.log('%c✓ Spatial Audio (3D Ses)', 'color: #4caf50;');
console.log('%c✓ Nickname + Chat Sistemi', 'color: #4caf50;');
console.log('%c✓ VR Chat Desteği', 'color: #4caf50;');
console.log('%c✓ Video Sonradan Değiştirme', 'color: #4caf50;');
console.log('%c✓ Ekran Pozisyonu Kontrolü', 'color: #4caf50;');
console.log('%c✓ VR UI (Hover ile Göster/Gizle)', 'color: #4caf50;');
console.log('%c✓ VR Seek Bar (Tıklanabilir)', 'color: #4caf50;');
console.log('%c✓ Performans Modu Seçimi', 'color: #4caf50;');
console.log('%c✓ Oda Sahipliği Transferi', 'color: #4caf50;');
console.log('%c✓ 3 Saniye Tam Senkronizasyon', 'color: #4caf50;');
console.log('%c╚════════════════════════════════════════════╝', 'color: #667eea;');
console.log('%cKlavye Kısayolları:', 'font-weight: bold; color: #764ba2;');
console.log('%c  Space   → Play/Pause', 'color: #999;');
console.log('%c  S       → Stop', 'color: #999;');
console.log('%c  Arrows  → Ekran Pozisyonu (Oda sahibi)', 'color: #999;');
console.log('%c  C       → Chat Aç/Kapa', 'color: #999;');
console.log('%c  G       → Ayarlar Aç/Kapa', 'color: #999;');
console.log('%c╚════════════════════════════════════════════╝', 'color: #667eea;');
console.log('%cDebug Komutları:', 'font-weight: bold; color: #764ba2;');
console.log('%c  vrCinemaDebug.getRoomInfo()    → Oda bilgisi', 'color: #999;');
console.log('%c  vrCinemaDebug.getVideoState()  → Video durumu', 'color: #999;');
console.log('%c  vrCinemaDebug.forceSync()      → Manuel senkronizasyon', 'color: #999;');
console.log('%c  vrCinemaDebug.showVRUI()       → VR UI\'yi göster', 'color: #999;');
console.log('%c  vrCinemaDebug.listListeners()  → Aktif dinleyiciler', 'color: #999;');
console.log('%c╚════════════════════════════════════════════╝', 'color: #667eea;');

// ============================================
// VERSİYON BİLGİSİ
// ============================================
const VERSION = '2.1.0-FULL';
const BUILD_DATE = '2025-01-14';

console.log(`%cVersion: ${VERSION} | Build: ${BUILD_DATE}`, 'color: #999; font-style: italic;');
console.log('%c╚════════════════════════════════════════════╝', 'color: #667eea;');
console.log('%cHazır! İyi eğlenceler! 🎬🍿', 'font-size: 16px; color: #4caf50; font-weight: bold;');
console.log('%c╚════════════════════════════════════════════╝', 'color: #667eea;');

// Sayfa yüklendiğinde
window.addEventListener('load', () => {
    console.log('✓ Sayfa tamamen yüklendi');
});