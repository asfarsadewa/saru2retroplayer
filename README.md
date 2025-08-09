# RetroPlayer - VHS/CRT Video Player

A nostalgic Electron-based video player that transforms any video into a retro VHS/CRT experience.

## Features

🎥 **Video Playback**
- Supports common video formats: MP4, AVI, MKV, MOV, WMV, FLV, WEBM, M4V, 3GP, OGV
- Drag & drop video files directly into the player
- Full keyboard controls (Space, Arrow keys, M for mute, F for fullscreen)

📺 **Retro Effects**
- Authentic CRT monitor simulation with curved screen edges
- Scanlines and phosphor glow effects
- VHS artifacts including static noise and color bleeding
- Screen flicker and interference patterns
- Vintage color grading with sepia tones
- Random video tracking glitches

🎮 **Retro Interface**
- 80s/90s inspired UI design
- Glowing green terminal-style controls
- Retro TV frame with brand label and power LED
- Forces 4:3 aspect ratio for authentic vintage feel

## Installation & Usage

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the application:
   ```bash
   npm start
   ```

3. Load a video:
   - Drag and drop a video file into the player
   - Or use Ctrl+O (Cmd+O on Mac) to open file dialog
   - Or use File > Open Video from the menu

## Keyboard Controls

- **Space**: Play/Pause
- **Left Arrow**: Seek back 10 seconds
- **Right Arrow**: Seek forward 10 seconds
- **Up Arrow**: Increase volume
- **Down Arrow**: Decrease volume
- **M**: Toggle mute
- **F**: Toggle fullscreen
- **F11**: Toggle fullscreen (alternative)

## Building for Distribution

```bash
npm run build
```

This will create distributable packages in the `dist` folder for your platform.

## Technical Details

- Built with Electron for cross-platform compatibility
- Uses HTML5 video element for broad format support
- CSS filters and animations create the retro visual effects
- WebGL canvas for dynamic noise generation
- Responsive design that maintains 4:3 aspect ratio

## Supported Platforms

- Windows
- macOS
- Linux

---

*Experience your videos like it's 1985! 📼*