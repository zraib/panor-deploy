# Node.js Configuration Scripts

This directory contains Node.js implementations of the panorama configuration generation scripts, converted from Python to eliminate Python dependencies.

## Scripts

### 1. generate-config.js
Main script that orchestrates the configuration generation process.

**Usage:**
```bash
node scripts/node/generate-config.js --project <projectId>
```

**Options:**
- `--project <projectId>`: Project ID for project-specific generation (required)
- `--help, -h`: Show help message

**Example:**
```bash
node scripts/node/generate-config.js --project toyota
```

### 2. generate-marzipano-config.js
Generates Marzipano configuration from CSV panorama data.

**Usage:**
```bash
node scripts/node/generate-marzipano-config.js --project <projectId> [--test]
```

**Options:**
- `--project <projectId>`: Project ID for project-specific generation (required)
- `--test`: Run in test mode

### 3. calculate-north-offsets.js
Calculates north offset values from quaternion orientations.

**Usage:**
```bash
node scripts/node/calculate-north-offsets.js --project <projectId> [--reference <sceneId>] [--analyze]
```

**Options:**
- `--project <projectId>`: Project ID for project-specific calculation (required)
- `--reference <sceneId>`: Reference scene ID to use as 0 offset
- `--analyze`: Analyze current orientations

## Features

### Mathematical Operations
- **Quaternion operations**: Conjugate, multiply, rotate vector
- **Vector operations**: Add, subtract, magnitude, normalize
- **Coordinate system conversions**: NavVis to Marzipano coordinate systems

### Configuration Generation
- **CSV parsing**: Automatic delimiter detection (comma or semicolon)
- **Floor clustering**: Groups panoramas by Z-position into floors
- **Hotspot generation**: Creates navigation hotspots between panoramas on the same floor
- **Orientation calculation**: Computes initial yaw for proper panorama orientation

### North Offset Calculation
- **Quaternion to yaw conversion**: Extracts yaw angle from quaternion orientation
- **Relative offset calculation**: Computes offsets relative to a reference scene
- **Angle normalization**: Ensures angles stay within [-180, 180] degree range
- **Backup creation**: Automatically creates backup files before modifications

## Dependencies

These scripts use only Node.js built-in modules:
- `fs`: File system operations
- `path`: Path utilities

No external dependencies or Python libraries are required.

## Migration from Python

The original Python scripts have been converted to Node.js with the following changes:

1. **Removed Python dependencies**:
   - `numpy`: Replaced with custom Vector3 and Quaternion classes
   - `argparse`: Replaced with custom argument parsing
   - `csv`: Replaced with custom CSV parsing

2. **Maintained functionality**:
   - All mathematical operations preserved
   - Same input/output formats
   - Identical configuration structure
   - Same command-line interface

3. **Improved features**:
   - Better error handling
   - Consistent help messages
   - Modular design for reusability

## File Structure

```
scripts/node/
├── README.md                      # This documentation
├── generate-config.js             # Main orchestration script
├── generate-marzipano-config.js   # Marzipano config generation
└── calculate-north-offsets.js     # North offset calculation
```

## Expected Input Format

The scripts expect a CSV file at `public/{projectId}/data/pano-poses.csv` with the following columns:

- `filename`: Panorama filename
- `pano_pos_x`, `pano_pos_y`, `pano_pos_z`: Position coordinates
- `pano_ori_w`, `pano_ori_x`, `pano_ori_y`, `pano_ori_z`: Quaternion orientation

## Output

Generates a configuration file at `public/{projectId}/config.json` with:

- Scene definitions with positions and orientations
- Floor level information
- Navigation hotspots between panoramas
- Calculated north offsets for proper orientation