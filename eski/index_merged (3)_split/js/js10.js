        
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
