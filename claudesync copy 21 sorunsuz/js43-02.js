
function updateSpatialAudioButton(enabled) {
    const btn = document.getElementById('btn-spatial-audio');
    if (btn) {
        if (enabled) {
            btn.textContent = '🎧 3D Ses ✓';
            btn.style.background = 'linear-gradient(135deg, #4ade80, #22c55e)';
        } else {
            btn.textContent = '🔊 Stereo';
            btn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        }
    }
}

debugLog('✅ Spatial Audio modülü yüklendi');