import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function runCommand(command, description) {
  console.log(`\n${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✓ ${description} completed`);
  } catch (error) {
    console.error(`✗ ${description} failed`);
    process.exit(1);
  }
}

function cleanDirectory(dir) {
  if (fs.existsSync(dir)) {
    fs.readdirSync(dir).forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
    });
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  fs.readdirSync(src).forEach((file) => {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    const stat = fs.statSync(srcPath);
    if (stat.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  });
}

console.log('🚀 Starting deployment to prod branch...\n');

// Save current branch
const currentBranch = execSync('git branch --show-current', { encoding: 'utf-8' }).trim();

// Build the project
runCommand('npm run build', 'Building project');

// Checkout prod branch
runCommand('git checkout prod', 'Switching to prod branch');

// Clean prod branch (keep .git folder)
console.log('\nCleaning prod branch...');
cleanDirectory('.');
console.log('✓ Prod branch cleaned');

// Copy dist contents to prod
console.log('\nCopying dist to prod...');
copyDirectory('dist', '.');
console.log('✓ Files copied');

// Add all files
runCommand('git add .', 'Staging files');

// Commit
runCommand('git commit -m "Deploy to prod"', 'Committing changes');

// Push to prod
runCommand('git push origin prod', 'Pushing to prod');

// Return to original branch
runCommand(`git checkout ${currentBranch}`, `Switching back to ${currentBranch}`);

console.log('\n✅ Deployment completed successfully!');
