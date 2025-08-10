# Build Instructions for Saru2 Retro Player

## Prerequisites
- Node.js and npm installed
- All dependencies installed (`npm install`)

## Building for Windows

### Option 1: Windows Installer (Recommended)
```bash
npm run build -- --win
```
This creates a `.exe` installer in the `dist/` folder that users can run to install the app.

### Option 2: Portable Windows App
```bash
npm run build -- --win portable
```
This creates a portable `.exe` file that doesn't require installation.

## Building for All Platforms
```bash
npm run build
```
Note: Cross-platform builds may require additional tools.

## Build Output
After building, you'll find the installers/executables in the `dist/` folder:
- Windows: `Saru2 Retro Player Setup X.X.X.exe`
- Mac: `Saru2 Retro Player-X.X.X.dmg`
- Linux: `Saru2 Retro Player-X.X.X.AppImage`

## Important Notes
1. The build includes yt-dlp.exe for YouTube support
2. Icons are currently placeholders - replace them with proper icons before distribution
3. The app is not code-signed, so users may see security warnings on first run
4. Windows Defender might flag yt-dlp.exe - this is a false positive

## Testing the Build
1. After building, install the app from the `dist/` folder
2. Test local video playback
3. Test YouTube URL streaming
4. Verify all retro effects work

## Troubleshooting
- If build fails, try deleting `node_modules` and `package-lock.json`, then run `npm install`
- Ensure all icon files exist in the `assets/` folder
- Make sure yt-dlp.exe exists at `node_modules/youtube-dl-exec/bin/yt-dlp.exe`