// TypeScript definitions for panorama configuration

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface Orientation {
  w: number;
  x: number;
  y: number;
  z: number;
}

export interface ViewParameters {
  yaw: number;
  pitch: number;
  fov: number;
}

export interface TileLevel {
  tileSize: number;
  size: number;
  fallbackOnly?: boolean;
}

export interface Hotspot {
  yaw: number;
  pitch: number;
  rotation: number;
  target: string;
  distance: number;
  type: 'navigation' | 'info';
  title?: string;
  text?: string;
}

export interface Scene {
  id: string;
  name: string;
  floor: number;
  northOffset: number;
  position: Position;
  orientation: Orientation;
  levels: TileLevel[];
  faceSize: number;
  initialViewParameters: ViewParameters;
  linkHotspots: Hotspot[];
  infoHotspots: Hotspot[];
}

export interface ViewerSettings {
  mouseViewMode: 'drag' | 'qtvr';
  autorotateEnabled: boolean;
  fullscreenButton: boolean;
  viewControlButtons: boolean;
}

export interface ViewerConfig {
  cameraToGroundOffset: number;
  coordinateMode: 'standard' | 'inverted_x' | 'inverted_y' | 'swapped_xy' | 'navvis';
  yawOffset: number;
  pitchOffset: number;
}

export interface PanoramaConfig {
  scenes: Scene[];
  name: string;
  settings: ViewerSettings;
  viewer: ViewerConfig;
}

// CSV data structure
export interface PanoramaData {
  id: string;
  filename: string;
  timestamp?: number;
  pano_pos_x: number;
  pano_pos_y: number;
  pano_pos_z: number;
  pano_ori_w: number;
  pano_ori_x: number;
  pano_ori_y: number;
  pano_ori_z: number;
  floor?: number;
}

// Environment configuration
export interface EnvironmentConfig {
  PANORAMA_CONFIG_MODE: ViewerConfig['coordinateMode'];
  PANORAMA_YAW_OFFSET: number;
  PANORAMA_PITCH_OFFSET: number;
  PANORAMA_CAMERA_OFFSET: number;
  PANORAMA_MAX_DISTANCE: number;
  PANORAMA_MAX_CONNECTIONS: number;
  NEXT_PUBLIC_DEV_MODE: boolean;
  NEXT_PUBLIC_SHOW_DEBUG_INFO: boolean;
}