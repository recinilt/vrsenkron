        
        // âœ… FIX #11: Countdown interval'Ä± track et
        function startSyncCountdownFromState(state) {
            if (!state.syncedPlayTime) return;
            
            const playTime = state.syncedPlayTime;
            const now = Date.now();
            
            if (playTime <= now) {
                // âœ… FIX: Timeout'u track et
                trackTimeout(setTimeout(() => {
                    executeSync(state);
                }, 100));
                return;
            }
            
            // âœ… INTERVAL FIX: DOM element'i dÃ¶ngÃ¼ dÄ±ÅŸÄ±nda cache'le
            const countdownElement = getCachedElement('sync-countdown');
            if (countdownElement) {
                countdownElement.style.display = 'block';
            }
            
            // âœ… FIX #11: Mevcut interval'Ä± temizle
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
            
            countdownInterval = setInterval(() => {
                const remaining = playTime - Date.now();
                
                if (remaining <= 0) {
                    clearInterval(countdownInterval);
                    countdownInterval = null;
                    
                    // âœ… FIX: Timeout'u track et
                    trackTimeout(setTimeout(() => {
                        executeSync(state);
                    }, 100));
                } else {
                    const seconds = Math.ceil(remaining / 1000);
                    // âœ… countdownElement dÃ¶ngÃ¼ dÄ±ÅŸÄ±nda cache'lendi
                    if (countdownElement) {
                        countdownElement.textContent = `â–¶ï¸ ${seconds} saniye sonra baÅŸlÄ±yor...`;
                    }
                    updateSyncUI(`â±ï¸ ${seconds} saniye sonra oynatÄ±lacak...`);
                }
            }, 100);
            
            // âœ… FIX #11: Interval'Ä± track et
            trackInterval(countdownInterval);
        }
