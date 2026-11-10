const { spawn } = require('child_process');
const path = require('path');
const electronPath = require('electron');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(electronPath, [path.resolve(__dirname, 'e2e-test.js')], {
  env,
  stdio: 'inherit',
});

child.on('close', (code) => {
  process.exit(code || 0);
});

