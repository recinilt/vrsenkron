        
        // ==================== ROOM MANAGEMENT ====================
        async function createRoom() {
            const roomName = getCachedElement('room-name').value.trim();
            const videoUrl = getCachedElement('video-url').value.trim();
            const screenSize = getCachedElement('screen-size').value;
            const environment = getCachedElement('environment').value;
            
            // P2P modu kontrolÃƒÂ¼
            const isP2PMode = currentVideoSourceType === 'local';
            
            if (!roomName) {
                alert('LÃƒÂ¼tfen oda adÃ„Â± giriniz!');
                return;
            }
            
            if (!isP2PMode && !videoUrl) {
                alert('LÃƒÂ¼tfen video URL giriniz!');
                return;
            }
            
            if (isP2PMode && !selectedLocalFile) {
                alert('LÃƒÂ¼tfen bir video dosyasÃ„Â± seÃƒÂ§iniz!');
                return;
            }
            
            try {
                const userCredential = await auth.signInAnonymously();
                currentUser = userCredential.user;
                
                let finalVideoUrl = videoUrl;
                let magnetURI = null;
                
                // P2P modunda dosyayÃ„Â± seed et
                if (isP2PMode && selectedLocalFile) {
                    try {
                        magnetURI = await seedLocalVideo(selectedLocalFile);
                        finalVideoUrl = 'p2p://' + magnetURI; // P2P marker
                        debugLog('Ã¢Å“â€¦ Magnet URI created:', magnetURI);
                    } catch (e) {
                        console.error('Seed error:', e);
                        alert('Video paylaÃ…Å¸Ã„Â±mÃ„Â± baÃ…Å¸latÃ„Â±lamadÃ„Â±: ' + e.message);
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
                
                // P2P modunda magnet URI'yi ayrÃ„Â± kaydet
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
                console.error('Ã¢ÂÅ’ Oda oluÃ…Å¸turma hatasÃ„Â±:', error);
                alert('Oda oluÃ…Å¸turulamadÃ„Â±: ' + error.message);
            }
        }
