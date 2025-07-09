import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI directory and file
function getProjectPOIPath(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return { dataDir, dataFile };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, ...updatedPOI }: POIData & { projectId: string } = req.body;

    // Validate required fields
    console.log('POI Update API - Received data:', { projectId, updatedPOI });
    
    if (!projectId) {
      console.log('Missing projectId');
      return res.status(400).json({ error: 'Missing projectId' });
    }
    if (!updatedPOI.id) {
      console.log('Missing POI id');
      return res.status(400).json({ error: 'Missing POI id' });
    }
    if (!updatedPOI.panoramaId) {
      console.log('Missing panoramaId');
      return res.status(400).json({ error: 'Missing panoramaId' });
    }
    if (!updatedPOI.name || !updatedPOI.name.trim()) {
      console.log('Missing or empty POI name');
      return res.status(400).json({ error: 'POI name is required' });
    }
    if (!updatedPOI.position || typeof updatedPOI.position.yaw !== 'number' || typeof updatedPOI.position.pitch !== 'number') {
      console.log('Invalid POI position');
      return res.status(400).json({ error: 'Valid POI position is required' });
    }
    if (!updatedPOI.type || !['file', 'iframe'].includes(updatedPOI.type)) {
      console.log('Invalid POI type');
      return res.status(400).json({ error: 'Valid POI type is required' });
    }
    if (!updatedPOI.content || !updatedPOI.content.trim()) {
      console.log('Missing POI content');
      return res.status(400).json({ error: 'POI content is required' });
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

    // Find and update the POI
    const poiIndex = existingPOIs.findIndex(poi => poi.id === updatedPOI.id);
    if (poiIndex === -1) {
      return res.status(404).json({ error: 'POI not found' });
    }

    // Update the POI while preserving createdAt
    existingPOIs[poiIndex] = {
      ...updatedPOI,
      createdAt: existingPOIs[poiIndex].createdAt, // Preserve original creation date
      updatedAt: new Date().toISOString() // Update the modification date
    };

    // Write updated data back to file
    try {
      fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2));
      console.log('POI updated successfully:', updatedPOI.id);
      
      return res.status(200).json({ 
        message: 'POI updated successfully', 
        poi: existingPOIs[poiIndex] 
      });
    } catch (writeError) {
      console.error('Error writing POI data:', writeError);
      return res.status(500).json({ error: 'Failed to save POI data' });
    }

  } catch (error) {
    console.error('POI Update API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}