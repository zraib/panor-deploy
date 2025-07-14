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
    nodejs: {
      available: true,
      version: process.version,
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
      },
    },
    recommendations: [] as string[],
  };

  // Node.js is always available in this context
  diagnostics.nodejs.available = true;
  diagnostics.nodejs.version = process.version;

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

  // Python scripts are no longer required - using Node.js modules only

  // Overall health check - Node.js only requirements
  const isHealthy = 
    diagnostics.nodejs.available &&
    diagnostics.directories.public.exists &&
    diagnostics.directories.public.writable &&
    diagnostics.directories.scripts.nodeScript.exists;

  res.status(200).json({
    healthy: isHealthy,
    diagnostics,
    summary: {
      nodejs: diagnostics.nodejs.available ? '✅ Available' : '❌ Not available',
      publicDir: diagnostics.directories.public.writable ? '✅ Writable' : '❌ Not writable',
      scripts: diagnostics.directories.scripts.nodeScript.exists ? '✅ Available' : '❌ Missing',
    },
  });
}