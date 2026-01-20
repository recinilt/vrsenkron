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

// ✅ SIMPLIFIED: Katılımcı için isteğin durumunu dinle (sadece UI güncelleme)
// Asıl owner değişikliği listenOwnerChange() tarafından dinleniyor
let myOwnershipRequestListener = null;

function listenMyOwnershipRequestStatus() {
    if (!currentRoomId || !currentUser || isRoomOwner) return;
    
    // Önceki listener'ı temizle
    if (myOwnershipRequestListener) {
        myOwnershipRequestListener.off();
        myOwnershipRequestListener = null;
    }
    
    myOwnershipRequestListener = db.ref(`rooms/${currentRoomId}/ownershipRequests`)
        .orderByChild('fromUid')
        .equalTo(currentUser.uid);
    
    trackListener(myOwnershipRequestListener);
    
    myOwnershipRequestListener.on('child_changed', (snapshot) => {
        const request = snapshot.val();
        
        if (request.status === 'accepted') {
            // ✅ İstek kabul edildi - listenOwnerChange() zaten owner değişikliğini yakalayacak
            debugLog('🎉 Ownership request accepted');
            pendingOwnershipRequest = null;
            // UI güncelleme listenOwnerChange() tarafından yapılacak
            
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
    
    myOwnershipRequestListener.on('child_removed', (snapshot) => {
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
    
    if (myOwnershipRequestListener) {
        myOwnershipRequestListener.off();
        myOwnershipRequestListener = null;
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
    // ✅ SIMPLIFIED: Sadece buton güncelle
    // Listener'lar joinRoom() içinde başlatılıyor
    updateOwnershipRequestButton();
    
    debugLog('✅ Ownership request system initialized');
}

debugLog('✅ Ownership Request System loaded');