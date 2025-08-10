# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Git Configuration
- user.email should be asfar.sadewa@gmail.com and user.name should be asfarsadewa

## Project Overview
RetroPlayer is an Electron-based video player that transforms videos into a nostalgic VHS/CRT experience with authentic vintage effects including scanlines, static noise, color bleeding, and CRT monitor simulation.

## Development Commands

### Running the Application
- `npm start` - Launch the application in production mode
- `npm run dev` - Launch with DevTools open for debugging

### Building for Distribution
- `npm run build` - Create distributable packages for Windows/Mac/Linux in the `dist` folder

### Installing Dependencies
- `npm install` - Install all required dependencies

## Architecture

### Core Components
1. **main.js** - Electron main process handling window creation, menu bar, file operations, and IPC communication with renderer
2. **renderer.js** - Video player logic including playback controls, subtitle/audio track management, and retro effects
3. **index.html** - Main UI structure with retro TV frame design
4. **styles.css** - Retro styling with CRT effects, scanlines, and vintage UI elements

### Key Features Implementation
- **Video Format Support**: Uses HTML5 video element with ffmpeg-static/ffprobe-static for subtitle/audio extraction
- **Retro Effects**: CSS filters, animations, and WebGL canvas for dynamic noise generation
- **Aspect Ratio**: Maintains 4:3 ratio with crop/stretch/fit modes
- **Subtitle System**: Extracts and displays subtitles with retro CRT positioning
- **Audio Tracks**: Multi-track audio support with track selection dialog

### IPC Communication
- `load-video` - Main process sends video paths to renderer
- `extract-subtitles` - Renderer requests subtitle extraction from main
- `extract-audio-tracks` - Renderer requests audio track info from main
- `switch-audio-track` - Renderer requests audio track switching

### File Structure
```
retroplayer/
├── main.js          # Electron main process
├── renderer.js      # Video player logic
├── index.html       # UI structure
├── styles.css       # Retro styling
├── assets/          # Icons and resources
└── debug_screenshots/ # Debug images
```

## Important Notes
- Electron app with `nodeIntegration: true` and `contextIsolation: false` for full Node.js access in renderer
- Window maximizes on startup, maintains dark theme (#000000 background)
- Supports drag & drop for video files
- Keyboard shortcuts: Space (play/pause), arrows (seek/volume), M (mute), F/F11 (fullscreen)