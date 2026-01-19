// ============================================
// YOUTUBE ARAMA SİSTEMİ
// YouTube Data API v3 ile video arama
// Oda sahibi odadan çıkmadan video değiştirebilir
// ============================================

// ==================== VARIABLES ====================
let ytSearchLoading = false;
let ytSearchResults = [];

// ==================== YOUTUBE SEARCH FUNCTIONS ====================

// YouTube'da video ara
async function searchYouTube(query) {
    if (!query || query.trim() === '') {
        showYTSearchError('Arama terimi giriniz');
        return;
    }
    
    if (YOUTUBE_API_KEY === 'YOUR_API_KEY_HERE' || !YOUTUBE_API_KEY) {
        showYTSearchError('YouTube API Key ayarlanmamış! js02.js dosyasında YOUTUBE_API_KEY değerini güncelleyin.');
        return;
    }
    
    if (ytSearchLoading) return;
    
    ytSearchLoading = true;
    updateYTSearchUI('loading');
    
    try {
        const encodedQuery = encodeURIComponent(query.trim());
        const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&maxResults=10&q=${encodedQuery}&key=${YOUTUBE_API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message || 'API hatası');
        }
        
        if (!data.items || data.items.length === 0) {
            showYTSearchError('Sonuç bulunamadı');
            ytSearchResults = [];
        } else {
            ytSearchResults = data.items;
            renderYTSearchResults(data.items);
        }
        
    } catch (error) {
        console.error('YouTube search error:', error);
        showYTSearchError('Arama hatası: ' + error.message);
    } finally {
        ytSearchLoading = false;
        updateYTSearchUI('idle');
    }
}

// Arama sonuçlarını göster
function renderYTSearchResults(items) {
    const container = document.getElementById('yt-search-results');
    if (!container) return;
    
    container.innerHTML = '';
    container.style.display = 'block';
    
    items.forEach((item, index) => {
        const videoId = item.id.videoId;
        const title = item.snippet.title;
        const channelTitle = item.snippet.channelTitle;
        const thumbnail = item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url;
        
        const resultItem = document.createElement('div');
        resultItem.className = 'yt-search-result-item';
        resultItem.innerHTML = `
            <img src="${thumbnail}" alt="${title}" class="yt-search-thumb">
            <div class="yt-search-info">
                <div class="yt-search-title">${escapeHtml(title)}</div>
                <div class="yt-search-channel">${escapeHtml(channelTitle)}</div>
            </div>
        `;
        
        resultItem.addEventListener('click', () => selectYTSearchResult(videoId, title));
        container.appendChild(resultItem);
    });
}

// Arama sonucundan video seç
async function selectYTSearchResult(videoId, title) {
    if (!isRoomOwner) {
        alert('Sadece oda sahibi video değiştirebilir');
        return;
    }
    
    if (!videoId) return;
    
    debugLog('🎬 Seçilen video:', videoId, title);
    
    // Arama sonuçlarını gizle
    hideYTSearchResults();
    
    // Arama inputunu temizle
    const searchInput = document.getElementById('yt-search-input');
    if (searchInput) searchInput.value = '';
    
    try {
        // Firebase'de YouTube video bilgilerini güncelle
        await db.ref('rooms/' + currentRoomId).update({
            'youtube/videoId': videoId,
            'videoState/isPlaying': false,
            'videoState/currentTime': 0,
            'videoState/startTimestamp': getServerTime(),
            'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP
        });
        
        // Lokal player'ı güncelle
        if (ytPlayer && ytPlayerReady) {
            ytPlayer.loadVideoById(videoId);
            ytPlayer.pauseVideo();
        }
        
        // Lokal state güncelle
        youtubeVideoId = videoId;
        currentRoomData.youtube.videoId = videoId;
        
        debugLog('✅ Video değiştirildi:', videoId);
        
    } catch (error) {
        console.error('Video değiştirme hatası:', error);
        alert('Video değiştirilemedi: ' + error.message);
    }
}

// Arama sonuçlarını gizle
function hideYTSearchResults() {
    const container = document.getElementById('yt-search-results');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
    ytSearchResults = [];
}

// Arama hatası göster
function showYTSearchError(message) {
    const container = document.getElementById('yt-search-results');
    if (!container) return;
    
    container.innerHTML = `<div class="yt-search-error">${escapeHtml(message)}</div>`;
    container.style.display = 'block';
}

// Arama UI durumunu güncelle
function updateYTSearchUI(state) {
    const btn = document.getElementById('yt-search-btn');
    const input = document.getElementById('yt-search-input');
    
    if (state === 'loading') {
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳';
        }
        if (input) input.disabled = true;
    } else {
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍';
        }
        if (input) input.disabled = false;
    }
}

// HTML escape (XSS önleme)
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== YOUTUBE VIDEO CHANGE LISTENER ====================

// Viewer'lar için: Video değişikliğini dinle
function listenYouTubeVideoChange() {
    if (!currentRoomId) return;
    
    const ref = db.ref('rooms/' + currentRoomId + '/youtube/videoId');
    trackListener(ref);
    
    ref.on('value', (snapshot) => {
        const newVideoId = snapshot.val();
        
        if (!newVideoId) return;
        
        // Aynı video ise ignore et
        if (newVideoId === youtubeVideoId) return;
        
        debugLog('🔄 YouTube video değişti:', newVideoId);
        
        // Lokal state güncelle
        youtubeVideoId = newVideoId;
        if (currentRoomData && currentRoomData.youtube) {
            currentRoomData.youtube.videoId = newVideoId;
        }
        
        // Player'ı güncelle
        if (ytPlayer && ytPlayerReady) {
            ytPlayer.loadVideoById(newVideoId);
            
            // Owner değilsek pause'da bekle (owner Firebase'i güncelleyecek)
            if (!isRoomOwner) {
                ytPlayer.pauseVideo();
            }
        }
    });
}

// ==================== SEARCH INPUT HANDLERS ====================

// Enter tuşu ile arama
function handleYTSearchKeydown(event) {
    // Boşluk tuşuna izin ver
    if (event.key === ' ') {
        // Default davranışa izin ver (boşluk yazılsın)
        return;
    }
    
    if (event.key === 'Enter') {
        event.preventDefault();
        const input = document.getElementById('yt-search-input');
        if (input && input.value.trim()) {
            searchYouTube(input.value);
        }
    } else if (event.key === 'Escape') {
        hideYTSearchResults();
    }
}

// Arama butonuna tıklama
function handleYTSearchClick() {
    const input = document.getElementById('yt-search-input');
    if (input && input.value.trim()) {
        searchYouTube(input.value);
    }
}

// Dışarı tıklayınca sonuçları kapat
document.addEventListener('click', (e) => {
    const searchContainer = document.getElementById('yt-search-container');
    if (searchContainer && !searchContainer.contains(e.target)) {
        hideYTSearchResults();
    }
});

debugLog('✅ YouTube Search modülü yüklendi');