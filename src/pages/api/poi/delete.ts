import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI directory and file
function getProjectPOIPath(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  const attachmentsDir = path.join(dataDir, 'attachments');
  const individualDir = path.join(dataDir, 'individual');
  const filesDir = path.join(dataDir, 'files');
  
  return { dataDir, dataFile, attachmentsDir, individualDir, filesDir };
}

// Helper function to delete associated file if it exists
function deleteAssociatedFile(projectId: string, poi: POIData) {
  if (poi.type === 'file' && poi.content) {
    const { attachmentsDir } = getProjectPOIPath(projectId);
    const filePath = path.join(attachmentsDir, poi.content);
    
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log('Deleted associated file:', filePath);
      } catch (error) {
        console.warn('Failed to delete associated file:', filePath, error);
      }
    }
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const projectId = Array.isArray(req.query.projectId) 
      ? req.query.projectId[0] 
      : req.query.projectId;
    const id = Array.isArray(req.query.id) 
      ? req.query.id[0] 
      : req.query.id;
    const useIndividual = Array.isArray(req.query.useIndividual) 
      ? req.query.useIndividual[0] 
      : req.query.useIndividual;

    if (!projectId || !id) {
      return res.status(400).json({ error: 'Missing projectId or POI id' });
    }

    const { dataFile, individualDir, filesDir } = getProjectPOIPath(projectId);
    let deletedPOI: POIData | null = null;

    // If using individual files, delete individual POI file
    if (useIndividual === 'true') {
      const individualFile = path.join(individualDir, `${id}.json`);
      
      if (fs.existsSync(individualFile)) {
        // Read POI data before deletion
        const fileContent = fs.readFileSync(individualFile, 'utf-8');
        deletedPOI = JSON.parse(fileContent);
        
        // Delete individual POI file
        fs.unlinkSync(individualFile);
        
        // Delete associated files if they exist
        if (deletedPOI && deletedPOI.type === 'file' && deletedPOI.content) {
          const attachmentPath = path.join(filesDir, deletedPOI.content);
          if (fs.existsSync(attachmentPath)) {
            fs.unlinkSync(attachmentPath);
          }
        }
        
        // Update POI index
        const indexFile = path.join(individualDir, 'poi-index.json');
        if (fs.existsSync(indexFile)) {
          const indexContent = fs.readFileSync(indexFile, 'utf-8');
          const index = JSON.parse(indexContent);
          index.pois = index.pois.filter((poiId: string) => poiId !== id);
          index.lastUpdated = new Date().toISOString();
          fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
        }
      }
    }

    // Also remove from main file for backward compatibility
    if (fs.existsSync(dataFile)) {
      const fileContent = fs.readFileSync(dataFile, 'utf-8');
      const existingPOIs: POIData[] = JSON.parse(fileContent);

      // Find POI to delete
      const poiIndex = existingPOIs.findIndex(poi => poi.id === id);
      if (poiIndex >= 0) {
        if (!deletedPOI) {
          deletedPOI = existingPOIs[poiIndex];
        }
        
        // Remove POI
        existingPOIs.splice(poiIndex, 1);

        // Write back to file
        fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2));
      }
    }

    if (!deletedPOI) {
      return res.status(404).json({ error: 'POI not found' });
    }

    // TypeScript assertion: deletedPOI is guaranteed to be non-null here
    const confirmedDeletedPOI: POIData = deletedPOI;

    res.status(200).json({
      success: true,
      deletedPOI: confirmedDeletedPOI
    });
  } catch (error) {
    console.error('Error deleting POI:', error);
    res.status(500).json({ error: 'Failed to delete POI' });
  }
}