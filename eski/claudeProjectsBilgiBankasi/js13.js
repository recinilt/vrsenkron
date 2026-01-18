        
        // Magnet URI'den video indir (izleyici iÃƒÂ§in)
        async function joinP2PTorrent(magnetURI) {
            return new Promise((resolve, reject) => {
                if (!magnetURI) {
                    reject(new Error('Magnet URI bulunamadÃ„Â±'));
                    return;
                }
                
                initP2PClient();
                
                if (!p2pClient) {
                    reject(new Error('WebTorrent baÃ…Å¸latÃ„Â±lamadÃ„Â±'));
                    return;
                }
                
                showP2PStatus('ÄŸÅ¸â€Â Torrent aranÃ„Â±yor...', 0);
                
                const opts = {
                    announce: WEBTORRENT_TRACKERS
                };
                
                p2pClient.add(magnetURI, opts, (torrent) => {
                    currentTorrent = torrent;
                    
                    debugLog('Ã¢Å“â€¦ Torrent joined:', torrent.infoHash);
                    debugLog('ÄŸÅ¸â€œÂ Files:', torrent.files.map(f => f.name));
                    
                    // Video dosyasÃ„Â±nÃ„Â± bul
                    const videoFile = torrent.files.find(file => {
                        const ext = file.name.split('.').pop().toLowerCase();
                        return ['mp4', 'webm', 'mkv', 'ogv', 'mov', 'avi'].includes(ext);
                    });
                    
                    if (!videoFile) {
                        reject(new Error('Video dosyasÃ„Â± bulunamadÃ„Â±'));
                        return;
                    }
                    
                    // Progress gÃƒÂ¼ncelleme
                    p2pUpdateInterval = setInterval(() => {
                        if (currentTorrent) {
                            const progress = Math.round(currentTorrent.progress * 100);
                            const stats = `ÄŸÅ¸â€œÂ¥ ${formatBytes(currentTorrent.downloadSpeed)}/s | ÄŸÅ¸â€œÂ¤ ${formatBytes(currentTorrent.uploadSpeed)}/s | ÄŸÅ¸â€˜Â¥ ${currentTorrent.numPeers}`;
                            updateP2PStatus(`ÄŸÅ¸â€œÂ¥ Ã„Â°ndiriliyor: %${progress}`, progress);
                            updateP2PStats(stats);
                            
                            if (currentTorrent.progress === 1) {
                                updateP2PStatus('Ã¢Å“â€¦ TamamlandÃ„Â± - PaylaÃ…Å¸Ã„Â±lÃ„Â±yor', 100);
                            }
                        }
                    }, 500);
                    trackInterval(p2pUpdateInterval);
                    
                    resolve(videoFile);
                });
                
                // Timeout
                setTimeout(() => {
                    if (!currentTorrent) {
                        reject(new Error('Torrent baÃ„Å¸lantÃ„Â± zaman aÃ…Å¸Ã„Â±mÃ„Â±'));
                    }
                }, 60000);
            });
        }
