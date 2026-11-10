const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, ['.', '--screenshot-views'], {
  env,
  stdio: 'inherit',
});

child.on('close', (code) => {
  console.log('Visual review pass finished with code:', code);
  process.exit(code || 0);
});
