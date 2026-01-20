        
        function startOwnerTasks() {
            // ✅ FIX: Önce mevcut owner interval'larını temizle (birikim önleme)
            clearOwnerTasks();
            
            ownerKeyframeInterval = setInterval(sendKeyframe, KEYFRAME_INTERVAL);
            ownerCleanupInterval = setInterval(cleanupOldData, 30000);
            
            trackInterval(ownerKeyframeInterval);
            trackInterval(ownerCleanupInterval);
            
            debugLog('👑 Owner tasks started');
        }
        

// DOMContentLoaded'dan ÖNCE, script içinde ekle:
// ✅ FIX: video-texture-fix artık throttled - her frame yerine 100ms'de bir
AFRAME.registerComponent('video-texture-fix', {
    schema: { type: 'selector' },
    init: function () {
        this.videoEl = this.data;
        this.material = null;
        this.lastUpdate = 0;
        this.updateInterval = 100; // ms - 10 FPS yeterli texture update için
    },
    tick: function (time) {
        if (!this.videoEl) return;
        
        // Throttle: sadece 100ms'de bir güncelle
        if (time - this.lastUpdate < this.updateInterval) return;
        this.lastUpdate = time;
        
        // readyState >= 2 means HAVE_CURRENT_DATA or higher
        // Sadece video oynatılıyorken güncelle
        if (this.videoEl.readyState >= 2 && !this.videoEl.paused) {
            if (!this.material) {
                const mesh = this.el.getObject3D('mesh');
                if (mesh && mesh.material) {
                    this.material = mesh.material;
                }
            }
            
            if (this.material && this.material.map) {
                this.material.map.needsUpdate = true;
            }
        }
    }
});