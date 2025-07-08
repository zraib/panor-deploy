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
    const { projectId, ...newPOI }: POIData & { projectId: string } = req.body;

    // Validate required fields
    if (!projectId || !newPOI.id || !newPOI.panoramaId || !newPOI.name || !newPOI.position) {
      return res.status(400).json({ error: 'Missing required fields (including projectId)' });
    }

    // Validate position
    if (
      typeof newPOI.position.yaw !== 'number' ||
      typeof newPOI.position.pitch !== 'number' ||
      newPOI.position.yaw < -180 ||
      newPOI.position.yaw > 180 ||
      newPOI.position.pitch < -90 ||
      newPOI.position.pitch > 90
    ) {
      return res.status(400).json({ error: 'Invalid position coordinates' });
    }

    // Validate type
    if (!['file', 'iframe'].includes(newPOI.type)) {
      return res.status(400).json({ error: 'Invalid POI type' });
    }

    // Get project-specific paths
    const { dataFile } = getProjectPOIPath(projectId);

    // Read existing POIs
    let existingPOIs: POIData[] = [];
    if (fs.existsSync(dataFile)) {
      try {
        const fileContent = fs.readFileSync(dataFile, 'utf8');
        existingPOIs = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing existing POI data:', parseError);
        // If file is corrupted, start with empty array
        existingPOIs = [];
      }
    }

    // Check for duplicate ID
    if (existingPOIs.some(poi => poi.id === newPOI.id)) {
      return res.status(409).json({ error: 'POI with this ID already exists' });
    }

    // Add new POI
    existingPOIs.push(newPOI);

    // Write back to file
    fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      poi: newPOI
    });
  } catch (error) {
    console.error('Save POI error:', error);
    res.status(500).json({ error: 'Failed to save POI' });
  }
}