        
        // Lokal dosyayÃ„Â± seed et (yayÃ„Â±ncÃ„Â± iÃƒÂ§in)
        async function seedLocalVideo(file) {
            return new Promise((resolve, reject) => {
                if (!file) {
                    reject(new Error('Dosya seÃƒÂ§ilmedi'));
                    return;
                }
                
                initP2PClient();
                
                if (!p2pClient) {
                    reject(new Error('WebTorrent baÃ…Å¸latÃ„Â±lamadÃ„Â±'));
                    return;
                }
                
                showP2PStatus('ÄŸÅ¸â€œÂ¤ Torrent oluÃ…Å¸turuluyor...', 0);
                
                const opts = {
                    announce: WEBTORRENT_TRACKERS,
                    name: file.name
                };
                
                p2pClient.seed(file, opts, (torrent) => {
                    currentTorrent = torrent;
                    
                    debugLog('Ã¢Å“â€¦ Seeding started:', torrent.magnetURI);
                    updateP2PStatus('ÄŸÅ¸â€œÂ¤ PaylaÃ…Å¸Ã„Â±lÃ„Â±yor: ' + torrent.numPeers + ' peer', 100);
                    
                    // Periyodik gÃƒÂ¼ncelleme
                    p2pUpdateInterval = setInterval(() => {
                        if (currentTorrent) {
                            const stats = `ÄŸÅ¸â€œÂ¤ ${formatBytes(currentTorrent.uploadSpeed)}/s | ÄŸÅ¸â€˜Â¥ ${currentTorrent.numPeers} peer`;
                            updateP2PStats(stats);
                        }
                    }, 1000);
                    trackInterval(p2pUpdateInterval);
                    
                    resolve(torrent.magnetURI);
                });
                
                // Timeout
                setTimeout(() => {
                    if (!currentTorrent) {
                        reject(new Error('Torrent oluÃ…Å¸turma zaman aÃ…Å¸Ã„Â±mÃ„Â±'));
                    }
                }, 30000);
            });
        }
