        
        // ✅ FIX #11: Countdown interval'ı track et
        function startSyncCountdownFromState(state) {
            if (!state.syncedPlayTime) return;
            
            const playTime = state.syncedPlayTime;
            const now = Date.now();
            
            if (playTime <= now) {
                // ✅ FIX: Timeout'u track et
                trackTimeout(setTimeout(() => {
                    executeSync(state);
                }, 100));
                return;
            }
            
            // ✅ INTERVAL FIX: DOM element'i döngü dışında cache'le
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'block';
            }
            
            // ✅ FIX #11: Mevcut interval'ı temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            countdownInterval = setInterval(() => {
                const remaining = playTime - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    
                    // ✅ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        executeSync(state);
                    }, 100));
                } else {
                    const seconds = Math.ceil(remaining / 1000);
                    // ✅ countdownElement döngü dışında cache'lendi
                    if (countdownElement) {
                        countdownElement.textContent = `▶️ ${seconds} saniye sonra başlıyor...`;
                    }
                    updateSyncUI(`⏱️ ${seconds} saniye sonra oynatılacak...`);
                }
            }, 100);
            
            // ✅ FIX #11: Interval'ı track et
            trackInterval(countdownInterval);
        }
