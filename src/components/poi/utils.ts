// POI utility functions for coordinate conversion and validation

import { POIPosition } from '@/types/poi';

/**
 * Convert screen coordinates to panorama yaw/pitch angles
 * @param clientX - Mouse X coordinate relative to viewport
 * @param clientY - Mouse Y coordinate relative to viewport
 * @param viewerWidth - Width of the panorama viewer
 * @param viewerHeight - Height of the panorama viewer
 * @param currentYaw - Current yaw angle of the view
 * @param currentPitch - Current pitch angle of the view
 * @param currentFov - Current field of view
 * @returns Object with yaw and pitch coordinates
 */
export const screenToYawPitch = (
  clientX: number,
  clientY: number,
  viewerWidth: number,
  viewerHeight: number,
  currentYaw: number,
  currentPitch: number,
  currentFov: number
): POIPosition => {
  // Normalize screen coordinates to [-1, 1] range
  const normalizedX = (clientX / viewerWidth) * 2 - 1;
  const normalizedY = -(clientY / viewerHeight) * 2 + 1;
  
  // Calculate the angular offset from the center of the view
  const fovRadians = (currentFov * Math.PI) / 180;
  const aspectRatio = viewerWidth / viewerHeight;
  
  // Calculate horizontal and vertical angular offsets
  const horizontalFov = fovRadians;
  const verticalFov = fovRadians / aspectRatio;
  
  const deltaYaw = normalizedX * (horizontalFov / 2) * (180 / Math.PI);
  const deltaPitch = -normalizedY * (verticalFov) * (180 / Math.PI);
  
  // Add the offsets to the current view direction
  const targetYaw = normalizeYaw(currentYaw + deltaYaw);
  const targetPitch = clampPitch(currentPitch + deltaPitch);
  
  return { 
    yaw: parseFloat(targetYaw.toFixed(2)),
    pitch: parseFloat(targetPitch.toFixed(2))
  };
};

/**
 * Validate yaw and pitch angles are within valid ranges
 * @param yaw - Yaw angle in degrees
 * @param pitch - Pitch angle in degrees
 * @throws Error if angles are outside valid ranges
 */
export const validateViewAngles = (yaw: number, pitch: number): void => {
  if (yaw < -180 || yaw > 180) {
    throw new Error(`Invalid yaw: ${yaw}. Must be between -180 and 180 degrees.`);
  }
  if (pitch < -90 || pitch > 90) {
    throw new Error(`Invalid pitch: ${pitch}. Must be between -90 and 90 degrees.`);
  }
};

/**
 * Normalize yaw angle to be within -180 to 180 range
 * @param yaw - Yaw angle in degrees
 * @returns Normalized yaw angle
 */
export const normalizeYaw = (yaw: number): number => {
  while (yaw > 180) yaw -= 360;
  while (yaw < -180) yaw += 360;
  return yaw;
};

/**
 * Clamp pitch angle to be within -90 to 90 range
 * @param pitch - Pitch angle in degrees
 * @returns Clamped pitch angle
 */
export const clampPitch = (pitch: number): number => {
  return Math.max(-90, Math.min(90, pitch));
};

/**
 * Generate a unique filename for uploaded POI attachments
 * @param originalName - Original filename
 * @param poiId - POI unique identifier
 * @returns Unique filename
 */
export const generateUniqueFilename = (originalName: string, poiId: string): string => {
  const extension = originalName.split('.').pop() || '';
  const timestamp = Date.now();
  return `${poiId}_${timestamp}.${extension}`;
};

/**
 * Validate file type for POI attachments
 * @param file - File to validate
 * @returns Boolean indicating if file type is allowed
 */
export const validateFileType = (file: File): boolean => {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'application/pdf',
    'video/mp4',
    'video/webm'
  ];
  
  return allowedTypes.includes(file.type);
};

/**
 * Get file type category for display purposes
 * @param mimeType - MIME type of the file
 * @returns File category string
 */
export const getFileCategory = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'file';
};

/**
 * Format file size for display
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};