// ============================================
// ODA YÖNETİMİ FONKSİYONLARI
// ============================================

function createRoom() {
    const roomName = document.getElementById('room-name-input').value.trim();
    const videoUrl = document.getElementById('video-url-input').value.trim();
    const subtitleUrl = document.getElementById('subtitle-url-input').value.trim();
    const environment = document.getElementById('environment-select').value;
    const screenSize = document.getElementById('screen-size').value;
    const isPrivate = document.getElementById('private-room').checked;
    const roomPassword = document.getElementById('room-password').value.trim();
    const controlMode = document.querySelector('input[name="control-mode"]:checked').value;
    
    if (!roomName || !videoUrl) {
        alert('⚠️ Lütfen oda adı ve video URL\'si girin!');
        return;
    }
    
    auth.signInAnonymously().then(() => {
        const userId = auth.currentUser.uid;
        const newRoomRef = roomsRef.push();
        const roomId = newRoomRef.key;
        
        const roomData = {
            name: roomName,
            videoUrl: videoUrl,
            subtitleUrl: subtitleUrl || null,
            environment: environment,
            screenSize: screenSize,
            owner: userId,
            ownerName: roomName.split(' ')[0] || 'Anonim',
            isPrivate: isPrivate,
            password: isPrivate ? roomPassword : null,
            controlMode: controlMode,
            viewers: 1,
            createdAt: Date.now(),
            videoState: {
                isPlaying: false,
                currentTime: 0,
                startTimestamp: null,
                lastUpdate: Date.now()
            }
        };
        
        newRoomRef.set(roomData).then(() => {
            console.log('✓ Oda oluşturuldu:', roomId);
            joinRoom(roomId, roomPassword);
        });
    }).catch((error) => {
        console.error('❌ Giriş hatası:', error);
        alert('Giriş yapılamadı!');
    });
}

function joinRoom(roomId, password = null) {
    roomsRef.child(roomId).once('value').then((snapshot) => {
        const room = snapshot.val();
        
        if (!room) {
            alert('⚠️ Oda bulunamadı!');
            return;
        }
        
        if (room.isPrivate && room.password !== password) {
            const enteredPassword = prompt('🔒 Bu oda şifrelidir. Şifreyi girin:');
            if (enteredPassword !== room.password) {
                alert('❌ Yanlış şifre!');
                return;
            }
        }
        
        auth.signInAnonymously().then(() => {
            const userId = auth.currentUser.uid;
            currentRoomId = roomId;
            currentRoomData = room;
            roomRef = roomsRef.child(roomId);
            
            isRoomOwner = (room.owner === userId);
            
            // Şifreyi sil (güvenlik)
            if (room.password) {
                roomRef.child('password').remove();
            }
            
            // İzleyici sayısını artır
            roomRef.child('viewers').transaction((current) => {
                return (current || 0) + 1;
            });
            
            // Presence sistemi
            viewerPresenceRef = database.ref('.info/connected');
            viewerPresenceRef.on('value', (snap) => {
                if (snap.val() === true) {
                    const myPresenceRef = roomRef.child('activeViewers').child(userId);
                    myPresenceRef.onDisconnect().remove();
                    myPresenceRef.set({
                        timestamp: Date.now(),
                        isOwner: isRoomOwner
                    });
                    
                    // İzleyici sayısını azalt - DÜZELTİLMİŞ
                    const viewersRef = roomRef.child('viewers');
                    viewersRef.onDisconnect().set(firebase.database.ServerValue.increment(-1));
                    
                    // Oda sahipliği transferi - DÜZELTİLMİŞ
                    if (isRoomOwner) {
                        const ownerRef = roomRef.child('owner');
                        ownerRef.onDisconnect().remove().then(() => {
                            console.log('✓ Disconnect handler ayarlandı (owner)');
                        });
                    }
                }
            });
            
            // Ortamı ayarla
            currentEnvironment = room.environment;
            setupVideo(room.videoUrl, room.screenSize);
            
            // Altyazı varsa yükle
            if (room.subtitleUrl) {
                loadSubtitle(room.subtitleUrl);
            }
            
            // VR UI Panel oluştur
            createVRUIPanel();
            
            hideOverlay();
            showVRControls();
            showRoomInfo();
            updateRoomInfoDisplay();
            listenToRoomUpdates();
            
            console.log('✓ Odaya katıldınız:', roomId);
            console.log('🎭 Ortam:', room.environment);
            console.log('👑 Oda sahibi:', isRoomOwner ? 'Evet' : 'Hayır');
            if (room.subtitleUrl) console.log('📝 Altyazı:', room.subtitleUrl);
        });
    }).catch((error) => {
        console.error('❌ Oda katılma hatası:', error);
        alert('Odaya katılınamadı!');
    });
}

function listRooms() {
    roomsRef.once('value').then((snapshot) => {
        const rooms = snapshot.val();
        const roomsList = document.getElementById('rooms-list');
        roomsList.innerHTML = '';
        
        if (!rooms) {
            roomsList.innerHTML = '<p style="text-align:center;color:#999;">Henüz oda yok. İlk odayı siz oluşturun! 🎬</p>';
            return;
        }
        
        let roomCount = 0;
        Object.entries(rooms).forEach(([roomId, room]) => {
            if (room.isPrivate) return;
            
            const isOwnerless = !room.owner;
            roomCount++;
            
            const roomDiv = document.createElement('div');
            roomDiv.className = `room-item${isOwnerless ? ' ownerless' : ''}`;
            roomDiv.onclick = () => joinRoom(roomId);
            
            const subtitleBadge = room.subtitleUrl ? ' | 📝 Altyazı' : '';
            
            roomDiv.innerHTML = `
                <div class="room-name">
                    ${escapeHtml(room.name)}
                    ${isOwnerless ? '<span class="badge badge-ownerless">Sahipsiz</span>' : ''}
                </div>
                <div class="room-info">
                    👥 ${room.viewers || 0} izleyici | 
                    🎭 ${ENVIRONMENTS[room.environment]?.name || 'Bilinmeyen'} | 
                    🎮 ${room.controlMode === 'owner' ? 'Sadece Sahip' : 'Herkes'}${subtitleBadge}
                    ${isOwnerless ? ' | ⚠️ Sahiplik alabilirsiniz' : ''}
                </div>
            `;
            
            roomsList.appendChild(roomDiv);
        });
        
        if (roomCount === 0) {
            roomsList.innerHTML = '<p style="text-align:center;color:#999;">Hiç açık oda yok. İlk odayı siz oluşturun! 🎬</p>';
        }
    });
}

function findAndTransferOwnership(roomId) {
    const roomRef = roomsRef.child(roomId);
    
    roomRef.child('activeViewers').once('value', (snapshot) => {
        const viewers = snapshot.val();
        
        if (!viewers || Object.keys(viewers).length === 0) {
            console.log('ℹ️ Başka izleyici yok, oda sahipsiz kalacak');
            roomRef.child('owner').set(null);
            return;
        }
        
        // İlk aktif izleyiciyi bul
        const newOwnerId = Object.keys(viewers)[0];
        roomRef.child('owner').set(newOwnerId);
        console.log('✓ Oda sahipliği transfer edildi:', newOwnerId);
    });
}

console.log('✓ Oda yönetimi fonksiyonları yüklendi');