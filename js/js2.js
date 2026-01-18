function cleanupP2P() {
    try {
        if (p2pProgressInterval) {
            clearInterval(p2pProgressInterval);
            p2pProgressInterval = null;
        }
        if (p2pTorrent) {
            try { p2pTorrent.destroy(); } catch (e) {}
            p2pTorrent = null;
        }
        if (p2pClient) {
            try { p2pClient.destroy(); } catch (e) {}
            p2pClient = null;
        }
        p2pMagnetURI = null;
        hideP2PStatus();
    } catch (e) {
        console.warn('P2P cleanup error:', e);
    }
}

function showP2PStatus() {
    const el = getCachedElement('p2p-status');
    if (el) el.style.display = 'block';
}

function hideP2PStatus() {
    const el = getCachedElement('p2p-status');
    if (el) el.style.display = 'none';
}

function setP2PStatusUI({ modeText, peersText, progressPct, speedText }) {
    const modeEl = getCachedElement('p2p-mode-label');
    const peersEl = getCachedElement('p2p-peers');
    const progressEl = getCachedElement('p2p-progress-text');
    const speedEl = getCachedElement('p2p-speed');
    const barEl = getCachedElement('p2p-progress-bar');

    if (modeEl && modeText != null) modeEl.textContent = modeText;
    if (peersEl && peersText != null) peersEl.textContent = peersText;
    if (progressEl && progressPct != null) progressEl.textContent = `${progressPct}%`;
    if (speedEl && speedText != null) speedEl.textContent = speedText;
    if (barEl && progressPct != null) barEl.style.width = `${progressPct}%`;
}

function formatBytesPerSecond(bps) {
    const n = Number(bps) || 0;
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let v = n;
    let u = 0;
    while (v >= 1024 && u < units.length - 1) {
        v /= 1024;
        u++;
    }
    return `${v.toFixed(u === 0 ? 0 : 1)} ${units[u]}`;
}

function pickBestVideoFile(files) {
    if (!files || !files.length) return null;

    const preferredExt = ['.mp4', '.webm', '.mkv', '.mov', '.m4v', '.ogv', '.ogg'];
    const byExt = files.find(f => preferredExt.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (byExt) return byExt;

    // fallback: pick largest file
    return files.slice().sort((a, b) => (b.length || 0) - (a.length || 0))[0];
}

async function seedLocalVideo(file) {
    if (!currentRoomId || !db) return;


    await ensureAuthReady();
    const client = initP2PClientIfNeeded();
    if (!client) {
        alert('Bu tarayıcı P2P (WebTorrent/WebRTC) desteklemiyor.');
        return;
    }

    cleanupP2P(); // ensure clean state, then recreate client
    const freshClient = initP2PClientIfNeeded();
    if (!freshClient) return;

    showP2PStatus();
    setP2PStatusUI({
        modeText: 'Seeding',
        peersText: '0 peers',
        progressPct: 0,
        speedText: '0 B/s'
    });

    return new Promise((resolve) => {
        freshClient.seed(file, { announce: P2P_TRACKERS }, async (torrent) => {
            p2pTorrent = torrent;
            p2pMagnetURI = torrent.magnetURI;

            try {
                await db.ref('rooms/' + currentRoomId + '/torrent').update({
                    magnetURI: torrent.magnetURI
                });
            } catch (e) {
                console.warn('Failed to write magnetURI:', e);
            }

            const chosen = pickBestVideoFile(torrent.files);
            if (chosen && videoElement) {
                try {
                    destroyAdaptiveStreaming();
                    revokeCurrentVideoURL();
                    videoElement.removeAttribute('src');
                    videoElement.load();
                    chosen.streamTo(videoElement);
                } catch (e) {
                    console.warn('P2P stream error:', e);
                }
            }

            // UI updates
            if (p2pProgressInterval) clearInterval(p2pProgressInterval);
            p2pProgressInterval = trackInterval(setInterval(() => {
                if (!p2pTorrent) return;
                const peers = p2pTorrent.numPeers || 0;
                const pct = Math.floor((p2pTorrent.progress || 0) * 100);
                setP2PStatusUI({
                    modeText: 'Seeding',
                    peersText: `${peers} peers`,
                    progressPct: pct,
                    speedText: `↑ ${formatBytesPerSecond(p2pTorrent.uploadSpeed)}`
                });
            }, 800));

            torrent.on('error', (err) => console.warn('Torrent error:', err));
            resolve();
        });
    });
}

function joinP2PTorrent(magnetURI) {
    if (!magnetURI || !currentRoomId) return;
    if (p2pMagnetURI && p2pMagnetURI === magnetURI && p2pTorrent) return;

    const client = initP2PClientIfNeeded();
    if (!client) {
        alert('Bu tarayıcı P2P (WebTorrent/WebRTC) desteklemiyor.');
        return;
    }

    // If we were already in another torrent, clean up first
    cleanupP2P();
    const freshClient = initP2PClientIfNeeded();
    if (!freshClient) return;

    p2pMagnetURI = magnetURI;
    showP2PStatus();
    setP2PStatusUI({
        modeText: 'Downloading',
        peersText: '0 peers',
        progressPct: 0,
        speedText: '0 B/s'
    });

    freshClient.add(magnetURI, { announce: P2P_TRACKERS }, (torrent) => {
        p2pTorrent = torrent;

        const chosen = pickBestVideoFile(torrent.files);
        if (chosen && videoElement) {
            try {
                destroyAdaptiveStreaming();
                revokeCurrentVideoURL();
                videoElement.removeAttribute('src');
                videoElement.load();
                chosen.streamTo(videoElement);
            } catch (e) {
                console.warn('P2P stream error:', e);
            }
        }

        if (p2pProgressInterval) clearInterval(p2pProgressInterval);
        p2pProgressInterval = trackInterval(setInterval(() => {
            if (!p2pTorrent) return;
            const peers = p2pTorrent.numPeers || 0;
            const pct = Math.floor((p2pTorrent.progress || 0) * 100);
            setP2PStatusUI({
                modeText: p2pTorrent.done ? 'Seeding' : 'Downloading',
                peersText: `${peers} peers`,
                progressPct: pct,
                speedText: `↓ ${formatBytesPerSecond(p2pTorrent.downloadSpeed)} • ↑ ${formatBytesPerSecond(p2pTorrent.uploadSpeed)}`
            });
        }, 800));

        torrent.on('error', (err) => console.warn('Torrent error:', err));
    });
}

function listenP2PMagnetURI() {
    if (!currentRoomId || !db) return;

    const magnetRef = db.ref('rooms/' + currentRoomId + '/torrent/magnetURI');
    trackListener(magnetRef);

    magnetRef.on('value', (snapshot) => {
        const magnetURI = snapshot.val();
        if (!currentRoomData) return;

        currentRoomData.torrent = currentRoomData.torrent || {};
        currentRoomData.torrent.magnetURI = magnetURI;

        if (magnetURI) {
            joinP2PTorrent(magnetURI);
        } else {
            // No magnet -> fall back to URL workflow (if available)
            hideP2PStatus();
            if (currentRoomData.videoUrl) {
                if (typeof currentRoomData.videoUrl === 'string' && currentRoomData.videoUrl.startsWith('p2p://')) {
            // P2P placeholder: source will be provided by WebTorrent when magnetURI arrives
        } else {
            setupAdaptiveSource(currentRoomData.videoUrl);
        }
            }
        }
    });
}


        function setCommandSourceSelf() {
            if (commandSourceTimeoutId) {
                clearTimeout(commandSourceTimeoutId);
            }
            lastCommandSource = 'self';
            commandSourceTimeoutId = setTimeout(() => {
                lastCommandSource = null;
                commandSourceTimeoutId = null;
            }, 2000);
        }

        function updateVideoState(updates) {
            if (videoStateUpdateDebounce) {
                clearTimeout(videoStateUpdateDebounce);
            }
            
            videoStateUpdateDebounce = setTimeout(() => {
                setCommandSourceSelf();
                db.ref(`rooms/${currentRoomId}/videoState`).update(updates);
                videoStateUpdateDebounce = null;
            }, 200);
        }


function seekBackward() {
    if (!isRoomOwner || !videoElement) return;

    pendingSeekAmount -= 10;

    if (seekDebounceTimer) {
        clearTimeout(seekDebounceTimer);
    }

    seekDebounceTimer = setTimeout(() => {
        executeSeek('backward', pendingSeekAmount);
        seekDebounceTimer = null;
        pendingSeekAmount = 0;
    }, 500);
}

function seekForward() {
    if (!isRoomOwner || !videoElement) return;

    pendingSeekAmount += 10;

    if (seekDebounceTimer) {
        clearTimeout(seekDebounceTimer);
    }

    seekDebounceTimer = setTimeout(() => {
        executeSeek('forward', pendingSeekAmount);
        seekDebounceTimer = null;
        pendingSeekAmount = 0;
    }, 500);
}

function executeSeek(direction, totalAmount) {
    if (!videoElement || isSeeking) return;

    if (videoElement.readyState < 1) {
        console.warn('Video metadata not loaded yet');
        return;
    }

    isSeeking = true;

    const targetTime = Math.max(0, Math.min(videoElement.duration || Infinity, videoElement.currentTime + totalAmount));

    lastCommandSource = 'self';
    videoElement.pause();

    let seekCompleted = false;

    const onSeeked = () => {
        if (seekCompleted) return;
        seekCompleted = true;
        videoElement.removeEventListener('seeked', onSeeked);

        const newPos = videoElement.currentTime;
        const updates = {
            'videoState/isPlaying': false,
            'videoState/currentTime': newPos,
            'videoState/startTimestamp': getServerTime(),
            'videoState/lastUpdate': firebase.database.ServerValue.TIMESTAMP,
            'keyframes': null,
            'syncState': null
        };

        db.ref(`rooms/${currentRoomId}`).update(updates)
            .then(() => {
                debugLog(`Seek ${direction} complete, paused at`, newPos);
                isSeeking = false;
            })
            .catch(err => {
                console.warn('Seek update error:', err);
                isSeeking = false;
            });

        // ✅ FIX: Timeout'u track et
        trackTimeout(setTimeout(() => { lastCommandSource = null; }, 2500));
    };

    videoElement.addEventListener('seeked', onSeeked);
    videoElement.currentTime = targetTime;

    // ✅ FIX: Timeout'u track et
    trackTimeout(setTimeout(() => {
        if (!seekCompleted) {
            isSeeking = false;
            debugLog('Seek timeout - forcing completion');
            onSeeked();
        }
    }, 2000));
}



        // ==================== FIREBASE INIT ====================
        firebase.initializeApp(firebaseConfig);
        db = firebase.database();
        auth = firebase.auth();
        
        // ==================== HELPER FUNCTIONS ====================
        function debugLog(...args) {
            if (DEBUG_MODE) console.log(...args);
        }
        

        // requestAnimationFrame queue limiter
        let rafQueue = [];
        let rafScheduled = false;
        
        function queueRAF(callback) {
            rafQueue.push(callback);
            if (!rafScheduled) {
                rafScheduled = true;
                requestAnimationFrame(() => {
                    const callbacks = rafQueue.splice(0);
                    rafScheduled = false;
                    callbacks.forEach(cb => {
                        try { cb(); } catch(e) { console.warn('RAF callback error:', e); }
                    });
                });
            }
        }
        
        
        function getServerTime() {
            return Date.now() + clockOffset;
        }
