import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { POIData } from '@/types/poi';
import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import AdmZip from 'adm-zip';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get project-specific POI paths
function getProjectPOIPaths(projectId: string) {
  const dataDir = path.join(process.cwd(), 'public', projectId, 'data', 'poi');
  const filesDir = path.join(dataDir, 'files');
  const dataFile = path.join(dataDir, 'poi-data.json');
  
  // Ensure directories exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(filesDir)) {
    fs.mkdirSync(filesDir, { recursive: true });
  }
  
  return { dataDir, filesDir, dataFile };
}

function validatePOIData(poi: any): poi is POIData {
  return (
    poi &&
    typeof poi.id === 'string' &&
    typeof poi.panoramaId === 'string' &&
    typeof poi.name === 'string' &&
    typeof poi.description === 'string' &&
    poi.position &&
    typeof poi.position.yaw === 'number' &&
    typeof poi.position.pitch === 'number' &&
    ['file', 'iframe'].includes(poi.type) &&
    typeof poi.content === 'string' &&
    typeof poi.createdAt === 'string' &&
    typeof poi.updatedAt === 'string'
  );
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const form = formidable({
      maxFileSize: 50 * 1024 * 1024, // 50MB limit
      keepExtensions: true,
    });

    const [fields, files] = await form.parse(req);
    
    const projectId = Array.isArray(fields.projectId) ? fields.projectId[0] : fields.projectId;
    const overwrite = Array.isArray(fields.overwrite) ? fields.overwrite[0] === 'true' : fields.overwrite === 'true';
    const generateNewId = Array.isArray(fields.generateNewId) ? fields.generateNewId[0] === 'true' : fields.generateNewId === 'true';
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!uploadedFile) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { dataDir, filesDir, dataFile } = getProjectPOIPaths(projectId);

    let poiData: POIData;
    let attachmentFiles: { originalName: string; content: Buffer }[] = [];

    // Determine file type and process accordingly
    const fileExtension = path.extname(uploadedFile.originalFilename || '').toLowerCase();
    
    if (fileExtension === '.zip') {
      // Handle ZIP file import
      const zip = new AdmZip(uploadedFile.filepath);
      const entries = zip.getEntries();
      
      let poiJsonEntry = entries.find((entry: any) => entry.entryName === 'poi-data.json');
      if (!poiJsonEntry) {
        return res.status(400).json({ error: 'Invalid POI package: poi-data.json not found' });
      }
      
      const poiJsonContent = poiJsonEntry.getData().toString('utf8');
      const poiArray = JSON.parse(poiJsonContent);
      
      // Handle both single POI and array formats
      let targetPOI: POIData;
      if (Array.isArray(poiArray)) {
        if (poiArray.length === 0) {
          return res.status(400).json({ error: 'No POI data found in the file' });
        }
        // Take the first POI from the array
        targetPOI = poiArray[0];
      } else if (poiArray.poi && validatePOIData(poiArray.poi)) {
        // Legacy format with poi wrapper
        targetPOI = poiArray.poi;
      } else if (validatePOIData(poiArray)) {
        // Direct POI object
        targetPOI = poiArray;
      } else {
        return res.status(400).json({ error: 'Invalid POI data structure' });
      }
      
      if (!validatePOIData(targetPOI)) {
        return res.status(400).json({ error: 'Invalid POI data structure' });
      }
      
      poiData = targetPOI;
      
      // Extract attachment files
      const attachmentEntries = entries.filter((entry: any) => entry.entryName.startsWith('attachments/'));
      for (const entry of attachmentEntries) {
        const fileName = path.basename(entry.entryName);
        attachmentFiles.push({
          originalName: fileName,
          content: entry.getData()
        });
      }
    } else if (fileExtension === '.json') {
      // Handle JSON file import
      const jsonContent = fs.readFileSync(uploadedFile.filepath, 'utf8');
      const poiPackage = JSON.parse(jsonContent);
      
      if (poiPackage.poi && validatePOIData(poiPackage.poi)) {
        poiData = poiPackage.poi;
      } else if (validatePOIData(poiPackage)) {
        poiData = poiPackage;
      } else {
        return res.status(400).json({ error: 'Invalid POI data structure' });
      }
    } else {
      return res.status(400).json({ error: 'Unsupported file format. Please upload a .json or .zip file' });
    }

    // Generate new ID if requested
    if (generateNewId) {
      poiData.id = uuidv4();
    }

    // Update timestamps
    poiData.updatedAt = new Date().toISOString();

    // Read existing POIs
    let existingPOIs: POIData[] = [];
    if (fs.existsSync(dataFile)) {
      try {
        const fileContent = fs.readFileSync(dataFile, 'utf8');
        existingPOIs = JSON.parse(fileContent);
      } catch (parseError) {
        console.error('Error parsing existing POI data:', parseError);
        existingPOIs = [];
      }
    }

    // Check for existing POI with same ID
    const existingIndex = existingPOIs.findIndex(poi => poi.id === poiData.id);
    
    if (existingIndex !== -1 && !overwrite) {
      return res.status(409).json({ 
        error: 'POI with this ID already exists',
        existingPOI: existingPOIs[existingIndex]
      });
    }

    // Handle file attachments
    if (attachmentFiles.length > 0 && poiData.type === 'file') {
      const attachmentFile = attachmentFiles[0]; // Use first attachment
      const newFileName = `${uuidv4()}_${attachmentFile.originalName}`;
      const attachmentPath = path.join(filesDir, newFileName);
      
      fs.writeFileSync(attachmentPath, attachmentFile.content);
      poiData.content = newFileName;
    }

    // Add or update POI
    if (existingIndex !== -1) {
      existingPOIs[existingIndex] = poiData;
    } else {
      existingPOIs.push(poiData);
    }

    // Save updated POI data
    fs.writeFileSync(dataFile, JSON.stringify(existingPOIs, null, 2), 'utf8');

    res.status(200).json({ 
      success: true, 
      poi: poiData,
      message: existingIndex !== -1 ? 'POI updated successfully' : 'POI imported successfully'
    });

  } catch (error) {
    console.error('Import single POI error:', error);
    res.status(500).json({ error: 'Failed to import POI' });
  }
}