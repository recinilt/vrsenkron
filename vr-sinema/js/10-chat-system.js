// ============================================
// MESAJLAŞMA SİSTEMİ
// ============================================

// Global değişkenler
let vrChatOpen = false;
let vrChatMessages = [];
let vrKeyboardOpen = false;
let vrChatInputText = '';

// Mesaj gönder
function sendMessage() {
    const input = document.getElementById('chat-message');
    const messageText = input.value.trim();
    
    if (!messageText) return;
    
    const messageData = {
        userId: auth.currentUser.uid,
        nickname: currentUserNickname,
        message: escapeHtml(messageText),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`rooms/${currentRoomId}/messages`).push(messageData);
    
    input.value = '';
}

// VR'dan mesaj gönder
function sendVRMessage() {
    if (!vrChatInputText.trim()) return;
    
    const messageData = {
        userId: auth.currentUser.uid,
        nickname: currentUserNickname,
        message: escapeHtml(vrChatInputText.trim()),
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    database.ref(`rooms/${currentRoomId}/messages`).push(messageData);
    
    vrChatInputText = '';
    updateVRChatInput();
    hideVRKeyboard();
}

// Mesajları dinle
function listenToMessages() {
    database.ref(`rooms/${currentRoomId}/messages`)
        .orderByChild('timestamp')
        .limitToLast(50)
        .on('child_added', (snapshot) => {
            const msg = snapshot.val();
            displayMessage(msg);
            displayVRMessage(msg);
        });
}

// Mesajı göster (2D UI)
function displayMessage(msg) {
    const messagesDiv = document.getElementById('messages');
    const msgElement = document.createElement('div');
    msgElement.className = 'message';
    
    const time = new Date(msg.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    msgElement.innerHTML = `
        <div class="nickname">${msg.nickname}</div>
        <div class="text">${msg.message}</div>
        <div class="time">${time}</div>
    `;
    
    messagesDiv.appendChild(msgElement);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // Max 50 mesaj göster (performans için)
    if (messagesDiv.children.length > 50) {
        messagesDiv.removeChild(messagesDiv.firstChild);
    }
}

// VR'da mesajı göster
function displayVRMessage(msg) {
    // Yeni mesaj bildirimini göster (5 saniye)
    showVRNewMessageNotification(msg);
    
    // Mesaj listesine ekle
    vrChatMessages.push(msg);
    
    // Sadece son 10 mesajı tut
    if (vrChatMessages.length > 10) {
        vrChatMessages.shift();
    }
    
    // Chat açıksa mesajları güncelle
    if (vrChatOpen) {
        updateVRChatMessages();
    }
}

// VR'da yeni mesaj bildirimi göster
function showVRNewMessageNotification(msg) {
    const notification = document.getElementById('vr-new-message-notification');
    const textEl = document.getElementById('vr-new-message-text');
    const authorEl = document.getElementById('vr-new-message-author');
    
    // Mesajı kısalt (max 30 karakter)
    let displayText = msg.message;
    if (displayText.length > 30) {
        displayText = displayText.substring(0, 27) + '...';
    }
    
    textEl.setAttribute('value', displayText);
    authorEl.setAttribute('value', msg.nickname);
    notification.setAttribute('visible', 'true');
    
    // 5 saniye sonra gizle
    setTimeout(() => {
        notification.setAttribute('visible', 'false');
    }, 5000);
}

// VR Chat'i aç/kapa
function toggleVRChat() {
    vrChatOpen = !vrChatOpen;
    const chatWindow = document.getElementById('vr-chat-window');
    chatWindow.setAttribute('visible', vrChatOpen ? 'true' : 'false');
    
    if (vrChatOpen) {
        updateVRChatMessages();
        console.log('💬 VR Chat açıldı');
    } else {
        console.log('💬 VR Chat kapatıldı');
        if (vrKeyboardOpen) {
            hideVRKeyboard();
        }
    }
}

// VR Chat mesajlarını güncelle
function updateVRChatMessages() {
    const messagesContainer = document.getElementById('vr-chat-messages');
    
    // Mevcut mesajları temizle
    while (messagesContainer.firstChild) {
        messagesContainer.removeChild(messagesContainer.firstChild);
    }
    
    // Son 5 mesajı göster
    const recentMessages = vrChatMessages.slice(-5);
    
    recentMessages.forEach((msg, index) => {
        const yPos = 0.3 - (index * 0.15);
        
        // Mesaj text entity
        const msgEntity = document.createElement('a-text');
        msgEntity.setAttribute('value', `${msg.nickname}: ${msg.message}`);
        msgEntity.setAttribute('align', 'left');
        msgEntity.setAttribute('position', `-1.1 ${yPos} 0`);
        msgEntity.setAttribute('width', '4');
        msgEntity.setAttribute('color', '#ffffff');
        msgEntity.setAttribute('wrap-count', '35');
        
        messagesContainer.appendChild(msgEntity);
    });
}

// VR Klavye göster
function showVRKeyboard() {
    vrKeyboardOpen = true;
    
    // Placeholder'ı gizle, input'u göster
    document.getElementById('vr-chat-input-placeholder').setAttribute('visible', 'false');
    document.getElementById('vr-chat-input-text').setAttribute('visible', 'true');
    
    console.log('⌨️ VR Klavye açıldı');
    
    // Gerçek klavye açılsın (mobil cihazlarda)
    if ('ontouchstart' in window) {
        // Görünmez bir input oluştur ve focus et
        createHiddenKeyboardInput();
    } else {
        // PC'de klavye event'lerini dinle
        startKeyboardListening();
    }
}

// VR Klavye gizle
function hideVRKeyboard() {
    vrKeyboardOpen = false;
    
    document.getElementById('vr-chat-input-placeholder').setAttribute('visible', 'true');
    document.getElementById('vr-chat-input-text').setAttribute('visible', 'false');
    
    console.log('⌨️ VR Klavye kapatıldı');
    
    // Klavye dinlemeyi durdur
    stopKeyboardListening();
}

// Görünmez klavye input oluştur (mobil için)
function createHiddenKeyboardInput() {
    // Varsa eski input'u kaldır
    const existingInput = document.getElementById('vr-hidden-keyboard');
    if (existingInput) {
        existingInput.remove();
    }
    
    // Yeni görünmez input oluştur
    const hiddenInput = document.createElement('input');
    hiddenInput.id = 'vr-hidden-keyboard';
    hiddenInput.type = 'text';
    hiddenInput.style.position = 'absolute';
    hiddenInput.style.left = '-9999px';
    hiddenInput.style.top = '-9999px';
    hiddenInput.value = vrChatInputText;
    
    document.body.appendChild(hiddenInput);
    hiddenInput.focus();
    
    // Input değişikliklerini dinle
    hiddenInput.addEventListener('input', (e) => {
        vrChatInputText = e.target.value;
        updateVRChatInput();
    });
    
    // Enter tuşu ile gönder
    hiddenInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendVRMessage();
            hiddenInput.value = '';
        }
    });
    
    // Blur olunca klavyeyi kapat
    hiddenInput.addEventListener('blur', () => {
        setTimeout(() => {
            if (vrKeyboardOpen) {
                hideVRKeyboard();
            }
        }, 100);
    });
}

// Klavye dinlemeyi başlat (PC için)
let keyboardListener = null;

function startKeyboardListening() {
    keyboardListener = (e) => {
        if (!vrKeyboardOpen) return;
        
        if (e.key === 'Enter') {
            sendVRMessage();
        } else if (e.key === 'Backspace') {
            vrChatInputText = vrChatInputText.slice(0, -1);
            updateVRChatInput();
        } else if (e.key === 'Escape') {
            hideVRKeyboard();
        } else if (e.key.length === 1) {
            // Sadece yazdırılabilir karakterler
            if (vrChatInputText.length < 200) {
                vrChatInputText += e.key;
                updateVRChatInput();
            }
        }
    };
    
    document.addEventListener('keydown', keyboardListener);
}

function stopKeyboardListening() {
    if (keyboardListener) {
        document.removeEventListener('keydown', keyboardListener);
        keyboardListener = null;
    }
    
    // Görünmez input'u kaldır
    const hiddenInput = document.getElementById('vr-hidden-keyboard');
    if (hiddenInput) {
        hiddenInput.remove();
    }
}

// VR Chat input'u güncelle
function updateVRChatInput() {
    const inputTextEl = document.getElementById('vr-chat-input-text');
    
    if (vrChatInputText) {
        inputTextEl.setAttribute('value', vrChatInputText + '|');
    } else {
        inputTextEl.setAttribute('value', '|');
    }
}

// Enter tuşu ile mesaj gönder (2D UI)
document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-message');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }
});