const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');

try {
  const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
  
  console.log('Generating panorama configuration...');
  const output1 = execSync(`${pythonCmd} scripts/generate_marzipano_config.py`, { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(output1);
  
  if (fs.existsSync('config.json')) {
    fs.renameSync('config.json', 'public/config.json');
    console.log('Configuration generated successfully at public/config.json');
  } else {
    throw new Error('config.json was not generated');
  }
  
  console.log('Calculating north offsets...');
  const output2 = execSync(`${pythonCmd} scripts/calculate_north_offsets.py`, { 
    encoding: 'utf8',
    cwd: process.cwd()
  });
  console.log(output2);
  
  console.log('North offsets calculated and applied successfully');
} catch (error) {
  console.error('Error in configuration process:', error.message);
  process.exit(1);
}