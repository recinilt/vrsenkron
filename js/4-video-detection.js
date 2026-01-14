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
    
    if (url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg')) {
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
            const transformedUrl = config.transform(match);
            console.log('✓ Dönüştürülen URL:', transformedUrl);
            return transformedUrl;
        }
    }
    
    // CORS proxy deneme
    if (service === 'cors-proxy') {
        console.log('🚀 Cloudflare Worker Devrede...');
        
        // Buranın tam olarak böyle olduğundan emin ol:
        const MY_PROXY = "https://v-sinema-proxy.recepyeni.workers.dev/?url=";
        
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

console.log('✓ Video algılama fonksiyonları yüklendi');
