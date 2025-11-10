const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1200,
    minHeight: 800,
    maxWidth: 1200,
    maxHeight: 800,
    resizable: false,
    backgroundColor: '#0a0a0a',
    frame: false, // 메뉴바 제거
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../build/icon.png')
  });

  mainWindow.loadFile('index.html');
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

// 창 제어
ipcMain.handle('window-minimize', () => {
  mainWindow.minimize();
});

ipcMain.handle('window-close', () => {
  mainWindow.close();
});

// 텍스트 파일 → 이미지 변환 (다중 포맷)
ipcMain.handle('convert-text-to-image', async (event, { filePath, quality, dpi, format, outputFolder }) => {
  try {
    let content;
    const encodings = ['utf8', 'latin1'];

    for (const encoding of encodings) {
      try {
        content = await fs.readFile(filePath, encoding);
        break;
      } catch (err) {
        continue;
      }
    }

    if (!content) {
      throw new Error('파일 인코딩을 감지할 수 없습니다');
    }

    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath).toUpperCase();
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const header = `╔══════════════════════════════════════════════════════════════╗
║  SEEDOC - Professional Document Converter                     ║
║  원본: ${fileName.padEnd(40).substring(0, 40)}
║  형식: ${fileExt}  DPI: ${dpi}  품질: ${quality}                    ║
║  일시: ${now}                                  ║
╚══════════════════════════════════════════════════════════════╝

`;

    const fullContent = header + content;
    const outputDir = outputFolder || path.dirname(filePath);  // 지정된 폴더 또는 원본 폴더
    const baseName = path.basename(filePath, path.extname(filePath));

    const width = 1800;
    const fontSize = 28;
    const lineHeight = fontSize + 8;
    const padding = 40;
    const maxHeight = 32000;

    const lines = fullContent.split('\n');
    const charsPerLine = Math.floor((width - padding * 2) / (fontSize * 0.9));

    const wrappedLines = [];
    for (const line of lines) {
      if (line.length === 0) {
        wrappedLines.push('');
      } else {
        const chunks = [];
        for (let i = 0; i < line.length; i += charsPerLine) {
          chunks.push(line.substring(i, i + charsPerLine));
        }
        wrappedLines.push(...chunks);
      }
    }

    const linesPerPage = Math.floor((maxHeight - padding * 2 - 40) / lineHeight);
    const totalPages = Math.ceil(wrappedLines.length / linesPerPage);
    const outputFiles = [];

    for (let pageNum = 0; pageNum < totalPages; pageNum++) {
      const startLine = pageNum * linesPerPage;
      const endLine = Math.min(startLine + linesPerPage, wrappedLines.length);
      const pageLines = wrappedLines.slice(startLine, endLine);
      const pageHeight = pageLines.length * lineHeight + padding * 2 + 40;

      let svgText = `<svg width="${width}" height="${pageHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="white"/>
        <style>
          text { font-family: 'D2Coding', 'Consolas', 'Monaco', 'Courier New', monospace; font-size: ${fontSize}px; }
          .meta { font-size: 10px; fill: #666; }
        </style>`;

      let y = padding + fontSize;
      for (const line of pageLines) {
        const escapedLine = line
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');

        svgText += `<text x="${padding}" y="${y}" fill="black">${escapedLine}</text>`;
        y += lineHeight;
      }

      const metaText = `Page ${pageNum + 1}/${totalPages} | ${now} | DPI: ${dpi} | SEEDOC`;
      svgText += `<text x="${padding}" y="${pageHeight - 20}" class="meta">${metaText}</text>`;
      svgText += `</svg>`;

      const svgBuffer = Buffer.from(svgText);

      const outputPath = totalPages === 1
        ? path.join(outputDir, `${baseName}.${format}`)
        : path.join(outputDir, `${baseName}_${String(pageNum + 1).padStart(3, '0')}.${format}`);

      const sharpInstance = sharp(svgBuffer).withMetadata({ density: dpi });

      switch (format) {
        case 'jpg':
        case 'jpeg':
          await sharpInstance.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
          break;
        case 'png':
          await sharpInstance.png({ quality, compressionLevel: Math.floor((100 - quality) / 10) }).toFile(outputPath);
          break;
        case 'webp':
          await sharpInstance.webp({ quality, effort: 6 }).toFile(outputPath);
          break;
        case 'tiff':
          await sharpInstance.tiff({ quality, compression: 'lzw' }).toFile(outputPath);
          break;
        default:
          await sharpInstance.jpeg({ quality, mozjpeg: true }).toFile(outputPath);
      }

      const stats = await fs.stat(outputPath);
      outputFiles.push({
        path: outputPath,
        size: Math.round(stats.size / 1024),
        lines: pageLines.length
      });
    }

    return {
      success: true,
      outputFiles,
      totalPages,
      totalSize: outputFiles.reduce((sum, f) => sum + f.size, 0)
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// JPG → MD 변환 (OCR)
ipcMain.handle('save-ocr-result', async (event, { originalPath, content, outputFolder }) => {
  try {
    const outputDir = outputFolder || path.dirname(originalPath);  // 지정된 폴더 또는 원본 폴더
    const baseName = path.basename(originalPath, path.extname(originalPath));
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputPath = path.join(outputDir, `ocr_${baseName}_${timestamp}.md`);

    await fs.writeFile(outputPath, content, 'utf8');
    const stats = await fs.stat(outputPath);

    return {
      success: true,
      outputPath,
      size: Math.round(stats.size / 1024)
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
});

// 파일 선택 다이얼로그
ipcMain.handle('select-files', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '텍스트 파일', extensions: ['md', 'txt', 'log', 'json', 'xml', 'html', 'py', 'js', 'ts', 'css'] },
      { name: '이미지 파일', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'tiff', 'tif'] },
      { name: '모든 파일', extensions: ['*'] }
    ]
  });

  return result.filePaths;
});

// 폴더 선택 다이얼로그
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true };
  }

  return { folderPath: result.filePaths[0] };
});

// 폴더 내 파일 목록 가져오기
ipcMain.handle('get-folder-files', async (event, { folderPath, recursive }) => {
  const supportedTextExts = ['.md', '.txt', '.log', '.json', '.xml', '.html', '.htm',
    '.csv', '.py', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss',
    '.yaml', '.yml', '.toml', '.ini', '.conf', '.sh', '.bat',
    '.c', '.cpp', '.h', '.hpp', '.java', '.go', '.rs', '.php',
    '.rb', '.swift', '.kt', '.sql', '.r', '.m', '.pl'];

  const supportedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff', '.tif'];
  const allFiles = [];

  async function scanDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && recursive) {
        await scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (supportedTextExts.includes(ext) || supportedImageExts.includes(ext)) {
          allFiles.push({
            path: fullPath,
            name: entry.name,
            type: supportedTextExts.includes(ext) ? 'text' : 'image'
          });
        }
      }
    }
  }

  try {
    await scanDir(folderPath);
    return { success: true, files: allFiles };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 황금율 테스트 변환
ipcMain.handle('test-conversion', async (event, { filePath, format, width, quality, pageHeight }) => {
  const { execSync } = require('child_process');
  const fs = require('fs');
  const path = require('path');

  try {
    const pythonPath = 'G:/conda_env/tau/python.exe';
    const scriptPath = 'C:/Users/VICTUS/.claude/scripts/text_to_image.py';
    const outputDir = 'C:/Users/VICTUS/.claude/test-output-golden/';

    // 출력 디렉토리 생성
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Python 스크립트 호출 (파라미터: width, quality, pageHeight 전달)
    const cmd = `"${pythonPath}" "${scriptPath}" "${filePath}" "${outputDir}" ${width} ${quality} ${pageHeight} ${format}`;
    execSync(cmd, { encoding: 'utf-8', timeout: 30000 });

    // 생성된 파일 크기 계산
    const baseName = path.basename(filePath, path.extname(filePath));
    const outputFiles = fs.readdirSync(outputDir).filter(f => f.startsWith(baseName));

    let totalSize = 0;
    for (const file of outputFiles) {
      const stats = fs.statSync(path.join(outputDir, file));
      totalSize += stats.size;
    }

    // 정리
    for (const file of outputFiles) {
      fs.unlinkSync(path.join(outputDir, file));
    }

    return { success: true, fileSize: totalSize, pages: outputFiles.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
