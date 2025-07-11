import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';
import archiver from 'archiver';

// Helper function to get project-specific POI file
function getProjectPOIFile(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  return { dataDir, dataFile };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, poiId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    if (!poiId || typeof poiId !== 'string') {
      return res.status(400).json({ error: 'POI ID is required' });
    }

    const { dataDir, dataFile } = getProjectPOIFile(projectId);

    // Check if POI data file exists
    if (!fs.existsSync(dataFile)) {
      return res.status(404).json({ error: 'No POIs found for this project' });
    }

    // Read and find the specific POI
    const fileContent = fs.readFileSync(dataFile, 'utf8');
    const pois: POIData[] = JSON.parse(fileContent);
    const poi = pois.find(p => p.id === poiId);

    if (!poi) {
      return res.status(404).json({ error: 'POI not found' });
    }

    // Create a ZIP file that contains the folder structure like the project's POI directory
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="poi-${poi.name.replace(/[^a-zA-Z0-9]/g, '_')}-${poiId.substring(0, 8)}.zip"`);
    
    archive.pipe(res);
    
    // Create poi-data.json containing only this POI (as an array for consistency)
    const poiDataContent = [poi];
    archive.append(JSON.stringify(poiDataContent, null, 2), { name: 'poi-data.json' });
    
    // Add file attachment if it exists
    if (poi.type === 'file' && poi.content) {
      const attachmentPath = path.join(dataDir, 'attachments', poi.content);
      if (fs.existsSync(attachmentPath)) {
        // Create attachments folder structure in the ZIP
        archive.file(attachmentPath, { name: `attachments/${poi.content}` });
      }
    }
    
    archive.finalize();

  } catch (error) {
    console.error('Export single POI error:', error);
    res.status(500).json({ error: 'Failed to export POI' });
  }
}