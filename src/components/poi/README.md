# POI (Point of Interest) System

A comprehensive POI system for the panorama viewer that allows users to create, manage, and interact with points of interest within panoramic scenes.

## Features

- **Right-click POI Creation**: Create POIs by right-clicking anywhere in the panorama
- **Modal Configuration**: Configure POI details through an intuitive modal interface
- **File Upload Support**: Upload images, PDFs, and videos as POI attachments
- **URL/Iframe Support**: Embed external content via URLs
- **Data Persistence**: POI data is stored in JSON format with file attachments
- **Interactive Markers**: Visual POI markers with hover tooltips
- **Preview System**: Click POI markers to preview content

## Components

### POIComponent.tsx
Main container component that handles:
- Right-click event detection
- Coordinate conversion from screen to panorama space
- POI data management and persistence
- Integration with other POI components

### POIContextMenu.tsx
Context menu that appears on right-click with options to:
- Create new POI
- Cancel operation

### POIModal.tsx
Modal form for POI configuration including:
- Name and description fields
- Content type selection (File/URL)
- File upload with drag-and-drop support
- URL input for iframe content
- Form validation and submission

### POIPreview.tsx
Preview component that displays:
- POI information and metadata
- Image/video content preview
- PDF and file download links
- Iframe content for URLs

### utils.ts
Utility functions for:
- Screen to panorama coordinate conversion
- Angle validation and normalization
- File type validation
- Unique filename generation

## Usage

### Integration

```tsx
import POIComponent from '@/components/poi/POIComponent';

// In your panorama viewer component
<POIComponent
  currentPanoramaId={currentSceneId}
  viewerSize={{ width: viewerWidth, height: viewerHeight }}
  viewerRef={marzipanoViewerRef}
  onPOICreated={(poi) => console.log('New POI created:', poi)}
/>
```

### Creating POIs

1. **Right-click** anywhere in the panorama view
2. Select **"Create POI"** from the context menu
3. Fill in the POI details:
   - **Name**: Short descriptive name
   - **Description**: Detailed description
   - **Content Type**: Choose between File Upload or URL
   - **Content**: Upload a file or enter a URL
4. Click **"Create POI"** to save

### Viewing POIs

- POI markers appear as red map pins in the panorama
- Hover over markers to see POI names
- Click markers to open the preview modal
- Preview shows content based on POI type

## Data Structure

### POI Data Format

```json
{
  "id": "uuid-string",
  "panoramaId": "scene-id",
  "name": "POI Name",
  "description": "Detailed description",
  "position": {
    "yaw": 45.2,
    "pitch": -10.3
  },
  "type": "file", // or "iframe"
  "content": "filename.jpg", // or URL for iframe
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### File Storage

```
public/
└── pano-app/
    └── data/
        └── poi/
            ├── poi-data.json      # POI metadata
            └── attachments/       # Uploaded files
                ├── poi-id_timestamp.jpg
                ├── poi-id_timestamp.pdf
                └── poi-id_timestamp.mp4
```

## API Endpoints

### POST /api/poi/upload
Handles file uploads for POI attachments.

**Request**: FormData with file and filename
**Response**: Upload confirmation with file details

### POST /api/poi/save
Saves POI metadata to the JSON data file.

**Request**: POI data object
**Response**: Save confirmation with POI details

## Configuration

### Environment Variables

```env
# Project name for file paths
REACT_APP_PROJECT_NAME=pano-app
NEXT_PUBLIC_PROJECT_NAME=pano-app
```

### File Type Support

**Images**: JPEG, PNG, GIF
**Documents**: PDF
**Videos**: MP4, WebM
**File Size Limit**: 10MB

## Coordinate System

The POI system uses spherical coordinates:
- **Yaw**: Horizontal rotation (-180° to +180°)
- **Pitch**: Vertical rotation (-90° to +90°)

Coordinates are calculated from screen click positions using the current view parameters (yaw, pitch, FOV).

## Error Handling

- Invalid coordinates are validated before saving
- File type and size validation during upload
- Toast notifications for user feedback
- Graceful fallbacks for missing or corrupted data

## Styling

The POI system uses Tailwind CSS classes for styling. Key visual elements:
- Context menu with hover effects
- Modal with form validation states
- POI markers with drop shadows
- Preview modal with responsive content

## Dependencies

- `uuid`: Unique ID generation
- `react-icons`: Icon components
- `react-toastify`: Toast notifications
- `react-dropzone`: File upload interface
- `formidable`: Server-side file handling

## Future Enhancements

- POI editing and deletion
- POI categories and filtering
- Bulk POI import/export
- POI search functionality
- Custom POI marker styles
- POI analytics and usage tracking