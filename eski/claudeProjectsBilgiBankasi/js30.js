        
        // Ã¢Å“â€¦ FIX #11: Countdown interval'Ã„Â± track et
        function startSyncCountdownFromState(state) {
            if (!state.syncedPlayTime) return;
            
            const playTime = state.syncedPlayTime;
            const now = Date.now();
            
            if (playTime <= now) {
                // Ã¢Å“â€¦ FIX: Timeout'u track et
                trackTimeout(setTimeout(() => {
                    executeSync(state);
                }, 100));
                return;
            }
            
            // Ã¢Å“â€¦ INTERVAL FIX: DOM element'i dÃƒÂ¶ngÃƒÂ¼ dÃ„Â±Ã…Å¸Ã„Â±nda cache'le
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'block';
            }
            
            // Ã¢Å“â€¦ FIX #11: Mevcut interval'Ã„Â± temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            countdownInterval = setInterval(() => {
                const remaining = playTime - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    
                    // Ã¢Å“â€¦ FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        executeSync(state);
                    }, 100));
                } else {
                    const seconds = Math.ceil(remaining / 1000);
                    // Ã¢Å“â€¦ countdownElement dÃƒÂ¶ngÃƒÂ¼ dÃ„Â±Ã…Å¸Ã„Â±nda cache'lendi
                    if (countdownElement) {
                        countdownElement.textContent = `Ã¢â€“Â¶Ã¯Â¸Â ${seconds} saniye sonra baÃ…Å¸lÃ„Â±yor...`;
                    }
                    updateSyncUI(`Ã¢ÂÂ±Ã¯Â¸Â ${seconds} saniye sonra oynatÃ„Â±lacak...`);
                }
            }, 100);
            
            // Ã¢Å“â€¦ FIX #11: Interval'Ã„Â± track et
            trackInterval(countdownInterval);
        }
