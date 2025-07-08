# Upload Troubleshooting Guide

## Common Upload Issues and Solutions

### 1. "Internal server error during file upload"

**Cause**: This error typically occurs when the configuration generation script fails after files
are successfully uploaded.

**Solutions**:

#### Check Python Installation

```bash
# Verify Python is installed and accessible
python --version
# Should show Python 3.x.x
```

#### Check Required Python Packages

```bash
# Verify numpy is installed
python -c "import numpy; print('numpy version:', numpy.__version__)"
```

#### Install Missing Dependencies

If numpy is missing:

```bash
pip install numpy
```

#### Manual Configuration Generation

If the upload completes but configuration fails, run manually:

```bash
node scripts/node/generate-config.js --project "YOUR_PROJECT_NAME"
```

### 2. "CSV file not found" Error

**Cause**: The CSV file wasn't properly uploaded or moved to the correct location.

**Solutions**:

1. Ensure your CSV file is named exactly `pano-poses.csv`
2. Check file permissions in the project directory
3. Verify the upload completed successfully before configuration generation

### 3. "Python or required packages not installed"

**Cause**: Python or numpy is not available on the system.

**Solutions**:

1. Install Python 3.7 or higher
2. Install numpy: `pip install numpy`
3. Ensure Python is in your system PATH

### 4. File Permission Errors

**Cause**: The application doesn't have permission to create directories or move files.

**Solutions**:

1. Check directory permissions for the `public/` folder
2. Ensure the application has write access to the project directory
3. On Windows, try running as administrator if needed

### 5. Large File Upload Issues

**Symptoms**: Upload timeout or memory errors

**Solutions**:

1. Upload fewer files at once
2. Reduce image file sizes if possible
3. Check available disk space
4. Increase server timeout settings if you have access

## Debugging Steps

### 1. Check Project Directory Structure

After upload, verify this structure exists:

```
public/
└── YOUR_PROJECT_NAME/
    ├── data/
    │   └── pano-poses.csv
    ├── images/
    │   ├── image1.jpg
    │   ├── image2.jpg
    │   └── ...
    └── config.json (generated after successful processing)
```

### 2. Test Configuration Generation Manually

```bash
# Test if the script works with your project
node scripts/node/generate-config.js --project "YOUR_PROJECT_NAME"

# Test Python script directly
python scripts/python/generate_marzipano_config.py --project "YOUR_PROJECT_NAME"
```

### 3. Check Server Logs

Look for detailed error messages in:

- Browser developer console (F12)
- Server console output
- Network tab in browser dev tools

### 4. Verify CSV File Format

Ensure your CSV file has the required columns:

- `filename`
- `pano_pos_x`, `pano_pos_y`, `pano_pos_z`
- `pano_ori_w`, `pano_ori_x`, `pano_ori_y`, `pano_ori_z`

## Prevention Tips

1. **Always name your CSV file exactly**: `pano-poses.csv`
2. **Use supported image formats**: JPEG (.jpg, .jpeg) or PNG (.png)
3. **Ensure stable internet connection** for large uploads
4. **Don't close the browser tab** during upload
5. **Check available disk space** before uploading

## Getting Help

If you continue to experience issues:

1. **Check the error message carefully** - it often contains specific guidance
2. **Try the manual configuration command** provided in error messages
3. **Verify your system meets the requirements**:
   - Python 3.7+
   - numpy package
   - Sufficient disk space
   - Write permissions to the project directory

## System Requirements

- **Python**: 3.7 or higher
- **Python Packages**: numpy
- **Node.js**: 14 or higher (for the application)
- **Disk Space**: Sufficient space for your panorama images
- **Permissions**: Write access to the application directory

## Error Code Reference

- **400**: Bad request (invalid project name or missing files)
- **408**: Upload timeout
- **409**: Duplicate files or project name conflict
- **413**: File too large
- **500**: Server error (usually configuration generation failure)
- **503**: Server temporarily unavailable
- **507**: Insufficient storage space
