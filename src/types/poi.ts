// POI (Point of Interest) type definitions

export interface POIPosition {
  yaw: number;
  pitch: number;
}

export interface POIData {
  id: string;
  panoramaId: string;
  name: string;
  description: string;
  position: POIPosition;
  type: 'file' | 'iframe';
  content: string; // filename for file type, URL for iframe type
  createdAt: string;
  updatedAt: string;
}

export interface POIFormData {
  name: string;
  description: string;
  type: 'file' | 'iframe';
  content: string;
  file?: File;
  position?: POIPosition;
}

export interface POIContextMenuProps {
  position: { x: number; y: number };
  onCreatePOI: () => void;
  onClose: () => void;
}

export interface POIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: POIFormData) => void;
  pendingPosition: POIPosition | null;
  editingPOI?: POIData | null;
}

export interface POIPreviewProps {
  poi: POIData;
  projectId: string;
  onClose: () => void;
  onEdit?: (poi: POIData) => void;
  onDelete?: (poiId: string) => void;
}

export interface POIComponentProps {
  projectId: string;
  currentPanoramaId: string;
  viewerSize: { width: number; height: number };
  viewerRef: React.RefObject<any>;
  panoRef: React.RefObject<HTMLDivElement>;
  onPOICreated?: (poi: POIData) => void;
}