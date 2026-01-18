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
    
    const oldVideo = document.getElementById('video-src');
    if (oldVideo) {
        oldVideo.pause();
        oldVideo.src = '';
        oldVideo.remove();
    }
    
    const videoAsset = document.createElement('video');
    videoAsset.id = 'video-src';
    videoAsset.crossOrigin = 'anonymous';
    videoAsset.preload = 'auto';
    videoAsset.loop = false;
    videoAsset.playsInline = true;
    videoAsset.muted = false;
    
    // TS video desteği için MIME type ayarla
    if (videoUrl.includes('.ts')) {
        videoAsset.type = 'video/mp2t';
    } else if (videoUrl.includes('.m3u8')) {
        videoAsset.type = 'application/x-mpegURL';
    }
    
    assets.appendChild(videoAsset);
    videoElement = videoAsset;
    
    // Video elementini önce DOM'a ekle, sonra src'yi ayarla
    videoElement.addEventListener('loadedmetadata', () => {
        console.log('✓ Video metadata yüklendi:', videoElement.duration, 'saniye');
        console.log('✓ Video boyutları:', videoElement.videoWidth, 'x', videoElement.videoHeight);
    });
    
    videoElement.addEventListener('loadeddata', () => {
        console.log('✓ Video data yüklendi');
    });
    
    videoElement.addEventListener('canplay', () => {
        console.log('✓ Video oynatmaya hazır');
        screen.setAttribute('visible', 'true');
    });
    
    videoElement.addEventListener('error', (e) => {
        console.error('❌ Video yükleme hatası:', e);
        console.error('❌ Video element error code:', videoElement.error?.code);
        console.error('❌ Video element error message:', videoElement.error?.message);
        showVideoError('load', e, originalUrl);
    });
    
    // Src'yi en son ayarla
    videoElement.src = videoUrl;
    videoElement.load();
    
    screen.setAttribute('src', '#video-src');
    
    console.log('✓ Video elementi oluşturuldu:', videoUrl);
}

function disposeEnvironment() {
    const scene = document.querySelector('a-scene');
    const environment = scene.querySelector('[environment]');
    
    if (environment) {
        environment.parentNode.removeChild(environment);
        console.log('✓ Önceki ortam temizlendi (dispose)');
    }
    
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
        message += '1. <strong>Cloudinary</strong> kullanın (Ücretsiz):<br>';
        message += '   • https://cloudinary.com adresine kaydolun<br>';
        message += '   • Videoyu yükleyin<br>';
        message += '   • URL formatı: res.cloudinary.com/[name]/video/upload/...<br><br>';
        
        message += '2. <strong>Zerostorage.net</strong> kullanın (Ücretsiz):<br>';
        message += '   • https://zerostorage.net adresine gidin<br>';
        message += '   • Videoyu yükleyin<br>';
        message += '   • Embed veya direkt linki kopyalayın<br><br>';
        
        message += '3. <strong>Catbox.moe</strong> kullanın (Ücretsiz):<br>';
        message += '   • https://catbox.moe adresine gidin<br>';
        message += '   • Videoyu yükleyin<br>';
        message += '   • Direkt linki kopyalayın<br><br>';
        
        message += '4. <strong>Bunny.net</strong> kullanın ($1/ay):<br>';
        message += '   • https://bunny.net adresine kaydolun<br>';
        message += '   • Storage Zone oluşturun<br>';
        message += '   • CDN linkini kullanın<br><br>';
        
        message += '5. <strong>Direkt video linki</strong> (.mp4, .webm, .ts, .m3u8)<br>';
        message += '   • Link video formatı ile bitmelidir<br>';
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

console.log('✓ Video kurulum fonksiyonları yüklendi (TS/M3U8 ve Cloudinary desteği eklendi)');