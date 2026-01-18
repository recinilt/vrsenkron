
        function handleVRButton(action) {
            if (!isRoomOwner) return;
            
            switch(action) {
                case 'play':
                    playVideo();
                    break;
                case 'pause':
                    pauseVideo();
                    break;
                case 'rewind':
                    seekBackward();
                    break;
                case 'forward':
                    seekForward();
                    break;
            }
        }
        
        // ==================== VIDEO CONTROLS (OWNER ONLY) ====================
        let playPromisePending = false;
