// ✅ SIMPLIFIED: Sahiplik isteğini kabul et
// Listener yönetimi artık listenOwnerChange() tarafından yapılıyor
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
        
        debugLog('✅ Accepting ownership request, new owner:', newOwnerUid);
        
        // ✅ SIMPLIFIED: Sadece Firebase güncelle
        // Listener yönetimi listenOwnerChange() tarafından otomatik yapılacak
        
        // 1. İsteği güncelle
        await db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).update({
            status: 'accepted'
        });
        
        // 2. Oda sahibini değiştir (Bu değişiklik listenOwnerChange'i tetikleyecek)
        await db.ref(`rooms/${currentRoomId}`).update({
            owner: newOwnerUid
        });
        
        // 3. Modal'ı kapat
        hideOwnershipRequestModal();
        
        // 4. 3 saniye sonra isteği sil (herkesin görmesi için bekle)
        trackTimeout(setTimeout(() => {
            db.ref(`rooms/${currentRoomId}/ownershipRequests/${requestId}`).remove().catch(() => {});
        }, 3000));
        
        debugLog('✅ Ownership transferred to:', newOwnerUid);
        
    } catch (error) {
        console.error('Accept ownership error:', error);
        alert('Transfer başarısız: ' + error.message);
    }
}