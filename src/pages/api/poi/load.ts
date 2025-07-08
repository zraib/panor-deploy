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
    const { projectId, panoramaId } = req.query;

    if (!projectId || typeof projectId !== 'string') {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const dataFile = getProjectPOIFile(projectId);

    // If file doesn't exist, return empty array
    if (!fs.existsSync(dataFile)) {
      return res.status(200).json({ pois: [] });
    }

    try {
      const fileContent = fs.readFileSync(dataFile, 'utf8');
      let pois: POIData[] = JSON.parse(fileContent);

      // Filter by panoramaId if provided
      if (panoramaId && typeof panoramaId === 'string') {
        pois = pois.filter(poi => poi.panoramaId === panoramaId);
      }

      res.status(200).json({ pois });
    } catch (parseError) {
      console.error('Error parsing POI data:', parseError);
      res.status(500).json({ error: 'Failed to parse POI data' });
    }
  } catch (error) {
    console.error('Load POI error:', error);
    res.status(500).json({ error: 'Failed to load POIs' });
  }
}