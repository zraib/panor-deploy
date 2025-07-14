import { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File } from 'formidable';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { uploadToS3, batchUploadToS3 } from '@/lib/aws-s3';

const execAsync = promisify(exec);

// Check if S3 is configured
function isS3Configured(): boolean {
  return !!(process.env.CLOUD_REGION && 
           process.env.S3_BUCKET_NAME && 
           (process.env.CLOUD_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID));
}

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true,
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

  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  let tempFilesToCleanup: (File | File[])[] = [];

  try {
    // Ensure tmp directory exists
    const tmpDir = path.join(process.cwd(), 'tmp');
    ensureDirectoryExists(tmpDir);
    
    const form = new IncomingForm({
      maxFields: 1000,
      allowEmptyFiles: false,
      minFileSize: 1,
      uploadDir: tmpDir,
      keepExtensions: true,
      multiples: true,
      // Remove all size limitations
      maxFileSize: Infinity,
      maxTotalFileSize: Infinity,
      maxFieldsSize: Infinity,
    });
    
    const { fields, files } = await new Promise<{ fields: any; files: any }>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Ensure project directories exist
    const publicDir = path.join(process.cwd(), 'public');
    const projectDir = path.join(publicDir, projectId);
    const imagesDir = path.join(projectDir, 'images');
    const dataDir = path.join(projectDir, 'data');

    const deleteAll = fields.deleteAll && fields.deleteAll[0] === 'true';

    if (deleteAll) {
      if (fs.existsSync(imagesDir)) {
        fs.rmSync(imagesDir, { recursive: true, force: true });
      }
      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }
    }
    
    ensureDirectoryExists(projectDir);
    ensureDirectoryExists(imagesDir);
    ensureDirectoryExists(dataDir);

    // Handle CSV file
    const csvFile = Array.isArray(files.csv) ? files.csv[0] : files.csv;
    const existingCsv = fields.existing_csv ? fields.existing_csv[0] : null;
    let csvDestPath = '';
    let csvUploadResult = null;

    if (csvFile) {
      tempFilesToCleanup.push(csvFile);
      
      if (isS3Configured()) {
        // Upload CSV to S3
        const csvBuffer = fs.readFileSync(csvFile.filepath);
        csvUploadResult = await uploadToS3(csvBuffer, 'pano-poses.csv', projectId, 'csv');
        console.log(`CSV file successfully uploaded to S3: ${csvUploadResult.key}`);
      } else {
        // Local file storage
        csvDestPath = path.join(dataDir, 'pano-poses.csv');
        await moveFile(csvFile.filepath, csvDestPath);
        
        // Verify CSV file was moved successfully
        if (!fs.existsSync(csvDestPath)) {
          throw new Error(`Failed to move CSV file to ${csvDestPath}`);
        }
        console.log(`CSV file successfully moved to: ${csvDestPath}`);
      }
    } else if (existingCsv) {
      if (!isS3Configured()) {
        csvDestPath = path.join(dataDir, existingCsv);
      }
    } else {
      return res.status(400).json({ error: 'CSV file is required' });
    }

    // Handle image files
    const imageFiles = Array.isArray(files.images) ? files.images : (files.images ? [files.images] : []);
    const existingImages = fields.existing_images ? (Array.isArray(fields.existing_images) ? fields.existing_images : [fields.existing_images]) : [];

    if (imageFiles.length === 0 && existingImages.length === 0) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }
    if (imageFiles.length > 0) {
        tempFilesToCleanup.push(files.images);
    }

    // Check for overwrite flag
    const allowOverwrite = fields.overwrite && fields.overwrite[0] === 'true';
    
    // Check for duplicate file names only if overwrite is not allowed
    if (!allowOverwrite) {
      const duplicateFiles: string[] = [];
      const existingFiles = fs.existsSync(imagesDir) ? fs.readdirSync(imagesDir) : [];
      
      for (const imageFile of imageFiles) {
        if (imageFile && imageFile.originalFilename) {
          if (existingFiles.includes(imageFile.originalFilename)) {
            duplicateFiles.push(imageFile.originalFilename);
          }
        }
      }

      // If duplicates found, return warning
      if (duplicateFiles.length > 0) {
        await cleanupTempFiles(tempFilesToCleanup);
        return res.status(409).json({ 
          error: 'Duplicate file names detected',
          duplicates: duplicateFiles,
          message: `The following files already exist: ${duplicateFiles.join(', ')}. Please rename them or choose different files.`
        });
      }
    }

    const movedImages: string[] = [];
    let imageUploadResults = [];
    
    if (imageFiles.length > 0) {
      if (isS3Configured()) {
        // Upload images to S3
        const filesToUpload = imageFiles
          .filter(file => file && file.originalFilename)
          .map(file => ({
            buffer: fs.readFileSync(file.filepath),
            filename: file.originalFilename!,
            fileType: 'panorama' as const
          }));
        
        imageUploadResults = await batchUploadToS3(filesToUpload, projectId);
        
        // Track successful uploads
        imageUploadResults.forEach(result => {
          if (result.success) {
            movedImages.push(result.filename);
          }
        });
        
        console.log(`Successfully uploaded ${movedImages.length} image files to S3:`, movedImages);
      } else {
        // Local file storage
        for (const imageFile of imageFiles) {
          if (imageFile && imageFile.originalFilename) {
            const imageDestPath = path.join(imagesDir, imageFile.originalFilename);
            await moveFile(imageFile.filepath, imageDestPath);
            
            // Verify image file was moved successfully
            if (!fs.existsSync(imageDestPath)) {
              throw new Error(`Failed to move image file to ${imageDestPath}`);
            }
            movedImages.push(imageFile.originalFilename);
          }
        }
        console.log(`Successfully moved ${movedImages.length} image files:`, movedImages);
      }
    }
    
    // Add existing images to the list of moved images
    existingImages.forEach((imageName: string) => movedImages.push(imageName));

    // Add a small delay to ensure all file operations are completed
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Final verification before running config script
    console.log(`Final verification for project ${projectId}:`);
    if (isS3Configured()) {
      console.log(`- Using S3 storage`);
      console.log(`- CSV uploaded: ${!!csvUploadResult}`);
      console.log(`- Images uploaded: ${movedImages.length}`);
    } else {
      console.log(`- Using local storage`);
      console.log(`- CSV exists: ${fs.existsSync(csvDestPath)}`);
      console.log(`- Images directory exists: ${fs.existsSync(imagesDir)}`);
      console.log(`- Images in directory: ${fs.readdirSync(imagesDir).length}`);
    }
    
    // Run the configuration generation script for this specific project
    try {
      console.log(`Starting configuration generation for project: ${projectId}`);
      
      // Use S3-aware script if S3 is configured, otherwise use regular script
      const scriptName = isS3Configured() ? 'generate-config-s3.js' : 'generate-config.js';
      const { stdout, stderr } = await execAsync(`node scripts/node/${scriptName} --project "${projectId}"`, {
        cwd: process.cwd(),
      });
      
      console.log('Script output:', stdout);
      if (stderr) {
        console.warn('Script warnings:', stderr);
      }

      const storageType = isS3Configured() ? 'S3' : 'local storage';
      res.status(200).json({ 
        message: `Files uploaded successfully to ${storageType} for project "${projectId}" and configuration generated!`,
        projectId,
        scriptOutput: stdout,
        storageType,
        uploadResults: isS3Configured() ? {
          csv: csvUploadResult,
          images: imageUploadResults
        } : undefined
      });
    } catch (scriptError: any) {
      console.error('Script execution error:', scriptError);
      
      // Provide more specific error messages based on the script error
      let errorDetails = 'Unknown configuration error';
      if (scriptError.message) {
        if (scriptError.message.includes('CSV file not found')) {
          errorDetails = 'CSV file was not properly uploaded or moved';
        } else if (scriptError.message.includes('python')) {
          errorDetails = 'Python or required packages (numpy) are not installed';
        } else if (scriptError.message.includes('Permission denied')) {
          errorDetails = 'File permission error - check directory permissions';
        } else {
          errorDetails = scriptError.message;
        }
      }
      
      const storageType = isS3Configured() ? 'S3' : 'local storage';
      res.status(500).json({ 
        error: 'Configuration generation failed',
        message: `Files uploaded successfully to ${storageType} for project "${projectId}", but configuration generation failed: ${errorDetails}`,
        projectId,
        details: process.env.NODE_ENV === 'development' ? scriptError.message : undefined,
        manualCommand: `node scripts/node/${isS3Configured() ? 'generate-config-s3.js' : 'generate-config.js'} --project "${projectId}"`,
        storageType,
        uploadResults: isS3Configured() ? {
          csv: csvUploadResult,
          images: imageUploadResults
        } : undefined
      });
    }

    // Clean up temp files after successful processing
    await cleanupTempFiles(tempFilesToCleanup);

  } catch (error: any) {
    console.error('Upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Internal server error during file upload';
    let statusCode = 500;
    
    if (error.code === 1009 || error.httpCode === 413) {
      errorMessage = 'File upload failed due to size restrictions. Please try with smaller files.';
      statusCode = 413;
    } else if (error.message && error.message.includes('timeout')) {
      errorMessage = 'Upload timeout. Please try again.';
      statusCode = 408;
    } else if (error.message && error.message.includes('ENOSPC')) {
      errorMessage = 'Server storage is full. Please contact administrator.';
      statusCode = 507;
    } else if (error.message && error.message.includes('EMFILE')) {
      errorMessage = 'Too many files being processed. Please try again in a moment.';
      statusCode = 503;
    } else if (error.code && error.code >= 1000 && error.code <= 1999) {
      errorMessage = `File upload error: ${error.message || 'Unknown formidable error'}`;
      statusCode = 400;
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