        
        // P2P Client temizleme
        function destroyP2PClient() {
            if (p2pUpdateInterval) {
                clearInterval(p2pUpdateInterval);
                p2pUpdateInterval = null;
            }
            
            if (currentTorrent) {
                try {
                    currentTorrent.destroy();
                } catch (e) {}
                currentTorrent = null;
            }
            
            if (p2pClient) {
                try {
                    p2pClient.destroy();
                } catch (e) {}
                p2pClient = null;
            }
            
            // ✅ YENİ: Flag'i reset et
            isP2PDownloadComplete = false;
            
            hideP2PStatus();
            debugLog('🧹 P2P client destroyed');
        }
        
        // Lokal dosyayı seed et (yayıncı için)
        async function seedLocalVideo(file) {
            return new Promise((resolve, reject) => {
                if (!file) {
                    reject(new Error('Dosya seçilmedi'));
                    return;
                }
                
                initP2PClient();
                
                if (!p2pClient) {
                    reject(new Error('WebTorrent başlatılamadı'));
                    return;
                }
                
                showP2PStatus('📤 Torrent oluşturuluyor...', 0);
                
                const opts = {
                    announce: WEBTORRENT_TRACKERS,
                    name: file.name
                };
                
                p2pClient.seed(file, opts, (torrent) => {
                    currentTorrent = torrent;
                    
                    debugLog('✅ Seeding started:', torrent.magnetURI);
                    updateP2PStatus('📤 Paylaşılıyor: ' + torrent.numPeers + ' peer', 100);
                    
                    // Periyodik güncelleme
                    p2pUpdateInterval = setInterval(() => {
                        if (currentTorrent) {
                            const stats = `📤 ${formatBytes(currentTorrent.uploadSpeed)}/s | 👥 ${currentTorrent.numPeers} peer`;
                            updateP2PStats(stats);
                        }
                    }, 1000);
                    trackInterval(p2pUpdateInterval);
                    
                    resolve(torrent.magnetURI);
                });
                
                // Timeout
                setTimeout(() => {
                    if (!currentTorrent) {
                        reject(new Error('Torrent oluşturma zaman aşımı'));
                    }
                }, 30000);
            });
        }
