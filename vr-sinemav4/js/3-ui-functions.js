// ============================================
// UI YÖNETİMİ FONKSİYONLARI - OPTİMİZE EDİLMİŞ
// ============================================

// Throttle fonksiyonu - Performans için
function throttle(func, delay) {
    let lastCall = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            func(...args);
        }
    };
}

// Debounce fonksiyonu - Performans için
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
}

function showSyncStatus(message) {
    const statusDiv = document.getElementById('sync-status');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.style.display = 'block';
        
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 3000);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showOverlay() {
    if (uiOverlay) {
        uiOverlay.classList.remove('hidden');
    }
}

function hideOverlay() {
    if (uiOverlay) {
        uiOverlay.classList.add('hidden');
    }
}

function showVRControls() {
    if (vrControls) {
        vrControls.classList.add('visible');
    }
}

function hideVRControls() {
    if (vrControls) {
        vrControls.classList.remove('visible');
    }
}

function showRoomInfo() {
    if (roomInfoDisplay) {
        roomInfoDisplay.classList.add('visible');
    }
}

function hideRoomInfo() {
    if (roomInfoDisplay) {
        roomInfoDisplay.classList.remove('visible');
    }
}

// Throttled versiyon - Her çağrıda değil, 3 saniyede bir çalışır
const updateRoomInfoDisplay = throttle(function() {
    if (!currentRoomData || !roomInfoDisplay) return;
    
    const roomName = document.getElementById('room-name');
    const viewersCount = document.getElementById('viewers-count');
    const controlMode = document.getElementById('control-mode');
    
    if (roomName) roomName.textContent = currentRoomData.name;
    if (viewersCount) viewersCount.textContent = currentRoomData.viewers || 0;
    if (controlMode) {
        controlMode.textContent = currentRoomData.controlMode === 'owner' ? 'Sadece Sahip' : 'Herkes';
    }
}, 3000);

console.log('✓ UI fonksiyonları yüklendi (Throttle/Debounce eklendi)');
