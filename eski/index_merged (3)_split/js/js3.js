
function setMaxQualityCap(newCap) {
    abrMaxHeightCap = Math.max(QUALITY_CAPS[0], Math.min(720, newCap));
    updateQualityCapUI();
    applyAdaptiveCap();
}

function increaseMaxQuality() {
    const idx = QUALITY_CAPS.indexOf(abrMaxHeightCap);
    const next = idx === -1 ? 720 : QUALITY_CAPS[Math.min(QUALITY_CAPS.length - 1, idx + 1)];
    setMaxQualityCap(next);
}

function decreaseMaxQuality() {
    const idx = QUALITY_CAPS.indexOf(abrMaxHeightCap);
    const next = idx === -1 ? 480 : QUALITY_CAPS[Math.max(0, idx - 1)];
    setMaxQualityCap(next);
}

function applyAdaptiveCap() {
    if (hlsInstance) {
        applyHlsCap();
    }
    if (dashInstance) {
        applyDashCap();
    }
}

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
