# Troubleshooting Guide

This guide helps resolve common issues with the panorama viewer application.

## Installation Issues

### Python Not Found

**Error**: `Python not found. Please install Python.`

**Solutions**:
1. **Install Python**:
   - Windows: Download from [python.org](https://python.org)
   - macOS: `brew install python3` or download from python.org
   - Linux: `sudo apt install python3` or equivalent

2. **Check Python installation**:
   ```bash
   python --version
   python3 --version
   ```

3. **Add Python to PATH** (Windows):
   - Reinstall Python with "Add to PATH" option
   - Or manually add Python directory to system PATH

### NumPy Import Error

**Error**: `ModuleNotFoundError: No module named 'numpy'`

**Solutions**:
```bash
pip install numpy
# or
pip3 install numpy
```

### Node.js Version Issues

**Error**: Build failures or dependency conflicts

**Solutions**:
1. **Update Node.js** to v18 or higher
2. **Clear npm cache**:
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

## Configuration Issues

### Hotspots Point in Wrong Direction

**Symptoms**: Navigation hotspots don't align with actual panorama positions

**Solutions**:

1. **Test coordinate systems**:
   ```bash
   npm run test:config
   ```

2. **Try different coordinate modes**:
   ```env
   # In .env.local
   PANORAMA_CONFIG_MODE=navvis
   ```
   
   Available modes: `standard`, `inverted_x`, `inverted_y`, `swapped_xy`, `navvis`

3. **Adjust yaw offset**:
   ```env
   PANORAMA_YAW_OFFSET=90  # Rotate 90 degrees
   ```

4. **Manual testing with Python script**:
   ```bash
   python scripts/generate_marzipano_config.py --mode navvis --yaw-offset 90
   ```

### Hotspots Too High or Too Low

**Symptoms**: Hotspots appear above or below the horizon

**Solutions**:

1. **Adjust pitch offset**:
   ```env
   PANORAMA_PITCH_OFFSET=-10  # Lower hotspots
   PANORAMA_PITCH_OFFSET=10   # Raise hotspots
   ```

2. **Change camera height offset**:
   ```env
   PANORAMA_CAMERA_OFFSET=1.5  # Increase height
   PANORAMA_CAMERA_OFFSET=0.8  # Decrease height
   ```

### No Hotspots Appearing

**Symptoms**: Panoramas load but no navigation hotspots are visible

**Solutions**:

1. **Check panorama distances**:
   ```env
   PANORAMA_MAX_DISTANCE=15.0  # Increase connection distance
   ```

2. **Verify CSV data format**:
   - Ensure semicolon (`;`) or comma (`,`) delimiters
   - Check for missing position/orientation data
   - Validate numeric values

3. **Check floor assignment**:
   - Panoramas only connect within the same floor
   - Verify Z-coordinates are reasonable

### Too Many/Few Connections

**Solutions**:

1. **Adjust connection limits**:
   ```env
   PANORAMA_MAX_CONNECTIONS=8   # More connections
   PANORAMA_MAX_CONNECTIONS=3   # Fewer connections
   ```

2. **Modify distance threshold**:
   ```env
   PANORAMA_MAX_DISTANCE=5.0    # Closer connections only
   PANORAMA_MAX_DISTANCE=20.0   # Allow distant connections
   ```

## Runtime Issues

### Panorama Images Not Loading

**Symptoms**: Black screen or missing textures

**Solutions**:

1. **Check image paths**:
   - Verify images exist in `public/images/`
   - Ensure filenames match CSV data
   - Check file extensions (should be `.jpg`)

2. **Image format issues**:
   - Convert to JPEG if using other formats
   - Ensure images are equirectangular panoramas
   - Recommended resolution: 2048x1024 or higher

3. **File permissions**:
   - Ensure images are readable
   - Check web server permissions

### Slow Performance

**Symptoms**: Laggy navigation or slow loading

**Solutions**:

1. **Optimize images**:
   - Compress JPEG images (quality 80-90%)
   - Use progressive JPEG encoding
   - Consider multiple resolution levels

2. **Reduce connections**:
   ```env
   PANORAMA_MAX_CONNECTIONS=4
   PANORAMA_MAX_DISTANCE=8.0
   ```

3. **Browser optimization**:
   - Use modern browsers (Chrome, Firefox, Safari)
   - Enable hardware acceleration
   - Close other tabs/applications

### Memory Issues During Build

**Error**: `JavaScript heap out of memory`

**Solutions**:

1. **Already configured** in package.json:
   ```json
   "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
   ```

2. **Increase memory further** if needed:
   ```json
   "build": "NODE_OPTIONS='--max-old-space-size=8192' next build"
   ```

## Data Issues

### CSV Parsing Errors

**Error**: Configuration generation fails with CSV errors

**Solutions**:

1. **Check delimiter**:
   - Use semicolon (`;`) or comma (`,`)
   - Be consistent throughout file

2. **Validate headers**:
   ```csv
   ID;filename;timestamp;pano_pos_x;pano_pos_y;pano_pos_z;pano_ori_w;pano_ori_x;pano_ori_y;pano_ori_z
   ```

3. **Check data types**:
   - Positions: floating-point numbers
   - Orientations: quaternion values (w, x, y, z)
   - IDs: strings or numbers

4. **Remove empty rows/columns**:
   - Delete trailing commas/semicolons
   - Remove empty lines at end of file

### Invalid Quaternion Data

**Symptoms**: Incorrect panorama orientations

**Solutions**:

1. **Normalize quaternions**:
   - Ensure quaternion magnitude ≈ 1.0
   - Check for zero quaternions (0, 0, 0, 0)

2. **Verify quaternion format**:
   - Order should be (w, x, y, z)
   - Some systems use (x, y, z, w)

3. **Test with identity quaternion**:
   - Use (1, 0, 0, 0) for testing
   - Should result in no rotation

## Development Issues

### TypeScript Errors

**Solutions**:

1. **Update type definitions**:
   - Check `src/types/` for latest types
   - Import correct interfaces

2. **Regenerate config**:
   ```bash
   npm run generate-config
   ```

3. **Clear TypeScript cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

### Hot Reload Not Working

**Solutions**:

1. **Restart development server**:
   ```bash
   npm run clean
   npm run dev
   ```

2. **Check file watchers**:
   - Ensure files are saved
   - Check IDE/editor settings

## Platform-Specific Issues

### Windows PowerShell Execution Policy

**Error**: Script execution disabled

**Solutions**:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### macOS/Linux Permission Errors

**Solutions**:
```bash
chmod +x scripts/generate_marzipano_config.py
```

### Path Separator Issues

**Symptoms**: File not found errors on different platforms

**Solutions**:
- Scripts automatically handle platform differences
- Use forward slashes in configuration
- Avoid hardcoded paths

## Getting Help

### Debug Information

1. **Enable debug mode**:
   ```env
   NEXT_PUBLIC_DEV_MODE=true
   NEXT_PUBLIC_SHOW_DEBUG_INFO=true
   ```

2. **Check browser console**:
   - Open Developer Tools (F12)
   - Look for JavaScript errors
   - Check network requests

3. **Test configuration**:
   ```bash
   npm run test:config
   ```

### Reporting Issues

When reporting issues, include:

1. **System information**:
   - Operating system
   - Node.js version (`node --version`)
   - Python version (`python --version`)

2. **Error messages**:
   - Complete error text
   - Stack traces
   - Console output

3. **Configuration**:
   - `.env.local` contents (remove sensitive data)
   - CSV file sample
   - Steps to reproduce

4. **Expected vs actual behavior**:
   - What should happen
   - What actually happens
   - Screenshots if applicable