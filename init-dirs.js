const fs = require('fs');
const path = require('path');

const dirs = [
  'frontend/src/app',
  'frontend/src/components/chat',
  'frontend/src/components/sidebar',
  'frontend/src/components/ui',
  'frontend/src/components/input',
  'frontend/src/hooks',
  'frontend/src/lib',
  'frontend/src/types',
  'frontend/public'
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

console.log('✅ Directory structure created');
