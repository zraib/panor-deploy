import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { projectId } = req.query;
  
  if (!projectId || typeof projectId !== 'string') {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  try {
    const projectDir = path.join(process.cwd(), 'public', projectId);
    const configPath = path.join(projectDir, 'config.json');
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Project configuration not found' });
    }
    
    const configData = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configData);
    
    // Add project metadata
    const response = {
      ...config,
      projectId,
      projectPath: `/${projectId}`
    };
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('Config API error:', error);
    
    if (error instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid configuration file format' });
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}