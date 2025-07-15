import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import path from 'path';

// Extract environment variables
const CLOUD_REGION = process.env.CLOUD_REGION || 'us-east-1';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

// Check if required environment variables are present
if (!S3_BUCKET_NAME) {
  throw new Error('Missing required environment variable: S3_BUCKET_NAME');
}

// Initialize S3 client using default credential provider chain
// This will automatically use IAM roles when deployed on AWS Amplify
const s3Client = new S3Client({
  region: CLOUD_REGION,
  // credentials will be automatically provided by AWS SDK default chain:
  // 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  // 2. IAM roles (when deployed on AWS Amplify with compute role)
  // 3. Instance metadata service
});

// File type configurations
interface FileTypeConfig {
  contentType: string;
  folder: string;
  maxSize: number; // in bytes
  allowedExtensions: string[];
}

const FILE_TYPE_CONFIGS: Record<string, FileTypeConfig> = {
  panorama: {
    contentType: 'image/jpeg',
    folder: 'images',
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.jpg', '.jpeg', '.png']
  },
  csv: {
    contentType: 'text/csv',
    folder: 'csv',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.csv']
  },
  poi: {
    contentType: 'application/octet-stream',
    folder: 'poi/attachments',
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.mp4', '.webm']
  },
  config: {
    contentType: 'application/json',
    folder: 'config',
    maxSize: 1 * 1024 * 1024, // 1MB
    allowedExtensions: ['.json']
  }
};

// Helper function to determine file type based on extension
function getFileType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  
  if (['.jpg', '.jpeg', '.png'].includes(ext) && filename.includes('pano')) {
    return 'panorama';
  }
  if (ext === '.csv') {
    return 'csv';
  }
  if (ext === '.json') {
    return 'config';
  }
  return 'poi'; // Default for POI attachments
}

// Helper function to get content type based on file extension
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.csv': 'text/csv',
    '.json': 'application/json'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

// Upload file to S3 with proper organization
export async function uploadToS3(
  file: Buffer | Uint8Array | string,
  filename: string,
  projectId: string,
  fileType?: string
): Promise<{ success: boolean; url: string; key: string }> {
  console.log(`Starting S3 upload for filename: ${filename}, projectId: ${projectId}`);
  console.log(`Using S3 Bucket: ${S3_BUCKET_NAME}, Region: ${CLOUD_REGION}`);

  try {
    const detectedFileType = fileType || getFileType(filename);
    const config = FILE_TYPE_CONFIGS[detectedFileType];
    
    if (!config) {
      throw new Error(`Unsupported file type: ${detectedFileType}`);
    }
    
    // Validate file extension
    const ext = path.extname(filename).toLowerCase();
    if (!config.allowedExtensions.includes(ext)) {
      throw new Error(`File extension ${ext} not allowed for ${detectedFileType} files`);
    }
    
    // Create S3 key with proper organization
    const key = `projects/${projectId}/${config.folder}/${filename}`;
    console.log(`Generated S3 key: ${key}`);
    console.log(`Content-Type: ${getContentType(filename)}`);
    console.log(`File size: ${file.length} bytes`);

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: getContentType(filename),
      Metadata: {
        projectId,
        fileType: detectedFileType,
        uploadedAt: new Date().toISOString()
      }
    });
    
    await s3Client.send(command);
    
    const url = `https://${S3_BUCKET_NAME}.s3.${CLOUD_REGION}.amazonaws.com/${key}`;
    console.log(`Successfully uploaded to S3. URL: ${url}`);
    
    return {
      success: true,
      url,
      key
    };
  } catch (error) {
    console.error('S3 upload error:', error);
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}, message: ${error.message}, stack: ${error.stack}`);
    }
    throw error;
  }
}

// List files in S3 for a specific project
export async function listProjectFiles(
  projectId: string,
  fileType?: string
): Promise<Array<{ key: string; size: number; lastModified: Date; url: string }>> {
  try {
    const prefix = fileType 
      ? `projects/${projectId}/${FILE_TYPE_CONFIGS[fileType].folder}/`
      : `projects/${projectId}/`;
    
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET_NAME,
      Prefix: prefix
    });
    
    const response = await s3Client.send(command);
    
    return (response.Contents || []).map(obj => ({
      key: obj.Key!,
      size: obj.Size!,
      lastModified: obj.LastModified!,
      url: `https://${S3_BUCKET_NAME}.s3.${CLOUD_REGION}.amazonaws.com/${obj.Key}`
    }));
  } catch (error) {
    console.error('S3 list error:', error);
    throw error;
  }
}

// Download file from S3
export async function downloadFromS3(
  key: string,
  localPath: string
): Promise<void> {
  try {
    const command = new GetObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    const response = await s3Client.send(command);
    
    if (response.Body instanceof Readable) {
      const fileStream = fs.createWriteStream(localPath);
      await pipeline(response.Body, fileStream);
    } else {
      throw new Error('Invalid response body type');
    }
  } catch (error) {
    console.error('S3 download error:', error);
    throw error;
  }
}

// Delete file from S3
export async function deleteFromS3(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET_NAME,
      Key: key
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw error;
  }
}

// Copy file within S3
export async function copyInS3(
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  try {
    const command = new CopyObjectCommand({
      Bucket: S3_BUCKET_NAME,
      CopySource: `${S3_BUCKET_NAME}/${sourceKey}`,
      Key: destinationKey
    });
    
    await s3Client.send(command);
  } catch (error) {
    console.error('S3 copy error:', error);
    throw error;
  }
}

// Get signed URL for temporary access
export async function getSignedUrl(key: string): Promise<string> {
  // For public buckets, return direct URL
  return `https://${S3_BUCKET_NAME}.s3.${CLOUD_REGION}.amazonaws.com/${key}`;
}

// Batch upload multiple files with concurrency control
export async function batchUploadToS3(
  files: Array<{ buffer: Buffer; filename: string; fileType?: string }>,
  projectId: string,
  concurrency: number = 3
): Promise<Array<{ success: boolean; filename: string; url?: string; key?: string; error?: string }>> {
  const results: Array<{ success: boolean; filename: string; url?: string; key?: string; error?: string }> = [];
  
  // Process files in batches to prevent overwhelming the server
  for (let i = 0; i < files.length; i += concurrency) {
    const batch = files.slice(i, i + concurrency);
    
    const batchPromises = batch.map(async (file) => {
      try {
        const result = await uploadToS3(file.buffer, file.filename, projectId, file.fileType);
        return {
          success: true,
          filename: file.filename,
          url: result.url,
          key: result.key
        };
      } catch (error) {
        return {
          success: false,
          filename: file.filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    });
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Add a small delay between batches to prevent rate limiting
    if (i + concurrency < files.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

export { S3_BUCKET_NAME, FILE_TYPE_CONFIGS };