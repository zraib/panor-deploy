// POI utility functions for coordinate conversion and validation

import { POIPosition } from '@/types/poi';

/**
 * Convert screen coordinates to panorama yaw/pitch angles
 * Uses simplified but more accurate calculation based on Marzipano's coordinate system
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
  // Convert to normalized device coordinates [-1, 1]
  const ndcX = (2 * clientX / viewerWidth) - 1;
  const ndcY = (2 * clientY / viewerHeight) - 1; // Don't flip Y axis - let Marzipano handle orientation
  
  // Calculate aspect ratio
  const aspectRatio = viewerWidth / viewerHeight;
  
  // Convert FOV to radians and calculate half angles
  const fovRad = currentFov * Math.PI / 180;
  const halfFovY = fovRad / 2;
  const halfFovX = Math.atan(Math.tan(halfFovY) * aspectRatio);
  
  // Calculate view-space angles from center
  const viewYaw = ndcX * halfFovX;
  const viewPitch = ndcY * halfFovY;
  
  // Convert current view angles to radians
  const currentYawRad = currentYaw * Math.PI / 180;
  const currentPitchRad = currentPitch * Math.PI / 180;
  
  // Simple additive approach that works better with Marzipano's coordinate system
  let targetYaw = currentYaw + (viewYaw * 180 / Math.PI);
  let targetPitch = currentPitch + (viewPitch * 180 / Math.PI);
  
  // Normalize angles
  targetYaw = normalizeYaw(targetYaw);
  targetPitch = clampPitch(targetPitch);
  
  return {
    yaw: parseFloat(targetYaw.toFixed(4)),
    pitch: parseFloat(targetPitch.toFixed(4))
  };
};

/**
 * Alternative coordinate conversion using ray casting approach
 * This can be used as a fallback if the simple approach doesn't work
 */
export const screenToYawPitchRaycast = (
  clientX: number,
  clientY: number,
  viewerWidth: number,
  viewerHeight: number,
  currentYaw: number,
  currentPitch: number,
  currentFov: number
): POIPosition => {
  // Convert to normalized coordinates
  const x = (clientX / viewerWidth - 0.5) * 2;
  const y = (clientY / viewerHeight - 0.5) * 2; // Don't flip Y axis - consistent with simple method
  
  // Calculate field of view in radians
  const fovRad = currentFov * Math.PI / 180;
  const aspectRatio = viewerWidth / viewerHeight;
  
  // Calculate the ray direction in view space
  const tanHalfFov = Math.tan(fovRad / 2);
  const rayX = x * tanHalfFov * aspectRatio;
  const rayY = y * tanHalfFov;
  const rayZ = -1; // Forward direction
  
  // Normalize the ray
  const rayLength = Math.sqrt(rayX * rayX + rayY * rayY + rayZ * rayZ);
  const normalizedRayX = rayX / rayLength;
  const normalizedRayY = rayY / rayLength;
  const normalizedRayZ = rayZ / rayLength;
  
  // Convert current view to radians
  const yawRad = currentYaw * Math.PI / 180;
  const pitchRad = currentPitch * Math.PI / 180;
  
  // Apply view rotation to ray (yaw then pitch)
  const cosYaw = Math.cos(yawRad);
  const sinYaw = Math.sin(yawRad);
  const cosPitch = Math.cos(pitchRad);
  const sinPitch = Math.sin(pitchRad);
  
  // Rotate around Y axis (yaw)
  const rotatedX1 = normalizedRayX * cosYaw - normalizedRayZ * sinYaw;
  const rotatedY1 = normalizedRayY;
  const rotatedZ1 = normalizedRayX * sinYaw + normalizedRayZ * cosYaw;
  
  // Rotate around X axis (pitch)
  const finalX = rotatedX1;
  const finalY = rotatedY1 * cosPitch - rotatedZ1 * sinPitch;
  const finalZ = rotatedY1 * sinPitch + rotatedZ1 * cosPitch;
  
  // Convert to spherical coordinates
  const targetYawRad = Math.atan2(finalX, finalZ);
  const targetPitchRad = Math.asin(Math.max(-1, Math.min(1, finalY)));
  
  // Convert to degrees
  const targetYaw = normalizeYaw(targetYawRad * 180 / Math.PI);
  const targetPitch = clampPitch(targetPitchRad * 180 / Math.PI);
  
  return {
    yaw: parseFloat(targetYaw.toFixed(4)),
    pitch: parseFloat(targetPitch.toFixed(4))
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