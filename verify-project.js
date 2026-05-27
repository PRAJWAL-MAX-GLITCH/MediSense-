#!/usr/bin/env node

/**
 * MediSense AI - Project Verification Script
 * Tests if the project setup is working correctly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║         MediSense AI - Project Health Check                    ║');
console.log('║                   Verification Test                            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

let allPass = true;

// Test 1: Check Node.js
console.log('[1/7] Checking Node.js...');
try {
  const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
  console.log(`✓ Node.js found: ${nodeVersion}`);
} catch (e) {
  console.error('❌ Node.js not found! Please install Node.js v18+');
  console.error('   Visit: https://nodejs.org');
  allPass = false;
}

// Test 2: Check npm
console.log('\n[2/7] Checking npm...');
try {
  const npmVersion = execSync('npm --version', { encoding: 'utf-8' }).trim();
  console.log(`✓ npm found: ${npmVersion}`);
} catch (e) {
  console.error('❌ npm not found!');
  allPass = false;
}

// Test 3: Check build script
console.log('\n[3/7] Checking build script...');
if (fs.existsSync('build-frontend.js')) {
  console.log('✓ build-frontend.js found');
  const stats = fs.statSync('build-frontend.js');
  console.log(`  Size: ${(stats.size / 1024).toFixed(2)} KB`);
} else {
  console.error('❌ build-frontend.js not found!');
  allPass = false;
}

// Test 4: Check documentation
console.log('\n[4/7] Checking documentation...');
const docs = [
  'START_HERE.txt',
  'COMPLETE_SETUP_GUIDE.md',
  'FRONTEND_README.txt',
  'QUICK_REFERENCE.txt',
];
let docCount = 0;
docs.forEach(doc => {
  if (fs.existsSync(doc)) {
    console.log(`✓ ${doc}`);
    docCount++;
  } else {
    console.log(`⚠ ${doc} - NOT FOUND`);
  }
});
console.log(`  Found: ${docCount}/${docs.length} documentation files`);

// Test 5: Check backend
console.log('\n[5/7] Checking backend...');
if (fs.existsSync('backend')) {
  console.log('✓ Backend directory found');
  if (fs.existsSync('backend/main.py')) {
    console.log('✓ main.py found');
  } else {
    console.log('⚠ main.py not found in backend');
  }
} else {
  console.log('⚠ Backend directory not found');
}

// Test 6: Check frontend
console.log('\n[6/7] Checking frontend structure...');
if (fs.existsSync('frontend')) {
  console.log('✓ Frontend directory exists');
  
  if (fs.existsSync('frontend/package.json')) {
    console.log('✓ package.json found');
  } else {
    console.log('ℹ package.json will be created by build-frontend.js');
  }
  
  if (fs.existsSync('frontend/src')) {
    console.log('✓ src/ directory exists');
    const srcDirs = fs.readdirSync('frontend/src');
    console.log(`  Contains: ${srcDirs.join(', ')}`);
  } else {
    console.log('ℹ src/ directory will be created by build-frontend.js');
  }
} else {
  console.log('ℹ Frontend directory will be created by build-frontend.js');
}

// Test 7: Check backups
console.log('\n[7/7] Checking backups...');
if (fs.existsSync('frontend-old')) {
  console.log('✓ frontend-old/ found (previous backup exists)');
} else {
  console.log('ℹ No previous backup (first time setup)');
}

// Final summary
console.log('\n╔════════════════════════════════════════════════════════════════╗');
if (allPass) {
  console.log('║              ✅ VERIFICATION PASSED - Ready to Build!           ║');
} else {
  console.log('║              ⚠️  VERIFICATION FAILED - Fix issues above          ║');
}
console.log('╚════════════════════════════════════════════════════════════════╝\n');

if (allPass) {
  console.log('Project Status: ✅ READY\n');
  console.log('Next Steps:');
  console.log('──────────────────────────────────────────────────────────────');
  console.log('1. Run: node build-frontend.js');
  console.log('2. Wait for npm install (2-5 minutes)');
  console.log('3. Run: cd frontend && npm run dev');
  console.log('4. Open: http://localhost:3000\n');
  process.exit(0);
} else {
  console.log('Project Status: ⚠️  ISSUES FOUND\n');
  console.log('Please resolve the issues above before proceeding.\n');
  process.exit(1);
}
