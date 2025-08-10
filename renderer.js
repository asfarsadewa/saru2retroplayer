const { ipcRenderer } = require('electron');

class RetroVideoPlayer {
    constructor() {
        this.video = document.getElementById('videoPlayer');
        this.playButton = document.getElementById('playButton');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.rewBtn = document.getElementById('rewBtn');
        this.ffBtn = document.getElementById('ffBtn');
        this.progressBar = document.getElementById('progressBar');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.volumeKnob = document.getElementById('volumeKnob');
        this.muteBtn = document.getElementById('muteBtn');
        this.subtitleBtn = document.getElementById('subtitleBtn');
        this.audioBtn = document.getElementById('audioBtn');
        this.aspectBtn = document.getElementById('aspectBtn');
        this.audioSelectionOverlay = document.getElementById('audioSelectionOverlay');
        this.audioTrackList = document.getElementById('audioTrackList');
        this.confirmAudioBtn = document.getElementById('confirmAudioBtn');
        this.cancelAudioBtn = document.getElementById('cancelAudioBtn');
        this.currentTime = document.getElementById('currentTime');
        this.duration = document.getElementById('duration');
        this.dropZone = document.getElementById('dropZone');
        this.videoOverlay = document.querySelector('.video-overlay');
        this.subtitleOverlay = document.getElementById('subtitleOverlay');
        this.urlInput = document.getElementById('urlInput');
        this.loadUrlBtn = document.getElementById('loadUrlBtn');
        
        // Status indicators
        this.playIndicator = document.querySelector('.play-indicator');
        this.pauseIndicator = document.querySelector('.pause-indicator');
        this.recIndicator = document.querySelector('.rec-indicator');
        
        this.isPlaying = false;
        this.isDragging = false;
        this.isVideoFullscreen = false;
        this.subtitles = [];
        this.currentSubtitleTrack = -1;
        this.subtitlesEnabled = false;
        this.audioTracks = [];
        this.currentAudioTrack = 0;
        this.currentVideoPath = null;
        this.selectedAudioTrack = 0;
        this.isWaitingForAudioSelection = false;
        this.aspectModes = ['crop', 'stretch', 'fit'];
        this.currentAspectMode = 1; // Default to stretch mode
        
        this.initializeEventListeners();
        this.applyRetroEffects();
        this.updateVolumeKnob();
        this.startScreenEffects();
    }
    
    initializeEventListeners() {
        this.video.addEventListener('loadedmetadata', () => this.onVideoLoaded());
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('ended', () => this.onVideoEnded());
        this.video.addEventListener('play', () => this.onPlay());
        this.video.addEventListener('pause', () => this.onPause());
        
        this.playButton.addEventListener('click', () => this.togglePlay());
        this.playPauseBtn.addEventListener('click', () => this.togglePlay());
        this.stopBtn.addEventListener('click', () => this.stopVideo());
        this.rewBtn.addEventListener('click', () => this.rewind());
        this.ffBtn.addEventListener('click', () => this.fastForward());
        
        this.progressBar.addEventListener('mousedown', () => this.isDragging = true);
        this.progressBar.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.seekTo();
        });
        this.progressBar.addEventListener('input', () => {
            if (this.isDragging) this.seekTo();
        });
        
        this.volumeSlider.addEventListener('input', () => {
            this.setVolume();
            this.updateVolumeKnob();
        });
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.subtitleBtn.addEventListener('click', () => this.toggleSubtitles());
        this.audioBtn.addEventListener('click', () => this.switchAudioTrack());
        this.aspectBtn.addEventListener('click', () => this.toggleAspectMode());
        this.confirmAudioBtn.addEventListener('click', () => this.confirmAudioSelection());
        this.cancelAudioBtn.addEventListener('click', () => this.cancelAudioSelection());
        
        // URL input handling
        this.loadUrlBtn.addEventListener('click', () => this.loadYouTubeURL());
        this.urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadYouTubeURL();
            }
        });
        
        this.setupDragAndDrop();
        
        ipcRenderer.on('load-video', (event, filePath) => {
            this.loadVideo(filePath);
        });
        
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        document.addEventListener('fullscreenchange', () => this.onFullscreenChange());
    }
    
    setupDragAndDrop() {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        ['dragenter', 'dragover'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.highlight(), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            this.dropZone.addEventListener(eventName, () => this.unhighlight(), false);
        });
        
        this.dropZone.addEventListener('drop', (e) => this.handleDrop(e), false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    highlight() {
        this.dropZone.classList.add('drag-active');
    }
    
    unhighlight() {
        this.dropZone.classList.remove('drag-active');
    }
    
    handleDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        const videoFile = files.find(file => this.isVideoFile(file));
        
        if (videoFile) {
            this.loadVideo(videoFile.path);
        }
    }
    
    isVideoFile(file) {
        const videoExtensions = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv'];
        const extension = file.name.split('.').pop().toLowerCase();
        return videoExtensions.includes(extension);
    }
    
    async loadVideo(filePath, selectedAudioTrack = 0, isYouTubeURL = false) {
        this.currentVideoPath = filePath;
        this.dropZone.style.display = 'none';
        
        // If it's a YouTube URL, we don't need to extract subtitles/audio tracks
        if (isYouTubeURL) {
            this.subtitles = [];
            this.audioTracks = [];
            this.selectedAudioTrack = 0;
            this.finalizeVideoLoad(true);
            return;
        }
        
        try {
            // Load track information first
            this.subtitles = await ipcRenderer.invoke('get-subtitles', filePath);
            this.audioTracks = await ipcRenderer.invoke('get-audio-tracks', filePath);
            
            // If multiple audio tracks exist, show selection dialog
            // TODO: Implement audio track switching with FFmpeg (see GitHub issue)
            // For now, always use the default (first) audio track
            /*
            if (this.audioTracks.length > 1 && selectedAudioTrack === 0) {
                this.showAudioSelectionDialog();
                return; // Wait for user selection
            }
            */
            
            // Load video with selected audio track
            this.selectedAudioTrack = selectedAudioTrack;
            this.finalizeVideoLoad();
            
        } catch (error) {
            console.error('Error loading video:', error);
            this.subtitles = [];
            this.audioTracks = [];
            this.finalizeVideoLoad(); // Load anyway with defaults
        }
    }
    
    async loadYouTubeURL() {
        const url = this.urlInput.value.trim();
        if (!url) {
            alert('Please enter a YouTube URL');
            return;
        }
        
        // Basic YouTube URL validation
        if (!url.includes('youtube.com/watch') && !url.includes('youtu.be/')) {
            alert('Please enter a valid YouTube URL');
            return;
        }
        
        // Show loading state
        this.loadUrlBtn.classList.add('loading');
        this.loadUrlBtn.textContent = 'LOADING...';
        
        try {
            const result = await ipcRenderer.invoke('load-youtube-url', url);
            
            if (result.success) {
                console.log('YouTube video loaded:', result.title);
                this.loadVideo(result.url, 0, true);
                this.urlInput.value = ''; // Clear input after successful load
            } else {
                alert(`Failed to load video: ${result.error}`);
            }
        } catch (error) {
            console.error('Error loading YouTube URL:', error);
            alert('Failed to load YouTube video');
        } finally {
            // Reset button state
            this.loadUrlBtn.classList.remove('loading');
            this.loadUrlBtn.textContent = 'LOAD';
        }
    }
    
    finalizeVideoLoad(isStreamURL = false) {
        // Set video source
        // For YouTube/stream URLs, use directly; for local files, add file:// protocol
        if (isStreamURL) {
            this.video.src = this.currentVideoPath;
        } else {
            this.video.src = `file://${this.currentVideoPath}`;
        }
        this.video.style.display = 'block';
        this.addVHSEffect();
        
        // Set initial aspect mode (stretch by default)
        this.video.classList.add(`aspect-${this.aspectModes[this.currentAspectMode]}`);
        // Update button to show stretch mode is active
        this.aspectBtn.classList.add('active');
        this.aspectBtn.querySelector('.btn-icon').textContent = '▭';
        this.aspectBtn.querySelector('.btn-label').textContent = 'STRETCH';
        
        // Load subtitles
        this.loadSubtitleTracks();
        this.setupAudioTrackSwitching();
        
        console.log(`Video loaded with audio track ${this.selectedAudioTrack}: ${this.audioTracks[this.selectedAudioTrack]?.label || 'Default'}`);
    }
    
    onVideoLoaded() {
        this.duration.textContent = this.formatTime(this.video.duration);
        this.video.volume = this.volumeSlider.value / 100;
    }
    
    togglePlay() {
        if (this.video.paused) {
            this.video.play();
        } else {
            this.video.pause();
        }
    }
    
    onPlay() {
        this.isPlaying = true;
        this.playButton.style.display = 'none';
        this.playPauseBtn.querySelector('.btn-icon').innerHTML = '⏸';
        this.playPauseBtn.querySelector('.btn-label').innerHTML = 'PAUSE';
        this.videoOverlay.style.opacity = '0';
        
        // Update status indicators
        this.playIndicator.classList.add('active');
        this.pauseIndicator.classList.remove('active');
    }
    
    onPause() {
        this.isPlaying = false;
        this.playPauseBtn.querySelector('.btn-icon').innerHTML = '▶';
        this.playPauseBtn.querySelector('.btn-label').innerHTML = 'PLAY';
        this.videoOverlay.style.opacity = '1';
        
        // Update status indicators
        this.playIndicator.classList.remove('active');
        this.pauseIndicator.classList.add('active');
    }
    
    stopVideo() {
        this.video.pause();
        this.video.currentTime = 0;
        this.playButton.style.display = 'flex';
        this.videoOverlay.style.opacity = '1';
        
        // Update button and status indicators
        this.playPauseBtn.querySelector('.btn-icon').innerHTML = '▶';
        this.playPauseBtn.querySelector('.btn-label').innerHTML = 'PLAY';
        this.playIndicator.classList.remove('active');
        this.pauseIndicator.classList.remove('active');
    }
    
    onVideoEnded() {
        this.isPlaying = false;
        this.playButton.style.display = 'flex';
        this.videoOverlay.style.opacity = '1';
        this.playPauseBtn.querySelector('.btn-icon').innerHTML = '▶';
        this.playPauseBtn.querySelector('.btn-label').innerHTML = 'PLAY';
        
        // Update status indicators
        this.playIndicator.classList.remove('active');
        this.pauseIndicator.classList.remove('active');
    }
    
    updateProgress() {
        if (!this.isDragging && this.video.duration) {
            const progress = (this.video.currentTime / this.video.duration) * 100;
            this.progressBar.value = progress;
            this.currentTime.textContent = this.formatTime(this.video.currentTime);
        }
    }
    
    seekTo() {
        if (this.video.duration) {
            const time = (this.progressBar.value / 100) * this.video.duration;
            this.video.currentTime = time;
        }
    }
    
    setVolume() {
        this.video.volume = this.volumeSlider.value / 100;
        this.updateMuteButton();
    }
    
    toggleMute() {
        if (this.video.muted) {
            this.video.muted = false;
            this.volumeSlider.value = this.video.volume * 100;
        } else {
            this.video.muted = true;
        }
        this.updateMuteButton();
    }
    
    updateMuteButton() {
        const icon = this.muteBtn.querySelector('.btn-icon');
        if (this.video.muted || this.video.volume === 0) {
            icon.innerHTML = '🔇';
        } else if (this.video.volume < 0.5) {
            icon.innerHTML = '🔉';
        } else {
            icon.innerHTML = '🔊';
        }
    }
    
    rewind() {
        this.video.currentTime = Math.max(0, this.video.currentTime - 10);
    }
    
    fastForward() {
        this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
    }
    
    updateVolumeKnob() {
        const knobPointer = this.volumeKnob.querySelector('.knob-pointer');
        const rotation = (this.volumeSlider.value / 100) * 270 - 135; // -135° to 135°
        knobPointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }
    
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    }
    
    toggleVideoFullscreen() {
        this.isVideoFullscreen = !this.isVideoFullscreen;
        
        if (this.isVideoFullscreen) {
            // Enter video-only fullscreen
            document.body.classList.add('fullscreen-video');
            document.documentElement.requestFullscreen().catch(err => {
                console.log('Fullscreen request failed:', err);
                // Fallback to just hiding VCR panel without browser fullscreen
                document.body.classList.add('fullscreen-video');
            });
        } else {
            // Exit video-only fullscreen
            document.body.classList.remove('fullscreen-video');
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(err => {
                    console.log('Exit fullscreen failed:', err);
                });
            }
        }
    }
    
    onFullscreenChange() {
        // If user exits fullscreen via ESC or other means, sync our state
        if (!document.fullscreenElement && this.isVideoFullscreen) {
            this.isVideoFullscreen = false;
            document.body.classList.remove('fullscreen-video');
        }
    }
    
    handleKeyboard(e) {
        if (e.code === 'Space') {
            e.preventDefault();
            this.togglePlay();
        } else if (e.code === 'ArrowLeft') {
            this.video.currentTime -= 10;
        } else if (e.code === 'ArrowRight') {
            this.video.currentTime += 10;
        } else if (e.code === 'ArrowUp') {
            this.video.volume = Math.min(1, this.video.volume + 0.1);
            this.volumeSlider.value = this.video.volume * 100;
        } else if (e.code === 'ArrowDown') {
            this.video.volume = Math.max(0, this.video.volume - 0.1);
            this.volumeSlider.value = this.video.volume * 100;
        } else if (e.code === 'KeyM') {
            this.toggleMute();
        } else if (e.code === 'KeyF') {
            this.toggleFullscreen();
        } else if (e.code === 'Enter' && e.altKey) {
            e.preventDefault();
            this.toggleVideoFullscreen();
        } else if (e.code === 'KeyC') {
            this.toggleSubtitles();
        } else if (e.code === 'KeyA') {
            this.switchAudioTrack();
        } else if (e.code === 'KeyR') {
            this.toggleAspectMode();
        }
    }
    
    formatTime(seconds) {
        if (isNaN(seconds)) return '00:00';
        
        const minutes = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    applyRetroEffects() {
        const video = this.video;
        
        video.style.filter = `
            sepia(0.3)
            saturate(0.65)
            contrast(0.85)
            brightness(1.05)
            hue-rotate(-8deg)
            blur(2px)
            drop-shadow(2px 0px 0px rgba(255, 0, 0, 0.4))
            drop-shadow(-2px 0px 0px rgba(0, 255, 255, 0.4))
            drop-shadow(0px 1px 0px rgba(255, 0, 255, 0.3))
        `;
        
        this.createStaticNoise();
        this.startScreenFlicker();
    }
    
    addVHSEffect() {
        const video = this.video;
        
        // Add VHS tracking lines
        setInterval(() => {
            if (Math.random() < 0.05) {
                this.createTrackingLine();
            }
        }, 300);
        
        // Add horizontal sync distortion
        setInterval(() => {
            if (Math.random() < 0.03) {
                video.style.transform = `scaleX(1.33) scaleY(1.0) translateX(${Math.random() * 8 - 4}px) skewX(${Math.random() * 2 - 1}deg)`;
                setTimeout(() => {
                    video.style.transform = 'scaleX(1.33) scaleY(1.0) translateX(0px) skewX(0deg)';
                }, Math.random() * 200 + 50);
            }
        }, 150);
        
        // Add color channel separation
        setInterval(() => {
            if (Math.random() < 0.03) {
                const intensity = Math.random() * 4 + 2;
                const blurAmount = Math.random() * 1.5 + 2;
                video.style.filter = `
                    sepia(0.35)
                    saturate(0.6)
                    contrast(0.8)
                    brightness(1.1)
                    hue-rotate(-10deg)
                    blur(${blurAmount}px)
                    drop-shadow(${intensity}px 0px 0px rgba(255, 0, 0, 0.5))
                    drop-shadow(-${intensity}px 0px 0px rgba(0, 255, 255, 0.5))
                    drop-shadow(0px ${intensity/2}px 0px rgba(255, 0, 255, 0.4))
                `;
                setTimeout(() => {
                    video.style.filter = `
                        sepia(0.3)
                        saturate(0.65)
                        contrast(0.85)
                        brightness(1.05)
                        hue-rotate(-8deg)
                        blur(2px)
                        drop-shadow(2px 0px 0px rgba(255, 0, 0, 0.4))
                        drop-shadow(-2px 0px 0px rgba(0, 255, 255, 0.4))
                        drop-shadow(0px 1px 0px rgba(255, 0, 255, 0.3))
                    `;
                }, Math.random() * 150 + 50);
            }
        }, 200);
        
        // Add frame drops/freezes
        setInterval(() => {
            if (Math.random() < 0.01) {
                const wasPlaying = !video.paused;
                video.pause();
                setTimeout(() => {
                    if (wasPlaying) video.play();
                }, Math.random() * 100 + 50);
            }
        }, 1000);
    }
    
    createTrackingLine() {
        const trackingLine = document.createElement('div');
        trackingLine.style.position = 'absolute';
        trackingLine.style.left = '0';
        trackingLine.style.right = '0';
        trackingLine.style.height = '3px';
        trackingLine.style.background = `
            linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.8) 20%, 
                rgba(255, 255, 255, 0.9) 50%, 
                rgba(255, 255, 255, 0.8) 80%, 
                transparent 100%
            )
        `;
        trackingLine.style.top = Math.random() * 100 + '%';
        trackingLine.style.zIndex = '101';
        trackingLine.style.mixBlendMode = 'overlay';
        trackingLine.style.filter = 'blur(0.5px)';
        
        const videoContainer = document.querySelector('.video-container');
        videoContainer.appendChild(trackingLine);
        
        // Animate tracking line movement
        let position = -10;
        const animateTracking = () => {
            position += 0.5 + Math.random() * 2;
            trackingLine.style.transform = `translateY(${position}px)`;
            
            if (position > videoContainer.offsetHeight + 50) {
                videoContainer.removeChild(trackingLine);
                return;
            }
            
            requestAnimationFrame(animateTracking);
        };
        
        animateTracking();
    }

    createStaticNoise() {
        const noise = document.querySelector('.vhs-noise');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 200;
        canvas.height = 150;
        
        const generateNoise = () => {
            const imageData = ctx.createImageData(canvas.width, canvas.height);
            const data = imageData.data;
            
            for (let i = 0; i < data.length; i += 4) {
                const value = Math.random() * 255;
                const alpha = Math.random() * 80 + 20; // More variation in opacity
                data[i] = value; // Red
                data[i + 1] = value * 0.8; // Green (slightly less)
                data[i + 2] = value * 0.6; // Blue (even less for warmth)
                data[i + 3] = alpha;
            }
            
            ctx.putImageData(imageData, 0, 0);
            noise.style.backgroundImage = `url(${canvas.toDataURL()})`;
            noise.style.backgroundSize = '400px 300px';
            noise.style.backgroundRepeat = 'repeat';
        };
        
        generateNoise();
        setInterval(generateNoise, 80); // Faster noise updates
    }
    
    startScreenFlicker() {
        const flicker = document.querySelector('.screen-flicker');
        
        setInterval(() => {
            if (Math.random() < 0.05) {
                flicker.style.opacity = Math.random() * 0.3;
                setTimeout(() => {
                    flicker.style.opacity = '0';
                }, Math.random() * 200);
            }
        }, 500);
    }
    
    startScreenEffects() {
        // Random phosphor spot generation
        setInterval(() => {
            if (Math.random() < 0.15) {
                this.createPhosphorSpot();
            }
        }, 2000);
        
        // Occasional screen geometry distortion
        setInterval(() => {
            if (Math.random() < 0.02) {
                this.addTemporaryDistortion();
            }
        }, 3000);
    }
    
    createPhosphorSpot() {
        const spot = document.createElement('div');
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const size = Math.random() * 3 + 1;
        const isLight = Math.random() > 0.5;
        
        spot.style.position = 'absolute';
        spot.style.left = x + '%';
        spot.style.top = y + '%';
        spot.style.width = size + 'px';
        spot.style.height = size + 'px';
        spot.style.borderRadius = '50%';
        spot.style.background = isLight 
            ? `rgba(255, 255, 255, ${Math.random() * 0.6 + 0.2})`
            : `rgba(0, 0, 0, ${Math.random() * 0.4 + 0.1})`;
        spot.style.zIndex = '103';
        spot.style.pointerEvents = 'none';
        spot.style.animation = `phosphor-spot-fade ${Math.random() * 3 + 1}s ease-out forwards`;
        
        const videoContainer = document.querySelector('.video-container');
        videoContainer.appendChild(spot);
        
        setTimeout(() => {
            if (videoContainer.contains(spot)) {
                videoContainer.removeChild(spot);
            }
        }, 4000);
    }
    
    addTemporaryDistortion() {
        const videoContainer = document.querySelector('.video-container');
        const originalTransform = videoContainer.style.transform;
        
        videoContainer.style.transform = originalTransform + ` skewX(${Math.random() * 0.5 - 0.25}deg)`;
        
        setTimeout(() => {
            videoContainer.style.transform = originalTransform;
        }, Math.random() * 100 + 50);
    }
    
    loadSubtitleTracks() {
        // Clear existing tracks
        const existingTracks = this.video.querySelectorAll('track');
        existingTracks.forEach(track => track.remove());
        
        // Add new tracks
        this.subtitles.forEach((subtitle, index) => {
            const track = document.createElement('track');
            track.kind = subtitle.kind;
            // Convert path to proper file URL
            const filePath = subtitle.src.replace(/\\/g, '/');
            track.src = `file:///${filePath}`;
            track.srclang = subtitle.srclang;
            track.label = subtitle.label;
            track.default = index === 0;
            this.video.appendChild(track);
        });
        
        // Update subtitle button state
        if (this.subtitles.length > 0) {
            this.subtitleBtn.style.opacity = '1';
            this.currentSubtitleTrack = 0;
            this.enableSubtitleDisplay();
        } else {
            this.subtitleBtn.style.opacity = '0.5';
        }
    }
    
    toggleSubtitles() {
        if (this.subtitles.length === 0) return;
        
        if (this.subtitlesEnabled) {
            this.disableSubtitles();
        } else {
            this.currentSubtitleTrack = (this.currentSubtitleTrack + 1) % this.subtitles.length;
            this.enableSubtitleDisplay();
        }
    }
    
    enableSubtitleDisplay() {
        this.subtitlesEnabled = true;
        this.subtitleOverlay.style.display = 'block';
        this.subtitleOverlay.classList.add('retro-style');
        
        // Enable text track for data access only
        if (this.video.textTracks.length > this.currentSubtitleTrack) {
            // Disable all tracks first
            for (let i = 0; i < this.video.textTracks.length; i++) {
                this.video.textTracks[i].mode = 'disabled';
            }
            // Enable current track for data access only (not visual display)
            this.video.textTracks[this.currentSubtitleTrack].mode = 'hidden';
            this.setupCustomSubtitleDisplay();
        }
        
        // Update button appearance
        this.subtitleBtn.classList.add('active');
        this.subtitleBtn.querySelector('.btn-icon').style.color = '#ffff88';
    }
    
    disableSubtitles() {
        this.subtitlesEnabled = false;
        this.subtitleOverlay.style.display = 'none';
        
        // Disable all text tracks
        for (let i = 0; i < this.video.textTracks.length; i++) {
            this.video.textTracks[i].mode = 'hidden';
        }
        
        // Update button appearance
        this.subtitleBtn.classList.remove('active');
        this.subtitleBtn.querySelector('.btn-icon').style.color = '#ddd';
    }
    
    setupCustomSubtitleDisplay() {
        const track = this.video.textTracks[this.currentSubtitleTrack];
        if (!track) return;
        
        track.oncuechange = () => {
            const cues = track.activeCues;
            if (cues.length > 0) {
                this.subtitleOverlay.textContent = cues[0].text;
            } else {
                this.subtitleOverlay.textContent = '';
            }
        };
    }
    
    toggleAspectMode() {
        // Remove current aspect class
        this.video.classList.remove(`aspect-${this.aspectModes[this.currentAspectMode]}`);
        
        // Cycle to next mode
        this.currentAspectMode = (this.currentAspectMode + 1) % this.aspectModes.length;
        
        // Add new aspect class
        this.video.classList.add(`aspect-${this.aspectModes[this.currentAspectMode]}`);
        
        // Update button appearance based on mode
        const btnIcon = this.aspectBtn.querySelector('.btn-icon');
        const btnLabel = this.aspectBtn.querySelector('.btn-label');
        
        switch(this.aspectModes[this.currentAspectMode]) {
            case 'crop':
                btnIcon.textContent = '◧';
                btnLabel.textContent = 'CROP';
                this.aspectBtn.classList.remove('active');
                break;
            case 'stretch':
                btnIcon.textContent = '▭';
                btnLabel.textContent = 'STRETCH';
                this.aspectBtn.classList.add('active');
                break;
            case 'fit':
                btnIcon.textContent = '◫';
                btnLabel.textContent = 'FIT';
                this.aspectBtn.classList.add('active');
                break;
        }
    }
    
    setupAudioTrackSwitching() {
        // Update audio button state
        if (this.audioTracks.length > 1) {
            this.audioBtn.style.opacity = '1';
        } else {
            this.audioBtn.style.opacity = '0.5';
        }
    }
    
    async switchAudioTrack() {
        if (this.audioTracks.length <= 1) return;
        
        this.currentAudioTrack = (this.currentAudioTrack + 1) % this.audioTracks.length;
        const currentTrack = this.audioTracks[this.currentAudioTrack];
        
        // Store current playback state
        const currentTime = this.video.currentTime;
        const wasPlaying = !this.video.paused;
        
        console.log(`Switching to audio track: ${currentTrack.label}`);
        
        // Update button appearance to show switching state
        this.audioBtn.classList.add('active');
        this.audioBtn.querySelector('.btn-icon').style.color = '#ffff88';
        
        try {
            // Request audio track switch from main process
            await ipcRenderer.invoke('switch-audio-track', this.currentVideoPath, this.currentAudioTrack);
            
            // For now, just show feedback - proper implementation would require
            // temporary file generation with selected audio stream
            console.log(`Audio track switched to: ${currentTrack.label}`);
            
        } catch (error) {
            console.error('Error switching audio track:', error);
        }
        
        setTimeout(() => {
            this.audioBtn.classList.remove('active');
            this.audioBtn.querySelector('.btn-icon').style.color = '#ddd';
        }, 1000);
    }
    
    showAudioSelectionDialog() {
        this.isWaitingForAudioSelection = true;
        this.selectedAudioTrack = 0; // Default selection
        
        // Populate audio track list
        this.audioTrackList.innerHTML = '';
        this.audioTracks.forEach((track, index) => {
            const trackOption = document.createElement('div');
            trackOption.className = 'audio-track-option';
            if (index === 0) trackOption.classList.add('selected');
            
            trackOption.innerHTML = `
                <div class="track-label">${track.label}</div>
                <div class="track-details">${track.codec} • ${track.channels} channels</div>
            `;
            
            trackOption.addEventListener('click', () => {
                // Remove selection from all options
                this.audioTrackList.querySelectorAll('.audio-track-option').forEach(opt => {
                    opt.classList.remove('selected');
                });
                // Add selection to clicked option
                trackOption.classList.add('selected');
                this.selectedAudioTrack = index;
            });
            
            this.audioTrackList.appendChild(trackOption);
        });
        
        // Show dialog
        this.audioSelectionOverlay.style.display = 'flex';
    }
    
    confirmAudioSelection() {
        this.audioSelectionOverlay.style.display = 'none';
        this.isWaitingForAudioSelection = false;
        this.finalizeVideoLoad();
    }
    
    cancelAudioSelection() {
        this.selectedAudioTrack = 0; // Use default (first track)
        this.audioSelectionOverlay.style.display = 'none';
        this.isWaitingForAudioSelection = false;
        this.finalizeVideoLoad();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RetroVideoPlayer();
});