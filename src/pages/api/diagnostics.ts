import { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const diagnostics = {
    timestamp: new Date().toISOString(),
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cwd: process.cwd(),
    },
    python: {
      available: false,
      version: null as string | null,
      error: null as string | null,
    },
    numpy: {
      available: false,
      version: null as string | null,
      error: null as string | null,
    },
    directories: {
      public: {
        exists: false,
        writable: false,
        path: '',
      },
      tmp: {
        exists: false,
        writable: false,
        path: '',
      },
      scripts: {
        nodeScript: {
          exists: false,
          path: '',
        },
        pythonScript: {
          exists: false,
          path: '',
        },
      },
    },
    recommendations: [] as string[],
  };

  // Check Python availability
  try {
    const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
    const { stdout } = await execAsync(`${pythonCmd} --version`);
    diagnostics.python.available = true;
    diagnostics.python.version = stdout.trim();
  } catch (error: any) {
    diagnostics.python.error = error.message;
    diagnostics.recommendations.push('Install Python 3.7 or higher');
  }

  // Check numpy availability
  if (diagnostics.python.available) {
    try {
      const pythonCmd = os.platform() === 'win32' ? 'python' : 'python3';
      const { stdout } = await execAsync(`${pythonCmd} -c "import numpy; print(numpy.__version__)"`); 
      diagnostics.numpy.available = true;
      diagnostics.numpy.version = stdout.trim();
    } catch (error: any) {
      diagnostics.numpy.error = error.message;
      diagnostics.recommendations.push('Install numpy: pip install numpy');
    }
  }

  // Check directories
  const publicDir = path.join(process.cwd(), 'public');
  diagnostics.directories.public.path = publicDir;
  diagnostics.directories.public.exists = fs.existsSync(publicDir);
  
  if (diagnostics.directories.public.exists) {
    try {
      const testFile = path.join(publicDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      diagnostics.directories.public.writable = true;
    } catch (error) {
      diagnostics.recommendations.push('Ensure write permissions for the public directory');
    }
  } else {
    diagnostics.recommendations.push('Create public directory');
  }

  const tmpDir = path.join(process.cwd(), 'tmp');
  diagnostics.directories.tmp.path = tmpDir;
  diagnostics.directories.tmp.exists = fs.existsSync(tmpDir);
  
  if (diagnostics.directories.tmp.exists) {
    try {
      const testFile = path.join(tmpDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      diagnostics.directories.tmp.writable = true;
    } catch (error) {
      diagnostics.recommendations.push('Ensure write permissions for the tmp directory');
    }
  }

  // Check script files
  const nodeScriptPath = path.join(process.cwd(), 'scripts', 'node', 'generate-config.js');
  diagnostics.directories.scripts.nodeScript.path = nodeScriptPath;
  diagnostics.directories.scripts.nodeScript.exists = fs.existsSync(nodeScriptPath);
  
  if (!diagnostics.directories.scripts.nodeScript.exists) {
    diagnostics.recommendations.push('Node.js configuration script is missing');
  }

  const pythonScriptPath = path.join(process.cwd(), 'scripts', 'python', 'generate_marzipano_config.py');
  diagnostics.directories.scripts.pythonScript.path = pythonScriptPath;
  diagnostics.directories.scripts.pythonScript.exists = fs.existsSync(pythonScriptPath);
  
  if (!diagnostics.directories.scripts.pythonScript.exists) {
    diagnostics.recommendations.push('Python configuration script is missing');
  }

  // Overall health check
  const isHealthy = 
    diagnostics.python.available &&
    diagnostics.numpy.available &&
    diagnostics.directories.public.exists &&
    diagnostics.directories.public.writable &&
    diagnostics.directories.scripts.nodeScript.exists &&
    diagnostics.directories.scripts.pythonScript.exists;

  res.status(200).json({
    healthy: isHealthy,
    diagnostics,
    summary: {
      python: diagnostics.python.available ? '✅ Available' : '❌ Not available',
      numpy: diagnostics.numpy.available ? '✅ Available' : '❌ Not available', 
      publicDir: diagnostics.directories.public.writable ? '✅ Writable' : '❌ Not writable',
      scripts: (diagnostics.directories.scripts.nodeScript.exists && diagnostics.directories.scripts.pythonScript.exists) ? '✅ Available' : '❌ Missing',
    },
  });
}