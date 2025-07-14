import { NextApiRequest, NextApiResponse } from 'next';
import { listProjectFiles, uploadToS3 } from '@/lib/aws-s3';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

// Initialize S3 client for direct operations
const s3Client = new S3Client({
  region: process.env.CLOUD_REGION!,
  credentials: {
    accessKeyId: process.env.CLOUD_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUD_SECRET_ACCESS_KEY!,
  },
});

interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  sceneCount: number;
  hasConfig: boolean;
  firstSceneId?: string;
  poiCount: number;
  floorCount: number;
}

// Helper function to get project metadata from S3
const getProjectMetadata = async (projectId: string) => {
  try {
    const files = await listProjectFiles(projectId);
    const configFiles = files.filter(f => f.key.includes('config.json'));
    const hasConfig = configFiles.length > 0;
    
    let sceneCount = 0;
    let firstSceneId: string | undefined;
    let floorCount = 0;
    
    if (hasConfig) {
      // In a real implementation, you'd fetch and parse the config
      // For now, estimate based on panorama files
      const panoramaFiles = files.filter(f => f.key.includes('panoramas/'));
      sceneCount = panoramaFiles.length;
      firstSceneId = panoramaFiles[0]?.key.split('/').pop()?.replace(/\.[^/.]+$/, '');
    }
    
    // Count POI files
    const poiFiles = files.filter(f => f.key.includes('poi/'));
    const poiCount = poiFiles.length;
    
    // Get creation date from oldest file
    const sortedFiles = files.sort((a, b) => a.lastModified.getTime() - b.lastModified.getTime());
    const createdAt = sortedFiles[0]?.lastModified || new Date();
    const updatedAt = files.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())[0]?.lastModified || new Date();
    
    return {
      sceneCount,
      hasConfig,
      firstSceneId,
      poiCount,
      floorCount,
      createdAt: createdAt.toISOString(),
      updatedAt: updatedAt.toISOString()
    };
  } catch (error) {
    console.error(`Error getting metadata for project ${projectId}:`, error);
    return {
      sceneCount: 0,
      hasConfig: false,
      firstSceneId: undefined,
      poiCount: 0,
      floorCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
};

const getProjectInfo = async (projectId: string): Promise<Project | null> => {
  try {
    // Check if project exists by looking for any files
    const files = await listProjectFiles(projectId);
    if (files.length === 0) {
      return null;
    }
    
    const metadata = await getProjectMetadata(projectId);
    
    return {
      id: projectId,
      name: projectId,
      createdAt: metadata.createdAt,
      updatedAt: metadata.updatedAt,
      sceneCount: metadata.sceneCount,
      hasConfig: metadata.hasConfig,
      firstSceneId: metadata.firstSceneId,
      poiCount: metadata.poiCount,
      floorCount: metadata.floorCount
    };
  } catch (error) {
    console.error(`Error getting project info for ${projectId}:`, error);
    return null;
  }
};

const deleteProjectFromS3 = async (projectId: string): Promise<void> => {
  try {
    const files = await listProjectFiles(projectId);
    
    // Delete all files for this project
    for (const file of files) {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: file.key
      });
      await s3Client.send(deleteCommand);
    }
  } catch (error) {
    console.error(`Error deleting project ${projectId} from S3:`, error);
    throw error;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  
  try {
    switch (method) {
      case 'GET':
        // List all projects from S3
        const listCommand = new ListObjectsV2Command({
          Bucket: process.env.S3_BUCKET_NAME!,
          Prefix: 'projects/',
          Delimiter: '/'
        });
        
        const response = await s3Client.send(listCommand);
        const projects: Project[] = [];
        
        // Extract project IDs from common prefixes
        const projectIds = (response.CommonPrefixes || [])
          .map(prefix => prefix.Prefix?.replace('projects/', '').replace('/', ''))
          .filter(Boolean) as string[];
        
        for (const projectId of projectIds) {
          const projectInfo = await getProjectInfo(projectId);
          if (projectInfo) {
            projects.push(projectInfo);
          }
        }
        
        // Sort by updated date (newest first)
        projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        res.status(200).json({ projects });
        break;
        
      case 'POST':
        // Create a new project
        const { projectName } = req.body;
        
        if (!projectName || typeof projectName !== 'string') {
          return res.status(400).json({ error: 'Project name is required' });
        }
        
        // Sanitize project name
        const sanitizedName = projectName.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
        
        if (!sanitizedName) {
          return res.status(400).json({ error: 'Invalid project name' });
        }
        
        // Check if project already exists
        const existingFiles = await listProjectFiles(sanitizedName);
        if (existingFiles.length > 0) {
          return res.status(409).json({ error: 'Project already exists' });
        }
        
        // Create a placeholder file to establish the project in S3
        const placeholderContent = JSON.stringify({
          projectId: sanitizedName,
          createdAt: new Date().toISOString(),
          version: '1.0.0'
        }, null, 2);
        
        await uploadToS3(
          Buffer.from(placeholderContent),
          'project.json',
          sanitizedName,
          'config'
        );
        
        const newProject = await getProjectInfo(sanitizedName);
        
        res.status(201).json({ project: newProject });
        break;
        
      case 'DELETE':
        // Delete a project
        const { projectId } = req.query;
        
        if (!projectId || typeof projectId !== 'string') {
          return res.status(400).json({ error: 'Project ID is required' });
        }
        
        // Check if project exists
        const projectFiles = await listProjectFiles(projectId);
        if (projectFiles.length === 0) {
          return res.status(404).json({ error: 'Project not found' });
        }
        
        await deleteProjectFromS3(projectId);
        
        res.status(200).json({ message: 'Project deleted successfully' });
        break;
        
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ error: `Method ${method} not allowed` });
    }
  } catch (error: any) {
    console.error('Projects API error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}