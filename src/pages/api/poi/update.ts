import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI directory and file
function getProjectPOIPath(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  const individualDir = path.join(dataDir, 'individual');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Ensure individual directory exists
  if (!fs.existsSync(individualDir)) {
    fs.mkdirSync(individualDir, { recursive: true });
  }
  
  return { dataDir, dataFile, individualDir };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, id, useIndividual, ...updateData } = req.body;

    if (!projectId || !id) {
      return res.status(400).json({ error: 'Missing projectId or POI id' });
    }

    // If using individual files, check if individual POI file exists
    if (useIndividual) {
      const { individualDir } = getProjectPOIPath(projectId);
      const individualFile = path.join(individualDir, `${id}.json`);
      
      if (fs.existsSync(individualFile)) {
        // Update individual file
        const fileContent = fs.readFileSync(individualFile, 'utf-8');
        const existingPOI: POIData = JSON.parse(fileContent);
        
        const updatedPOI = {
          ...existingPOI,
          ...updateData,
          updatedAt: new Date().toISOString()
        };
        
        fs.writeFileSync(individualFile, JSON.stringify(updatedPOI, null, 2));
        
        // Also update the main file for backward compatibility
        const { dataFile } = getProjectPOIPath(projectId);
        if (fs.existsSync(dataFile)) {
          const mainFileContent = fs.readFileSync(dataFile, 'utf-8');
          const existingPOIs: POIData[] = JSON.parse(mainFileContent);
          const poiIndex = existingPOIs.findIndex(poi => poi.id === id);
          
          if (poiIndex >= 0) {
            existingPOIs[poiIndex] = updatedPOI;
            fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2));
          }
        }
        
        return res.status(200).json({
          success: true,
          poi: updatedPOI
        });
      }
    }

    // Legacy: Update in main poi-data.json file
    const { dataFile } = getProjectPOIPath(projectId);

    // Read existing POIs
    if (!fs.existsSync(dataFile)) {
      return res.status(404).json({ error: 'POI data file not found' });
    }

    const fileContent = fs.readFileSync(dataFile, 'utf-8');
    const existingPOIs: POIData[] = JSON.parse(fileContent);

    // Find POI to update
    const poiIndex = existingPOIs.findIndex(poi => poi.id === id);
    if (poiIndex === -1) {
      return res.status(404).json({ error: 'POI not found' });
    }

    // Update POI
    const updatedPOI = {
      ...existingPOIs[poiIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    existingPOIs[poiIndex] = updatedPOI;

    // Write back to file
    fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2));

    res.status(200).json({
      success: true,
      poi: updatedPOI
    });
  } catch (error) {
    console.error('Error updating POI:', error);
    res.status(500).json({ error: 'Failed to update POI' });
  }
}