// ============================================
// ALTYAZI SİSTEMİ
// ============================================

function loadSubtitle(subtitleUrl) {
    if (!subtitleUrl) return;
    
    fetch(subtitleUrl)
        .then(response => response.text())
        .then(text => {
            const fileExtension = subtitleUrl.split('.').pop().toLowerCase();
            
            if (fileExtension === 'srt') {
                subtitleData = parseSRT(text);
            } else if (fileExtension === 'vtt') {
                subtitleData = parseVTT(text);
            } else if (fileExtension === 'ass' || fileExtension === 'ssa') {
                subtitleData = parseASS(text);
            }
            
            console.log('✓ Altyazı yüklendi:', subtitleData.length, 'satır');
            startSubtitleUpdate();
        })
        .catch(error => {
            console.error('❌ Altyazı yükleme hatası:', error);
        });
}

function parseSRT(srtText) {
    const subtitles = [];
    const blocks = srtText.trim().split(/\n\s*\n/);
    
    blocks.forEach(block => {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const timeLine = lines[1];
            const timeMatch = timeLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            
            if (timeMatch) {
                const startTime = parseFloat(timeMatch[1]) * 3600 + 
                                parseFloat(timeMatch[2]) * 60 + 
                                parseFloat(timeMatch[3]) + 
                                parseFloat(timeMatch[4]) / 1000;
                
                const endTime = parseFloat(timeMatch[5]) * 3600 + 
                              parseFloat(timeMatch[6]) * 60 + 
                              parseFloat(timeMatch[7]) + 
                              parseFloat(timeMatch[8]) / 1000;
                
                const text = lines.slice(2).join('\n');
                
                subtitles.push({ startTime, endTime, text });
            }
        }
    });
    
    return subtitles;
}

function parseVTT(vttText) {
    const subtitles = [];
    const lines = vttText.split('\n');
    let currentSubtitle = null;
    
    lines.forEach(line => {
        line = line.trim();
        
        if (line.includes('-->')) {
            const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/);
            
            if (timeMatch) {
                const startTime = parseFloat(timeMatch[1]) * 3600 + 
                                parseFloat(timeMatch[2]) * 60 + 
                                parseFloat(timeMatch[3]) + 
                                parseFloat(timeMatch[4]) / 1000;
                
                const endTime = parseFloat(timeMatch[5]) * 3600 + 
                              parseFloat(timeMatch[6]) * 60 + 
                              parseFloat(timeMatch[7]) + 
                              parseFloat(timeMatch[8]) / 1000;
                
                currentSubtitle = { startTime, endTime, text: '' };
            }
        } else if (currentSubtitle && line && !line.startsWith('WEBVTT')) {
            currentSubtitle.text += line + '\n';
            if (line === '' || lines[lines.indexOf(line) + 1] === '') {
                subtitles.push(currentSubtitle);
                currentSubtitle = null;
            }
        }
    });
    
    return subtitles;
}

function parseASS(assText) {
    const subtitles = [];
    const lines = assText.split('\n');
    
    lines.forEach(line => {
        if (line.startsWith('Dialogue:')) {
            const parts = line.substring(9).split(',');
            if (parts.length >= 10) {
                const startTime = parseAssTime(parts[1].trim());
                const endTime = parseAssTime(parts[2].trim());
                const text = parts.slice(9).join(',').replace(/\{[^}]*\}/g, '');
                
                subtitles.push({ startTime, endTime, text });
            }
        }
    });
    
    return subtitles;
}

function parseAssTime(timeStr) {
    const parts = timeStr.split(':');
    return parseFloat(parts[0]) * 3600 + 
           parseFloat(parts[1]) * 60 + 
           parseFloat(parts[2]);
}

function startSubtitleUpdate() {
    if (subtitleUpdateInterval) {
        clearInterval(subtitleUpdateInterval);
    }
    
    if (!subtitleElement) {
        createSubtitleElement();
    }
    
    subtitleUpdateInterval = setInterval(() => {
        if (!videoElement || !subtitleData) return;
        
        const currentTime = videoElement.currentTime;
        const currentSub = subtitleData.find(sub => 
            currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        
        if (currentSub) {
            subtitleElement.setAttribute('value', currentSub.text.trim());
            subtitleElement.setAttribute('visible', 'true');
        } else {
            subtitleElement.setAttribute('visible', 'false');
        }
    }, 100);
}

function createSubtitleElement() {
    const scene = document.querySelector('a-scene');
    
    subtitleElement = document.createElement('a-text');
    subtitleElement.setAttribute('id', 'subtitle-text');
    subtitleElement.setAttribute('value', '');
    subtitleElement.setAttribute('align', 'center');
    subtitleElement.setAttribute('width', 20);
    subtitleElement.setAttribute('position', '0 -3 -10');
    subtitleElement.setAttribute('color', '#FFFFFF');
    subtitleElement.setAttribute('shader', 'msdf');
    subtitleElement.setAttribute('background', 'color: rgba(0, 0, 0, 0.7); padding: 0.2');
    subtitleElement.setAttribute('visible', 'false');
    
    scene.appendChild(subtitleElement);
    console.log('✓ Altyazı elementi oluşturuldu');
}

function removeSubtitle() {
    if (subtitleUpdateInterval) {
        clearInterval(subtitleUpdateInterval);
        subtitleUpdateInterval = null;
    }
    
    if (subtitleElement) {
        subtitleElement.setAttribute('visible', 'false');
    }
    
    subtitleData = null;
    console.log('✓ Altyazı kaldırıldı');
}

console.log('✓ Altyazı sistemi yüklendi');
