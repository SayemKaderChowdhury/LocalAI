const { spawn, execSync } = require('child_process');
const path = require('path');

const exePath = path.resolve(__dirname, '../release/win-unpacked/LocalAI.exe');
console.log('Testing packaged executable at:', exePath);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const child = spawn(exePath, [], {
  env,
  detached: true,
  stdio: 'ignore',
});

const pid = child.pid;
console.log('Launched LocalAI PID:', pid);

setTimeout(() => {
  try {
    // Check for any conhost, cmd, or powershell processes whose parent is this LocalAI process
    const psCmd = `Get-CimInstance Win32_Process | Where-Object { $_.ParentProcessId -eq ${pid} } | Select-Object Id, Name, CommandLine | ConvertTo-Json -Compress`;
    const raw = execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psCmd}"`, {
      encoding: 'utf-8',
      windowsHide: true,
    });

    let children = [];
    if (raw.trim()) {
      const parsed = JSON.parse(raw.trim());
      children = Array.isArray(parsed) ? parsed : [parsed];
    }

    console.log(`Found ${children.length} child processes for LocalAI (PID ${pid}):`);
    let terminalCount = 0;
    for (const c of children) {
      console.log(` - PID ${c.Id}: ${c.Name}`);
      if (/conhost|cmd|powershell|bash/i.test(c.Name)) {
        terminalCount++;
      }
    }

    console.log(`\nTerminal / Console Window Count: ${terminalCount}`);

    // Terminate test instance
    try {
      execSync(`taskkill /F /PID ${pid} /T`, { windowsHide: true, stdio: 'ignore' });
    } catch {}

    if (terminalCount === 0) {
      console.log('✅ VERIFICATION PASSED: Exactly ZERO terminal windows detected!');
      process.exit(0);
    } else {
      console.error(`❌ VERIFICATION FAILED: Detected ${terminalCount} terminal windows!`);
      process.exit(1);
    }
  } catch (err) {
    console.error('Error during verification:', err);
    try {
      process.kill(pid);
    } catch {}
    process.exit(1);
  }
}, 3500);
