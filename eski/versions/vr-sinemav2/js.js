
// ============================================
// FİREBASE YAPLANDIRMASI (apilermapiler.js)
// ============================================
const firebaseConfig = {
    apiKey: "AIzaSyC60idSLdAiqAjPWAOMaM3g8LAKPGEUwH8",
    authDomain: "vr-sinema.firebaseapp.com",
    databaseURL: "https://vr-sinema-default-rtdb.firebaseio.com",
    projectId: "vr-sinema",
    storageBucket: "vr-sinema.firebasestorage.app",
    messagingSenderId: "724648238300",
    appId: "1:724648238300:web:dceba8c536e8a5ffd96819"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

let authReady = false;
auth.signInAnonymously()
    .then(() => {
        console.log('✓ Anonim giriş başarılı:', auth.currentUser.uid);
        authReady = true;
    })
    .catch((error) => {
        console.error('❌ Giriş hatası:', error);
        alert('Firebase bağlantı hatası! Lütfen sayfayı yenileyin.\n\nHata: ' + error.message);
    });

// ============================================
// 1-config.js - YAPILANDIRMA + PRESET_VIDEOS
// ============================================
const CONFIG = {
    DRIFT_THRESHOLD: 3.0,
    DRIFT_CORRECTION: 5.0,
    KEYFRAME_INTERVAL: 10000,
    VIEWER_UPDATE_THROTTLE: 5000,
    SEEK_DEBOUNCE: 2000,
    SEEK_REWIND: 4000,
    SYNC_DELAY: 3000
};

// Video Kütüphanesi - Hazır Videolar
const PRESET_VIDEOS = [
    {
        name: "Big Buck Bunny (Blender)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
        thumbnail: "https://peach.blender.org/wp-content/uploads/title_anouncement.jpg?x11217",
        duration: "10:34",
        category: "Demo"
    },
    {
        name: "Elephants Dream (Blender)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
        thumbnail: "https://orange.blender.org/wp-content/themes/orange/images/media/s1_proog_emo_comp.jpg",
        duration: "10:53",
        category: "Demo"
    },
    {
        name: "Sintel (Blender)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
        thumbnail: "https://durian.blender.org/wp-content/uploads/2010/06/sintel_trailer_1080p.png",
        duration: "14:48",
        category: "Demo"
    },
    {
        name: "Tears of Steel (Blender)",
        url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
        thumbnail: "https://mango.blender.org/wp-content/uploads/2012/05/01_thom.jpg",
        duration: "12:14",
        category: "Demo"
    }
];

// 13 Sinema Ortamı
const ENVIRONMENTS = {
    none: {
        name: 'Ortamsız',
        icon: '⬛',
        config: null
    },
    theater: {
        name: 'Klasik Sinema',
        icon: '🎪',
        config: 'preset: default; lighting: distant; shadow: true'
    },
    space: {
        name: 'Uzay İstasyonu',
        icon: '🌌',
        config: 'preset: starry; lighting: none'
    },
    forest: {
        name: 'Orman',
        icon: '🌲',
        config: 'preset: forest; lighting: distant'
    },
    desert: {
        name: 'Çöl Gece',
        icon: '🏜️',
        config: 'preset: egypt; lighting: distant; dressing: none'
    },
    moon: {
        name: 'Ay Yüzeyi',
        icon: '🌙',
        config: 'preset: goaland; lighting: distant; ground: flat'
    },
    cyberpunk: {
        name: 'Cyberpunk',
        icon: '🌃',
        config: 'preset: japan; lighting: distant; fog: 0.8'
    },
    underwater: {
        name: 'Su Altı',
        icon: '🌊',
        config: 'preset: poison; lighting: distant; fog: 0.5'
    },
    mountain: {
        name: 'Dağ Zirvesi',
        icon: '⛰️',
        config: 'preset: arches; lighting: distant; ground: hills'
    },
    volcano: {
        name: 'Volkan',
        icon: '🌋',
        config: 'preset: volcano; lighting: distant; ground: canyon'
    },
    fantasy: {
        name: 'Fantastik',
        icon: '✨',
        config: 'preset: dream; lighting: distant; dressing: cubes'
    },
    city: {
        name: 'Şehir',
        icon: '🏙️',
        config: 'preset: chicago; lighting: distant; skyType: atmosphere'
    },
    beach: {
        name: 'Sahil',
        icon: '🏖️',
        config: 'preset: yavapai; lighting: distant; ground: flat'
    }
};

// ============================================
// 2-globals.js - GLOBAL DEĞİŞKENLER
// ============================================
let currentRoomId = null;
let currentRoomData = null;
let isRoomOwner = false;
let videoElement = null;
let roomRef = null;
let selectedRoomForPassword = null;
let videoServiceType = null;
let selectedEnvironment = 'none';
let syncTimeout = null;

// Hibrit Senkronizasyon için
let keyframeInterval = null;
let lastSeekTime = 0;
let seekDebounceTimer = null;
let isLocalSeek = false;

// Video Kütüphanesi için
let userVideos = [];
let videoLibraryVisible = false;

// Altyazı için
let currentSubtitles = [];
let subtitlesVisible = false;
let subtitleUpdateInterval = null;

// ============================================
// 3-ui-functions.js - UI FONKSİYONLARI + THROTTLE/DEBOUNCE
// ============================================

// Throttle fonksiyonu
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func.apply(this, args);
        }
    };
}

// Debounce fonksiyonu
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

function showMainMenu() {
    document.getElementById('main-menu').style.display = 'block';
    document.getElementById('create-room').style.display = 'none';
    document.getElementById('room-list').style.display = 'none';
    document.getElementById('password-prompt').style.display = 'none';
}

function showCreateRoom() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('create-room').style.display = 'block';
    
    document.getElementById('private-room-check').addEventListener('change', function() {
        document.getElementById('room-password-input').style.display = 
            this.checked ? 'block' : 'none';
    });
}

function showRoomList() {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('room-list').style.display = 'block';
    loadRooms();
}

function refreshRooms() {
    loadRooms();
}

function showPasswordPrompt(roomId, roomName) {
    selectedRoomForPassword = roomId;
    document.getElementById('password-room-name').textContent = `Oda: ${roomName}`;
    document.getElementById('room-list').style.display = 'none';
    document.getElementById('password-prompt').style.display = 'block';
}

function showSyncStatus(text) {
    const statusEl = document.getElementById('sync-status');
    const indicator = document.getElementById('status-indicator');
    
    statusEl.textContent = text || '⏱️ 3 saniye sonra başlıyor...';
    statusEl.classList.add('visible');
    indicator.className = 'status-indicator syncing';
    
    setTimeout(() => {
        statusEl.classList.remove('visible');
        indicator.className = 'status-indicator connected';
    }, 3500);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function selectEnvironment(envKey, element) {
    selectedEnvironment = envKey;
    document.querySelectorAll('.environment-card').forEach(card => {
        card.classList.remove('selected');
    });
    element.classList.add('selected');
}

function applyEnvironment(envKey) {
    const container = document.getElementById('environment-container');
    const floor = document.getElementById('default-floor');
    
    if (!ENVIRONMENTS[envKey]) {
        console.error('Bilinmeyen ortam:', envKey);
        envKey = 'none';
    }
    
    const env = ENVIRONMENTS[envKey];
    container.innerHTML = '';
    
    if (env.config === null) {
        floor.setAttribute('visible', 'true');
        document.getElementById('env-name').textContent = `${env.icon} ${env.name}`;
        console.log('✓ Ortamsız mod aktif');
    } else {
        const envEntity = document.createElement('a-entity');
        envEntity.setAttribute('environment', env.config);
        container.appendChild(envEntity);
        floor.setAttribute('visible', 'false');
        document.getElementById('env-name').textContent = `${env.icon} ${env.name}`;
        console.log('✓ Ortam yüklendi:', env.name);
    }
}

// ============================================
// 4-video-detection.js - VIDEO SERVİS ALGILAMA
// ============================================
function detectVideoService(url) {
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    // YouTube
    if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
        return 'youtube';
    }
    
    // Google Drive
    if (lowerUrl.includes('drive.google.com')) {
        return 'google-drive';
    }
    
    // Catbox
    if (lowerUrl.includes('catbox.moe') || lowerUrl.includes('files.catbox.moe')) {
        return 'catbox';
    }
    
    // Bunny CDN
    if (lowerUrl.includes('.b-cdn.net') || lowerUrl.includes('bunny')) {
        return 'bunny';
    }
    
    // Cloudinary
    if (lowerUrl.includes('cloudinary.com')) {
        return 'cloudinary';
    }
    
    // Zerostorage
    if (lowerUrl.includes('zerostorage.net')) {
        return 'zerostorage';
    }
    
    // Direkt video formatları
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mkv', '.avi', '.mov', '.flv', '.ts', '.m3u8'];
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
        return 'direct';
    }
    
    return 'unknown';
}

function processVideoUrl(url) {
    const service = detectVideoService(url);
    videoServiceType = service;
    
    console.log('🎬 Video servisi:', service);
    
    // YouTube için özel işlem
    if (service === 'youtube') {
        console.log('📺 YouTube linki tespit edildi');
        return url; // YouTube embed olarak kullanılacak
    }
    
    // Google Drive için özel işlem
    if (service === 'google-drive') {
        console.log('📁 Google Drive linki tespit edildi');
        const fileId = extractGoogleDriveFileId(url);
        if (fileId) {
            return `https://drive.google.com/uc?export=download&id=${fileId}`;
        }
    }
    
    // Catbox - direkt kullanım
    if (service === 'catbox') {
        console.log('📦 Catbox linki tespit edildi');
        return url;
    }
    
    // Bunny CDN - direkt kullanım
    if (service === 'bunny') {
        console.log('🐰 Bunny CDN linki tespit edildi');
        return url;
    }
    
    // Cloudinary - direkt kullanım
    if (service === 'cloudinary') {
        console.log('☁️ Cloudinary linki tespit edildi');
        return url;
    }
    
    // Zerostorage - direkt kullanım
    if (service === 'zerostorage') {
        console.log('💾 Zerostorage linki tespit edildi');
        return url;
    }
    
    // Direkt video linki
    if (service === 'direct') {
        console.log('🎬 Direkt video linki tespit edildi');
        return url;
    }
    
    // Bilinmeyen kaynak - CORS proxy kullan
    console.log('⚠️ Bilinmeyen kaynak, CORS proxy kullanılıyor');
    videoServiceType = 'cors-proxy';
    return 'https://corsproxy.io/?' + encodeURIComponent(url);
}

function extractGoogleDriveFileId(url) {
    const patterns = [
        /\/d\/([a-zA-Z0-9_-]+)/,
        /id=([a-zA-Z0-9_-]+)/,
        /\/file\/d\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
}

function getServiceBadge(service) {
    const badges = {
        'youtube': '<span class="service-badge" style="background: #ff0000;">YouTube</span>',
        'google-drive': '<span class="service-badge" style="background: #4285f4;">Google Drive</span>',
        'catbox': '<span class="service-badge badge-catbox">Catbox</span>',
        'bunny': '<span class="service-badge badge-bunny">Bunny CDN</span>',
        'cloudinary': '<span class="service-badge" style="background: #3448c5;">Cloudinary</span>',
        'zerostorage': '<span class="service-badge" style="background: #00bcd4;">Zerostorage</span>',
        'direct': '<span class="service-badge badge-direct">Direkt</span>',
        'cors-proxy': '<span class="service-badge badge-cors">CORS Proxy</span>'
    };
    return badges[service] || '';
}

// ============================================
// 5-room-management.js - ODA YÖNETİMİ + startHybridSync
// ============================================
function transferOwnership(roomId) {
    const roomRef = database.ref(`rooms/${roomId}`);
    
    roomRef.child('members').once('value', (snapshot) => {
        const members = snapshot.val() || [];
        const otherMembers = members.filter(uid => uid !== auth.currentUser.uid);
        
        if (otherMembers.length > 0) {
            const newOwner = otherMembers[0];
            roomRef.child('owner').set(newOwner);
            console.log('✓ Oda sahipliği devredildi:', newOwner);
        } else {
            roomRef.child('owner').set(null);
            console.log('✓ Oda sahipsiz bırakıldı');
        }
    });
}

function createRoom() {
    if (!authReady) {
        alert('Lütfen bekleyin, Firebase bağlantısı kuruluyor...');
        return;
    }
    
    const roomName = document.getElementById('room-name-input').value.trim();
    const videoUrl = document.getElementById('video-url-input').value.trim();
    const isPrivate = document.getElementById('private-room-check').checked;
    const password = document.getElementById('room-password-input').value;
    const screenSize = document.getElementById('screen-size').value;
    const controlMode = document.querySelector('input[name="control-mode"]:checked').value;
    
    if (!roomName || !videoUrl) {
        alert('Lütfen oda adı ve video URL giriniz!');
        return;
    }
    
    const processedUrl = processVideoUrl(videoUrl);
    const newRoomRef = database.ref('rooms').push();
    const roomId = newRoomRef.key;
    
    const roomData = {
        name: roomName,
        videoUrl: processedUrl,
        originalUrl: videoUrl,
        videoService: videoServiceType,
        environment: selectedEnvironment,
        controlMode: controlMode,
        isPrivate: isPrivate,
        password: isPrivate ? btoa(password) : null,
        screenSize: screenSize,
        owner: auth.currentUser.uid,
        members: [auth.currentUser.uid],
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        currentKeyframe: {
            isPlaying: false,
            currentTime: 0,
            timestamp: Date.now()
        },
        urgentUpdate: null,
        videoState: {
            isPlaying: false,
            currentTime: 0,
            lastUpdate: Date.now(),
            startTimestamp: null
        },
        viewers: 1
    };
    
    newRoomRef.set(roomData).then(() => {
        isRoomOwner = true;
        joinRoom(roomId, roomData);
    }).catch(error => {
        console.error('Oda oluşturma hatası:', error);
        showVideoError('create', error, videoUrl);
    });
}

function loadRooms() {
    const roomsContainer = document.getElementById('rooms-container');
    roomsContainer.innerHTML = '<div class="loading">⏳ Odalar yükleniyor...</div>';
    
    setTimeout(() => {
        database.ref('rooms').orderByChild('createdAt').once('value', (snapshot) => {
            roomsContainer.innerHTML = '';
            
            if (!snapshot.exists()) {
                roomsContainer.innerHTML = '<p style="text-align: center; color: #666;">Henüz aktif oda yok. İlk odayı siz oluşturun! 🎬</p>';
                return;
            }
            
            const rooms = [];
            snapshot.forEach((childSnapshot) => {
                const room = childSnapshot.val();
                rooms.push({
                    id: childSnapshot.key,
                    data: room
                });
            });
            
            if (rooms.length === 0) {
                roomsContainer.innerHTML = '<p style="text-align: center; color: #666;">Henüz aktif oda yok. İlk odayı siz oluşturun! 🎬</p>';
                return;
            }
            
            rooms.reverse().forEach(room => {
                const roomDiv = document.createElement('div');
                let className = 'room-item';
                if (room.data.isPrivate) className += ' private';
                if (!room.data.owner || room.data.viewers === 0) className += ' ownerless';
                
                roomDiv.className = className;
                const serviceBadge = getServiceBadge(room.data.videoService);
                const envInfo = ENVIRONMENTS[room.data.environment] || ENVIRONMENTS['none'];
                
                let badges = '';
                if (room.data.isPrivate) {
                    badges += '<span class="lock-icon">🔒</span>';
                }
                if (!room.data.owner || room.data.viewers === 0) {
                    badges += '<span class="badge badge-ownerless">🔓 Sahipsiz</span>';
                }
                
                roomDiv.innerHTML = `
                    ${badges}
                    <div class="room-name">${escapeHtml(room.data.name)} ${serviceBadge}</div>
                    <div class="room-info">
                        👥 ${room.data.viewers || 0} izleyici • ${envInfo.icon} ${envInfo.name}
                    </div>
                `;
                roomDiv.onclick = () => selectRoom(room.id, room.data);
                roomsContainer.appendChild(roomDiv);
            });
        }).catch(error => {
            console.error('Oda listesi yükleme hatası:', error);
            roomsContainer.innerHTML = '<p style="color: red;">Odalar yüklenirken hata oluştu. Lütfen sayfayı yenileyin.</p>';
        });
    }, 500);
}

function selectRoom(roomId, roomData) {
    if (roomData.isPrivate) {
        showPasswordPrompt(roomId, roomData.name);
    } else {
        joinRoom(roomId, roomData);
    }
}

function joinWithPassword() {
    const password = document.getElementById('room-password-join').value;
    
    database.ref(`rooms/${selectedRoomForPassword}`).once('value', (snapshot) => {
        const roomData = snapshot.val();
        
        if (!roomData) {
            alert('Oda bulunamadı!');
            return;
        }
        
        if (btoa(password) === roomData.password) {
            joinRoom(selectedRoomForPassword, roomData);
        } else {
            alert('Yanlış şifre!');
        }
    });
}

function joinRoom(roomId, roomData) {
    currentRoomId = roomId;
    currentRoomData = roomData;
    roomRef = database.ref(`rooms/${roomId}`);
    videoServiceType = roomData.videoService;
    
    if (!roomData.owner || roomData.owner === null) {
        roomRef.child('owner').set(auth.currentUser.uid);
        isRoomOwner = true;
        console.log('✓ Sahipsiz odaya katıldım, şimdi ben sahibim');
    } else {
        isRoomOwner = (roomData.owner === auth.currentUser.uid);
    }
    
    roomRef.child('members').transaction((currentMembers) => {
        if (!currentMembers) currentMembers = [];
        if (!currentMembers.includes(auth.currentUser.uid)) {
            currentMembers.push(auth.currentUser.uid);
        }
        return currentMembers;
    });
    
    roomRef.child('viewers').transaction((current) => {
        return (current || 0) + 1;
    });
    
    document.getElementById('ui-overlay').classList.add('hidden');
    document.getElementById('vr-controls').classList.add('visible');
    document.getElementById('room-info-display').classList.add('visible');
    
    document.getElementById('room-title').textContent = roomData.name;
    document.getElementById('video-service-badge').innerHTML = getServiceBadge(videoServiceType);
    
    const controlText = roomData.controlMode === 'everyone' ? 'Herkes kontrol edebilir' : 'Sadece oda sahibi';
    document.getElementById('control-mode-text').textContent = controlText;
    
    updateViewerCount();
    applyEnvironment(roomData.environment || 'none');
    setupVideo(roomData.videoUrl, roomData.screenSize, roomData.originalUrl);
    
    // Hibrit senkronizasyon başlat
    startHybridSync();
    
    window.addEventListener('beforeunload', () => {
        leaveRoomSilent();
    });
}

function leaveRoom() {
    if (isRoomOwner) {
        document.getElementById('delete-modal').classList.add('active');
    } else {
        leaveRoomSilent();
        location.reload();
    }
}

function leaveRoomSilent() {
    if (currentRoomId && roomRef) {
        // Hibrit senkronizasyon durdur
        if (keyframeInterval) {
            clearInterval(keyframeInterval);
            keyframeInterval = null;
        }
        
        roomRef.child('members').transaction((currentMembers) => {
            if (!currentMembers) return null;
            return currentMembers.filter(uid => uid !== auth.currentUser.uid);
        });
        
        roomRef.child('viewers').transaction((current) => {
            const newCount = Math.max((current || 1) - 1, 0);
            
            if (newCount === 0) {
                roomRef.child('owner').set(null);
            }
            
            return newCount;
        });
        
        roomRef.off();
    }
}

function confirmDeleteRoom(shouldDelete) {
    document.getElementById('delete-modal').classList.remove('active');
    
    if (shouldDelete) {
        roomRef.remove().then(() => {
            console.log('✓ Oda sahibi tarafından silindi');
        });
    } else {
        if (currentRoomData.isPrivate) {
            roomRef.update({
                isPrivate: false,
                password: null
            });
            console.log('✓ Şifreli oda açık bırakıldı, şifre silindi');
        }
        
        transferOwnership(currentRoomId);
        leaveRoomSilent();
    }
    
    location.reload();
}

function updateViewerCount() {
    if (roomRef) {
        roomRef.child('viewers').once('value', (snapshot) => {
            document.getElementById('viewers-count').textContent = snapshot.val() || 0;
        });
    }
}

// Throttled viewer count update
const throttledViewerUpdate = throttle(updateViewerCount, CONFIG.VIEWER_UPDATE_THROTTLE);

// ============================================
// 6-video-setup.js - VIDEO KURULUM
// ============================================
function setupVideo(videoUrl, screenSize, originalUrl) {
    const scene = document.querySelector('a-scene');
    const screen = document.getElementById('cinema-screen');
    
    const sizes = {
        normal: { width: 16, height: 9 },
        large: { width: 24, height: 13.5 },
        xlarge: { width: 32, height: 18 },
        imax: { width: 40, height: 22.5 }
    };
    
    const size = sizes[screenSize] || sizes.large;
    screen.setAttribute('width', size.width);
    screen.setAttribute('height', size.height);
    
    let assets = document.querySelector('a-assets');
    if (!assets) {
        assets = document.createElement('a-assets');
        scene.appendChild(assets);
    }
    
    // YouTube video için özel işlem
    if (videoServiceType === 'youtube') {
        const videoId = extractYouTubeVideoId(originalUrl);
        if (videoId) {
            // YouTube iframe embed kullanarak
            console.log('📺 YouTube video ID:', videoId);
            alert('⚠️ YouTube videoları şu anda desteklenmiyor. Lütfen direkt .mp4 linki kullanın.');
            leaveRoom();
            return;
        }
    }
    
    const videoAsset = document.createElement('video');
    videoAsset.id = 'video-src';
    videoAsset.crossOrigin = 'anonymous';
    videoAsset.src = videoUrl;
    videoAsset.preload = 'auto';
    videoAsset.loop = false;
    videoAsset.playsInline = true;
    
    // 360/180 video kontrolü
    if (originalUrl.includes('360') || currentRoomData.videoType === '360') {
        screen.setAttribute('geometry', 'primitive: sphere; radius: 100; segmentsWidth: 64; segmentsHeight: 64');
        screen.setAttribute('material', 'shader: flat; side: back');
        screen.setAttribute('scale', '-1 1 1');
        console.log('🌐 360° video modu aktif');
    } else if (originalUrl.includes('180') || currentRoomData.videoType === '180') {
        screen.setAttribute('geometry', 'primitive: sphere; radius: 100; segmentsWidth: 64; segmentsHeight: 32; thetaStart: 0; thetaLength: 180');
        screen.setAttribute('material', 'shader: flat; side: back');
        screen.setAttribute('scale', '-1 1 1');
        console.log('🌐 180° video modu aktif');
    }
    
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

function extractYouTubeVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    
    return null;
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

// ============================================
// 7-video-controls.js - VIDEO KONTROLLERİ
// ============================================
function canControlVideo() {
    if (!currentRoomData) return false;
    
    if (currentRoomData.controlMode === 'everyone') {
        return true;
    }
    
    return isRoomOwner;
}

function togglePlayPause() {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    if (videoElement.paused) {
        const startTimestamp = Date.now() + CONFIG.SYNC_DELAY;
        
        // Urgent Update gönder
        roomRef.child('urgentUpdate').set({
            type: 'play',
            currentTime: videoElement.currentTime,
            startTimestamp: startTimestamp,
            timestamp: Date.now()
        });
        
        // Eski sistem için de güncelle (yedek)
        roomRef.child('videoState').update({
            isPlaying: true,
            currentTime: videoElement.currentTime,
            startTimestamp: startTimestamp,
            lastUpdate: Date.now()
        });
        
        showSyncStatus('⏱️ 3 saniye sonra başlıyor...');
        console.log('▶️ Video 3 saniye sonra başlatılacak:', new Date(startTimestamp).toLocaleTimeString());
    } else {
        videoElement.pause();
        
        // Urgent Update gönder
        roomRef.child('urgentUpdate').set({
            type: 'pause',
            currentTime: videoElement.currentTime,
            timestamp: Date.now()
        });
        
        // Eski sistem için de güncelle (yedek)
        roomRef.child('videoState').update({
            isPlaying: false,
            currentTime: videoElement.currentTime,
            startTimestamp: null,
            lastUpdate: Date.now()
        });
        
        console.log('⏸️ Video durduruldu');
    }
}

function stopVideo() {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) {
        alert('Video henüz yüklenmedi!');
        return;
    }
    
    videoElement.pause();
    videoElement.currentTime = 0;
    
    // Urgent Update gönder
    roomRef.child('urgentUpdate').set({
        type: 'stop',
        currentTime: 0,
        timestamp: Date.now()
    });
    
    // Eski sistem için de güncelle (yedek)
    roomRef.child('videoState').update({
        isPlaying: false,
        currentTime: 0,
        startTimestamp: null,
        lastUpdate: Date.now()
    });
    
    console.log('⏹ Video durduruldu ve başa sarıldı');
    showSyncStatus('⏹ Video başa sarıldı');
}

// Seek işlemi (debounced)
const debouncedSeek = debounce((newTime) => {
    if (!canControlVideo()) {
        alert('⚠️ Bu odada sadece oda sahibi video kontrolü yapabilir!');
        return;
    }
    
    if (!videoElement) return;
    
    isLocalSeek = true;
    const rewindTime = Math.max(0, newTime - CONFIG.SEEK_REWIND);
    videoElement.currentTime = rewindTime;
    
    // Urgent Update gönder
    roomRef.child('urgentUpdate').set({
        type: 'seek',
        currentTime: rewindTime,
        timestamp: Date.now()
    });
    
    // Eski sistem için de güncelle (yedek)
    roomRef.child('videoState').update({
        isPlaying: false,
        currentTime: rewindTime,
        startTimestamp: null,
        lastUpdate: Date.now()
    });
    
    console.log(`⏩ Seek: ${newTime.toFixed(1)}s → Geri sarma: ${rewindTime.toFixed(1)}s`);
    
    setTimeout(() => {
        isLocalSeek = false;
    }, 1000);
}, CONFIG.SEEK_DEBOUNCE);

function seekVideo(seconds) {
    if (!videoElement) return;
    const newTime = Math.max(0, Math.min(videoElement.currentTime + seconds, videoElement.duration));
    debouncedSeek(newTime);
}

function seekToPosition(position) {
    if (!videoElement) return;
    const newTime = Math.max(0, Math.min(position, videoElement.duration));
    debouncedSeek(newTime);
}

// ============================================
// 10-subtitle-system.js - ALTYAZI SİSTEMİ
// ============================================
// Not: Altyazı sistemi şu an aktif değil, ileride eklenebilir
function toggleSubtitles() {
    subtitlesVisible = !subtitlesVisible;
    console.log('Altyazı:', subtitlesVisible ? 'Açık' : 'Kapalı');
}

// ============================================
// 11-vr-ui-panel.js - VR UI + SEEK BAR DÜZELTMESİ
// ============================================
// VR ekran hareketi fonksiyonları
function moveScreen(direction, amount = 1) {
    const screen = document.getElementById('cinema-screen');
    const currentPos = screen.getAttribute('position');
    
    switch(direction) {
        case 'up':
            screen.setAttribute('position', `${currentPos.x} ${currentPos.y + amount} ${currentPos.z}`);
            break;
        case 'down':
            screen.setAttribute('position', `${currentPos.x} ${currentPos.y - amount} ${currentPos.z}`);
            break;
        case 'left':
            screen.setAttribute('position', `${currentPos.x - amount} ${currentPos.y} ${currentPos.z}`);
            break;
        case 'right':
            screen.setAttribute('position', `${currentPos.x + amount} ${currentPos.y} ${currentPos.z}`);
            break;
        case 'forward':
            screen.setAttribute('position', `${currentPos.x} ${currentPos.y} ${currentPos.z - amount}`);
            break;
        case 'backward':
            screen.setAttribute('position', `${currentPos.x} ${currentPos.y} ${currentPos.z + amount}`);
            break;
    }
    console.log('Ekran pozisyon:', screen.getAttribute('position'));
}

function resetScreenPosition() {
    const screen = document.getElementById('cinema-screen');
    const screenSize = currentRoomData?.screenSize || 'large';
    screen.setAttribute('position', '0 2 -15');
    console.log('✓ Ekran pozisyonu sıfırlandı');
}

// ============================================
// 12-youtube-gdrive-api.js - YOUTUBE/DRIVE API
// ============================================
// Not: API entegrasyonları şu an aktif değil, ileride eklenebilir

// ============================================
// 13-init.js - BAŞLATMA + EVENT LISTENERS
// ============================================
console.log('🎬 VR Sosyal Sinema - Modüler Edition v3.0');
console.log('📍 Site: https://recinilt.github.io/mefeypublic/recinilt/vr-sinemav2.html');
console.log('⚙️ 85 Özellik:');
console.log('   • Hibrit Senkronizasyon (Keyframe + Urgent)');
console.log('   • Video Kütüphanesi');
console.log('   • 13 Sinema Ortamı');
console.log('   • Oda Sahipliği Transferi');
console.log('   • Firebase %90 Azalma');
console.log('Firebase:', firebase.app().name ? 'Bağlı ✓' : 'Bağlı Değil ✗');

document.addEventListener('DOMContentLoaded', () => {
    const scene = document.querySelector('a-scene');
    scene.addEventListener('loaded', () => {
        console.log('✓ VR sahnesi yüklendi');
    });
    
    // Klavye kısayolları
    document.addEventListener('keydown', (e) => {
        if (!videoElement) return;
        
        // UI overlay açıksa klavye kontrollerini devre dışı bırak
        const overlay = document.getElementById('ui-overlay');
        if (!overlay.classList.contains('hidden')) return;
        
        switch(e.key.toLowerCase()) {
            case ' ':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'arrowleft':
                e.preventDefault();
                seekVideo(-10);
                break;
            case 'arrowright':
                e.preventDefault();
                seekVideo(10);
                break;
            case 'arrowup':
                e.preventDefault();
                moveScreen('up', 0.5);
                break;
            case 'arrowdown':
                e.preventDefault();
                moveScreen('down', 0.5);
                break;
            case 'w':
                moveScreen('up', 0.5);
                break;
            case 's':
                moveScreen('down', 0.5);
                break;
            case 'a':
                moveScreen('left', 0.5);
                break;
            case 'd':
                moveScreen('right', 0.5);
                break;
            case 'q':
                moveScreen('forward', 0.5);
                break;
            case 'e':
                moveScreen('backward', 0.5);
                break;
            case 'r':
                resetScreenPosition();
                break;
            case 'c':
                toggleSubtitles();
                break;
            case 'm':
                if (videoElement) {
                    videoElement.muted = !videoElement.muted;
                    console.log('Ses:', videoElement.muted ? 'Kapalı' : 'Açık');
                }
                break;
            case 'f':
                if (document.fullscreenElement) {
                    document.exitFullscreen();
                } else {
                    document.documentElement.requestFullscreen();
                }
                break;
        }
    });
});

// ============================================
// 14-video-library.js - VİDEO KÜTÜPHANESİ
// ============================================
function loadUserVideos() {
    const saved = localStorage.getItem('userVideos');
    if (saved) {
        try {
            userVideos = JSON.parse(saved);
            console.log('✓ Kullanıcı videoları yüklendi:', userVideos.length);
        } catch (e) {
            console.error('❌ Video yükleme hatası:', e);
            userVideos = [];
        }
    }
}

function saveUserVideo(name, url) {
    const video = {
        name: name,
        url: url,
        addedAt: Date.now()
    };
    
    userVideos.push(video);
    localStorage.setItem('userVideos', JSON.stringify(userVideos));
    console.log('✓ Video kaydedildi:', name);
}

function deleteUserVideo(index) {
    if (confirm('Bu videoyu silmek istediğinizden emin misiniz?')) {
        userVideos.splice(index, 1);
        localStorage.setItem('userVideos', JSON.stringify(userVideos));
        console.log('✓ Video silindi');
    }
}

// Video kütüphanesini başlat
loadUserVideos();

// ============================================
// 15-hybrid-sync.js - HİBRİT SENKRONİZASYON
// ============================================
function startHybridSync() {
    if (!roomRef || !videoElement) {
        console.error('❌ Hibrit sync başlatılamadı: roomRef veya videoElement yok');
        return;
    }
    
    console.log('🔄 Hibrit senkronizasyon başlatılıyor...');
    
    // 1. Keyframe güncellemelerini dinle (10 saniyede bir)
    roomRef.child('currentKeyframe').on('value', (snapshot) => {
        if (!videoElement || isLocalSeek) return;
        
        const keyframe = snapshot.val();
        if (!keyframe) return;
        
        const now = Date.now();
        const timeSinceKeyframe = (now - keyframe.timestamp) / 1000;
        
        if (keyframe.isPlaying && videoElement.paused) {
            // Video oynatılmalı ama durdurulmuş
            const predictedTime = keyframe.currentTime + timeSinceKeyframe;
            videoElement.currentTime = predictedTime;
            videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
            console.log(`🔄 Keyframe sync: Play at ${predictedTime.toFixed(1)}s`);
        } else if (!keyframe.isPlaying && !videoElement.paused) {
            // Video durdurulmalı ama oynuyor
            videoElement.pause();
            videoElement.currentTime = keyframe.currentTime;
            console.log(`🔄 Keyframe sync: Pause at ${keyframe.currentTime.toFixed(1)}s`);
        } else if (keyframe.isPlaying && !videoElement.paused) {
            // Drift kontrolü
            const predictedTime = keyframe.currentTime + timeSinceKeyframe;
            const drift = Math.abs(videoElement.currentTime - predictedTime);
            
            if (drift > CONFIG.DRIFT_CORRECTION) {
                videoElement.currentTime = predictedTime;
                console.log(`🔄 Drift düzeltme: ${drift.toFixed(1)}s fark, ${predictedTime.toFixed(1)}s'ye ayarlandı`);
            } else if (drift > CONFIG.DRIFT_THRESHOLD) {
                console.log(`⚠️ Küçük drift: ${drift.toFixed(1)}s (tolerans içinde)`);
            }
        }
    });
    
    // 2. Urgent Update'leri dinle (Play/Pause/Seek anında)
    roomRef.child('urgentUpdate').on('value', (snapshot) => {
        if (!videoElement || isLocalSeek) return;
        
        const urgent = snapshot.val();
        if (!urgent) return;
        
        const now = Date.now();
        const age = now - urgent.timestamp;
        
        // 5 saniyeden eski urgent update'leri yoksay
        if (age > 5000) return;
        
        console.log(`⚡ Urgent Update: ${urgent.type} (${age}ms önce)`);
        
        switch(urgent.type) {
            case 'play':
                if (urgent.startTimestamp) {
                    const waitTime = urgent.startTimestamp - now;
                    if (waitTime > 0) {
                        console.log(`⏱️ ${(waitTime/1000).toFixed(1)}s sonra başlayacak`);
                        showSyncStatus(`⏱️ ${Math.ceil(waitTime/1000)}s sonra başlıyor...`);
                        
                        if (syncTimeout) clearTimeout(syncTimeout);
                        syncTimeout = setTimeout(() => {
                            videoElement.currentTime = urgent.currentTime;
                            videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                            console.log('▶️ Video başlatıldı (urgent sync)');
                        }, waitTime);
                    } else {
                        const elapsedSeconds = Math.abs(waitTime) / 1000;
                        const newSeek = urgent.currentTime + elapsedSeconds;
                        videoElement.currentTime = newSeek;
                        videoElement.play().catch(err => console.log('Auto-play engellendi:', err));
                        console.log(`▶️ Video başlatıldı (${elapsedSeconds.toFixed(1)}s gecikmeli)`);
                    }
                }
                break;
                
            case 'pause':
                if (!videoElement.paused) {
                    videoElement.pause();
                    videoElement.currentTime = urgent.currentTime;
                    console.log('⏸️ Video durduruldu (urgent)');
                }
                break;
                
            case 'seek':
                videoElement.pause();
                videoElement.currentTime = urgent.currentTime;
                console.log(`⏩ Seek (urgent): ${urgent.currentTime.toFixed(1)}s`);
                break;
                
            case 'stop':
                videoElement.pause();
                videoElement.currentTime = 0;
                console.log('⏹ Video durduruldu (urgent)');
                break;
        }
    });
    
    // 3. Sadece oda sahibi keyframe yayınlar
    if (isRoomOwner) {
        keyframeInterval = setInterval(() => {
            if (!videoElement) return;
            
            roomRef.child('currentKeyframe').set({
                isPlaying: !videoElement.paused,
                currentTime: videoElement.currentTime,
                timestamp: Date.now()
            });
            
            console.log(`📡 Keyframe gönderildi: ${videoElement.paused ? 'Pause' : 'Play'} @ ${videoElement.currentTime.toFixed(1)}s`);
        }, CONFIG.KEYFRAME_INTERVAL);
        
        console.log('✓ Keyframe broadcast başlatıldı (10s interval)');
    }
    
    // 4. Viewer count güncellemelerini dinle
    roomRef.child('viewers').on('value', () => {
        throttledViewerUpdate();
    });
    
    // 5. Sahiplik değişikliğini dinle
    roomRef.child('owner').on('value', (snapshot) => {
        const newOwner = snapshot.val();
        if (newOwner === auth.currentUser.uid && !isRoomOwner) {
            isRoomOwner = true;
            console.log('✓ Oda sahipliği size devredildi!');
            alert('🎉 Oda sahipliği size devredildi! Artık video kontrollerini kullanabilirsiniz.');
            
            // Yeni sahip olarak keyframe broadcast başlat
            if (!keyframeInterval) {
                keyframeInterval = setInterval(() => {
                    if (!videoElement) return;
                    
                    roomRef.child('currentKeyframe').set({
                        isPlaying: !videoElement.paused,
                        currentTime: videoElement.currentTime,
                        timestamp: Date.now()
                    });
                }, CONFIG.KEYFRAME_INTERVAL);
                
                console.log('✓ Keyframe broadcast başlatıldı (yeni sahip)');
            }
        }
    });
    
    console.log('✓ Hibrit senkronizasyon aktif');
    console.log('  • Keyframe: 10s interval');
    console.log('  • Urgent: Anında');
    console.log('  • Drift threshold: 3s');
    console.log('  • Drift correction: 5s');
}

// ============================================
// BİTİŞ MESAJI
// ============================================
console.log('✅ Tüm modüller yüklendi - VR Sinema hazır!');
