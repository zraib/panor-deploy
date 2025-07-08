const fs = require('fs');
const path = require('path');

/**
 * Script to clean up accumulated temporary files in the tmp directory
 */
async function cleanupTempDirectory() {
  const tmpDir = path.join(process.cwd(), 'tmp');
  
  if (!fs.existsSync(tmpDir)) {
    console.log('No tmp directory found. Nothing to clean up.');
    return;
  }

  try {
    const files = await fs.promises.readdir(tmpDir);
    let cleanedCount = 0;
    let totalSize = 0;

    for (const file of files) {
      const filePath = path.join(tmpDir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (stats.isFile()) {
        totalSize += stats.size;
        await fs.promises.unlink(filePath);
        cleanedCount++;
        console.log(`Removed: ${file}`);
      }
    }

    const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`\nCleanup completed:`);
    console.log(`- Files removed: ${cleanedCount}`);
    console.log(`- Space freed: ${sizeMB} MB`);
    
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  cleanupTempDirectory();
}

module.exports = { cleanupTempDirectory };