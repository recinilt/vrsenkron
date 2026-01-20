        // ==================== SYNC MECHANISM ====================
        
        function initiateSync() {
            if (!currentRoomId || !currentUser) return;
            
            // YouTube veya normal video kontrolü
            if (!isYouTubeMode && !videoElement) return;
            if (isYouTubeMode && (!ytPlayer || !ytPlayerReady)) return;
            
            debugLog('🔄 Sync initiated by user, isOwner:', isRoomOwner);
            
            const syncBtn = getCachedElement('btn-sync');
            const ytSyncBtn = document.getElementById('yt-btn-sync');
            if (syncBtn) syncBtn.disabled = true;
            if (ytSyncBtn) ytSyncBtn.disabled = true;
            
            if (isRoomOwner) {
                // Owner direkt sync başlatır
                executeOwnerSync();
            } else {
                // Viewer izin isteği gönderir
                sendSyncRequest();
            }
        }
        
        // Owner direkt sync başlatır
        async function executeOwnerSync() {
            try {
                const targetPosition = await calculateSyncPosition();
                const playAtTime = getServerTime() + SYNC_PLAY_DELAY;
                
                // Firebase'e yaz
                await db.ref('rooms/' + currentRoomId + '/syncState').set({
                    syncedSeekPosition: targetPosition,
                    playAtTime: playAtTime,
                    initiatedBy: currentUser.uid,
                    initiatedAt: firebase.database.ServerValue.TIMESTAMP
                });
                
                debugLog('✅ Owner sync started, playAtTime:', playAtTime, 'position:', targetPosition);
                
            } catch (error) {
                console.error('Owner sync error:', error);
                enableSyncButton();
            }
        }
        
        // Sync pozisyonunu hesapla
        async function calculateSyncPosition() {
            const snapshot = await db.ref('rooms/' + currentRoomId + '/activeViewers').once('value');
            const viewers = snapshot.val();
            
            const positions = [];
            
            // Kendi pozisyonumu ekle
            if (isYouTubeMode && ytPlayer && ytPlayerReady) {
                positions.push(ytPlayer.getCurrentTime());
            } else if (videoElement) {
                positions.push(videoElement.currentTime);
            }
            
            // Diğer viewer pozisyonlarını ekle
            if (viewers) {
                Object.keys(viewers).forEach(uid => {
                    if (uid !== currentUser.uid && viewers[uid].currentPosition !== undefined) {
                        positions.push(viewers[uid].currentPosition);
                    }
                });
            }
            
            let minPosition = Math.min(...positions);
            
            // Validation
            if (!isFinite(minPosition) || isNaN(minPosition)) {
                if (isYouTubeMode && ytPlayer && ytPlayerReady) {
                    minPosition = ytPlayer.getCurrentTime() || 0;
                } else if (videoElement) {
                    minPosition = videoElement.currentTime || 0;
                } else {
                    minPosition = 0;
                }
            }
            
            // En geridekinden 4 saniye çıkar
            const targetPosition = Math.max(0, minPosition - 4);
            
            debugLog('📍 Positions:', positions, '→ Target:', targetPosition);
            
            return targetPosition;
        }
        
        // Viewer sync isteği gönderir
        async function sendSyncRequest() {
            try {
                // Mevcut pozisyonu hesapla
                let currentPosition = 0;
                if (isYouTubeMode && ytPlayer && ytPlayerReady) {
                    currentPosition = ytPlayer.getCurrentTime();
                } else if (videoElement) {
                    currentPosition = videoElement.currentTime;
                }
                
                // Firebase'e sync isteği yaz
                await db.ref('rooms/' + currentRoomId + '/syncRequests/' + currentUser.uid).set({
                    fromUid: currentUser.uid,
                    currentPosition: currentPosition,
                    timestamp: firebase.database.ServerValue.TIMESTAMP,
                    status: 'pending',
                    expiresAt: Date.now() + SYNC_REQUEST_TIMEOUT
                });
                
                pendingSyncRequest = currentUser.uid;
                
                debugLog('📤 Sync request sent');
                
                // UI güncelle
                updateSyncUI('⏳ Oda sahibinin onayı bekleniyor...');
                
                // Timeout
                trackTimeout(setTimeout(async () => {
                    if (pendingSyncRequest === currentUser.uid) {
                        const snapshot = await db.ref('rooms/' + currentRoomId + '/syncRequests/' + currentUser.uid).once('value');
                        if (snapshot.exists() && snapshot.val().status === 'pending') {
                            await db.ref('rooms/' + currentRoomId + '/syncRequests/' + currentUser.uid).remove();
                            debugLog('⏰ Sync request expired');
                            pendingSyncRequest = null;
                            enableSyncButton();
                            updateSyncUI('⏰ İstek zaman aşımına uğradı');
                        }
                    }
                }, SYNC_REQUEST_TIMEOUT));
                
            } catch (error) {
                console.error('Sync request error:', error);
                enableSyncButton();
            }
        }
        
        // Sync butonunu aktif et
        function enableSyncButton() {
            const syncBtn = getCachedElement('btn-sync');
            const ytSyncBtn = document.getElementById('yt-btn-sync');
            if (syncBtn) syncBtn.disabled = false;
            if (ytSyncBtn) ytSyncBtn.disabled = false;
        }
        
        // Owner için sync isteklerini dinle
        function listenSyncRequests() {
            if (!currentRoomId || !isRoomOwner) return;
            
            // Önceki listener'ı temizle
            if (syncRequestListener) {
                syncRequestListener.off();
                syncRequestListener = null;
            }
            
            syncRequestListener = db.ref('rooms/' + currentRoomId + '/syncRequests');
            trackListener(syncRequestListener);
            
            syncRequestListener.on('child_added', (snapshot) => {
                const request = snapshot.val();
                const requestId = snapshot.key;
                
                if (!request || request.status !== 'pending') return;
                
                // Süresi dolmuş mu kontrol et
                if (request.expiresAt && Date.now() > request.expiresAt) {
                    snapshot.ref.remove();
                    return;
                }
                
                debugLog('📩 New sync request from:', request.fromUid);
                
                // Modal göster
                showSyncRequestModal(requestId, request);
            });
        }
        
        // Sync istek modalı göster
        function showSyncRequestModal(requestId, request) {
            // Mevcut modal varsa kapat
            hideSyncRequestModal();
            
            const modal = document.createElement('div');
            modal.id = 'sync-request-modal';
            modal.className = 'sync-modal-overlay';
            
            const remainingTime = Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000));
            
            modal.innerHTML = `
                <div class="sync-modal">
                    <div class="sync-modal-header">
                        <span>🔄 Senkronizasyon İsteği</span>
                        <span id="sync-modal-timer">${remainingTime}s</span>
                    </div>
                    <div class="sync-modal-body">
                        <p>Bir katılımcı herkesi senkronize etmek istiyor.</p>
                        <p class="sync-modal-uid">Kullanıcı: ${request.fromUid.substring(0, 8)}...</p>
                    </div>
                    <div class="sync-modal-buttons">
                        <button class="sync-btn-accept" onclick="approveSyncRequest('${requestId}')">✅ Onayla</button>
                        <button class="sync-btn-reject" onclick="rejectSyncRequest('${requestId}')">❌ Reddet</button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            currentSyncRequestModal = modal;
            
            // Timer güncelle
            const timerEl = document.getElementById('sync-modal-timer');
            const timerInterval = setInterval(() => {
                const remaining = Math.max(0, Math.ceil((request.expiresAt - Date.now()) / 1000));
                if (timerEl) {
                    timerEl.textContent = `${remaining}s`;
                }
                
                if (remaining <= 0) {
                    clearInterval(timerInterval);
                    hideSyncRequestModal();
                }
            }, 1000);
            trackInterval(timerInterval);
        }
        
        // Modal'ı kapat
        function hideSyncRequestModal() {
            const modal = document.getElementById('sync-request-modal');
            if (modal) {
                modal.remove();
            }
            currentSyncRequestModal = null;
        }