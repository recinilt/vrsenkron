// ============================================
// VİDEO SERVİSİ ALGILAMA
// ============================================

function detectVideoService(url) {
    if (!url) return 'unknown';
    
    for (const [service, config] of Object.entries(VIDEO_SERVICES)) {
        if (config.pattern.test(url)) {
            return service;
        }
    }
    
    // Direkt video dosyası kontrolü (TS dahil)
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || 
        url.includes('.ts') || url.includes('.m3u8')) {
        return 'direct';
    }
    
    return 'cors-proxy';
}

function getVideoUrl(inputUrl) {
    if (!inputUrl) return null;
    
    const service = detectVideoService(inputUrl);
    console.log('🔍 Algılanan servis:', service);
    
    // Direkt video dosyası
    if (service === 'direct') {
        return inputUrl;
    }
    
    // Bilinen servisler
    if (VIDEO_SERVICES[service]) {
        const config = VIDEO_SERVICES[service];
        const match = inputUrl.match(config.pattern);
        
        if (match) {
            // Transform fonksiyonuna match yerine inputUrl gönder
            const transformedUrl = config.transform(match.input || inputUrl);
            console.log('✓ Dönüştürülen URL:', transformedUrl);
            return transformedUrl;
        }
    }
    
    // CORS proxy deneme
    if (service === 'cors-proxy') {
        console.log('⚡ Netlify Edge Proxy kullanılıyor...');
        const MY_PROXY = `${window.location.origin}/proxy?url=`;
        return `${MY_PROXY}${encodeURIComponent(inputUrl)}`;
    }
    
    return inputUrl;
}

function extractVideoId(url, service) {
    const config = VIDEO_SERVICES[service];
    if (!config) return null;
    
    const match = url.match(config.pattern);
    return match ? match[1] : null;
}

console.log('✓ Video algılama fonksiyonları yüklendi (TS/M3U8 ve Cloudinary desteği eklendi)');