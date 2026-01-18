        
        // ==================== ROOM MANAGEMENT ====================
        async function createRoom() {
            const roomName = getCachedElement('room-name').value.trim();
            const videoUrl = getCachedElement('video-url').value.trim();
            const screenSize = getCachedElement('screen-size').value;
            const environment = getCachedElement('environment').value;
            
            // P2P modu kontrolÃ¼
            const isP2PMode = currentVideoSourceType === 'local';
            
            if (!roomName) {
                alert('LÃ¼tfen oda adÄ± giriniz!');
                return;
            }
            
            if (!isP2PMode && !videoUrl) {
                alert('LÃ¼tfen video URL giriniz!');
                return;
            }
            
            if (isP2PMode && !selectedLocalFile) {
                alert('LÃ¼tfen bir video dosyasÄ± seÃ§iniz!');
                return;
            }
            
            try {
                const userCredential = await auth.signInAnonymously();
                currentUser = userCredential.user;
                
                let finalVideoUrl = videoUrl;
                let magnetURI = null;
                
                // P2P modunda dosyayÄ± seed et
                if (isP2PMode && selectedLocalFile) {
                    try {
                        magnetURI = await seedLocalVideo(selectedLocalFile);
                        finalVideoUrl = 'p2p://' + magnetURI; // P2P marker
                        debugLog('âœ… Magnet URI created:', magnetURI);
                    } catch (e) {
                        console.error('Seed error:', e);
                        alert('Video paylaÅŸÄ±mÄ± baÅŸlatÄ±lamadÄ±: ' + e.message);
                        return;
                    }
                }
                
                const roomRef = db.ref('rooms').push();
                currentRoomId = roomRef.key;
                
                const roomData = {
                    name: roomName,
                    owner: currentUser.uid,
                    videoUrl: finalVideoUrl,
                    screenSize: screenSize,
                    environment: environment,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    videoState: {
                        isPlaying: false,
                        currentTime: 0,
                        startTimestamp: 0,
                        lastUpdate: firebase.database.ServerValue.TIMESTAMP
                    }
                };
                
                // P2P modunda magnet URI'yi ayrÄ± kaydet
                if (magnetURI) {
                    roomData.p2p = {
                        magnetURI: magnetURI,
                        fileName: selectedLocalFile.name,
                        fileSize: selectedLocalFile.size
                    };
                }
                
                await roomRef.set(roomData);
                
                await joinRoom(currentRoomId);
            } catch (error) {
                console.error('âŒ Oda oluÅŸturma hatasÄ±:', error);
                alert('Oda oluÅŸturulamadÄ±: ' + error.message);
            }
        }
