// ============================================
// OWNERSHIP REQUEST SİSTEMİ
// Katılımcılar oda sahipliği isteyebilir
// Kuyruk sistemi, timeout, cooldown destekli
// ============================================

// ==================== OWNERSHIP REQUEST FUNCTIONS ====================

// Ownership request butonu durumunu güncelle
function updateOwnershipRequestButton() {
    const btn = getCachedElement('btn-request-ownership');
    if (!btn) return;
    
    if (isRoomOwner) {
        btn.disabled = true;
        btn.style.opacity = '0.4';
        btn.style.cursor = 'not-allowed';
        btn.textContent = '👑 Oda Sahibisin';
    } else {
        // Cooldown kontrolü
        const now = Date.now();
        const timeSinceLastRequest = now - lastOwnershipRequestTime;
        
        if (timeSinceLastRequest < OWNERSHIP_REQUEST_COOLDOWN && lastOwnershipRequestTime > 0) {
            const remainingCooldown = Math.ceil((OWNERSHIP_REQUEST_COOLDOWN - timeSinceLastRequest) / 1000);
            btn.disabled = true;
            btn.style.opacity = '0.6';
            btn.textContent = `⏳ ${remainingCooldown}s bekle`;
            
            // Cooldown timer
            const cooldownInterval = setInterval(() => {
                const remaining = Math.ceil((OWNERSHIP_REQUEST_COOLDOWN - (Date.now() - lastOwnershipRequestTime)) / 1000);
                if (remaining <= 0) {
                    clearInterval(cooldownInterval);
                    btn.disabled = false;
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.textContent = '🙋 Sahiplik İste';
                } else {
                    btn.textContent = `⏳ ${remaining}s bekle`;
                }
            }, 1000);
            trackInterval(cooldownInterval);
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
            btn.textContent = '🙋 Sahiplik İste';
        }
    }
}

// Sahiplik isteği gönder
async function sendOwnershipRequest() {
    if (!currentRoomId || !currentUser || isRoomOwner) {
        debugLog('⚠️ Cannot send ownership request');
        return;
    }
    
    // Cooldown kontrolü
    const now = Date.now();
    if (now - lastOwnershipRequestTime < OWNERSHIP_REQUEST_COOLDOWN && lastOwnershipRequestTime > 0) {
        const remaining = Math.ceil((OWNERSHIP_REQUEST_COOLDOWN - (now - lastOwnershipRequestTime)) / 1000);
        alert(`Lütfen ${remaining} saniye bekleyin.`);
        return;
    }
    
    // Mevcut pending isteğim var mı kontrol et
    const existingRequest = await db.ref(`rooms/${currentRoomId}/ownershipRequests`)
        .orderByChild('fromUid')
        .equalTo(currentUser.uid)
        .once('value');
    
    if (existingRequest.exists()) {
        let hasPending = false;
        existingRequest.forEach(child => {
            if (child.val().status === 'pending') {
                hasPending = true;
            }
        });
        
        if (hasPending) {
            alert('Zaten bekleyen bir isteğiniz var.');
            return;
        }
    }
    
    try {
        const requestRef = db.ref(`rooms/${currentRoomId}/ownershipRequests`).push();
        
        await requestRef.set({
            fromUid: currentUser.uid,
            timestamp: firebase.database.ServerValue.TIMESTAMP,
            status: 'pending',
            expiresAt: Date.now() + OWNERSHIP_REQUEST_TIMEOUT
        });
        
        pendingOwnershipRequest = requestRef.key;
        
        debugLog('✅ Ownership request sent:', requestRef.key);
        
        // Buton durumunu güncelle
        const btn = getCachedElement('btn-request-ownership');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '⏳ İstek gönderildi...';
        }
        
        // Timeout kontrolü - istek 60sn sonra otomatik silinir
        trackTimeout(setTimeout(async () => {
            if (pendingOwnershipRequest === requestRef.key) {
                const snapshot = await requestRef.once('value');
                if (snapshot.exists() && snapshot.val().status === 'pending') {
                    await requestRef.remove();
                    debugLog('⏰ Ownership request expired');
                    pendingOwnershipRequest = null;
                    updateOwnershipRequestButton();
                }
            }
        }, OWNERSHIP_REQUEST_TIMEOUT));
        
    } catch (error) {
        console.error('Ownership request error:', error);
        alert('İstek gönderilemedi: ' + error.message);
    }
}

// Oda sahibi için: Gelen istekleri dinle
function listenOwnershipRequests() {
    if (!currentRoomId || !isRoomOwner) return;
    
    // Önceki listener'ı temizle
    if (ownershipRequestListener) {
        ownershipRequestListener.off();
        ownershipRequestListener = null;
    }
    
    ownershipRequestListener = db.ref(`rooms/${currentRoomId}/ownershipRequests`)
        .orderByChild('status')
        .equalTo('pending');
    
    trackListener(ownershipRequestListener);
    
    ownershipRequestListener.on('child_added', async (snapshot) => {
        const request = snapshot.val();
        const requestId = snapshot.key;
        
        if (!request || request.status !== 'pending') return;
        
        // Süresi dolmuş mu kontrol et
        if (request.expiresAt && Date.now() > request.expiresAt) {
            snapshot.ref.remove();
            return;
        }
        
        debugLog('📩 New ownership request from:', request.fromUid);
        
        // Modal göster
        showOwnershipRequestModal(requestId, request);
    });
    
    // Timeout interval - süresi dolan istekleri temizle
    if (ownershipRequestTimeoutInterval) {
        clearInterval(ownershipRequestTimeoutInterval);
    }
    
    ownershipRequestTimeoutInterval = setInterval(async () => {
        if (!currentRoomId || !isRoomOwner) return;
        
        const snapshot = await db.ref(`rooms/${currentRoomId}/ownershipRequests`).once('value');
        if (snapshot.exists()) {
            snapshot.forEach(child => {
                const req = child.val();
                if (req.expiresAt && Date.now() > req.expiresAt && req.status === 'pending') {
                    child.ref.remove();
                    debugLog('🧹 Expired request removed:', child.key);
                }
            });
        }
    }, 10000);
    trackInterval(ownershipRequestTimeoutInterval);
}

// Sahiplik isteği modalı göster
function showOwnershipRequestModal(requestId, request) {
    // Mevcut modal varsa kapat
    hideOwnershipRequestModal();
    
    const modal = document.createElement('div');
    modal.id = 'ownership-request-modal';
    modal.className = 'ownership-modal-overlay';
    
    const remainingTime = Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000));
    
    modal.innerHTML = `
        <div class="ownership-modal">
            <div class="ownership-modal-header">
                <span>🙋 Sahiplik İsteği</span>
                <span id="ownership-modal-timer">${remainingTime}s</span>
            </div>
            <div class="ownership-modal-body">
                <p>Bir katılımcı oda sahipliği istiyor.</p>
                <p class="ownership-modal-uid">Kullanıcı: ${request.fromUid.substring(0, 8)}...</p>
            </div>
            <div class="ownership-modal-buttons">
                <button class="ownership-btn-accept" onclick="acceptOwnershipRequest('${requestId}')">✅ Kabul Et</button>
                <button class="ownership-btn-reject" onclick="rejectOwnershipRequest('${requestId}')">❌ Reddet</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    currentRequestModal = modal;
    
    // Timer güncelle
    const timerEl = document.getElementById('ownership-modal-timer');
    const timerInterval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000));
        if (timerEl) {
            timerEl.textContent = `${remaining}s`;
        }
        
        if (remaining <= 0) {
            clearInterval(timerInterval);
            hideOwnershipRequestModal();
        }
    }, 1000);
    trackInterval(timerInterval);
}

// Modal'ı kapat
function hideOwnershipRequestModal() {
    const modal = document.getElementById('ownership-request-modal');
    if (modal) {
        modal.remove();
    }
    currentRequestModal = null;
}