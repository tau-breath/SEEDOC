const { ipcRenderer } = require('electron');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// 상태 관리
let fileQueue = [];
let processing = false;
let currentQuality = 80;
let currentDPI = 200;
let currentFormat = 'jpg';
let outputFolder = null; // null = 원본 파일 폴더 사용

// DOM 요소
const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');
const formatSelect = document.getElementById('output-format');
const qualitySlider = document.getElementById('quality');
const qualityValue = document.getElementById('quality-value');
const dpiSlider = document.getElementById('dpi');
const dpiValue = document.getElementById('dpi-value');
const dropzone = document.getElementById('dropzone');
const logContainer = document.getElementById('log');
const fileQueueContainer = document.getElementById('file-queue');
const selectFilesBtn = document.getElementById('select-files');
const selectFolderBtn = document.getElementById('select-folder');
const selectOutputBtn = document.getElementById('select-output');
const outputLabel = document.getElementById('output-label');
const outputPath = document.getElementById('output-path');
const progressText = document.getElementById('progress-text');

// 창 제어
minimizeBtn.addEventListener('click', () => {
  ipcRenderer.invoke('window-minimize');
});

closeBtn.addEventListener('click', () => {
  ipcRenderer.invoke('window-close');
});

// 초기화
log('SEEDOC initialized', 'success');
log(`Settings: Format=${currentFormat.toUpperCase()}, Quality=${currentQuality}, DPI=${currentDPI}`, 'info');

// 설정 이벤트
formatSelect.addEventListener('change', (e) => {
  currentFormat = e.target.value;
  log(`Output format changed: ${currentFormat.toUpperCase()}`, 'info');
});

qualitySlider.addEventListener('input', (e) => {
  currentQuality = parseInt(e.target.value);
  qualityValue.textContent = currentQuality;
});

dpiSlider.addEventListener('input', (e) => {
  currentDPI = parseInt(e.target.value);
  dpiValue.textContent = currentDPI;
});

// 파일 선택 버튼
selectFilesBtn.addEventListener('click', async () => {
  const filePaths = await ipcRenderer.invoke('select-files');
  if (filePaths && filePaths.length > 0) {
    addFilesToQueue(filePaths);
  }
});

// 폴더 선택 버튼
selectFolderBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folder');

  if (!result.canceled) {
    log(`Scanning folder: ${result.folderPath}`, 'info');

    const { success, files, error } = await ipcRenderer.invoke('get-folder-files', {
      folderPath: result.folderPath,
      recursive: true
    });

    if (success) {
      log(`Found ${files.length} files`, 'success');
      const filePaths = files.map(f => f.path);
      addFilesToQueue(filePaths);
    } else {
      log(`Folder scan failed: ${error}`, 'error');
    }
  }
});

// 출력 폴더 선택 버튼
selectOutputBtn.addEventListener('click', async () => {
  const result = await ipcRenderer.invoke('select-folder');

  if (!result.canceled) {
    outputFolder = result.folderPath;
    const folderName = path.basename(outputFolder);
    outputLabel.textContent = folderName;
    outputPath.textContent = outputFolder;
    log(`Output folder set: ${outputFolder}`, 'info');
  }
});

// 출력 폴더 초기화 (더블클릭)
selectOutputBtn.addEventListener('dblclick', () => {
  outputFolder = null;
  outputLabel.textContent = 'Same as source';
  outputPath.textContent = '';
  log('Output folder reset to source folder', 'info');
});

// 드래그 앤 드롭 (파일만)
dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer.files).map(f => f.path);
  addFilesToQueue(files);
});

document.addEventListener('dragover', (e) => {
  e.preventDefault();
});

// 큐에 파일 추가
function addFilesToQueue(filePaths) {
  const supportedTextExts = ['.md', '.txt', '.log', '.json', '.xml', '.html', '.htm',
    '.csv', '.py', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss',
    '.yaml', '.yml', '.toml', '.ini', '.conf', '.sh', '.bat',
    '.c', '.cpp', '.h', '.hpp', '.java', '.go', '.rs', '.php',
    '.rb', '.swift', '.kt', '.sql', '.r', '.m', '.pl'];

  const supportedImageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif', '.tiff', '.tif'];

  log(`Adding ${filePaths.length} file(s)...`, 'info');

  let addedCount = 0;

  for (const filePath of filePaths) {
    const ext = path.extname(filePath).toLowerCase();
    const fileName = path.basename(filePath);

    if (supportedTextExts.includes(ext)) {
      fileQueue.push({
        id: Date.now() + Math.random(),
        path: filePath,
        name: fileName,
        type: 'text',
        status: 'pending'
      });
      log(`${fileName} → ${currentFormat.toUpperCase()}`, 'default');
      addedCount++;
    } else if (supportedImageExts.includes(ext)) {
      fileQueue.push({
        id: Date.now() + Math.random(),
        path: filePath,
        name: fileName,
        type: 'image',
        status: 'pending'
      });
      log(`${fileName} → MD (OCR)`, 'default');
      addedCount++;
    }
  }

  if (addedCount > 0) {
    log(`${addedCount} file(s) added to queue`, 'success');
    updateQueueUI();

    if (!processing) {
      processQueue();
    }
  } else {
    log('No supported files found', 'warning');
  }
}

// 큐 UI 업데이트
function updateQueueUI() {
  if (fileQueue.length === 0) {
    fileQueueContainer.innerHTML = `
      <div class="empty-queue">
        No files in queue<br>
        Drop files or folders to begin
      </div>
    `;
    return;
  }

  fileQueueContainer.innerHTML = '';

  for (const file of fileQueue) {
    const item = document.createElement('div');
    item.className = `queue-item ${file.status}`;

    const icon = file.type === 'text' ? '📄' : '🖼️';
    const statusText = file.status === 'processing' ? 'Processing...' :
                       file.status === 'completed' ? 'Completed' : 'Pending';

    item.innerHTML = `
      <div class="queue-icon">${icon}</div>
      <div class="queue-info">
        <div class="queue-name">${file.name}</div>
        <div class="queue-status">${statusText}</div>
      </div>
      <button class="queue-remove" data-id="${file.id}">×</button>
    `;

    // 삭제 버튼 이벤트
    const removeBtn = item.querySelector('.queue-remove');
    removeBtn.addEventListener('click', () => {
      removeFileFromQueue(file.id);
    });

    fileQueueContainer.appendChild(item);
  }
}

// 파일 큐에서 제거
function removeFileFromQueue(fileId) {
  const fileIndex = fileQueue.findIndex(f => f.id === fileId);
  if (fileIndex === -1) return;

  const file = fileQueue[fileIndex];

  // 처리 중인 파일은 제거 불가
  if (file.status === 'processing') {
    log(`Cannot remove ${file.name} - currently processing`, 'warning');
    return;
  }

  fileQueue.splice(fileIndex, 1);
  log(`Removed: ${file.name}`, 'info');
  updateQueueUI();
}

// 큐 처리
async function processQueue() {
  processing = true;
  const totalFiles = fileQueue.length;
  let dotCount = 0;

  const dotInterval = setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    const dots = '.'.repeat(dotCount);
    progressText.textContent = `Processing${dots}`;
  }, 500);

  while (fileQueue.length > 0) {
    const file = fileQueue.find(f => f.status === 'pending');
    if (!file) break;

    file.status = 'processing';
    updateQueueUI();

    const remaining = fileQueue.filter(f => f.status === 'pending').length;
    log(`Processing: ${file.name} (${remaining} remaining)`, 'info');

    try {
      if (file.type === 'text') {
        await convertTextToImage(file);
      } else if (file.type === 'image') {
        await convertImageToMD(file);
      }

      file.status = 'completed';
    } catch (error) {
      log(`Failed: ${error.message}`, 'error');
      file.status = 'error';
    }

    updateQueueUI();
  }

  clearInterval(dotInterval);
  processing = false;
  progressText.textContent = 'Completed';
  log('All conversions completed', 'success');

  setTimeout(() => {
    fileQueue = fileQueue.filter(f => f.status !== 'completed');
    updateQueueUI();
    progressText.textContent = 'Professional Document Converter';
  }, 3000);
}

// 텍스트 → 이미지 변환
async function convertTextToImage(file) {
  log(`Converting ${file.name} → ${currentFormat.toUpperCase()}...`, 'info');

  const result = await ipcRenderer.invoke('convert-text-to-image', {
    filePath: file.path,
    quality: currentQuality,
    dpi: currentDPI,
    format: currentFormat,
    outputFolder: outputFolder  // null이면 원본 폴더 사용
  });

  if (result.success) {
    log(`✓ ${result.totalPages} page(s), ${result.totalSize} KB`, 'success');
    for (const f of result.outputFiles) {
      log(`  ${path.basename(f.path)} (${f.lines} lines, ${f.size} KB)`, 'default');
    }
  } else {
    throw new Error(result.error);
  }
}

// 이미지 → MD 변환 (OCR)
async function convertImageToMD(file) {
  log(`Converting ${file.name} → MD (OCR)...`, 'info');
  log('Initializing Tesseract OCR...', 'info');

  const { data: { text } } = await Tesseract.recognize(
    file.path,
    'kor+eng',
    {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          const progress = Math.round(m.progress * 100);
          log(`OCR progress: ${progress}%`, 'info');
        }
      }
    }
  );

  log('OCR completed, saving MD file...', 'success');

  const result = await ipcRenderer.invoke('save-ocr-result', {
    originalPath: file.path,
    content: text,
    outputFolder: outputFolder  // null이면 원본 폴더 사용
  });

  if (result.success) {
    log(`✓ Saved: ${path.basename(result.outputPath)} (${result.size} KB)`, 'success');
  } else {
    throw new Error(result.error);
  }
}

// 황금율 테스트 버튼
const testGoldenRatioBtn = document.getElementById('test-golden-ratio');
testGoldenRatioBtn.addEventListener('click', async () => {
  log('=== GOLDEN RATIO TEST START ===', 'warning');
  log('Testing multiple combinations...', 'info');

  // 테스트 파일 선택
  const filePaths = await ipcRenderer.invoke('select-files');
  if (!filePaths || filePaths.length === 0) {
    log('No file selected for testing', 'error');
    return;
  }

  const testFile = filePaths[0];
  log(`Test file: ${path.basename(testFile)}`, 'info');

  // 테스트 조합 (황금율 Ultra 포함)
  const combinations = [
    // Ultra Compact (황금율 2025-11-09)
    { format: 'jpg', width: 1600, quality: 60, height: 65000, label: 'ULTRA' },
    // JPG
    { format: 'jpg', width: 800, quality: 50, height: 20000 },
    { format: 'jpg', width: 800, quality: 60, height: 25000 },
    { format: 'jpg', width: 1200, quality: 50, height: 20000 },
    { format: 'jpg', width: 1200, quality: 60, height: 25000 },
    { format: 'jpg', width: 1600, quality: 60, height: 30000 },
    { format: 'jpg', width: 1600, quality: 80, height: 30000 },
    // WEBP
    { format: 'webp', width: 800, quality: 50, height: 20000 },
    { format: 'webp', width: 800, quality: 60, height: 25000 },
    { format: 'webp', width: 1200, quality: 50, height: 20000 },
    { format: 'webp', width: 1200, quality: 60, height: 25000 },
    { format: 'webp', width: 1600, quality: 60, height: 30000 },
    { format: 'webp', width: 1600, quality: 80, height: 30000 },
  ];

  log(`Testing ${combinations.length} combinations...`, 'info');

  const results = [];

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    const { format, width, quality, height, label } = combo;

    const labelText = label ? ` [${label}]` : '';
    log(`[${i+1}/${combinations.length}] Testing: ${format.toUpperCase()} ${width}px Q${quality} H${height}px${labelText}`, 'info');

    try {
      const result = await ipcRenderer.invoke('test-conversion', {
        filePath: testFile,
        format,
        width,
        quality,
        pageHeight: height
      });

      if (result.success) {
        const tokens = Math.ceil((width * height) / 750);
        const score = result.fileSize / tokens; // 토큰당 바이트 (작을수록 좋음)

        results.push({
          ...combo,
          fileSize: result.fileSize,
          tokens,
          score,
          pages: result.pages || 1
        });

        log(`  Size: ${(result.fileSize/1024).toFixed(1)}KB, Tokens: ${tokens}, Score: ${score.toFixed(2)}`, 'success');
      } else {
        log(`  Failed: ${result.error}`, 'error');
      }
    } catch (error) {
      log(`  Error: ${error.message}`, 'error');
    }
  }

  // 최적 조합 찾기
  results.sort((a, b) => a.score - b.score);

  log('', 'default');
  log('=== TOP 3 GOLDEN RATIOS ===', 'success');
  for (let i = 0; i < Math.min(3, results.length); i++) {
    const r = results[i];
    log(`${i+1}. ${r.format.toUpperCase()} ${r.width}px Q${r.quality} H${r.height}px - Score: ${r.score.toFixed(2)} (${(r.fileSize/1024).toFixed(1)}KB, ${r.tokens} tokens)`, 'success');
  }

  log('=== TEST COMPLETE ===', 'warning');
});

// 로그 출력
function log(message, type = 'default') {
  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;

  const timestamp = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  entry.textContent = `[${timestamp}] ${message}`;

  logContainer.appendChild(entry);
  logContainer.scrollTop = logContainer.scrollHeight;
}
