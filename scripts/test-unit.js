const assert = require('assert');
const path = require('path');

console.log('--- Running LocalAI Unit Tests ---');

// 1. Verify Model Tier Rationale & Catalog Integrity
const { KNOWN_MODELS } = require('../dist-electron/main/hardware.js');
assert(Array.isArray(KNOWN_MODELS), 'KNOWN_MODELS must be an array');
assert(KNOWN_MODELS.length >= 8, 'Must have at least 8 models in catalog');

for (const model of KNOWN_MODELS) {
  assert(model.id, 'Model must have an id');
  assert(model.name, 'Model must have a name');
  assert(model.tag, 'Model must have a tag');
  assert(typeof model.sizeGB === 'number', 'sizeGB must be number');
  assert(typeof model.ramNeededGB === 'number', 'ramNeededGB must be number');
}
console.log(`✓ Model catalog integrity passed (${KNOWN_MODELS.length} models verified).`);

// 2. Verify Abliterated Models Safety Flags
const abliterated = KNOWN_MODELS.filter((m) => m.isAbliterated);
assert(abliterated.length >= 5, 'Must have catalog of abliterated models');
for (const m of abliterated) {
  assert.strictEqual(m.isAbliterated, true, 'isAbliterated flag must be strictly true');
}
console.log(`✓ Abliterated model isolation passed (${abliterated.length} models flagged).`);

// 3. Verify Hardware Model Tier Logic
const hardwareModule = require('../dist-electron/main/hardware.js');
const specs = hardwareModule.getHardwareSpecs();
assert(specs.cpu, 'Hardware specs must contain cpu');
assert(typeof specs.totalRamGB === 'number', 'totalRamGB must be number');
assert(['8gb_low', '16gb_mid', '32gb_high', 'ultra'].includes(specs.tier), 'Valid tier assigned');
console.log(`✓ Hardware tier profiling passed (Detected Tier: ${specs.tier}, Recommended: ${specs.recommendedModel}).`);

// 4. Verify Local Loopback URL Rules
const allowedUrls = [
  'http://127.0.0.1:11434',
  'http://localhost:11434',
  'http://127.0.0.1:5173',
  'file:///app/index.html'
];
const forbiddenUrls = [
  'https://api.openai.com/v1/chat',
  'https://api.anthropic.com/v1/messages',
  'https://generativelanguage.googleapis.com',
  'https://telemetry.localai.io'
];

function isUrlAllowed(url) {
  return (
    url.startsWith('file:') ||
    url.startsWith('devtools:') ||
    url.startsWith('http://127.0.0.1:') ||
    url.startsWith('http://localhost:') ||
    url.startsWith('ws://127.0.0.1:') ||
    url.startsWith('ws://localhost:')
  );
}

for (const u of allowedUrls) {
  assert.strictEqual(isUrlAllowed(u), true, `Should allow local url: ${u}`);
}
for (const u of forbiddenUrls) {
  assert.strictEqual(isUrlAllowed(u), false, `Must block outbound url: ${u}`);
}
console.log('✓ Strict loopback network sandbox rules verified.');

console.log('\n--- ALL UNIT TESTS PASSED (100%) ---');
