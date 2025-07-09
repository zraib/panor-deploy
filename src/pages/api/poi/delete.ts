import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI directory and file
function getProjectPOIPath(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  const attachmentsDir = path.join(dataDir, 'attachments');
  
  return { dataDir, dataFile, attachmentsDir };
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
    const { projectId, poiId } = req.body;

    // Validate required fields
    console.log('POI Delete API - Received data:', { projectId, poiId });
    
    if (!projectId) {
      console.log('Missing projectId');
      return res.status(400).json({ error: 'Missing projectId' });
    }
    if (!poiId) {
      console.log('Missing poiId');
      return res.status(400).json({ error: 'Missing poiId' });
    }

    const { dataFile } = getProjectPOIPath(projectId);

    // Read existing POI data
    let existingPOIs: POIData[] = [];
    if (fs.existsSync(dataFile)) {
      try {
        const fileContent = fs.readFileSync(dataFile, 'utf8');
        const parsedData = JSON.parse(fileContent);
        existingPOIs = Array.isArray(parsedData) ? parsedData : [];
      } catch (parseError) {
        console.error('Error parsing existing POI data:', parseError);
        return res.status(500).json({ error: 'Failed to parse existing POI data' });
      }
    }

    // Find the POI to delete
    const poiToDelete = existingPOIs.find(poi => poi.id === poiId);
    if (!poiToDelete) {
      return res.status(404).json({ error: 'POI not found' });
    }

    // Delete associated file if it exists
    deleteAssociatedFile(projectId, poiToDelete);

    // Remove the POI from the array
    const updatedPOIs = existingPOIs.filter(poi => poi.id !== poiId);

    // Write updated data back to file
    try {
      fs.writeFileSync(dataFile, JSON.stringify(updatedPOIs, null, 2));
      console.log('POI deleted successfully:', poiId);
      
      return res.status(200).json({ 
        message: 'POI deleted successfully', 
        deletedPOI: poiToDelete 
      });
    } catch (writeError) {
      console.error('Error writing POI data:', writeError);
      return res.status(500).json({ error: 'Failed to save POI data' });
    }

  } catch (error) {
    console.error('POI Delete API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}