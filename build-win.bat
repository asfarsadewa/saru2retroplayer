@echo off
echo Building RetroPlayer for Windows...
set CSC_IDENTITY_AUTO_DISCOVERY=false
npx electron-builder --win --config.win.sign=false
echo Build complete! Check the dist folder.