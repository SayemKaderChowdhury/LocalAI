const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

async function build() {
  const distDir = path.resolve(__dirname, '../dist-electron');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  // Copy sql-wasm.wasm into dist-electron
  const wasmSrc = path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm');
  const wasmDest = path.resolve(distDir, 'sql-wasm.wasm');
  if (fs.existsSync(wasmSrc)) {
    fs.copyFileSync(wasmSrc, wasmDest);
    console.log('Copied sql-wasm.wasm to dist-electron');
  }

  // Copy icon into dist-electron
  const iconSrc = path.resolve(__dirname, '../build/icon.png');
  const iconDest = path.resolve(distDir, 'icon.png');
  if (fs.existsSync(iconSrc)) {
    fs.copyFileSync(iconSrc, iconDest);
    console.log('Copied icon.png to dist-electron');
  }

  console.log('Building Electron main process...');
  await esbuild.build({
    entryPoints: [
      path.resolve(__dirname, '../src/main/index.ts'),
      path.resolve(__dirname, '../src/main/db.ts'),
      path.resolve(__dirname, '../src/main/hardware.ts'),
      path.resolve(__dirname, '../src/main/ollama.ts'),
      path.resolve(__dirname, '../src/main/rag.ts'),
      path.resolve(__dirname, '../src/main/ipc.ts'),
      path.resolve(__dirname, '../src/main/logger.ts'),
    ],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outdir: path.resolve(distDir, 'main'),
    external: [
      'electron',
      'sql.js',
      'pdf-parse',
      'mammoth',
      'xlsx',
    ],
    sourcemap: true,
  });

  console.log('Building Electron preload script...');
  await esbuild.build({
    entryPoints: [path.resolve(__dirname, '../src/preload/index.ts')],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile: path.resolve(distDir, 'preload/index.js'),
    external: ['electron'],
    sourcemap: true,
  });

  console.log('Electron build finished successfully!');
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});

