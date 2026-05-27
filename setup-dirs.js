#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname);
const frontendDir = path.join(projectRoot, 'frontend');

// Create directory structure
const dirs = [
  'src/app',
  'src/components/chat',
  'src/components/sidebar',
  'src/components/ui',
  'src/hooks',
  'src/lib',
  'src/types',
  'public',
];

console.log('🔧 Creating directory structure...');
dirs.forEach(dir => {
  const fullPath = path.join(frontendDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`✓ Created ${dir}`);
  }
});

console.log('\n✅ Directory structure created successfully!');
