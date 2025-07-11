import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
import archiver from 'archiver';
import { POIData } from '../../../types/poi';

interface ExportAllRequest {
  projectId: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const projectId = Array.isArray(req.query.projectId) 
      ? req.query.projectId[0] 
      : req.query.projectId;

    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Get project POI directory
    const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
    const poiDataPath = path.join(dataDir, 'poi-data.json');
    const attachmentsDir = path.join(dataDir, 'attachments');

    // Check if POI data exists
    if (!fs.existsSync(poiDataPath)) {
      return res.status(404).json({ error: 'No POI data found for this project' });
    }

    // Read POI data
    const poiDataContent = fs.readFileSync(poiDataPath, 'utf8');
    let pois: POIData[];
    
    try {
      pois = JSON.parse(poiDataContent);
      if (!Array.isArray(pois)) {
        return res.status(400).json({ error: 'Invalid POI data format' });
      }
    } catch (parseError) {
      return res.status(400).json({ error: 'Failed to parse POI data' });
    }

    if (pois.length === 0) {
      return res.status(404).json({ error: 'No POIs found in this project' });
    }

    // Set response headers for ZIP download
    const filename = `${projectId}-all-pois-export.zip`;
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive errors
    archive.on('error', (err) => {
      console.error('Archive error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create export archive' });
      }
    });

    // Pipe archive to response
    archive.pipe(res);

    // Add poi-data.json to the archive
    archive.append(JSON.stringify(pois, null, 2), { name: 'poi-data.json' });

    // Track which attachment files we've added to avoid duplicates
    const addedAttachments = new Set<string>();

    // Add attachment files for POIs that have them
    for (const poi of pois) {
      if (poi.type === 'file' && poi.content && !addedAttachments.has(poi.content)) {
        const attachmentPath = path.join(attachmentsDir, poi.content);
        
        if (fs.existsSync(attachmentPath)) {
          try {
            const attachmentBuffer = fs.readFileSync(attachmentPath);
            archive.append(attachmentBuffer, { name: `attachments/${poi.content}` });
            addedAttachments.add(poi.content);
          } catch (fileError) {
            console.warn(`Failed to read attachment file: ${poi.content}`, fileError);
            // Continue with other files instead of failing the entire export
          }
        } else {
          console.warn(`Attachment file not found: ${attachmentPath}`);
        }
      }
    }

    // Finalize the archive
    await archive.finalize();

  } catch (error) {
    console.error('Export all POIs error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Failed to export POIs',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}