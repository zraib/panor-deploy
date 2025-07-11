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
    const { projectId, useIndividual, ...newPOI }: POIData & { projectId: string; useIndividual?: boolean } = req.body;

    // Validate required fields
    console.log('POI Save API - Received data:', { projectId, newPOI, useIndividual });
    
    if (!projectId) {
      console.log('Missing projectId');
      return res.status(400).json({ error: 'Missing projectId' });
    }
    if (!newPOI.id) {
      console.log('Missing POI id');
      return res.status(400).json({ error: 'Missing POI id' });
    }
    if (!newPOI.panoramaId) {
      console.log('Missing panoramaId');
      return res.status(400).json({ error: 'Missing panoramaId' });
    }
    if (!newPOI.name) {
      console.log('Missing POI name');
      return res.status(400).json({ error: 'Missing POI name' });
    }
    if (!newPOI.description) {
      console.log('Missing POI description');
      return res.status(400).json({ error: 'Missing POI description' });
    }
    if (!newPOI.position) {
      console.log('Missing POI position');
      return res.status(400).json({ error: 'Missing POI position' });
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

    // Add timestamps
    const poiWithTimestamps = {
      ...newPOI,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If using individual files, delegate to save-individual endpoint
    if (useIndividual) {
      const saveIndividualResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/poi/save-individual`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ projectId, ...poiWithTimestamps })
      });
      
      if (saveIndividualResponse.ok) {
        const result = await saveIndividualResponse.json();
        return res.status(201).json(result);
      } else {
        throw new Error('Failed to save individual POI file');
      }
    }

    // Legacy: Save to single poi-data.json file
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
    if (existingPOIs.some(poi => poi.id === poiWithTimestamps.id)) {
      return res.status(409).json({ error: 'POI with this ID already exists' });
    }

    // Add new POI
    existingPOIs.push(poiWithTimestamps);

    // Write back to file
    fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2), 'utf8');

    res.status(201).json({
      success: true,
      poi: poiWithTimestamps
    });
  } catch (error) {
    console.error('Save POI error:', error);
    res.status(500).json({ error: 'Failed to save POI' });
  }
}