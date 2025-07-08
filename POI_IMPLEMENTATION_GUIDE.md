# POI System Implementation Guide

## Overview

This guide provides a complete implementation of a Point of Interest (POI) system for the panorama viewer application. The system allows users to create, manage, and interact with points of interest within panoramic scenes through right-click interactions, modal configuration, and data persistence.

## ✅ Implementation Status

### Completed Components

- ✅ **POI Types & Interfaces** (`src/types/poi.ts`)
- ✅ **Utility Functions** (`src/components/poi/utils.ts`)
- ✅ **Context Menu Component** (`src/components/poi/POIContextMenu.tsx`)
- ✅ **Modal Configuration** (`src/components/poi/POIModal.tsx`)
- ✅ **Preview Component** (`src/components/poi/POIPreview.tsx`)
- ✅ **Main POI Component** (`src/components/poi/POIComponent.tsx`)
- ✅ **API Endpoints** (`pages/api/poi/upload.ts`, `pages/api/poi/save.ts`)
- ✅ **Data Storage Structure** (`public/pano-app/data/poi/`)
- ✅ **Integration with PanoramaViewer**
- ✅ **Environment Configuration**
- ✅ **Documentation & Tests**

## 🚀 Features Implemented

### Core Functionality

1. **Right-Click POI Creation**
   - Detects right-click events on panorama
   - Converts screen coordinates to spherical coordinates (yaw/pitch)
   - Shows context menu with "Create POI" option

2. **Modal Configuration Interface**
   - Form with name, description, and content type fields
   - File upload with drag-and-drop support
   - URL input for iframe content
   - Real-time validation and error handling

3. **Data Persistence**
   - JSON-based POI metadata storage
   - File attachment system with unique naming
   - RESTful API endpoints for data operations

4. **Interactive POI Markers**
   - Visual markers positioned in panorama space
   - Hover tooltips showing POI names
   - Click-to-preview functionality

5. **Content Preview System**
   - Image preview with error handling
   - Video playback controls
   - PDF and file download links
   - Iframe embedding for external content

### Technical Features

- **Coordinate System**: Accurate screen-to-spherical coordinate conversion
- **File Validation**: Type and size validation for uploads
- **Error Handling**: Comprehensive error handling with user feedback
- **Toast Notifications**: User-friendly feedback system
- **Responsive Design**: Mobile-friendly interface components
- **TypeScript Support**: Full type safety throughout the system

## 📁 File Structure

```
src/
├── components/
│   └── poi/
│       ├── POIComponent.tsx       # Main POI logic container
│       ├── POIContextMenu.tsx     # Right-click context menu
│       ├── POIModal.tsx           # Form for POI details
│       ├── POIPreview.tsx         # Preview component for POI content
│       ├── utils.ts               # Helper functions
│       ├── README.md              # Component documentation
│       └── __tests__/
│           └── POIComponent.test.tsx
├── types/
│   └── poi.ts                     # POI type definitions
pages/
└── api/
    └── poi/
        ├── upload.ts              # File upload endpoint
        └── save.ts                # POI data save endpoint
public/
└── pano-app/
    └── data/
        └── poi/
            ├── attachments/       # Uploaded files directory
            └── poi-data.json      # POI metadata storage
```

## 🔧 Usage Instructions

### For Users

1. **Creating a POI**:
   - Right-click anywhere in the panorama view
   - Select "Create POI" from the context menu
   - Fill in the POI details in the modal:
     - Enter a descriptive name
     - Add a detailed description
     - Choose content type (File or URL)
     - Upload a file or enter a URL
   - Click "Create POI" to save

2. **Viewing POIs**:
   - POI markers appear as red map pins in the panorama
   - Hover over markers to see POI names
   - Click markers to open the preview modal
   - Preview shows content based on POI type

### For Developers

1. **Integration**:
   ```tsx
   import POIComponent from '@/components/poi/POIComponent';
   
   // Add to your panorama viewer
   <POIComponent
     currentPanoramaId={currentSceneId}
     viewerSize={{ width: viewerWidth, height: viewerHeight }}
     viewerRef={marzipanoViewerRef}
     onPOICreated={(poi) => handlePOICreated(poi)}
   />
   ```

2. **Configuration**:
   - Set `NEXT_PUBLIC_PROJECT_NAME` in `.env.local`
   - Ensure API routes are accessible
   - Configure file upload limits as needed

## 📊 Data Format

### POI JSON Structure
```json
{
  "id": "uuid-string",
  "panoramaId": "scene-identifier",
  "name": "POI Display Name",
  "description": "Detailed description",
  "position": {
    "yaw": 45.2,
    "pitch": -10.3
  },
  "type": "file",
  "content": "filename.jpg",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Supported File Types
- **Images**: JPEG, PNG, GIF
- **Documents**: PDF
- **Videos**: MP4, WebM
- **Size Limit**: 10MB per file

## 🔒 Validation & Security

### Coordinate Validation
- Yaw: -180° ≤ yaw ≤ 180°
- Pitch: -90° ≤ pitch ≤ 90°
- Real-time validation during POI creation

### File Security
- MIME type validation
- File size limits
- Unique filename generation
- Secure file storage in public directory

### Input Validation
- Required field validation
- URL format validation for iframe content
- XSS protection through proper escaping

## 🎨 Styling & UI

### Design System
- **Framework**: Tailwind CSS
- **Icons**: React Icons (Font Awesome)
- **Notifications**: React Toastify
- **File Upload**: React Dropzone

### Visual Elements
- Context menu with hover effects
- Modal with form validation states
- POI markers with drop shadows and tooltips
- Responsive preview modal
- Loading states and error handling

## 🧪 Testing

### Test Coverage
- Component rendering tests
- Event handling verification
- API integration tests
- Error handling scenarios
- Coordinate conversion accuracy

### Running Tests
```bash
npm test
# or
npm run test:coverage
```

## 🚀 Deployment Considerations

### Environment Setup
1. Ensure `.env.local` contains project configuration
2. Verify API routes are accessible in production
3. Configure file upload directory permissions
4. Set up proper CORS headers if needed

### Performance Optimization
- Lazy loading of POI components
- Image optimization for previews
- Efficient coordinate calculations
- Minimal re-renders through React.memo

## 🔮 Future Enhancements

### Planned Features
- POI editing and deletion capabilities
- POI categories and filtering system
- Bulk POI import/export functionality
- Advanced search and discovery
- Custom POI marker styles
- POI analytics and usage tracking
- Multi-language support
- POI sharing and collaboration

### Technical Improvements
- WebGL-based marker rendering
- Real-time collaborative editing
- Advanced coordinate system support
- Integration with external mapping services
- Enhanced mobile touch interactions

## 📞 Support & Troubleshooting

### Common Issues

1. **POI markers not appearing**:
   - Check if POI data is loading correctly
   - Verify coordinate calculations
   - Ensure viewer is properly initialized

2. **File upload failures**:
   - Check file size and type restrictions
   - Verify API endpoint accessibility
   - Ensure proper directory permissions

3. **Coordinate conversion issues**:
   - Verify viewer reference is valid
   - Check view parameter calculations
   - Ensure proper event handling

### Debug Mode
Enable debug mode by setting `NEXT_PUBLIC_SHOW_DEBUG_INFO=true` in `.env.local`

## 📄 License & Credits

This POI system implementation follows the same license as the main panorama viewer project. Built with modern React patterns and best practices for maintainability and extensibility.