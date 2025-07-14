import { NextApiRequest, NextApiResponse } from 'next';
import { uploadToS3, listProjectFiles } from '@/lib/aws-s3';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { projectId } = req.body;
    
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }

    // Check if CSV file exists in S3
    const csvFiles = await listProjectFiles(projectId, 'csv');
    const csvFile = csvFiles.find(file => file.key.endsWith('.csv'));
    
    if (!csvFile) {
      return res.status(400).json({ 
        error: 'CSV file not found. Please upload pano-poses.csv first.' 
      });
    }

    // Check if panorama images exist
    const panoramaFiles = await listProjectFiles(projectId, 'panorama');
    
    if (panoramaFiles.length === 0) {
      return res.status(400).json({ 
        error: 'No panorama images found. Please upload panorama images first.' 
      });
    }

    // Create temporary directory for processing
    const tempDir = path.join(os.tmpdir(), `config-gen-${projectId}-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    
    try {
      // Create project directory structure that the script expects
      const publicDir = path.join(tempDir, 'public');
      const projectDir = path.join(publicDir, projectId);
      const dataDir = path.join(projectDir, 'data');
      const imagesDir = path.join(projectDir, 'images');
      
      fs.mkdirSync(dataDir, { recursive: true });
      fs.mkdirSync(imagesDir, { recursive: true });
      
      // Download CSV file from S3 to the expected location
      const csvTempPath = path.join(dataDir, 'pano-poses.csv');
      const csvResponse = await fetch(csvFile.url);
      const csvContent = await csvResponse.text();
      fs.writeFileSync(csvTempPath, csvContent);
      
      // For config generation, we just need the image filenames
      // The actual images will be served from S3
      const imageList = panoramaFiles.map(file => {
        const filename = path.basename(file.key);
        // Create placeholder files for the config generator
        const placeholderPath = path.join(imagesDir, filename);
        fs.writeFileSync(placeholderPath, 'placeholder');
        return filename;
      });

      // Generate configuration using the Node.js script
      const configScriptPath = path.join(process.cwd(), 'scripts', 'node', 'generate-config.js');
      
      if (!fs.existsSync(configScriptPath)) {
        throw new Error('Configuration generation script not found');
      }

      // Run the configuration generation script
      const command = `node "${configScriptPath}" --project="${projectId}"`;
      
      try {
        execSync(command, { 
          cwd: tempDir, // Set working directory to temp dir so script can find public folder
          stdio: 'pipe',
          timeout: 30000 // 30 second timeout
        });
      } catch (execError: any) {
        console.error('Config generation failed:', execError.message);
        throw new Error(`Configuration generation failed: ${execError.message}`);
      }

      // Read the generated configuration
      const configPath = path.join(projectDir, 'config.json');
      
      if (!fs.existsSync(configPath)) {
        throw new Error('Configuration file was not generated');
      }

      const configContent = fs.readFileSync(configPath, 'utf8');
      let config;
      
      try {
        config = JSON.parse(configContent);
      } catch (parseError) {
        throw new Error('Generated configuration is not valid JSON');
      }

      // Update image URLs in config to point to S3
      if (config.scenes) {
        config.scenes = config.scenes.map((scene: any) => {
          if (scene.imageUrl) {
            const imageName = path.basename(scene.imageUrl);
            const s3Image = panoramaFiles.find(file => file.key.endsWith(imageName));
            if (s3Image) {
              scene.imageUrl = s3Image.url;
            }
          }
          return scene;
        });
      }

      // Add metadata to config
      config.metadata = {
        projectId,
        generatedAt: new Date().toISOString(),
        totalScenes: config.scenes ? config.scenes.length : 0,
        totalImages: panoramaFiles.length,
        csvFile: csvFile.key,
        version: '1.0.0'
      };

      // Upload configuration to S3
      const configBuffer = Buffer.from(JSON.stringify(config, null, 2));
      const uploadResult = await uploadToS3(
        configBuffer,
        'config.json',
        projectId,
        'config'
      );

      // Clean up temporary directory
      fs.rmSync(tempDir, { recursive: true, force: true });

      res.status(200).json({
        success: true,
        configUrl: uploadResult.url,
        configKey: uploadResult.key,
        metadata: config.metadata,
        summary: {
          totalScenes: config.metadata.totalScenes,
          totalImages: config.metadata.totalImages,
          csvProcessed: true,
          configGenerated: true
        }
      });

    } catch (processingError) {
      // Clean up temporary directory on error
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      throw processingError;
    }

  } catch (error) {
    console.error('Configuration generation error:', error);
    
    let errorMessage = 'Configuration generation failed';
    let statusCode = 500;
    
    if (error instanceof Error) {
      errorMessage = error.message;
      
      if (error.message.includes('CSV file not found')) {
        statusCode = 400;
      } else if (error.message.includes('No panorama images')) {
        statusCode = 400;
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        errorMessage = 'Configuration generation timed out. Please try again.';
      }
    }
    
    res.status(statusCode).json({ 
      error: errorMessage,
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}