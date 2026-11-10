const { app, BrowserWindow, session } = require('electron');
const path = require('path');
const fs = require('fs');

async function runCapture() {
  await app.whenReady();

  // Strict network sandboxing
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    if (
      url.startsWith('file:') ||
      url.startsWith('devtools:') ||
      url.startsWith('http://127.0.0.1:') ||
      url.startsWith('http://localhost:')
    ) {
      callback({ cancel: false });
    } else {
      callback({ cancel: true });
    }
  });

  const screenshotsDir = path.resolve(process.cwd(), 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const { LocalDatabase } = require('../dist-electron/main/db.js');
  const db = new LocalDatabase();
  await db.init();

  const { OllamaClient } = require('../dist-electron/main/ollama.js');
  const ollama = new OllamaClient();

  const { RagEngine } = require('../dist-electron/main/rag.js');
  const rag = new RagEngine(db, ollama);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, '../dist-electron/preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const { setupIpcHandlers } = require('../dist-electron/main/ipc.js');
  setupIpcHandlers(win, db, ollama, rag);

  const htmlPath = path.resolve(__dirname, '../dist-renderer/index.html');
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 2000));

  // 1. Capture Main Chat view
  const imgChat = await win.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, 'view-chat.png'), imgChat.toPNG());
  console.log('Saved view-chat.png');

  // 2. Switch to Workspaces view
  await win.webContents.executeJavaScript(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Workspaces'));
    if (btn) btn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));
  const imgWorkspaces = await win.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, 'view-workspaces.png'), imgWorkspaces.toPNG());
  console.log('Saved view-workspaces.png');

  // 3. Switch to Library view
  await win.webContents.executeJavaScript(`
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Library'));
    if (btn) btn.click();
  `);
  await new Promise((r) => setTimeout(r, 800));
  const imgLibrary = await win.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, 'view-library.png'), imgLibrary.toPNG());
  console.log('Saved view-library.png');

  // 4. Open Settings modal and switch to Models tab
  await win.webContents.executeJavaScript(`
    const gear = document.querySelector('button[title="App Settings"]');
    if (gear) gear.click();
  `);
  await new Promise((r) => setTimeout(r, 600));

  await win.webContents.executeJavaScript(`
    const tab = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Models & Engine'));
    if (tab) tab.click();
  `);
  await new Promise((r) => setTimeout(r, 600));
  const imgSettings = await win.webContents.capturePage();
  fs.writeFileSync(path.join(screenshotsDir, 'view-settings.png'), imgSettings.toPNG());
  console.log('Saved view-settings.png');

  win.close();
  app.quit();
}

runCapture().catch((err) => {
  console.error('Capture error:', err);
  app.quit();
});
