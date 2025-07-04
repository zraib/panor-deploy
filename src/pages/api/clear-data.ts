import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

async function deleteDirectoryFiles(dir: string) {
  try {
    if (!fs.existsSync(dir)) {
      console.log(`Directory not found: ${dir}. Nothing to delete.`);
      return;
    }

    const files = await readdir(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const fileStat = await stat(filePath);
      if (fileStat.isFile()) {
        await unlink(filePath);
      }
    }
  } catch (error) {
    console.error(`Error deleting files in directory ${dir}:`, error);
    throw new Error(`Failed to delete files in ${dir}.`);
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const publicDir = path.join(process.cwd(), 'public');
    const imagesDir = path.join(publicDir, 'images');
    const dataDir = path.join(publicDir, 'data');

    await deleteDirectoryFiles(imagesDir);
    await deleteDirectoryFiles(dataDir);

    res.status(200).json({ message: 'All existing panorama data has been cleared.' });

  } catch (error: any) {
    console.error('Error clearing data:', error);
    res.status(500).json({ error: 'Internal server error while clearing data.', details: error.message });
  }
}