        
        // Ã¢Å“â€¦ MEMORY LEAK FIX: Object URL temizleme
        function revokeCurrentVideoURL() {
            if (currentVideoObjectURL) {
                URL.revokeObjectURL(currentVideoObjectURL);
                currentVideoObjectURL = null;
                debugLog('ÄŸÅ¸Â§Â¹ Object URL revoked');
            }
        }
        
        // ==================== P2P WebTorrent FUNCTIONS ====================
        
        // Video source tab deÃ„Å¸iÃ…Å¸tirme
        function switchVideoSourceTab(tab) {
            currentVideoSourceType = tab;
            
            const tabUrl = getCachedElement('tab-url');
            const tabLocal = getCachedElement('tab-local');
            const urlSection = getCachedElement('url-section');
            const localSection = getCachedElement('local-file-section');
            
            if (tab === 'url') {
                tabUrl.classList.add('active');
                tabLocal.classList.remove('active');
                urlSection.classList.remove('hidden-tab');
                localSection.classList.remove('active');
            } else {
                tabUrl.classList.remove('active');
                tabLocal.classList.add('active');
                urlSection.classList.add('hidden-tab');
                localSection.classList.add('active');
            }
        }
        
        // P2P Client baÃ…Å¸latma
        function initP2PClient() {
            if (p2pClient) return p2pClient;
            
            try {
                p2pClient = new WebTorrent();
                
                p2pClient.on('error', (err) => {
                    console.error('WebTorrent error:', err);
                    updateP2PStatus('Ã¢ÂÅ’ P2P HatasÃ„Â±: ' + err.message, 0);
                });
                
                debugLog('Ã¢Å“â€¦ WebTorrent client initialized');
                return p2pClient;
            } catch (e) {
                console.error('WebTorrent init error:', e);
                return null;
            }
        }
