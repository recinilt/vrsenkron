        
        // ✅ MEMORY LEAK FIX: Object URL temizleme
        function revokeCurrentVideoURL() {
            if (currentVideoObjectURL) {
                URL.revokeObjectURL(currentVideoObjectURL);
                currentVideoObjectURL = null;
                debugLog('🧹 Object URL revoked');
            }
        }
        
        // ==================== P2P WebTorrent FUNCTIONS ====================
        
        // Video source tab değiştirme
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
        
        // P2P Client başlatma
        function initP2PClient() {
            if (p2pClient) return p2pClient;
            
            try {
                p2pClient = new WebTorrent();
                
                p2pClient.on('error', (err) => {
                    console.error('WebTorrent error:', err);
                    updateP2PStatus('❌ P2P Hatası: ' + err.message, 0);
                });
                
                debugLog('✅ WebTorrent client initialized');
                return p2pClient;
            } catch (e) {
                console.error('WebTorrent init error:', e);
                return null;
            }
        }
