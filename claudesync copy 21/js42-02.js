// Sahiplik isteğini kabul et
async function acceptOwnershipRequest(requestId) {
    if (!currentRoomId || !isRoomOwner) return;
    
    try {
        const requestSnapshot = await db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).once('value');
        const request = requestSnapshot.val();
        
        if (!request || request.status !== 'pending') {
            alert('Bu istek artık geçerli değil.');
            hideOwnershipRequestModal();
            return;
        }
        
        const newOwnerUid = request.fromUid;
        
        // Transfer işlemi
        ownerTransferInProgress = true;
        
        // 1. İsteği güncelle
        await db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).update({
            status: 'accepted'
        });
        
        // 2. Oda sahibini değiştir
        await db.ref(`rooms/${currentRoomId}`).update({
            owner: newOwnerUid
        });
        
        // 3. Viewer bilgilerini güncelle
        await db.ref(`rooms/${currentRoomId}/activeViewers/${newOwnerUid}`).update({
            isOwner: true
        });
        
        await db.ref(`rooms/${currentRoomId}/activeViewers/${currentUser.uid}`).update({
            isOwner: false
        });
        
        // 4. Lokal state güncelle
        isRoomOwner = false;
        currentRoomData.owner = newOwnerUid;
        
        // 5. Owner task'larını durdur
        clearOwnerTasks();
        
        // 6. Ownership request listener'ı durdur
        if (ownershipRequestListener) {
            ownershipRequestListener.off();
            ownershipRequestListener = null;
        }
        
        if (ownershipRequestTimeoutInterval) {
            clearInterval(ownershipRequestTimeoutInterval);
            ownershipRequestTimeoutInterval = null;
        }
        
        // ✅ FIX: Sync request listener'ı durdur (eski sahip artık dinlememeli)
        cleanupSyncRequests();
        
        // 7. Keyframe listener'ı başlat (artık viewer'ız)
        listenKeyframes();
        
        // ✅ FIX: Kendi sync isteğimizin durumunu dinlemeye başla (artık viewer'ız)
        listenMySyncRequestStatus();
        
        // 8. UI güncelle
        updateRoomInfoDisplay();
        updateOwnershipRequestButton();
        
        // ✅ FIX: YouTube modundaysa kontrolleri güncelle (arama çubuğu gizlensin)
        if (isYouTubeMode) {
            updateYouTubeControls();
        }
        
        // 9. İsteği temizle
        await db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).remove();
        
        debugLog('✅ Ownership transferred to:', newOwnerUid);
        
        hideOwnershipRequestModal();
        ownerTransferInProgress = false;
        
    } catch (error) {
        console.error('Accept ownership error:', error);
        alert('Transfer başarısız: ' + error.message);
        ownerTransferInProgress = false;
    }
}

// Sahiplik isteğini reddet
async function rejectOwnershipRequest(requestId) {
    if (!currentRoomId || !isRoomOwner) return;
    
    try {
        await db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).update({
            status: 'rejected',
            rejectedAt: firebase.database.ServerValue.TIMESTAMP
        });
        
        debugLog('❌ Ownership request rejected:', requestId);
        
        // 5 saniye sonra sil
        trackTimeout(setTimeout(() => {
            db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).remove().catch(() => {});
        }, 5000));
        
        hideOwnershipRequestModal();
        
    } catch (error) {
        console.error('Reject ownership error:', error);
    }
}

// Katılımcı için: İsteğin durumunu dinle
function listenMyOwnershipRequestStatus() {
    if (!currentRoomId || !currentUser || isRoomOwner) return;
    
    const ref = db.ref(`rooms/${currentRoomId}/ownershipRequests`)
        .orderByChild('fromUid')
        .equalTo(currentUser.uid);
    
    trackListener(ref);
    
    ref.on('child_changed', (snapshot) => {
        const request = snapshot.val();
        
        if (request.status === 'accepted') {
            // Sahiplik bana geçti!
            debugLog('🎉 Ownership accepted - I am now the owner!');
            
            isRoomOwner = true;
            currentRoomData.owner = currentUser.uid;
            
            // Owner task'larını başlat
            startOwnerTasks();
            
            // Ownership request listener'ı başlat
            listenOwnershipRequests();
            
            // ✅ FIX: Sync request listener'ı başlat (artık owner'ız)
            listenSyncRequests();
            
            // UI güncelle
            updateRoomInfoDisplay();
            updateOwnershipRequestButton();
            
            // ✅ FIX: YouTube modundaysa kontrolleri güncelle (arama çubuğu görünsün)
            if (isYouTubeMode) {
                updateYouTubeControls();
            }
            
            pendingOwnershipRequest = null;
            
        } else if (request.status === 'rejected') {
            // İstek reddedildi
            debugLog('😔 Ownership request rejected');
            
            lastOwnershipRequestTime = Date.now();
            pendingOwnershipRequest = null;
            
            // Buton cooldown'a girsin
            updateOwnershipRequestButton();
            
            alert('Sahiplik isteğiniz reddedildi. 2 dakika sonra tekrar deneyebilirsiniz.');
        }
    });
    
    ref.on('child_removed', (snapshot) => {
        // İstek silindi (timeout veya kabul sonrası)
        if (pendingOwnershipRequest === snapshot.key) {
            pendingOwnershipRequest = null;
            updateOwnershipRequestButton();
        }
    });
}

// Ownership request cleanup
function cleanupOwnershipRequests() {
    if (ownershipRequestListener) {
        ownershipRequestListener.off();
        ownershipRequestListener = null;
    }
    
    if (ownershipRequestTimeoutInterval) {
        clearInterval(ownershipRequestTimeoutInterval);
        ownershipRequestTimeoutInterval = null;
    }
    
    hideOwnershipRequestModal();
    
    pendingOwnershipRequest = null;
    lastOwnershipRequestTime = 0;
    
    debugLog('🧹 Ownership request cleanup completed');
}

// Ownership request sistemi başlat
function initOwnershipRequestSystem() {
    if (isRoomOwner) {
        listenOwnershipRequests();
    } else {
        listenMyOwnershipRequestStatus();
    }
    
    updateOwnershipRequestButton();
    
    debugLog('✅ Ownership request system initialized');
}

debugLog('✅ Ownership Request System loaded');