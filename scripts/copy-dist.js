const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '../web-receiver/dist');
const destDir = path.join(__dirname, '../mobile-app/backend/public');

if (!fs.existsSync(srcDir)) {
  console.error('[Build Script] Source dist directory not found:', srcDir);
  process.exit(1);
}

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

copyRecursiveSync(srcDir, destDir);
console.log('✅ [Build Script] Successfully synced web-receiver dist to mobile-app/backend/public');
