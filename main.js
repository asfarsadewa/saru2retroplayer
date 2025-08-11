const { app, BrowserWindow, dialog, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const youtubedl = require('youtube-dl-exec');

// Helper function to get executable paths for production
function getExecutablePath(devPath, exeName) {
  if (app.isPackaged) {
    // In production, look for the executable in the resources folder
    return path.join(process.resourcesPath, 'bin', exeName);
  }
  return devPath;
}

let mainWindow;

function createWindow() {
  const aspectRatio = 4/3;
  const baseWidth = 800;
  const baseHeight = Math.round(baseWidth / aspectRatio);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 900,
    minWidth: 800,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    backgroundColor: '#000000',
    titleBarStyle: 'default',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    show: false
  });

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.show();
    
    if (process.argv.includes('--dev')) {
      mainWindow.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Video...',
          accelerator: 'CmdOrCtrl+O',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                {
                  name: 'Video Files',
                  extensions: ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp', 'ogv']
                },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              mainWindow.webContents.send('load-video', result.filePaths[0]);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Fullscreen',
          accelerator: 'F11',
          click: () => {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Subtitle extraction functions
function extractSubtitles(videoPath) {
  return new Promise((resolve, reject) => {
    const videoDir = path.dirname(videoPath);
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const subtitleDir = path.join(videoDir, '.saru2_subtitles');
    
    // Create subtitle cache directory
    if (!fs.existsSync(subtitleDir)) {
      fs.mkdirSync(subtitleDir, { recursive: true });
    }

    // First, probe for subtitle streams using ffprobe
    const ffprobePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe')
      : ffprobeStatic.path;
    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-select_streams', 's',
      videoPath
    ]);

    let probeOutput = '';
    let probeError = '';
    ffprobe.stdout.on('data', (data) => {
      probeOutput += data.toString();
    });
    
    ffprobe.stderr.on('data', (data) => {
      probeError += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        console.log(`No subtitle streams found in video: ${probeError || `Exit code: ${code}`}`);
        resolve([]); // No subtitle streams found
        return;
      }

      try {
        const probeData = JSON.parse(probeOutput);
        const subtitleStreams = probeData.streams || [];
        
        if (subtitleStreams.length === 0) {
          resolve([]);
          return;
        }

        const extractPromises = subtitleStreams.map((stream, index) => {
          return extractSubtitleTrack(videoPath, stream.index, index, subtitleDir, videoName, stream);
        });

        Promise.all(extractPromises)
          .then(tracks => resolve(tracks.filter(Boolean)))
          .catch(reject);
      } catch (error) {
        resolve([]);
      }
    });
  });
}

function extractSubtitleTrack(videoPath, streamIndex, trackIndex, outputDir, videoName, streamInfo) {
  return new Promise((resolve) => {
    const language = streamInfo.tags?.language || `track${trackIndex}`;
    const title = streamInfo.tags?.title || `Subtitle ${trackIndex + 1}`;
    const outputFile = path.join(outputDir, `${videoName}_${language}_${trackIndex}.vtt`);
    
    // Check if already extracted
    if (fs.existsSync(outputFile)) {
      resolve({
        src: outputFile,
        label: `${title} (${language})`,
        srclang: language,
        kind: 'subtitles'
      });
      return;
    }

    const ffmpegPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')
      : ffmpegStatic;
    const ffmpeg = spawn(ffmpegPath, [
      '-i', videoPath,
      '-map', `0:${streamIndex}`,
      '-c:s', 'webvtt',
      '-y',
      outputFile
    ]);

    let ffmpegError = '';
    ffmpeg.stderr.on('data', (data) => {
      ffmpegError += data.toString();
    });

    ffmpeg.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputFile)) {
        console.log(`Successfully extracted subtitle track ${trackIndex}: ${outputFile}`);
        resolve({
          src: outputFile,
          label: `${title} (${language})`,
          srclang: language,
          kind: 'subtitles'
        });
      } else {
        console.error(`Failed to extract subtitle track ${trackIndex} (stream ${streamIndex}):`, ffmpegError || `Exit code: ${code}`);
        resolve(null);
      }
    });

    ffmpeg.on('error', (error) => {
      console.error(`FFmpeg process error for subtitle track ${trackIndex}:`, error);
      resolve(null);
    });
  });
}

function findExternalSubtitles(videoPath) {
  const videoDir = path.dirname(videoPath);
  const videoName = path.basename(videoPath, path.extname(videoPath));
  const subtitleExtensions = ['.srt', '.vtt', '.ass', '.ssa'];
  const subtitles = [];

  subtitleExtensions.forEach(ext => {
    const subtitlePath = path.join(videoDir, videoName + ext);
    if (fs.existsSync(subtitlePath)) {
      // Convert SRT to VTT if needed
      if (ext === '.srt') {
        const vttPath = convertSrtToVtt(subtitlePath);
        if (vttPath) {
          subtitles.push({
            src: vttPath,
            label: `External Subtitles (${ext})`,
            srclang: 'unknown',
            kind: 'subtitles'
          });
        }
      } else if (ext === '.vtt') {
        subtitles.push({
          src: subtitlePath,
          label: `External Subtitles (${ext})`,
          srclang: 'unknown',
          kind: 'subtitles'
        });
      }
    }
  });

  return subtitles;
}

function convertSrtToVtt(srtPath) {
  try {
    const srtContent = fs.readFileSync(srtPath, 'utf8');
    const vttPath = srtPath.replace('.srt', '.vtt');
    
    // Simple SRT to VTT conversion
    const vttContent = 'WEBVTT\n\n' + srtContent
      .replace(/(\d+:\d+:\d+),(\d+)/g, '$1.$2') // Replace comma with dot in timestamps
      .replace(/^\d+\s*$/gm, ''); // Remove sequence numbers
    
    fs.writeFileSync(vttPath, vttContent, 'utf8');
    return vttPath;
  } catch (error) {
    console.error('Error converting SRT to VTT:', error);
    return null;
  }
}

// Audio track detection
function detectAudioTracks(videoPath) {
  return new Promise((resolve, reject) => {
    const ffprobePath = app.isPackaged 
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffprobe-static', 'bin', 'win32', 'x64', 'ffprobe.exe')
      : ffprobeStatic.path;
    const ffprobe = spawn(ffprobePath, [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      '-select_streams', 'a',
      videoPath
    ]);

    let probeOutput = '';
    let probeError = '';
    ffprobe.stdout.on('data', (data) => {
      probeOutput += data.toString();
    });
    
    ffprobe.stderr.on('data', (data) => {
      probeError += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        console.log(`No audio streams found in video: ${probeError || `Exit code: ${code}`}`);
        resolve([]);
        return;
      }

      try {
        const probeData = JSON.parse(probeOutput);
        const audioStreams = probeData.streams || [];
        
        if (audioStreams.length === 0) {
          resolve([]);
          return;
        }

        const audioTracks = audioStreams.map((stream, index) => {
          const language = stream.tags?.language || `track${index}`;
          const title = stream.tags?.title || `Audio ${index + 1}`;
          return {
            index: stream.index,
            trackIndex: index,
            label: `${title} (${language})`,
            language: language,
            codec: stream.codec_name,
            channels: stream.channels
          };
        });

        console.log(`Found ${audioTracks.length} audio tracks:`, audioTracks.map(t => t.label));
        resolve(audioTracks);
      } catch (error) {
        console.error('Error parsing audio probe data:', error);
        resolve([]);
      }
    });
  });
}

// IPC handlers
ipcMain.handle('get-subtitles', async (event, videoPath) => {
  try {
    const embeddedSubtitles = await extractSubtitles(videoPath);
    const externalSubtitles = findExternalSubtitles(videoPath);
    return [...embeddedSubtitles, ...externalSubtitles];
  } catch (error) {
    console.error('Error getting subtitles:', error);
    return [];
  }
});

ipcMain.handle('get-audio-tracks', async (event, videoPath) => {
  try {
    return await detectAudioTracks(videoPath);
  } catch (error) {
    console.error('Error getting audio tracks:', error);
    return [];
  }
});

ipcMain.handle('switch-audio-track', async (event, videoPath, audioTrackIndex) => {
  try {
    // For now, just log the track switch
    // Full implementation would require generating temporary video with selected audio
    console.log(`Audio track switch requested: track ${audioTrackIndex} for ${videoPath}`);
    return { success: true, message: `Switched to audio track ${audioTrackIndex}` };
  } catch (error) {
    console.error('Error switching audio track:', error);
    return { success: false, error: error.message };
  }
});

// YouTube URL handler with better error handling
ipcMain.handle('load-youtube-url', async (event, url) => {
  return new Promise((resolve) => {
    console.log('Fetching YouTube video info for:', url);
    
    // Use different path for packaged vs development
    const ytdlpPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'bin', 'yt-dlp.exe')
      : path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
    
    // Check if yt-dlp.exe exists
    if (!fs.existsSync(ytdlpPath)) {
      console.error('yt-dlp.exe not found at:', ytdlpPath);
      resolve({
        success: false,
        error: 'YouTube downloader not found. Please ensure yt-dlp.exe is installed.'
      });
      return;
    }
    
    console.log('Using yt-dlp at:', ytdlpPath);
    
    // Spawn yt-dlp process directly for better control
    const ytdlp = spawn(ytdlpPath, [
      url,
      '--get-url',
      '--no-playlist',  // Important: Only get the single video, not the playlist
      '--format', 'best[height<=720]',  // Simplified format
      '--no-check-certificates',
      '--no-warnings',
      '--quiet',  // Less verbose output
      '--no-cache-dir'  // Avoid cache issues
    ]);
    
    let output = '';
    let errorOutput = '';
    let timedOut = false;
    
    // Set a timeout of 30 seconds
    const timeout = setTimeout(() => {
      timedOut = true;
      console.log('yt-dlp process timed out, killing...');
      ytdlp.kill('SIGTERM');
    }, 30000);
    
    ytdlp.stdout.on('data', (data) => {
      output += data.toString();
      console.log('yt-dlp output chunk received:', data.toString().substring(0, 100));
    });
    
    ytdlp.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('yt-dlp stderr:', data.toString());
    });
    
    ytdlp.on('error', (error) => {
      clearTimeout(timeout);
      console.error('Failed to spawn yt-dlp:', error);
      resolve({
        success: false,
        error: `Failed to start YouTube downloader: ${error.message}`
      });
    });
    
    ytdlp.on('close', (code) => {
      clearTimeout(timeout);
      
      if (timedOut) {
        console.error('yt-dlp timed out');
        resolve({
          success: false,
          error: 'Request timed out. The video might be unavailable or restricted.'
        });
        return;
      }
      
      if (code !== 0) {
        console.error(`yt-dlp exited with code ${code}`);
        console.error('Error output:', errorOutput);
        resolve({
          success: false,
          error: errorOutput || `YouTube downloader failed with code ${code}`
        });
        return;
      }
      
      const videoUrl = output.trim();
      if (!videoUrl) {
        console.error('No URL extracted from yt-dlp output');
        resolve({
          success: false,
          error: 'Could not extract video URL. The video might be unavailable.'
        });
        return;
      }
      
      console.log('YouTube video URL extracted successfully');
      console.log('URL length:', videoUrl.length);
      
      resolve({
        success: true,
        url: videoUrl,
        title: 'YouTube Video',
        duration: 0
      });
    });
  });
});