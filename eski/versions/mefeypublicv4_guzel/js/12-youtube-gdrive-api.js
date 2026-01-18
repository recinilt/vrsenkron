// ============================================
// YOUTUBE & GOOGLE DRIVE API SİSTEMİ
// ============================================

// YouTube Video Bilgisi Al
async function getYouTubeVideoInfo(videoId) {
    if (API_KEYS.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        console.warn('⚠️ YouTube API Key girilmemiş, direkt embed kullanılacak');
        return null;
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?` +
            `part=snippet,contentDetails&id=${videoId}&key=${API_KEYS.YOUTUBE_API_KEY}`
        );
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
            const video = data.items[0];
            return {
                title: video.snippet.title,
                duration: parseYouTubeDuration(video.contentDetails.duration),
                thumbnail: video.snippet.thumbnails.high.url,
                channelTitle: video.snippet.channelTitle
            };
        }
        
        return null;
    } catch (error) {
        console.error('❌ YouTube API hatası:', error);
        return null;
    }
}

function parseYouTubeDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);
    return hours * 3600 + minutes * 60 + seconds;
}

// YouTube Search
async function searchYouTube(query, maxResults = 10) {
    if (API_KEYS.YOUTUBE_API_KEY === 'YOUR_YOUTUBE_API_KEY_HERE') {
        alert('⚠️ YouTube API Key girilmemiş! 1-config.js dosyasından API key ekleyin.');
        return [];
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/search?` +
            `part=snippet&q=${encodeURIComponent(query)}&type=video&maxResults=${maxResults}&key=${API_KEYS.YOUTUBE_API_KEY}`
        );
        
        const data = await response.json();
        
        if (data.items) {
            return data.items.map(item => ({
                videoId: item.id.videoId,
                title: item.snippet.title,
                thumbnail: item.snippet.thumbnails.medium.url,
                channelTitle: item.snippet.channelTitle,
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            }));
        }
        
        return [];
    } catch (error) {
        console.error('❌ YouTube Search hatası:', error);
        return [];
    }
}

// Google Drive File Info
async function getGoogleDriveFileInfo(fileId) {
    if (API_KEYS.GOOGLE_DRIVE_API_KEY === 'YOUR_GOOGLE_DRIVE_API_KEY_HERE') {
        console.warn('⚠️ Google Drive API Key girilmemiş, direkt link kullanılacak');
        return null;
    }
    
    try {
        const response = await fetch(
            `https://www.googleapis.com/drive/v3/files/${fileId}?` +
            `fields=name,mimeType,size,thumbnailLink&key=${API_KEYS.GOOGLE_DRIVE_API_KEY}`
        );
        
        const data = await response.json();
        
        return {
            name: data.name,
            mimeType: data.mimeType,
            size: data.size,
            thumbnail: data.thumbnailLink
        };
    } catch (error) {
        console.error('❌ Google Drive API hatası:', error);
        return null;
    }
}

// Google Drive Video Stream URL
function getGoogleDriveStreamUrl(fileId) {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Video URL İşleme
async function processVideoUrl(url) {
    const youtubeMatch = url.match(/(youtu\.be\/|youtube\.com\/(watch\?v=|embed\/|v\/|shorts\/))([\w-]{11})/);
    if (youtubeMatch) {
        const videoId = youtubeMatch[3];
        const info = await getYouTubeVideoInfo(videoId);
        
        return {
            type: 'youtube',
            videoId: videoId,
            url: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&enablejsapi=1`,
            info: info
        };
    }
    
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (driveMatch) {
        const fileId = driveMatch[1];
        const info = await getGoogleDriveFileInfo(fileId);
        
        return {
            type: 'googledrive',
            fileId: fileId,
            url: getGoogleDriveStreamUrl(fileId),
            previewUrl: `https://drive.google.com/file/d/${fileId}/preview`,
            info: info
        };
    }
    
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    if (SUPPORTED_VIDEO_FORMATS.includes(extension)) {
        return {
            type: 'direct',
            url: url,
            format: extension
        };
    }
    
    return {
        type: 'unknown',
        url: url
    };
}

// YouTube Search UI - DÜZELTİLMİŞ
function showYouTubeSearchModal() {
    const query = prompt('🔍 YouTube\'da ara:');
    if (!query) return;
    
    searchYouTube(query).then(results => {
        if (results.length === 0) {
            alert('❌ Sonuç bulunamadı!');
            return;
        }
        
        let html = '<h2>🔍 YouTube Arama Sonuçları</h2><div style="max-height: 400px; overflow-y: auto;">';
        
        results.forEach(video => {
            html += `
                <div class="youtube-result" style="padding: 10px; border-bottom: 1px solid #ddd; cursor: pointer;" 
                     onclick="selectYouTubeVideo('${escapeHtml(video.url)}')">
                    <img src="${video.thumbnail}" style="width: 120px; float: left; margin-right: 10px;">
                    <strong>${escapeHtml(video.title)}</strong><br>
                    <small>${escapeHtml(video.channelTitle)}</small>
                </div>
            `;
        });
        
        html += '</div><br><button onclick="showCreateRoom()">◀ Oda Oluşturmaya Dön</button>';
        
        const uiOverlay = document.getElementById('ui-overlay');
        const uiContainer = uiOverlay.querySelector('.ui-container');
        
        if (uiOverlay && uiContainer) {
            uiOverlay.classList.remove('hidden');
            uiContainer.innerHTML = html;
        }
    });
}

// YouTube video seçimi - DÜZELTİLMİŞ
function selectYouTubeVideo(url) {
    console.log('✓ YouTube video seçildi:', url);
    
    // Ana menüye dön ve oda oluşturma ekranını göster
    showCreateRoom();
    
    // Video URL'sini doldur
    const videoUrlInput = document.getElementById('video-url-input');
    if (videoUrlInput) {
        videoUrlInput.value = url;
        console.log('✓ Video URL input\'a yazıldı');
    } else {
        console.error('❌ video-url-input elementi bulunamadı!');
    }
}

console.log('✓ YouTube & Google Drive API sistemi yüklendi');