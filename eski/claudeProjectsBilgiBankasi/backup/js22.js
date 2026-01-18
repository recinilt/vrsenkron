        
        async function showRoomList() {
            try {
                if (!auth.currentUser) {
                    await auth.signInAnonymously();
                }
                
                const roomsSnapshot = await db.ref('rooms').limitToLast(20).once('value');
                const roomList = getCachedElement('room-list');
                roomList.innerHTML = '';
                
                const rooms = [];
                const roomsToDelete = [];
                
                roomsSnapshot.forEach(child => {
                    const roomData = child.val();
                    const viewerCount = roomData.activeViewers ? Object.keys(roomData.activeViewers).length : 0;
                    
                    if (viewerCount === 0) {
                        roomsToDelete.push(child.key);
                    } else {
                        rooms.push({ id: child.key, data: roomData, viewers: viewerCount });
                    }
                });
                
                roomsToDelete.forEach(roomId => {
                    db.ref('rooms/' + roomId).remove();
                });
                
                if (rooms.length === 0) {
                    roomList.innerHTML = '<p style="text-align: center; opacity: 0.7;">Aktif oda bulunamadÄ±</p>';
                } else {
                    rooms.forEach(room => {
                        const isP2P = room.data.p2p && room.data.p2p.magnetURI;
                        const roomDiv = document.createElement('div');
                        roomDiv.className = 'room-item';
                        roomDiv.innerHTML = `
                            <div class="room-name">${room.data.name} ${isP2P ? 'ğŸ”— P2P' : ''}</div>
                            <div class="room-details">ğŸ‘¥ ${room.viewers} izleyici ${isP2P ? '| ğŸ“ ' + room.data.p2p.fileName : ''}</div>
                        `;
                        roomDiv.onclick = () => joinRoom(room.id);
                        roomList.appendChild(roomDiv);
                    });
                }
                
                getCachedElement('create-room-section').classList.add('hidden');
                getCachedElement('room-list-section').classList.remove('hidden');
                
            } catch (error) {
                console.error('âŒ Oda listesi hatasÄ±:', error);
                alert('Odalar yÃ¼klenirken hata oluÅŸtu: ' + error.message + '\n\nLÃ¼tfen Firebase Rules ayarlarÄ±nÄ±zÄ± kontrol edin.');
            }
        }
