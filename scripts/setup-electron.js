const fs = require('fs');
const path = require('path');
const extract = require('extract-zip');

async function main() {
  const zip = 'C:\\Users\\sayem\\AppData\\Local\\electron\\Cache\\8237340b5eb45bdaa0fd80d68059dc8c2503c864e720929383526cb4b61a91e9\\electron-v35.0.0-win32-x64.zip';
  const dist = path.resolve(__dirname, '..', 'node_modules', 'electron', 'dist');
  console.log('Extracting to:', dist);
  if (!fs.existsSync(dist)) {
    fs.mkdirSync(dist, { recursive: true });
  }
  await extract(zip, { dir: dist });
  fs.writeFileSync(path.resolve(__dirname, '..', 'node_modules', 'electron', 'path.txt'), 'electron.exe');
  console.log('Done!');
}

main().catch(err => {
  console.error('Extraction error:', err);
  process.exit(1);
});

