import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI paths
function getProjectPOIPaths(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const individualDir = path.join(dataDir, 'individual');
  const filesDir = path.join(dataDir, 'files');
  const indexFile = path.join(dataDir, 'poi-index.json');
  
  // Ensure directories exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(individualDir)) {
    fs.mkdirSync(individualDir, { recursive: true });
  }
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  
  return { dataDir, individualDir, filesDir, indexFile };
}

// Helper function to update POI index
function updatePOIIndex(indexFile: string, poi: POIData, action: 'add' | 'update' | 'delete') {
  let index: { [key: string]: { name: string; panoramaId: string; type: string; updatedAt: string } } = {};
  
  if (fs.existsSync(indexFile)) {
    try {
      const indexContent = fs.readFileSync(indexFile, 'utf8');
      index = JSON.parse(indexContent);
    } catch (error) {
      console.error('Error reading POI index:', error);
      index = {};
    }
  }
  
  if (action === 'delete') {
    delete index[poi.id];
  } else {
    index[poi.id] = {
      name: poi.name,
      panoramaId: poi.panoramaId,
      type: poi.type,
      updatedAt: poi.updatedAt
    };
  }
  
  fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
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
    console.log('POI Save Individual API - Received data:', { projectId, newPOI });
    
    if (!projectId) {
      return res.status(400).json({ error: 'Missing projectId' });
    }
    if (!newPOI.id) {
      return res.status(400).json({ error: 'Missing POI id' });
    }
    if (!newPOI.panoramaId) {
      return res.status(400).json({ error: 'Missing panoramaId' });
    }
    if (!newPOI.name) {
      return res.status(400).json({ error: 'Missing POI name' });
    }
    if (!newPOI.description) {
      return res.status(400).json({ error: 'Missing POI description' });
    }
    if (!newPOI.position) {
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

    // Get project-specific paths
    const { individualDir, indexFile } = getProjectPOIPaths(projectId);

    // Create individual POI file
    const poiFileName = `${newPOI.id}.json`;
    const poiFilePath = path.join(individualDir, poiFileName);
    
    // Check if POI already exists
    const isUpdate = fs.existsSync(poiFilePath);
    
    // Create POI package with metadata
    const poiPackage = {
      poi: newPOI,
      metadata: {
        createdAt: isUpdate ? undefined : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        projectId: projectId,
        version: '1.0.0'
      }
    };
    
    // If updating, preserve original creation date
    if (isUpdate) {
      try {
        const existingContent = fs.readFileSync(poiFilePath, 'utf8');
        const existingPackage = JSON.parse(existingContent);
        if (existingPackage.metadata?.createdAt) {
          poiPackage.metadata.createdAt = existingPackage.metadata.createdAt;
        }
      } catch (error) {
        console.error('Error reading existing POI file:', error);
      }
    }

    // Write individual POI file
    fs.writeFileSync(poiFilePath, JSON.stringify(poiPackage, null, 2), 'utf8');
    
    // Update POI index
    updatePOIIndex(indexFile, newPOI, isUpdate ? 'update' : 'add');
    
    // Also maintain backward compatibility with the main poi-data.json
    const mainDataFile = path.join(path.dirname(individualDir), 'poi-data.json');
    let existingPOIs: POIData[] = [];
    
    if (fs.existsSync(mainDataFile)) {
      try {
        const fileContent = fs.readFileSync(mainDataFile, 'utf8');
        existingPOIs = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing existing POI data:', parseError);
        existingPOIs = [];
      }
    }
    
    // Update or add POI in main file
    const existingIndex = existingPOIs.findIndex(poi => poi.id === newPOI.id);
    if (existingIndex !== -1) {
      existingPOIs[existingIndex] = newPOI;
    } else {
      existingPOIs.push(newPOI);
    }
    
    fs.writeFileSync(mainDataFile, JSON.stringify(existingPOIs, null, 2), 'utf8');

    console.log(`POI ${isUpdate ? 'updated' : 'saved'} successfully:`, {
      id: newPOI.id,
      name: newPOI.name,
      individualFile: poiFilePath
    });

    res.status(200).json({ 
      success: true, 
      poi: newPOI,
      isUpdate,
      individualFile: poiFileName
    });

  } catch (error) {
    console.error('Save individual POI error:', error);
    res.status(500).json({ error: 'Failed to save POI' });
  }
}