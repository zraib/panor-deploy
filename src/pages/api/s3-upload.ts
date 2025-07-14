import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs/promises';
import { uploadToS3 } from '@/lib/aws-s3';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
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
      maxFileSize: 50 * 1024 * 1024, // 50MB limit for panoramas
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
        return allowedTypes.includes(mimetype || '') || 
               Boolean(originalFilename && originalFilename.endsWith('.csv'));
      }
    });

    const [fields, files] = await form.parse(req);
    const fileOrFiles = files.file;
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    const fileType = Array.isArray(fields.fileType) ? fields.fileType[0] : fields.fileType;
    
    if (!fileOrFiles) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Handle single file or array of files
    const file = Array.isArray(fileOrFiles) ? fileOrFiles[0] : fileOrFiles;
    
    if (!file || !file.originalFilename) {
      return res.status(400).json({ error: 'Invalid file data' });
    }
    
    // Read file content
    const fileContent = await fs.readFile(file.filepath);
    
    // Upload to S3 with proper organization
    const result = await uploadToS3(
      fileContent,
      file.originalFilename,
      projectId,
      fileType
    );
    
    // Clean up temporary file
    try {
      await fs.unlink(file.filepath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary file:', cleanupError);
    }
    
    res.status(200).json({
      success: true,
      url: result.url,
      key: result.key,
      filename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (error) {
    console.error('S3 Upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ error: 'File too large. Maximum size is 50MB.' });
      }
      if (error.message.includes('filter')) {
        return res.status(415).json({ error: 'Unsupported file type. Please upload supported file formats.' });
      }
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}