// ============================================
// VİDEO KURULUM FONKSİYONLARI - OPTİMİZE EDİLMİŞ
// ============================================

function setupVideo(videoUrl, screenSize) {
    console.log('🎬 Video ayarlanıyor:', videoUrl);
    
    const originalUrl = videoUrl;
    const processedUrl = getVideoUrl(videoUrl);
    
    if (!processedUrl) {
        showVideoError('invalid', null, originalUrl);
        return;
    }
    
    setupVideoTexture(processedUrl, screenSize, originalUrl);
    
    const scene = document.querySelector('a-scene');
    const environment = scene.querySelector('[environment]');
    
    if (environment) {
        environment.setAttribute('environment', {
            preset: currentEnvironment,
            lighting: 'distant',
            lightPosition: { x: 0, y: 1, z: 0 }
        });
    }
    
    console.log('✓ Ortam değiştirildi:', currentEnvironment);
}

function setupVideoTexture(videoUrl, screenSize, originalUrl) {
    const scene = document.querySelector('a-scene');
    const screen = document.getElementById('video-screen');
    
    if (!screen) {
        console.error('❌ Ekran elementi bulunamadı!');
        return;
    }
    
    // Ekran geometrisini ayarla
    const size = {
        'flat': { width: 16, height: 9 },
        '360': { width: 100, height: 100 },
        '180': { width: 50, height: 50 }
    }[screenSize] || { width: 16, height: 9 };
    
    if (screenSize === '360') {
        screen.setAttribute('geometry', {
            primitive: 'sphere',
            radius: 50,
            segmentsWidth: 64,
            segmentsHeight: 64
        });
        screen.setAttribute('material', 'side: back');
        screen.setAttribute('scale', '-1 1 1');
    } else if (screenSize === '180') {
        screen.setAttribute('geometry', {
            primitive: 'sphere',
            radius: 25,
            segmentsWidth: 64,
            segmentsHeight: 32,
            thetaStart: 0,
            thetaLength: 180
        });
        screen.setAttribute('material', 'side: back');
        screen.setAttribute('scale', '-1 1 1');
    } else {
        screen.setAttribute('geometry', {
            primitive: 'plane',
            width: size.width,
            height: size.height
        });
        screen.removeAttribute('scale');
    }
    
    screen.setAttribute('width', size.width);
    screen.setAttribute('height', size.height);
    
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }
    
    // Eski video asset varsa temizle
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = '';
        oldVideo.remove();
    }
    
    const videoAsset = document.createElement('video');
    videoAsset.id = 'video-src';
    videoAsset.crossOrigin = 'anonymous';
    videoAsset.src = videoUrl;
    videoAsset.preload = 'auto';
    videoAsset.loop = false;
    videoAsset.playsInline = true;
    
    assets.appendChild(videoAsset);
    videoElement = videoAsset;
    
    screen.setAttribute('src', '#video-src');
    screen.setAttribute('visible', 'true');
    
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('✓ Video yüklendi:', videoElement.duration, 'saniye');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('❌ Video yükleme hatası:', e);
        showVideoError('load', e, originalUrl);
    });
}

// ✅ YENİ: Ortam Dispose Mekanizması
function disposeEnvironment() {
    const scene = document.querySelector('a-scene');
    const environment = scene.querySelector('[environment]');
    
    if (environment) {
        // A-Frame entity'yi tamamen kaldır
        environment.parentNode.removeChild(environment);
        console.log('✓ Önceki ortam temizlendi (dispose)');
    }
    
    // Yeni environment entity oluştur
    const newEnv = document.createElement('a-entity');
    newEnv.setAttribute('environment', '');
    scene.appendChild(newEnv);
    
    return newEnv;
}

function showVideoError(type, error, url) {
    const service = detectVideoService(url);
    let message = '❌ <strong>Video Yüklenemedi!</strong><br><br>';
    
    if (type === 'load') {
        message += '<strong>Sebep:</strong><br>';
        message += '• URL yanlış veya erişilemiyor<br>';
        message += '• Video formatı desteklenmiyor<br>';
        message += '• CORS sorunu<br><br>';
    }
    
    message += '<strong>Çözüm Önerileri:</strong><br>';
    
    if (service === 'unknown' || service === 'cors-proxy') {
        message += '1. <strong>Catbox.moe</strong> kullanın (Ücretsiz):<br>';
        message += '   • https://catbox.moe adresine gidin<br>';
        message += '   • Videoyu yükleyin<br>';
        message += '   • Direkt linki kopyalayın<br><br>';
        
        message += '2. <strong>Bunny.net</strong> kullanın ($1/ay):<br>';
        message += '   • https://bunny.net adresine kaydolun<br>';
        message += '   • Storage Zone oluşturun<br>';
        message += '   • CDN linkini kullanın<br><br>';
        
        message += '3. <strong>Direkt .mp4 linki</strong> bulun<br>';
        message += '   • Link .mp4 ile bitmelidir<br>';
        message += '   • CORS izni olmalıdır<br>';
    } else {
        message += '• Linkin doğru olduğundan emin olun<br>';
        message += '• Başka bir video deneyin<br>';
        message += '• Tarayıcı konsolunu kontrol edin (F12)<br>';
    }
    
    const overlay = document.getElementById('ui-overlay');
    overlay.classList.remove('hidden');
    overlay.querySelector('.ui-container').innerHTML = `
        <h1>🎬 VR Sosyal Sinema</h1>
        <div class="error-box">${message}</div>
        <button onclick="location.reload()">◀ Ana Menüye Dön</button>
    `;
}

console.log('✓ Video kurulum fonksiyonları yüklendi (Dispose mekanizması eklendi)');
