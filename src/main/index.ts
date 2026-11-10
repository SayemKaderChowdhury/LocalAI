// Record t0 immediately at first line
const appStartTime = Date.now();

// Clear any terminal-inherited ELECTRON_RUN_AS_NODE flag so the GUI always boots properly
delete process.env.ELECTRON_RUN_AS_NODE;

import { app, BrowserWindow, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { LocalDatabase } from './db';
import { OllamaClient } from './ollama';
import { RagEngine } from './rag';
import { setupIpcHandlers } from './ipc';
import { logger } from './logger';
import { getHardwareSpecs, KNOWN_MODELS } from './hardware';

logger.startup('process start (t0)', 0, 'Main process initialized');

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV === 'development' || process.env.ELECTRON_IS_DEV === '1';

async function createWindow() {
  const iconPath = path.join(__dirname, '../icon.png');

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    frame: true,
    show: false, // Prevent white flash; show on ready-to-show
    titleBarStyle: 'default',
    title: 'LocalAI — Private Desktop Assistant',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    backgroundColor: '#0F1012',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const t1 = Date.now() - appStartTime;
  logger.startup('window created (t1)', t1, 'BrowserWindow instantiated');

  mainWindow.webContents.on('console-message', (_event, level, message, line, sourceId) => {
    logger.info(`[RENDERER-CONSOLE] (${level}) ${message} [${sourceId}:${line}]`);
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logger.error(`[DID-FAIL-LOAD] ${errorCode}: ${errorDescription} (${validatedURL})`);
  });

  mainWindow.once('ready-to-show', () => {
    const t2 = Date.now() - appStartTime;
    logger.startup('window shown (t2)', t2, 'ready-to-show fired; window visible');
    mainWindow?.show();
  });

  // Strict network sandboxing: never allow any network requests outside 127.0.0.1/localhost
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (
      url.startsWith('file:') ||
      url.startsWith('devtools:') ||
      url.startsWith('http://127.0.0.1:') ||
      url.startsWith('http://localhost:') ||
      url.startsWith('ws://127.0.0.1:') ||
      url.startsWith('ws://localhost:')
    ) {
      callback({ cancel: false });
    } else {
      logger.warn(`[BLOCKED OUTBOUND CALL]: ${url}`);
      callback({ cancel: true });
    }
  });

  // Initialize backend systems asynchronously without blocking UI load
  const db = new LocalDatabase();
  await db.init();

  const ollama = new OllamaClient();
  const rag = new RagEngine(db, ollama);

  // Setup IPC channels
  setupIpcHandlers(mainWindow, db, ollama, rag, appStartTime);

  // Non-blocking background health check & model warmup
  ollama.checkHealth().then(async (health) => {
    if (!health.running) {
      logger.info('Ollama not running on boot, starting daemon in background...');
      await ollama.startOllama();
    }
    const settings = db.getSettings();
    const activeModel = settings?.activeModel || 'qwen3.5:4b';
    ollama.warmupModel(activeModel).catch((err) => {
      logger.warn('Initial model warmup notice:', err);
    });
  }).catch((err) => {
    logger.warn('Background Ollama health check error:', err);
  });

  const htmlFile = path.join(__dirname, '../../dist-renderer/index.html');
  const devUrl = 'http://127.0.0.1:5173';

  if (process.env.ELECTRON_START_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev) {
    await mainWindow.loadURL(devUrl);
  } else if (fs.existsSync(htmlFile)) {
    await mainWindow.loadFile(htmlFile);
  } else {
    await mainWindow.loadURL(devUrl);
  }

  // Visual Screenshot Capture Flag support
  if (process.argv.includes('--screenshot-views') || process.argv.includes('--screenshot-test')) {
    console.log('Running visual screenshot capture pass...');
    const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // 1. Capture 1280x800 Chat view
    mainWindow.setSize(1280, 800);
    await new Promise((r) => setTimeout(r, 2200));
    const img800 = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1280x800.png'), img800.toPNG());
    fs.writeFileSync(path.join(screenshotsDir, 'view-chat.png'), img800.toPNG());
    console.log('Saved screenshot-1280x800.png and view-chat.png');

    // 2. Capture 1920x1080 Chat view
    mainWindow.setSize(1920, 1080);
    await new Promise((r) => setTimeout(r, 1200));
    const img1080 = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(screenshotsDir, 'screenshot-1920x1080.png'), img1080.toPNG());
    console.log('Saved screenshot-1920x1080.png');

    // Reset size to 1280x800 for component views
    mainWindow.setSize(1280, 800);
    await new Promise((r) => setTimeout(r, 600));

    // 3. Capture Workspaces view
    await mainWindow.webContents.executeJavaScript(`
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Workspaces'));
      if (btn) btn.click();
    `);
    await new Promise((r) => setTimeout(r, 1000));
    const imgWorkspaces = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(screenshotsDir, 'view-workspaces.png'), imgWorkspaces.toPNG());
    console.log('Saved view-workspaces.png');

    // 4. Capture Library view
    await mainWindow.webContents.executeJavaScript(`
      const navButtons = document.querySelectorAll('nav button');
      if (navButtons[1]) navButtons[1].click();
    `);
    await new Promise((r) => setTimeout(r, 1200));
    const imgLibrary = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(screenshotsDir, 'view-library.png'), imgLibrary.toPNG());
    console.log('Saved view-library.png');

    // 5. Capture Settings view (Models tab)
    await mainWindow.webContents.executeJavaScript(`
      const gear = document.querySelector('button[title="App Settings"]');
      if (gear) gear.click();
    `);
    await new Promise((r) => setTimeout(r, 1000));
    await mainWindow.webContents.executeJavaScript(`
      const tabs = Array.from(document.querySelectorAll('button'));
      const modelTab = tabs.find(b => b.textContent && b.textContent.includes('Models & Engine'));
      if (modelTab) modelTab.click();
    `);
    await new Promise((r) => setTimeout(r, 1200));
    const imgSettings = await mainWindow.webContents.capturePage();
    fs.writeFileSync(path.join(screenshotsDir, 'view-settings.png'), imgSettings.toPNG());
    console.log('Saved view-settings.png');

    app.quit();
    return;
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}

export { LocalDatabase, OllamaClient, RagEngine, getHardwareSpecs, KNOWN_MODELS };
