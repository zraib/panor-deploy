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
    // Increase timeout for large uploads (5 minutes)
    externalResolver: true,
  },
  // Note: maxDuration is not a valid Next.js API config option
  // For Vercel deployments, use vercel.json to configure function timeouts
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

// Helper function to clean up temp files
const cleanupTempFiles = async (tempFiles: (File | File[])[]) => {
  for (const fileOrArray of tempFiles) {
    const files = Array.isArray(fileOrArray) ? fileOrArray : [fileOrArray];
    for (const file of files) {
      if (file && file.filepath && fs.existsSync(file.filepath)) {
        try {
          await fs.promises.unlink(file.filepath);
          console.log(`Cleaned up temp file: ${file.filepath}`);
        } catch (error) {
          console.warn(`Failed to cleanup temp file ${file.filepath}:`, error);
        }
      }
    }
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let tempFilesToCleanup: (File | File[])[] = [];

  try {
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    ensureDirectoryExists(tmpDir);
    
    const form = new IncomingForm({
      maxFileSize: 200 * 1024 * 1024, // 200MB per file (for large panorama images)
      maxTotalFileSize: 2 * 1024 * 1024 * 1024, // 2GB total
      maxFields: 1000,
      maxFieldsSize: 20 * 1024 * 1024, // 20MB for fields
      allowEmptyFiles: false,
      minFileSize: 1,
      // Increase timeout for parsing
      uploadDir: tmpDir,
      keepExtensions: true,
      multiples: true,
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
    tempFilesToCleanup.push(csvFile);

    const csvDestPath = path.join(dataDir, 'pano-poses.csv');
    await moveFile(csvFile.filepath, csvDestPath);

    // Handle image files
    const imageFiles = Array.isArray(files.images) ? files.images : [files.images];
    if (!imageFiles || imageFiles.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }
    tempFilesToCleanup.push(files.images);

    // Check for overwrite flag
    const allowOverwrite = fields.overwrite && fields.overwrite[0] === 'true';
    
    // Check for duplicate file names only if overwrite is not allowed
    if (!allowOverwrite) {
      const duplicateFiles: string[] = [];
      const existingFiles = fs.readdirSync(imagesDir);
      
      for (const imageFile of imageFiles) {
        if (imageFile && imageFile.originalFilename) {
          if (existingFiles.includes(imageFile.originalFilename)) {
            duplicateFiles.push(imageFile.originalFilename);
          }
        }
      }

      // If duplicates found, return warning
      if (duplicateFiles.length > 0) {
        // Clean up temp files before returning
        await cleanupTempFiles(tempFilesToCleanup);
        return res.status(409).json({ 
          error: 'Duplicate file names detected',
          duplicates: duplicateFiles,
          message: `The following files already exist: ${duplicateFiles.join(', ')}. Please rename them or choose different files.`
        });
      }
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

    // Clean up temp files after successful processing
    await cleanupTempFiles(tempFilesToCleanup);

  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error during file upload';
    let statusCode = 500;
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      errorMessage = 'One or more files exceed the maximum size limit of 200MB per file.';
      statusCode = 413;
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      errorMessage = 'Too many files uploaded. Please reduce the number of files.';
      statusCode = 413;
    } else if (error.code === 'LIMIT_FIELD_VALUE') {
      errorMessage = 'Form data is too large. Please reduce file sizes.';
      statusCode = 413;
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Upload timeout. Please try uploading fewer files at once or reduce file sizes.';
      statusCode = 408;
    } else if (error.message && error.message.includes('ENOSPC')) {
      errorMessage = 'Server storage is full. Please contact administrator.';
      statusCode = 507;
    } else if (error.message && error.message.includes('EMFILE')) {
      errorMessage = 'Too many files being processed. Please try again in a moment.';
      statusCode = 503;
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });

    // Clean up temp files even on error
    try {
      await cleanupTempFiles(tempFilesToCleanup);
    } catch (cleanupError) {
      console.error('Error during temp file cleanup:', cleanupError);
    }
  }
}