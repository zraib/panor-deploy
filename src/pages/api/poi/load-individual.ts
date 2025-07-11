import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI paths
function getProjectPOIPaths(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const individualDir = path.join(dataDir, 'individual');
  const indexFile = path.join(dataDir, 'poi-index.json');
  
  return { dataDir, individualDir, indexFile };
}

// Helper function to load POI from individual file
function loadIndividualPOI(individualDir: string, poiId: string): POIData | null {
  const poiFilePath = path.join(individualDir, `${poiId}.json`);
  
  if (!fs.existsSync(poiFilePath)) {
    return null;
  }
  
  try {
    const fileContent = fs.readFileSync(poiFilePath, 'utf8');
    const poiPackage = JSON.parse(fileContent);
    return poiPackage.poi || poiPackage; // Support both packaged and direct POI format
  } catch (error) {
    console.error(`Error loading individual POI ${poiId}:`, error);
    return null;
  }
}

// Helper function to load all individual POIs
function loadAllIndividualPOIs(individualDir: string): POIData[] {
  if (!fs.existsSync(individualDir)) {
    return [];
  }
  
  const pois: POIData[] = [];
  const files = fs.readdirSync(individualDir);
  
  for (const file of files) {
    if (path.extname(file) === '.json') {
      const poiId = path.basename(file, '.json');
      const poi = loadIndividualPOI(individualDir, poiId);
      if (poi) {
        pois.push(poi);
      }
    }
  }
  
  return pois;
}

// Helper function to migrate from main file to individual files
function migrateToIndividualFiles(projectId: string): boolean {
  const { dataDir, individualDir, indexFile } = getProjectPOIPaths(projectId);
  const mainDataFile = path.join(dataDir, 'poi-data.json');
  
  // Check if migration is needed
  if (!fs.existsSync(mainDataFile) || fs.existsSync(indexFile)) {
    return false; // No migration needed
  }
  
  try {
    const fileContent = fs.readFileSync(mainDataFile, 'utf8');
    const pois: POIData[] = JSON.parse(fileContent);
    
    // Ensure individual directory exists
    if (!fs.existsSync(individualDir)) {
      fs.mkdirSync(individualDir, { recursive: true });
    }
    
    // Create individual files and index
    const index: { [key: string]: { name: string; panoramaId: string; type: string; updatedAt: string } } = {};
    
    for (const poi of pois) {
      // Create individual POI file
      const poiPackage = {
        poi: poi,
        metadata: {
          createdAt: poi.createdAt,
          updatedAt: poi.updatedAt,
          projectId: projectId,
          version: '1.0.0',
          migratedAt: new Date().toISOString()
        }
      };
      
      const poiFilePath = path.join(individualDir, `${poi.id}.json`);
      fs.writeFileSync(poiFilePath, JSON.stringify(poiPackage, null, 2), 'utf8');
      
      // Add to index
      index[poi.id] = {
        name: poi.name,
        panoramaId: poi.panoramaId,
        type: poi.type,
        updatedAt: poi.updatedAt
      };
    }
    
    // Write index file
    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2), 'utf8');
    
    console.log(`Migrated ${pois.length} POIs to individual files for project ${projectId}`);
    return true;
  } catch (error) {
    console.error('Migration error:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId, poiId, panoramaId, useIndividual } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const { dataDir, individualDir, indexFile } = getProjectPOIPaths(projectId);
    
    // Check if we should use individual file structure
    const shouldUseIndividual = useIndividual === 'true' || fs.existsSync(indexFile);
    
    if (shouldUseIndividual) {
      // Try migration first if needed
      migrateToIndividualFiles(projectId);
      
      if (poiId && typeof poiId === 'string') {
        // Load specific POI
        const poi = loadIndividualPOI(individualDir, poiId);
        if (!poi) {
          return res.status(404).json({ error: 'POI not found' });
        }
        return res.status(200).json({ poi, source: 'individual' });
      } else {
        // Load all POIs or filter by panoramaId
        let pois = loadAllIndividualPOIs(individualDir);
        
        if (panoramaId && typeof panoramaId === 'string') {
          pois = pois.filter(poi => poi.panoramaId === panoramaId);
        }
        
        return res.status(200).json({ pois, source: 'individual', count: pois.length });
      }
    } else {
      // Fallback to main file (backward compatibility)
      const mainDataFile = path.join(dataDir, 'poi-data.json');
      
      if (!fs.existsSync(mainDataFile)) {
        return res.status(200).json({ pois: [], source: 'main' });
      }
      
      try {
        const fileContent = fs.readFileSync(mainDataFile, 'utf8');
        let pois: POIData[] = JSON.parse(fileContent);
        
        if (poiId && typeof poiId === 'string') {
          const poi = pois.find(p => p.id === poiId);
          if (!poi) {
            return res.status(404).json({ error: 'POI not found' });
          }
          return res.status(200).json({ poi, source: 'main' });
        }
        
        // Filter by panoramaId if provided
        if (panoramaId && typeof panoramaId === 'string') {
          pois = pois.filter(poi => poi.panoramaId === panoramaId);
        }
        
        return res.status(200).json({ pois, source: 'main' });
      } catch (parseError) {
        console.error('Error parsing POI data:', parseError);
        return res.status(500).json({ error: 'Failed to parse POI data' });
      }
    }

  } catch (error) {
    console.error('Load individual POI error:', error);
    res.status(500).json({ error: 'Failed to load POIs' });
  }
}