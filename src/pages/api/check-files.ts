import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const dataDir = path.join(process.cwd(), 'public', 'data');
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    const csvFilePath = path.join(dataDir, 'pano-poses.csv');
    const csvFileExists = fs.existsSync(csvFilePath);

    let imageFiles: string[] = [];
    if (fs.existsSync(imagesDir)) {
      imageFiles = fs.readdirSync(imagesDir).filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
      });
    }

    res.status(200).json({
      csvFile: csvFileExists ? 'pano-poses.csv' : null,
      imageFiles: imageFiles,
      imageCount: imageFiles.length
    });

  } catch (error) {
    console.error('Error checking files:', error);
    res.status(500).json({ error: 'Internal server error while checking files' });
  }
}