// ============================================
// VİDEO KÜTÜPHANESİ SİSTEMİ
// ============================================

// Hazır videolar (preset)
const PRESET_VIDEOS = [
    
    {
        name: "Revolver (Tabanca) Türkçe Dublaj 20025",
        url: "https://vr-sinema.online/videos/revolver-dublaj.mp4"
    },
    {
        name: "Big Buck Bunny (Blender Foundation)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
    },
    {
        name: "Elephants Dream (Blender Foundation)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
    },
    {
        name: "Sintel Trailer (Blender Foundation)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
    },
    {
        name: "Tears of Steel (Blender Foundation)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
    }
];

// LocalStorage'dan kullanıcı videolarını yükle
function loadUserVideos() {
    const saved = localStorage.getItem('userVideos');
    return saved ? JSON.parse(saved) : [];
}

// LocalStorage'a kullanıcı videolarını kaydet
function saveUserVideos(videos) {
    localStorage.setItem('userVideos', JSON.stringify(videos));
}

// Kullanıcı videosu ekle
function addUserVideo(name, url) {
    const userVideos = loadUserVideos();
    userVideos.push({ name, url, timestamp: Date.now() });
    saveUserVideos(userVideos);
    console.log('✓ Video kütüphaneye eklendi:', name);
}

// Kullanıcı videosu sil
function removeUserVideo(index) {
    const userVideos = loadUserVideos();
    userVideos.splice(index, 1);
    saveUserVideos(userVideos);
    console.log('✓ Video kütüphaneden silindi');
}

// Tüm videoları getir (preset + kullanıcı)
function getAllVideos() {
    const userVideos = loadUserVideos();
    return {
        preset: PRESET_VIDEOS,
        user: userVideos
    };
}

// Video seçiciyi oluştur
function createVideoSelector() {
    const container = document.createElement('div');
    container.className = 'video-selector-container';
    container.style.marginTop = '15px';
    
    // Başlık ve toggle butonu
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '10px';
    
    const label = document.createElement('label');
    label.innerHTML = '<strong>📚 Hazır Videolar:</strong>';
    label.style.cursor = 'pointer';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.textContent = '▼ Göster';
    toggleBtn.className = 'secondary';
    toggleBtn.style.padding = '5px 15px';
    toggleBtn.style.fontSize = '0.9em';
    
    header.appendChild(label);
    header.appendChild(toggleBtn);
    container.appendChild(header);
    
    // Video listesi (başlangıçta gizli)
    const videoList = document.createElement('div');
    videoList.className = 'video-list';
    videoList.style.display = 'none';
    videoList.style.maxHeight = '300px';
    videoList.style.overflowY = 'auto';
    videoList.style.background = '#f8f9fa';
    videoList.style.borderRadius = '8px';
    videoList.style.padding = '10px';
    videoList.style.marginBottom = '10px';
    
    // Toggle işlevi
    let isOpen = false;
    const toggleList = () => {
        isOpen = !isOpen;
        videoList.style.display = isOpen ? 'block' : 'none';
        toggleBtn.textContent = isOpen ? '▲ Gizle' : '▼ Göster';
        if (isOpen) {
            updateVideoList();
        }
    };
    
    toggleBtn.onclick = (e) => {
        e.preventDefault();
        toggleList();
    };
    
    label.onclick = toggleList;
    
    // Video listesini güncelle
    const updateVideoList = () => {
        const videos = getAllVideos();
        videoList.innerHTML = '';
        
        // Preset videolar
        if (videos.preset.length > 0) {
            const presetTitle = document.createElement('div');
            presetTitle.innerHTML = '<strong>🎬 Hazır Videolar:</strong>';
            presetTitle.style.marginBottom = '8px';
            presetTitle.style.color = '#667eea';
            videoList.appendChild(presetTitle);
            
            videos.preset.forEach((video) => {
                const item = createVideoItem(video.name, video.url, false);
                videoList.appendChild(item);
            });
        }
        
        // Kullanıcı videoları
        if (videos.user.length > 0) {
            const userTitle = document.createElement('div');
            userTitle.innerHTML = '<strong>📁 Benim Videolarım:</strong>';
            userTitle.style.marginTop = '15px';
            userTitle.style.marginBottom = '8px';
            userTitle.style.color = '#f5576c';
            videoList.appendChild(userTitle);
            
            videos.user.forEach((video, index) => {
                const item = createVideoItem(video.name, video.url, true, index);
                videoList.appendChild(item);
            });
        }
        
        if (videos.preset.length === 0 && videos.user.length === 0) {
            videoList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Henüz video yok</p>';
        }
    };
    
    container.appendChild(videoList);
    
    return container;
}

// Video item oluştur
function createVideoItem(name, url, isDeletable, index = null) {
    const item = document.createElement('div');
    item.className = 'video-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '8px 12px';
    item.style.marginBottom = '5px';
    item.style.background = 'white';
    item.style.borderRadius = '6px';
    item.style.cursor = 'pointer';
    item.style.transition = 'all 0.2s';
    
    // Hover efekti
    item.onmouseenter = () => {
        item.style.background = '#e3f2fd';
        item.style.transform = 'translateX(3px)';
    };
    
    item.onmouseleave = () => {
        item.style.background = 'white';
        item.style.transform = 'translateX(0)';
    };
    
    // Video bilgisi
    const info = document.createElement('div');
    info.style.flex = '1';
    info.innerHTML = `
        <div style="font-weight: 600; color: #333; margin-bottom: 2px;">${escapeHtml(name)}</div>
        <div style="font-size: 0.8em; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(url)}</div>
    `;
    
    // Seç butonu
    const selectBtn = document.createElement('button');
    selectBtn.textContent = '✓ Seç';
    selectBtn.style.padding = '5px 12px';
    selectBtn.style.fontSize = '0.85em';
    selectBtn.style.marginLeft = '10px';
    selectBtn.onclick = (e) => {
        e.stopPropagation();
        selectVideo(url);
    };
    
    item.appendChild(info);
    item.appendChild(selectBtn);
    
    // Silme butonu (sadece kullanıcı videoları için)
    if (isDeletable) {
        const deleteBtn = document.createElement('button');
        deleteBtn.textContent = '🗑️';
        deleteBtn.className = 'danger';
        deleteBtn.style.padding = '5px 10px';
        deleteBtn.style.fontSize = '0.85em';
        deleteBtn.style.marginLeft = '5px';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm('Bu videoyu kütüphaneden silmek istediğinize emin misiniz?')) {
                removeUserVideo(index);
                // Listeyi güncelle
                const container = document.querySelector('.video-list');
                if (container) {
                    updateVideoListInUI();
                }
            }
        };
        item.appendChild(deleteBtn);
    }
    
    // Tüm item'a tıklama ile de seçim yapılabilir
    info.onclick = () => selectVideo(url);
    
    return item;
}

// Video seç ve input'a yerleştir
function selectVideo(url) {
    const videoUrlInput = document.getElementById('video-url-input');
    if (videoUrlInput) {
        videoUrlInput.value = url;
        console.log('✓ Video seçildi:', url);
        
        // Görsel geri bildirim
        videoUrlInput.style.background = '#e8f5e9';
        setTimeout(() => {
            videoUrlInput.style.background = '';
        }, 500);
    }
}

// UI'daki video listesini güncelle
function updateVideoListInUI() {
    const videoList = document.querySelector('.video-list');
    if (!videoList) return;
    
    const videos = getAllVideos();
    videoList.innerHTML = '';
    
    // Preset videolar
    if (videos.preset.length > 0) {
        const presetTitle = document.createElement('div');
        presetTitle.innerHTML = '<strong>🎬 Hazır Videolar:</strong>';
        presetTitle.style.marginBottom = '8px';
        presetTitle.style.color = '#667eea';
        videoList.appendChild(presetTitle);
        
        videos.preset.forEach((video) => {
            const item = createVideoItem(video.name, video.url, false);
            videoList.appendChild(item);
        });
    }
    
    // Kullanıcı videoları
    if (videos.user.length > 0) {
        const userTitle = document.createElement('div');
        userTitle.innerHTML = '<strong>📁 Benim Videolarım:</strong>';
        userTitle.style.marginTop = '15px';
        userTitle.style.marginBottom = '8px';
        userTitle.style.color = '#f5576c';
        videoList.appendChild(userTitle);
        
        videos.user.forEach((video, index) => {
            const item = createVideoItem(video.name, video.url, true, index);
            videoList.appendChild(item);
        });
    }
    
    if (videos.preset.length === 0 && videos.user.length === 0) {
        videoList.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Henüz video yok</p>';
    }
}

// Oda oluşturulduğunda video URL'yi kaydet
function saveVideoIfNew(url) {
    if (!url || url.trim() === '') return;
    
    const videos = getAllVideos();
    
    // Zaten var mı kontrol et (preset veya kullanıcı)
    const existsInPreset = videos.preset.some(v => v.url === url);
    const existsInUser = videos.user.some(v => v.url === url);
    
    if (existsInPreset || existsInUser) {
        console.log('ℹ️ Video zaten kütüphanede mevcut');
        return;
    }
    
    // URL'den isim çıkar (son parça)
    let name = url.split('/').pop().split('?')[0];
    if (name.length > 50) {
        name = name.substring(0, 47) + '...';
    }
    
    // Kullanıcıya sor
    const shouldSave = confirm(`Bu videoyu kütüphanenize kaydetmek ister misiniz?\n\n${name}`);
    
    if (shouldSave) {
        const customName = prompt('Video için bir isim girin:', name);
        if (customName && customName.trim() !== '') {
            addUserVideo(customName.trim(), url);
        }
    }
}

console.log('✓ Video kütüphanesi sistemi yüklendi');
console.log('✓ Preset videolar:', PRESET_VIDEOS.length);
console.log('✓ Kullanıcı videoları:', loadUserVideos().length);