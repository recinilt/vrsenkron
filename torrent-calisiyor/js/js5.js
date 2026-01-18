// Magnet URI'den video indir (izleyici için)
        async function joinP2PTorrent(magnetURI) {
            return new Promise((resolve, reject) => {
                if (!magnetURI) {
                    reject(new Error('Magnet URI bulunamadı'));
                    return;
                }
                
                initP2PClient();
                
                if (!p2pClient) {
                    reject(new Error('WebTorrent başlatılamadı'));
                    return;
                }
                
                showP2PStatus('🔍 Torrent aranıyor...', 0);
                
                const opts = {
                    announce: WEBTORRENT_TRACKERS
                };
                
                p2pClient.add(magnetURI, opts, (torrent) => {
                    currentTorrent = torrent;
                    
                    debugLog('✅ Torrent joined:', torrent.infoHash);
                    debugLog('📁 Files:', torrent.files.map(f => f.name));
                    
                    // Video dosyasını bul
                    const videoFile = torrent.files.find(file => {
                        const ext = file.name.split('.').pop().toLowerCase();
                        return ['mp4', 'webm', 'mkv', 'ogv', 'mov', 'avi'].includes(ext);
                    });
                    
                    if (!videoFile) {
                        reject(new Error('Video dosyası bulunamadı'));
                        return;
                    }
                    
                    // Progress güncelleme
                    p2pUpdateInterval = setInterval(() => {
                        if (currentTorrent) {
                            const progress = Math.round(currentTorrent.progress * 100);
                            const stats = `📥 ${formatBytes(currentTorrent.downloadSpeed)}/s | 📤 ${formatBytes(currentTorrent.uploadSpeed)}/s | 👥 ${currentTorrent.numPeers}`;
                            updateP2PStatus(`📥 İndiriliyor: %${progress}`, progress);
                            updateP2PStats(stats);
                            
                            if (currentTorrent.progress === 1) {
                                updateP2PStatus('✅ Tamamlandı - Paylaşılıyor', 100);
                            }
                        }
                    }, 500);
                    trackInterval(p2pUpdateInterval);
                    
                    resolve(videoFile);
                });
                
                // Timeout
                setTimeout(() => {
                    if (!currentTorrent) {
                        reject(new Error('Torrent bağlantı zaman aşımı'));
                    }
                }, 60000);
            });
        }
        
        // P2P Status UI
        function showP2PStatus(text, progress) {
            const statusEl = getCachedElement('p2p-status');
            const textEl = getCachedElement('p2p-status-text');
            const fillEl = getCachedElement('p2p-progress-fill');
            
            if (statusEl) statusEl.style.display = 'block';
            if (textEl) textEl.textContent = text;
            if (fillEl) fillEl.style.width = progress + '%';
        }
        
        function updateP2PStatus(text, progress) {
            const textEl = getCachedElement('p2p-status-text');
            const fillEl = getCachedElement('p2p-progress-fill');
            
            if (textEl) textEl.textContent = text;
            if (fillEl) fillEl.style.width = progress + '%';
        }
        
        function updateP2PStats(stats) {
            const statsEl = getCachedElement('p2p-stats');
            if (statsEl) statsEl.textContent = stats;
        }
        
        function hideP2PStatus() {
            const statusEl = getCachedElement('p2p-status');
            if (statusEl) statusEl.style.display = 'none';
        }
        
        function formatBytes(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
        
        // Dosya seçme event'leri
        function setupFileInput() {
            const fileInput = document.getElementById('local-video-file');
            const dropZone = document.getElementById('file-drop-zone');
            const fileNameDisplay = document.getElementById('selected-file-name');
            
            if (fileInput) {
                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file) {
                        selectedLocalFile = file;
                        if (fileNameDisplay) {
                            fileNameDisplay.textContent = '✅ ' + file.name + ' (' + formatBytes(file.size) + ')';
                        }
                        debugLog('📁 File selected:', file.name, file.size);
                    }
                });
            }
            
            if (dropZone) {
                dropZone.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    dropZone.classList.add('dragover');
                });
                
                dropZone.addEventListener('dragleave', () => {
                    dropZone.classList.remove('dragover');
                });
                
                dropZone.addEventListener('drop', (e) => {
                    e.preventDefault();
                    dropZone.classList.remove('dragover');
                    
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith('video/')) {
                        selectedLocalFile = file;
                        if (fileNameDisplay) {
                            fileNameDisplay.textContent = '✅ ' + file.name + ' (' + formatBytes(file.size) + ')';
                        }
                        debugLog('📁 File dropped:', file.name, file.size);
                    }
                });
            }
        }
