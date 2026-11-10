const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

console.log('--- Measuring LocalAI Startup Timeline ---');
const appData = process.env.APPDATA || path.join(process.env.USERPROFILE, 'AppData', 'Roaming');
const startupLog = path.join(appData, 'LocalAI', 'logs', 'startup.log');

// Clear existing startup log for clean run
if (fs.existsSync(startupLog)) {
  fs.writeFileSync(startupLog, '');
}

const startTime = Date.now();
const child = spawn(electronPath, ['.'], {
  env,
  stdio: 'pipe',
  windowsHide: true,
});

child.stdout.on('data', (d) => {
  const s = d.toString();
  if (s.includes('[STARTUP]')) {
    console.log(s.trim());
  }
});

// Wait 4 seconds for window show & ready event, then read startup log and exit child
setTimeout(() => {
  if (fs.existsSync(startupLog)) {
    const logContent = fs.readFileSync(startupLog, 'utf-8');
    console.log('\n--- Captured Startup Log ---');
    console.log(logContent);
  } else {
    console.log('No startup log found at:', startupLog);
  }
  child.kill();
  process.exit(0);
}, 6500);
