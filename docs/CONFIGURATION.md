# Configuration Guide

This guide explains how to configure the panorama viewer for optimal performance and accuracy.

## Environment Variables

Configuration is managed through the `.env.local` file in the project root.

### Panorama Settings

```env
# Coordinate system mode
PANORAMA_CONFIG_MODE=standard

# Rotation offsets (in degrees)
PANORAMA_YAW_OFFSET=0
PANORAMA_PITCH_OFFSET=0

# Camera height offset (in meters)
PANORAMA_CAMERA_OFFSET=1.2

# Connection settings
PANORAMA_MAX_DISTANCE=10.0
PANORAMA_MAX_CONNECTIONS=6
```

### Coordinate System Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `standard` | Default coordinate system | Most panorama datasets |
| `inverted_x` | X-axis inverted | Some camera systems |
| `inverted_y` | Y-axis inverted | Alternative orientations |
| `swapped_xy` | X and Y axes swapped | Rotated coordinate systems |
| `navvis` | NavVis-style coordinates | NavVis camera systems |

### Rotation Offsets

- **Yaw Offset**: Rotates hotspots horizontally (left/right)
- **Pitch Offset**: Rotates hotspots vertically (up/down)
- Values in degrees (positive = clockwise)

### Camera Settings

- **Camera Offset**: Height difference between camera and ground level
- **Max Distance**: Maximum distance for automatic hotspot connections
- **Max Connections**: Maximum number of hotspots per panorama

## Command Line Configuration

The Python script accepts command-line arguments for testing:

```bash
# Test different coordinate modes
python scripts/generate_marzipano_config.py --mode navvis

# Adjust rotation offsets
python scripts/generate_marzipano_config.py --yaw-offset 90 --pitch-offset -5

# Change camera height
python scripts/generate_marzipano_config.py --offset 1.5

# Run coordinate system test
python scripts/generate_marzipano_config.py --test
```

## Data Format

The `public/data/pano-poses.csv` file should contain:

```csv
ID;filename;timestamp;pano_pos_x;pano_pos_y;pano_pos_z;pano_ori_w;pano_ori_x;pano_ori_y;pano_ori_z
0;00000-pano.jpg;1638362862.084862;1.994931;-9.795800;0.966767;0.714306;-0.016649;-0.010443;-0.699558
```

### Required Fields

- **ID**: Unique identifier for the panorama
- **filename**: Image filename (should match files in `public/images/`)
- **pano_pos_x/y/z**: 3D position coordinates
- **pano_ori_w/x/y/z**: Quaternion orientation (w, x, y, z)

### Optional Fields

- **timestamp**: Unix timestamp of capture

## Hotspot Configuration

Hotspots are automatically generated based on:

1. **Distance**: Panoramas within `PANORAMA_MAX_DISTANCE`
2. **Floor**: Only connects panoramas on the same floor
3. **Limit**: Maximum of `PANORAMA_MAX_CONNECTIONS` per panorama
4. **Sorting**: Closest panoramas are prioritized

## Floor Detection

Floors are automatically detected by:

1. Grouping Z-coordinates within 2 meters
2. Assigning floor numbers relative to the largest group
3. The floor with the most panoramas becomes floor 0

## Troubleshooting Configuration

### Hotspots Point in Wrong Direction

1. Try different coordinate modes:
   ```bash
   npm run test:config
   ```

2. Adjust yaw offset:
   ```env
   PANORAMA_YAW_OFFSET=90
   ```

### Hotspots Too High/Low

1. Adjust pitch offset:
   ```env
   PANORAMA_PITCH_OFFSET=-10
   ```

2. Change camera height:
   ```env
   PANORAMA_CAMERA_OFFSET=1.5
   ```

### Too Many/Few Connections

1. Adjust maximum distance:
   ```env
   PANORAMA_MAX_DISTANCE=15.0
   ```

2. Change connection limit:
   ```env
   PANORAMA_MAX_CONNECTIONS=8
   ```

## Performance Optimization

### Image Optimization

- Use JPEG format for panoramas
- Recommended resolution: 2048x1024 or 4096x2048
- Compress images to balance quality and file size

### Configuration Caching

- Generated `public/config.json` is cached
- Regenerate only when data changes
- Use `npm run clean` to clear cache

### Build Optimization

- Increased memory allocation in build script
- Use `npm run build` for production builds
- Static export supported for hosting

## Advanced Configuration

### Custom Hotspot Types

Modify the Python script to add custom hotspot types:

```python
hotspot = {
    'yaw': yaw,
    'pitch': pitch,
    'rotation': 0,
    'target': target_id,
    'type': 'custom',
    'title': 'Custom Hotspot',
    'text': 'Description'
}
```

### Multi-Floor Navigation

Floor information is automatically included in the configuration:

```json
{
  "id": "00001",
  "floor": 0,
  "position": {...}
}
```

### Viewer Customization

Modify viewer settings in the generated config:

```json
{
  "settings": {
    "mouseViewMode": "drag",
    "autorotateEnabled": false,
    "fullscreenButton": true,
    "viewControlButtons": true
  }
}
```