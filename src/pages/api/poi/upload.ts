import { NextApiRequest, NextApiResponse } from 'next';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';

// Disable body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get project-specific upload directory
function getProjectUploadDir(projectId: string) {
  const uploadDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi', 'attachments');
  
  // Ensure upload directory exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  return uploadDir;
}

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
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: ({ mimetype }) => {
        return [
          'image/jpeg',
          'image/jpg', 
          'image/png',
          'image/gif',
          'application/pdf',
          'video/mp4',
          'video/webm'
        ].includes(mimetype || '');
      }
    });

    const [fields, files] = await form.parse(req);
    
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    const uploadDir = getProjectUploadDir(projectId);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    const filename = Array.isArray(fields.filename) ? fields.filename[0] : fields.filename;
    
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!filename) {
      return res.status(400).json({ error: 'No filename provided' });
    }

    // Move file to final location with the specified filename
    const finalPath = path.join(uploadDir, filename);
    
    // Check if file already exists
    if (fs.existsSync(finalPath)) {
      // Remove the temporary file
      fs.unlinkSync(file.filepath);
      return res.status(409).json({ error: 'File already exists' });
    }

    // Move the file (handle cross-drive moves)
    try {
      fs.renameSync(file.filepath, finalPath);
    } catch (renameError: any) {
      // If rename fails (e.g., cross-drive move), copy and delete
      if (renameError.code === 'EXDEV') {
        fs.copyFileSync(file.filepath, finalPath);
        fs.unlinkSync(file.filepath);
      } else {
        throw renameError;
      }
    }

    res.status(200).json({
      success: true,
      filename,
      size: file.size,
      mimetype: file.mimetype
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('maxFileSize')) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
      if (error.message.includes('filter')) {
        return res.status(415).json({ error: 'Unsupported file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).' });
      }
    }
    
    // Check for formidable error codes
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 1003) {
        return res.status(415).json({ 
          error: 'Unsupported file type. Please upload images (JPG, PNG, GIF), PDFs, or videos (MP4, WebM).',
          details: 'The file type was not recognized as a valid media file.'
        });
      }
      if (error.code === 1009) {
        return res.status(413).json({ error: 'File too large. Maximum size is 10MB.' });
      }
    }
    
    res.status(500).json({ 
      error: 'Upload failed',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
}