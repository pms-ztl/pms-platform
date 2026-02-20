/**
 * Post-install script: generates Prisma client after npm install.
 */
const { execSync } = require('child_process');
const path = require('path');

const DB_PKG = path.join(__dirname, '..', 'packages', 'database');

try {
  console.log('[postinstall] Generating Prisma client...');
  execSync('npx prisma generate', { cwd: DB_PKG, stdio: 'inherit' });
  console.log('[postinstall] Prisma client generated.');
} catch (err) {
  console.warn('[postinstall] Prisma generate failed (non-fatal):', err.message);
}
