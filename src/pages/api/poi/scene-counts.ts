import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';

// Helper function to get project-specific POI file
function getProjectPOIFile(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const dataFile = path.join(dataDir, 'poi-data.json');
  return dataFile;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const dataFile = getProjectPOIFile(projectId);

    // Check if POI data file exists
    if (!fs.existsSync(dataFile)) {
      return res.status(200).json({ sceneCounts: {} });
    }

    // Read and parse POI data
    const fileContent = fs.readFileSync(dataFile, 'utf8');
    const pois: POIData[] = JSON.parse(fileContent);

    // Count POIs per scene
    const sceneCounts: Record<string, number> = {};
    pois.forEach(poi => {
      if (poi.panoramaId) {
        sceneCounts[poi.panoramaId] = (sceneCounts[poi.panoramaId] || 0) + 1;
      }
    });

    res.status(200).json({ sceneCounts });
  } catch (error) {
    console.error('Error loading POI scene counts:', error);
    res.status(500).json({ error: 'Failed to load POI scene counts' });
  }
}