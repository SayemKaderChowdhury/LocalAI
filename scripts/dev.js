const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const electronPath = require('electron');

async function waitForServer(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
          if (res.statusCode === 200) resolve(true);
          else reject(new Error('Status ' + res.statusCode));
        });
        req.on('error', reject);
        req.setTimeout(1000, () => {
          req.destroy();
          reject(new Error('Timeout'));
        });
      });
      return true;
    } catch {
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw new Error(`Timeout waiting for ${url}`);
}

async function start() {
  require('./build-electron.js');

  console.log('Waiting for Vite server at http://127.0.0.1:5173...');
  await waitForServer('http://127.0.0.1:5173');
  console.log('Vite dev server is ready! Launching Electron...');

  const child = spawn(electronPath, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_IS_DEV: '1' },
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});

