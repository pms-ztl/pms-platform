const { spawn } = require('child_process');
const path = require('path');
const proc = spawn(
  process.execPath,
  [path.join(__dirname, 'node_modules/vite/bin/vite.js'), '--port', '3002'],
  { cwd: path.join(__dirname, 'apps/web'), stdio: 'inherit' }
);
proc.on('error', (e) => { console.error(e); process.exit(1); });
