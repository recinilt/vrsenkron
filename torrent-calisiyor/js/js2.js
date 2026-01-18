function applyHlsCap() {
    if (!hlsInstance || !hlsInstance.levels || hlsInstance.levels.length === 0) return;

    let capIndex = -1;
    for (let i = 0; i < hlsInstance.levels.length; i++) {
        const h = hlsInstance.levels[i].height || 0;
        if (h > 0 && h <= abrMaxHeightCap) capIndex = i;
    }

    if (capIndex === -1) {
        // If levels don't expose height, just cap to the top level (best effort)
        capIndex = hlsInstance.levels.length - 1;
    }

    hlsInstance.autoLevelCapping = capIndex;

    // If currently above cap, force next segment down
    if (hlsInstance.currentLevel > capIndex) {
        hlsInstance.nextAutoLevel = capIndex;
    }
}

function normalizeKbps(value) {
    if (!isFinite(value) || isNaN(value)) return null;
    // dash.js commonly uses kbps, but guard if bits/s slipped in
    if (value > 100000) return Math.round(value / 1000);
    return Math.round(value);
}

function applyDashCap() {
    if (!dashInstance) return;

    let list = [];
    try {
        list = dashInstance.getBitrateInfoListFor('video') || [];
    } catch (e) {
        list = [];
    }
    if (!list.length) return;

    const kbpsValues = list.map(i => normalizeKbps(i.bitrate)).filter(v => v !== null);
    if (!kbpsValues.length) return;

    const minKbps = Math.min(...kbpsValues);

    const candidates = list
        .filter(i => (i.height || 0) > 0 && i.height <= abrMaxHeightCap)
        .map(i => normalizeKbps(i.bitrate))
        .filter(v => v !== null);

    const maxKbps = candidates.length ? Math.max(...candidates) : minKbps;

    // Start low, keep min low, cap max to selected threshold
    dashInstance.updateSettings({
        streaming: {
            abr: {
                initialBitrate: { audio: -1, video: minKbps },
                minBitrate: { audio: -1, video: minKbps },
                maxBitrate: { audio: -1, video: maxKbps }
            },
            buffer: {
                fastSwitchEnabled: true
            }
        }
    });
}

function setupAdaptiveSource(url) {
    if (!videoElement) return;

    destroyAdaptiveStreaming();

    const type = getStreamType(url);

    if (type === 'hls') {
        if (window.Hls && Hls.isSupported()) {
            hlsInstance = new Hls({
                startLevel: 0, // start from lowest
                minAutoBitrate: 0, // allow lowest
                abrEwmaDefaultEstimate: 150000, // very low initial estimate (bps)
                abrBandWidthFactor: 0.9, // ✅ FIX: 0.8 -> 0.9 (kalite düşürme için daha muhafazakar)
                abrBandWidthUpFactor: 0.6 // ✅ FIX: 0.7 -> 0.6 (yukarı geçişte daha dikkatli)
            });

            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
                applyHlsCap();
                updateQualityCapUI();
            });

            hlsInstance.attachMedia(videoElement);
            hlsInstance.loadSource(url);
            return;
        }

        // Safari / native HLS support
        videoElement.src = url;
        updateQualityCapUI();
        return;
    }

    if (type === 'dash') {
        if (window.dashjs && dashjs.MediaPlayer) {
            dashInstance = dashjs.MediaPlayer().create();

            dashInstance.updateSettings({
                streaming: {
                    abr: {
                        initialBitrate: { audio: -1, video: 150 }, // kbps
                        minBitrate: { audio: -1, video: 100 },
                        maxBitrate: { audio: -1, video: 2500 } // will be recalculated on init
                    },
                    buffer: {
                        fastSwitchEnabled: true
                    }
                }
            });

            dashInstance.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
                applyDashCap();
                updateQualityCapUI();
            });

            dashInstance.initialize(videoElement, url, false);
            return;
        }

        videoElement.src = url;
        updateQualityCapUI();
        return;
    }

    // Native progressive (mp4/webm/etc.)
    videoElement.src = url;
    updateQualityCapUI();
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
