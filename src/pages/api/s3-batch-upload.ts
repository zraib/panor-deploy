import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { batchUploadToS3 } from '@/lib/aws-s3';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      keepExtensions: true,
      maxFileSize: 50 * 1024 * 1024, // 50MB per file
      maxTotalFileSize: 500 * 1024 * 1024, // 500MB total
      multiples: true, // Allow multiple files
      filter: (part) => {
        const { mimetype, originalFilename } = part;
        // Allow images, CSV, JSON, PDFs, and videos
        const allowedTypes = [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'text/csv',
          'application/json',
          'application/pdf',
          'video/mp4',
          'video/webm'
        ];
        return allowedTypes.includes(mimetype ?? '') ||
               Boolean(originalFilename && (originalFilename.endsWith('.csv') || originalFilename.endsWith('.json')));
      }
    });

    const [fields, files] = await form.parse(req);
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Process all uploaded files
    const filesToUpload: {
      buffer: Buffer;
      filename: string;
      fileType: 'panorama' | 'csv' | 'config' | 'poi';
      size: number;
      mimetype: string | null;
    }[] = [];
    const tempFiles: string[] = [];

    // Handle multiple files
    for (const [fieldName, fileOrFiles] of Object.entries(files)) {
      const fileArray = Array.isArray(fileOrFiles) ? fileOrFiles : [fileOrFiles];
      
      for (const file of fileArray) {
        if (file && file.originalFilename && file.filepath) {
          try {
            const fileContent = await fs.readFile(file.filepath);
            
            // Determine file type based on filename and content
            let fileType: 'panorama' | 'csv' | 'config' | 'poi' = 'poi'; // default
            const filename = file.originalFilename.toLowerCase();
            
            if (filename.includes('pano') && (filename.endsWith('.jpg') || filename.endsWith('.jpeg') || filename.endsWith('.png'))) {
              fileType = 'panorama';
            } else if (filename.endsWith('.csv')) {
              fileType = 'csv';
            } else if (filename.endsWith('.json')) {
              fileType = 'config';
            }
            
            filesToUpload.push({
              buffer: fileContent,
              filename: file.originalFilename,
              fileType,
              size: file.size,
              mimetype: file.mimetype
            });
            
            tempFiles.push(file.filepath);
          } catch (readError) {
            console.error(`Failed to read file ${file.originalFilename}:`, readError);
          }
        }
      }
    }

    if (filesToUpload.length === 0) {
      return res.status(400).json({ error: 'No valid files to upload' });
    }

    // Upload all files to S3
    const uploadResults = await batchUploadToS3(
      filesToUpload.map(file => ({
        buffer: file.buffer,
        filename: file.filename,
        fileType: file.fileType
      })),
      projectId
    );
    
    // Clean up temporary files
    for (const tempFile of tempFiles) {
      try {
        await fs.unlink(tempFile);
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary file:', tempFile, cleanupError);
      }
    }

    // Categorize results
    const successful = uploadResults.filter(result => result.success);
    const failed = uploadResults.filter(result => !result.success);
    
    // Group by file type for response
    const resultsByType = {
      panoramas: successful.filter(r => filesToUpload.find(f => f.filename === r.filename)?.fileType === 'panorama'),
      csv: successful.filter(r => filesToUpload.find(f => f.filename === r.filename)?.fileType === 'csv'),
      config: successful.filter(r => filesToUpload.find(f => f.filename === r.filename)?.fileType === 'config'),
      poi: successful.filter(r => filesToUpload.find(f => f.filename === r.filename)?.fileType === 'poi')
    };

    const response = {
      success: failed.length === 0,
      totalFiles: uploadResults.length,
      successfulUploads: successful.length,
      failedUploads: failed.length,
      results: resultsByType,
      errors: failed.map(f => ({ filename: f.filename, error: f.error })),
      summary: {
        panoramas: resultsByType.panoramas.length,
        csv: resultsByType.csv.length,
        config: resultsByType.config.length,
        poi: resultsByType.poi.length
      }
    };

    const statusCode = failed.length > 0 ? 207 : 200; // 207 Multi-Status for partial success
    res.status(statusCode).json(response);

  } catch (error) {
    console.error('Batch upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ 
          error: 'One or more files are too large. Maximum size is 50MB per file.' 
        });
      }
      if (error.message.includes('maxTotalFileSize')) {
        return res.status(413).json({ 
          error: 'Total upload size too large. Maximum total size is 500MB.' 
        });
      }
      if (error.message.includes('filter')) {
        return res.status(415).json({ 
          error: 'One or more files have unsupported file types.' 
        });
      }
    }
    
    res.status(500).json({ 
      error: 'Batch upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}