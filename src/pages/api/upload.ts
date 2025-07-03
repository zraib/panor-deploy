import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

const ensureDirectoryExists = (dirPath: string) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const moveFile = (oldPath: string, newPath: string) => {
  return new Promise<void>((resolve, reject) => {
    fs.rename(oldPath, newPath, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = new IncomingForm({
      maxFileSize: 100 * 1024 * 1024, // 100MB per file
      maxTotalFileSize: 500 * 1024 * 1024, // 500MB total
      maxFields: 1000,
      maxFieldsSize: 20 * 1024 * 1024, // 20MB for fields
      allowEmptyFiles: false,
      minFileSize: 1,
    });
    
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Ensure directories exist
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    const dataDir = path.join(publicDir, 'data');
    
    ensureDirectoryExists(imagesDir);
    ensureDirectoryExists(dataDir);

    // Handle CSV file
    const csvFile = Array.isArray(files.csv) ? files.csv[0] : files.csv;
    if (!csvFile) {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    const csvDestPath = path.join(dataDir, 'pano-poses.csv');
    await moveFile(csvFile.filepath, csvDestPath);

    // Handle image files
    const imageFiles = Array.isArray(files.images) ? files.images : [files.images];
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    for (const imageFile of imageFiles) {
      if (imageFile && imageFile.originalFilename) {
        const imageDestPath = path.join(imagesDir, imageFile.originalFilename);
        await moveFile(imageFile.filepath, imageDestPath);
      }
    }

    // Run the configuration generation script
    try {
      const { stdout, stderr } = await execAsync('npm run generate-config', {
        cwd: process.cwd(),
      });
      
      console.log('Script output:', stdout);
      if (stderr) {
        console.warn('Script warnings:', stderr);
      }

      res.status(200).json({ 
        message: 'Files uploaded successfully and configuration generated!',
        scriptOutput: stdout
      });
    } catch (scriptError) {
      console.error('Script execution error:', scriptError);
      res.status(200).json({ 
        message: 'Files uploaded successfully, but configuration generation failed. Please run "npm run generate-config" manually.',
        error: scriptError
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error during file upload' });
  }
}