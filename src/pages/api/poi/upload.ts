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
        // Allow images, PDFs, and videos
        const allowedTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'application/pdf',
          'video/mp4',
          'video/webm'
        ];
        return allowedTypes.includes(mimetype || '');
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

    // Move the file
    fs.renameSync(file.filepath, finalPath);

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
        return res.status(415).json({ error: 'Unsupported file type.' });
      }
    }
    
    res.status(500).json({ error: 'Upload failed' });
  }
}