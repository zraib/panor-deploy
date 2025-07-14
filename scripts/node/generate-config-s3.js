#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { generateConfig } = require('./generate-marzipano-config');
const { calculateNorthOffsets } = require('./calculate-north-offsets');

// AWS S3 client setup
let s3Client = null;
let S3_BUCKET_NAME = null;

// Initialize S3 client if configured
function initS3() {
  if (process.env.CLOUD_REGION && process.env.S3_BUCKET_NAME) {
    try {
      const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
      
      const config = {
        region: process.env.CLOUD_REGION
      };
      
      // Add credentials if available (for local development)
      if (process.env.CLOUD_ACCESS_KEY_ID && process.env.CLOUD_SECRET_ACCESS_KEY) {
        config.credentials = {
          accessKeyId: process.env.CLOUD_ACCESS_KEY_ID,
          secretAccessKey: process.env.CLOUD_SECRET_ACCESS_KEY
        };
      }
      
      s3Client = new S3Client(config);
      S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;
      return true;
    } catch (error) {
      console.warn('S3 client initialization failed:', error.message);
      return false;
    }
  }
  return false;
}

// Download file from S3
async function downloadFromS3(key, localPath) {
  if (!s3Client) {
    throw new Error('S3 client not initialized');
  }
  
  try {
    const { GetObjectCommand } = require('@aws-sdk/client-s3');
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    // Ensure directory exists
    const dir = path.dirname(localPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Convert stream to buffer and write to file
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    fs.writeFileSync(localPath, buffer);
    
    console.log(`Downloaded ${key} to ${localPath}`);
  } catch (error) {
    console.error(`Failed to download ${key}:`, error.message);
    throw error;
  }
}

// Check if S3 is configured
function isS3Configured() {
  return !!(process.env.CLOUD_REGION && 
           process.env.S3_BUCKET_NAME && 
           (process.env.CLOUD_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID));
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    project: null,
    help: false,
    forceLocal: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--project':
        options.project = args[++i];
        break;
      case '--force-local':
        options.forceLocal = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }
  
  return options;
}

function showHelp() {
  console.log('Usage: node generate-config-s3.js --project <projectId> [--force-local]');
  console.log('\nGenerate Marzipano configuration from panorama data (S3-aware)');
  console.log('\nOptions:');
  console.log('  --project <projectId>   Project ID for project-specific generation (required)');
  console.log('  --force-local          Force use of local files even if S3 is configured');
  console.log('  --help, -h             Show this help message');
  console.log('\nExample:');
  console.log('  node generate-config-s3.js --project villa');
}

async function main() {
  try {
    const options = parseArgs();
    
    if (options.help) {
      showHelp();
      process.exit(0);
    }

    if (!options.project) {
      console.error('Error: Project ID is required. Use --project <projectId> argument.');
      console.log('\nUse --help for more information.');
      process.exit(1);
    }
    
    const projectId = options.project;
    console.log(`Generating panorama configuration for project: ${projectId}`);

    // Determine if we should use S3 or local files
    const useS3 = !options.forceLocal && isS3Configured() && initS3();
    
    if (useS3) {
      console.log('Using S3 storage mode');
      
      // Create temporary directory for downloaded files
      const tempDir = path.join(process.cwd(), 'tmp', 'config-generation', projectId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Download CSV file from S3
      const s3CsvKey = `projects/${projectId}/csv/pano-poses.csv`;
      const localCsvPath = path.join(tempDir, 'pano-poses.csv');
      
      try {
        await downloadFromS3(s3CsvKey, localCsvPath);
      } catch (error) {
        console.error(`Failed to download CSV from S3: ${error.message}`);
        console.log('Falling back to local file system...');
        
        // Fallback to local files
        const localCsvFile = `public/${projectId}/data/pano-poses.csv`;
        if (!fs.existsSync(localCsvFile)) {
          throw new Error(`CSV file not found in S3 or locally at ${localCsvFile}`);
        }
        fs.copyFileSync(localCsvFile, localCsvPath);
      }
      
      // Generate config using downloaded CSV
      const outputFile = `public/${projectId}/config.json`;
      const projectPath = `/${projectId}`;
      
      // Ensure output directory exists
      const outputDir = path.dirname(outputFile);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      generateConfig(localCsvPath, outputFile, projectPath);
      
      // Clean up temporary files
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupError) {
        console.warn('Failed to clean up temporary files:', cleanupError.message);
      }
      
    } else {
      console.log('Using local storage mode');
      
      // Use local file paths
      const csvFile = `public/${projectId}/data/pano-poses.csv`;
      const outputFile = `public/${projectId}/config.json`;
      const projectPath = `/${projectId}`;

      if (!fs.existsSync(csvFile)) {
        throw new Error(`CSV file not found at ${csvFile}`);
      }

      generateConfig(csvFile, outputFile, projectPath);
    }

    const outputFile = `public/${projectId}/config.json`;
    if (!fs.existsSync(outputFile)) {
      throw new Error(`config.json was not generated at ${outputFile}`);
    }

    console.log(`Configuration generated successfully at ${outputFile}`);

    console.log('Calculating north offsets...');
    
    // Calculate north offsets
    calculateNorthOffsets(outputFile);

    console.log('North offsets calculated and applied successfully');
    
  } catch (error) {
    console.error('Error in configuration process:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  isS3Configured,
  downloadFromS3,
  initS3
};