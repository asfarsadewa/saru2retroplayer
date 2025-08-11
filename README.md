# RetroPlayer - VHS/CRT Video Player

A nostalgic Electron-based video player that transforms any video into a complete retro VHS/CRT experience with authentic visual and audio effects.

## Features

🎥 **Video Playback**
- Supports common video formats: MP4, AVI, MKV, MOV, WMV, FLV, WEBM, M4V, 3GP, OGV
- YouTube URL streaming support with yt-dlp integration
- Drag & drop video files directly into the player
- Full keyboard controls and VCR-style interface
- Subtitle support with retro styling (SRT, VTT, embedded subtitles)
- Multi-track audio detection and switching

📺 **Visual Retro Effects**
- Authentic CRT monitor simulation with curved screen edges
- Dynamic scanlines and phosphor glow effects
- VHS artifacts including static noise and color bleeding
- Screen flicker, interference patterns, and tracking errors
- Vintage color grading with sepia tones and desaturation
- Random video distortion and frame drops
- 4:3 aspect ratio with crop/stretch/fit modes

🔊 **Audio Oldies Effects (NEW)**
- **Mono Audio Conversion**: Forces all audio to mono for authentic vintage sound
- **Vintage Crackling**: Random audio pops and crackles simulating old records/equipment
- **Wow & Flutter**: Subtle pitch variations mimicking old tape player mechanisms
- **Frequency Response Limiting**: High/low-pass filtering (80Hz-8kHz) simulating vintage speakers
- **Dynamic Range Compression**: Compressed audio dynamics typical of old audio systems
- Works seamlessly with both local files and YouTube streams

🎮 **Retro Interface**
- 80s/90s inspired VCR control panel design
- Glowing green terminal-style controls and LED displays
- Retro TV frame with brand label and power indicators
- Authentic tape counter and progress visualization
- Status lights for play/pause/record modes

## Installation & Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm start
   ```
   
   For development with DevTools:
   ```bash
   npm run dev
   ```

3. Load a video:
   - **Local Files**: Drag and drop a video file into the player
   - **YouTube**: Enter a YouTube URL and click LOAD
   - **File Menu**: Use Ctrl+O (Cmd+O on Mac) or File > Open Video

## Keyboard Controls

- **Space**: Play/Pause
- **Left Arrow**: Seek back 10 seconds
- **Right Arrow**: Seek forward 10 seconds
- **Up Arrow**: Increase volume
- **Down Arrow**: Decrease volume
- **M**: Toggle mute
- **F**: Toggle fullscreen
- **F11**: Toggle fullscreen (alternative)
- **Alt+Enter**: Toggle video-only fullscreen
- **C**: Toggle subtitles
- **A**: Switch audio tracks (when multiple available)
- **R**: Toggle aspect ratio modes (crop/stretch/fit)

## Technical Architecture

### Core Components
- **main.js**: Electron main process handling window creation, menu bar, file operations, and IPC
- **renderer.js**: Video player logic, retro effects, Web Audio API processing
- **index.html**: Main UI structure with retro TV frame design
- **styles.css**: Retro styling with CRT effects, scanlines, and vintage UI elements

### Audio Processing Pipeline
```
Video Element → Web Audio API → Stereo-to-Mono → Vintage Filters → Crackling Effects → Speakers
```

### Key Features Implementation
- **Video Format Support**: HTML5 video element with ffmpeg-static/ffprobe-static for metadata extraction
- **Retro Effects**: CSS filters, animations, and WebGL canvas for dynamic noise generation
- **Audio Processing**: Web Audio API for real-time mono conversion and vintage audio effects
- **YouTube Support**: yt-dlp integration for streaming video URLs
- **Subtitle System**: Extracts and displays subtitles with retro CRT positioning
- **Multi-track Audio**: Detection and switching support (UI implementation pending)

### IPC Communication
- `load-video`: Main process sends video paths to renderer
- `get-subtitles`: Renderer requests subtitle extraction from main
- `get-audio-tracks`: Renderer requests audio track info from main
- `switch-audio-track`: Renderer requests audio track switching
- `load-youtube-url`: YouTube URL processing with yt-dlp

## Building for Distribution

```bash
npm run build
```

This creates distributable packages in the `dist` folder for Windows, macOS, and Linux.

### Build Configuration
- **Windows**: Directory output with optional NSIS installer
- **macOS**: DMG package
- **Linux**: AppImage format
- Includes yt-dlp.exe and ffmpeg binaries for full functionality

## Dependencies

### Runtime
- **Electron**: Cross-platform desktop app framework
- **ffmpeg-static**: Video processing and subtitle extraction
- **ffprobe-static**: Media file metadata analysis  
- **youtube-dl-exec**: YouTube URL streaming support

### Development
- **electron-builder**: Multi-platform build system
- **sharp**: Image processing for build assets

## Supported Platforms

- **Windows** (7, 8, 10, 11)
- **macOS** (10.15+)
- **Linux** (Most distributions via AppImage)

## File Structure

```
retroplayer/
├── main.js              # Electron main process
├── renderer.js          # Video player + Web Audio processing
├── index.html           # UI structure
├── styles.css           # Retro styling & effects
├── assets/              # Icons and resources
├── package.json         # Dependencies and build config
└── README.md           # This file
```

---

*Experience your videos like it's 1985! Complete with authentic mono audio and vintage crackling effects. 📼*