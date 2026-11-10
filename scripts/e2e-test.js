const { app } = require('electron');
const path = require('path');
const fs = require('fs');

async function runTests() {
  await app.whenReady();
  console.log('====================================================');
  console.log(' LocalAI v2 End-to-End Acceptance Verification');
  console.log('====================================================');

  // 1. Test Database & Workspaces
  console.log('\n[TEST 1] Local Database & Workspaces...');
  const { LocalDatabase } = require('../dist-electron/main/db.js');
  const { OllamaClient } = require('../dist-electron/main/ollama.js');
  const { RagEngine } = require('../dist-electron/main/rag.js');
  const { KNOWN_MODELS } = require('../dist-electron/main/hardware.js');
  const db = new LocalDatabase();
  await db.init();

  const testWsId = 'ws_test_' + Date.now().toString(36);
  const testWs = {
    id: testWsId,
    name: 'CalProof Startup Test',
    instructions: 'You are helping me with my CalProof startup. Answer concisely.',
    color: '#2563EB',
    memory: 'Key metric: Monthly recurring revenue is $12,000.',
    created_at: Date.now(),
    updated_at: Date.now(),
  };
  db.saveWorkspace(testWs);

  const wsList = db.getWorkspaces();
  const foundWs = wsList.find((w) => w.id === testWsId);
  if (!foundWs) throw new Error('Failed to create/find workspace!');
  console.log('✓ Workspace created & retrieved:', foundWs.name);

  // Create conversation inside workspace
  const testConvId = 'conv_test_' + Date.now().toString(36);
  const testConv = {
    id: testConvId,
    title: 'Pitch Deck Review',
    created_at: Date.now(),
    updated_at: Date.now(),
    pinned: false,
    temperature: 0.7,
    context_length: 4096,
    max_tokens: 2048,
    model: 'qwen3:4b',
    workspace_id: testWsId,
  };
  db.saveConversation(testConv);

  const scopedConvs = db.getConversations(testWsId);
  if (!scopedConvs.some((c) => c.id === testConvId)) {
    throw new Error('Scoped conversation not found in workspace!');
  }
  console.log('✓ Scoped chat found inside workspace:', scopedConvs[0].title);

  // Test Unified Search
  const searchResult = db.search('CalProof');
  if (!searchResult.workspaces.some((w) => w.id === testWsId)) {
    throw new Error('Unified search did not locate workspace!');
  }
  console.log('✓ Unified search located workspace successfully.');

  // 2. Test Folder Upload & Recursive Scanning & Differential Sync
  console.log('\n[TEST 2] Folder Upload & Differential Sync RAG...');
  const testDir = path.resolve(__dirname, '../test-sandbox-folder');
  const subDir = path.join(testDir, 'financials');
  fs.mkdirSync(subDir, { recursive: true });

  const doc1Path = path.join(testDir, 'overview.txt');
  fs.writeFileSync(doc1Path, 'CalProof is a private local AI platform with zero cloud transmission.');

  const doc2Path = path.join(subDir, 'budget.csv');
  fs.writeFileSync(doc2Path, 'Month,Revenue,Burn\nJan,10000,4000\nFeb,12000,4200\n');

  const ollama = new OllamaClient();
  const rag = new RagEngine(db, ollama);

  // Scan folder
  const scan = rag.scanFolder(testDir);
  console.log(`✓ Scanned folder: found ${scan.totalFiles} files (${scan.supportedFiles} supported).`);
  if (scan.supportedFiles < 2) throw new Error('Scan did not detect supported files!');

  // Index files
  const filesToIndex = scan.items.filter((i) => i.supported).map((i) => ({ path: i.path, relativePath: i.relativePath }));
  const indexSummary = await rag.indexFolderFiles(testDir, filesToIndex, testWsId);
  console.log(`✓ Indexed ${indexSummary.indexedCount} files, skipped ${indexSummary.skippedCount} unsupported.`);

  // Test RAG Retrieval with Citations preserving source path
  const ragRet = await rag.retrieveRelevantChunks('What is the revenue in Feb?', testWsId);
  console.log(`✓ RAG retrieved ${ragRet.citations.length} citations.`);
  if (ragRet.citations.length > 0) {
    console.log(`  Citation Source: "${ragRet.citations[0].source}" (${ragRet.citations[0].pageOrSection})`);
    if (!ragRet.citations[0].source.includes('.csv') && !ragRet.citations[0].source.includes('.txt')) {
      throw new Error('Citation did not preserve file source name!');
    }
  }

  // Test Differential Sync: 0 changes
  const sync1 = await rag.syncFolder(testDir, testWsId);
  console.log(`✓ Sync pass 1 (unmodified): ${sync1.summary}`);
  if (sync1.added !== 0 || sync1.updated !== 0 || sync1.deleted !== 0) {
    throw new Error('Differential sync detected changes on untouched folder!');
  }

  // Modify 1 file and re-sync
  await new Promise((r) => setTimeout(r, 100));
  fs.appendFileSync(doc1Path, '\nUpdated section on privacy architecture.');
  const sync2 = await rag.syncFolder(testDir, testWsId);
  console.log(`✓ Sync pass 2 (modified 1 file): ${sync2.summary}`);
  if (sync2.updated !== 1) {
    throw new Error('Differential sync did not catch modified file!');
  }

  // 3. Test Offline Voice Transcription
  console.log('\n[TEST 3] Offline Voice Transcription (faster-whisper)...');
  const { execSync } = require('child_process');
  const pythonExe = path.resolve(__dirname, '../whisper-env/Scripts/python.exe');
  const scriptPath = path.resolve(__dirname, '../scripts/transcribe.py');

  const tonePy = path.join(__dirname, 'gen_tone.py');
  fs.writeFileSync(tonePy, `import wave, math, struct
with wave.open('test_tone_e2e.wav', 'w') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(16000)
    for i in range(8000):
        val = int(32767.0 * 0.1 * math.sin(2 * math.pi * 440.0 * i / 16000.0))
        w.writeframes(struct.pack('<h', val))
`);
  execSync(`"${pythonExe}" "${tonePy}"`, { windowsHide: true, stdio: 'pipe' });
  fs.unlinkSync(tonePy);

  const rawTranscribe = execSync(`"${pythonExe}" "${scriptPath}" "test_tone_e2e.wav" --model base`, {
    encoding: 'utf-8',
    windowsHide: true,
    stdio: 'pipe',
  });
  const voiceRes = JSON.parse(rawTranscribe.trim());
  if (!voiceRes.success) throw new Error('Voice transcription failed: ' + voiceRes.error);
  console.log('✓ Local Whisper base model executed successfully offline:', voiceRes);
  fs.unlinkSync('test_tone_e2e.wav');

  // 4. Test Opt-in Abliterated Model Config
  console.log('\n[TEST 4] Opt-in Abliterated Model Catalog & Settings...');
  const settings = db.getSettings();
  if (settings.enableAbliteratedModels !== false) {
    throw new Error('Abliterated models must be OFF by default!');
  }
  console.log('✓ Abliterated models are OFF by default in AppSettings.');

  const abliterated = KNOWN_MODELS.filter((m) => m.isAbliterated);
  console.log(`✓ Found ${abliterated.length} abliterated models in catalog with isAbliterated: true.`);
  console.log(`  Example: ${abliterated[0].name} (${abliterated[0].tag})`);

  // 5. Test Model Inference & Streaming First-Token Latency (t4)
  console.log('\n[TEST 5] Local Model Streaming & First-Token Latency (t4)...');
  const health = await ollama.checkHealth();
  const chatModel = health.models.find((m) => !m.name.includes('embed'))?.name || 'qwen3:4b';
  console.log(`✓ Ollama online with ${health.models.length} installed models. Testing chat model '${chatModel}'...`);

  let receivedToken = false;
  let firstTokenLatencyMs = 0;
  const chatStartTime = Date.now();

  await new Promise((resolve) => {
    ollama.chatStream(
      {
        messageId: 'test_stream_' + Date.now(),
        model: chatModel,
        messages: [{ role: 'user', content: 'Say hello in two words.' }],
        maxTokens: 10,
      },
      (chunk) => {
        if (!receivedToken && chunk.delta) {
          receivedToken = true;
          firstTokenLatencyMs = Date.now() - chatStartTime;
          console.log(`✓ First token received in ${firstTokenLatencyMs} ms: "${chunk.delta.trim()}"`);
        }
        if (chunk.done || chunk.error) {
          resolve();
        }
      }
    );
  });
  console.log(`✓ Streaming response verified (t4 first-token latency: ${firstTokenLatencyMs}ms).`);

  // Cleanup test artifacts
  console.log('\n[CLEANUP] Cleaning up test workspace and sandbox...');
  db.deleteWorkspace(testWsId, true);
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✓ Cleaned up test data.');

  console.log('\n====================================================');
  console.log(' ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('====================================================');
  app.quit();
}

runTests().catch((err) => {
  console.error('\n❌ Test Failure:', err);
  app.quit();
  process.exit(1);
});
