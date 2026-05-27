#!/usr/bin/env node
/**
 * MediSense AI - Next.js Frontend Setup
 * Run with: node install-frontend.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_DIR = path.join(__dirname, 'frontend');

// File structure
const fileStructure = {
  'package.json': {
    name: 'medisense-frontend',
    version: '1.0.0',
    private: true,
    scripts: {
      dev: 'next dev',
      build: 'next build',
      start: 'next start',
      lint: 'next lint'
    },
    dependencies: {
      react: '^18.2.0',
      'react-dom': '^18.2.0',
      next: '^14.1.0',
      'framer-motion': '^10.16.16',
      'lucide-react': '^0.292.0',
      '@radix-ui/react-dialog': '^1.1.1',
      '@radix-ui/react-scroll-area': '^1.0.5',
      clsx: '^2.0.0',
      'tailwind-merge': '^2.2.0'
    },
    devDependencies: {
      typescript: '^5',
      tailwindcss: '^3.3.0',
      postcss: '^8',
      autoprefixer: '^10.4.16',
      '@types/node': '^20',
      '@types/react': '^18',
      '@types/react-dom': '^18',
      eslint: '^8',
      'eslint-config-next': '^14.1.0'
    }
  }
};

console.log('🚀 Setting up MediSense AI Frontend...');

// Create package.json
const pkgPath = path.join(FRONTEND_DIR, 'package.json');
fs.writeFileSync(pkgPath, JSON.stringify(fileStructure['package.json'], null, 2));
console.log('✓ Created package.json');

// Install dependencies
console.log('📦 Installing dependencies... (this may take a few minutes)');
try {
  execSync('npm install', { cwd: FRONTEND_DIR, stdio: 'inherit' });
  console.log('✓ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

console.log('\n✅ Frontend setup complete!');
console.log('\n📝 Next steps:');
console.log('   1. cd frontend');
console.log('   2. npm run dev');
console.log('   3. Open http://localhost:3000');
