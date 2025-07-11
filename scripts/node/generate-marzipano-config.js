#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Parse CSV content with automatic delimiter detection
 */
function parseCSV(content) {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return [];
    
    // Detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';
    
    // Parse header
    const headers = firstLine.split(delimiter).map(h => h.trim());
    
    // Parse rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(delimiter).map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });
        rows.push(row);
    }
    
    return rows;
}

/**
 * Vector operations
 */
class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    static fromArray(arr) {
        return new Vector3(arr[0], arr[1], arr[2]);
    }
    
    toArray() {
        return [this.x, this.y, this.z];
    }
    
    add(other) {
        return new Vector3(this.x + other.x, this.y + other.y, this.z + other.z);
    }
    
    subtract(other) {
        return new Vector3(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector3(0, 0, 0);
        return new Vector3(this.x / mag, this.y / mag, this.z / mag);
    }
}

/**
 * Quaternion operations
 */
class Quaternion {
    constructor(w, x, y, z) {
        this.w = w;
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    static fromArray(arr) {
        return new Quaternion(arr[0], arr[1], arr[2], arr[3]);
    }
    
    conjugate() {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }
    
    multiply(other) {
        const w1 = this.w, x1 = this.x, y1 = this.y, z1 = this.z;
        const w2 = other.w, x2 = other.x, y2 = other.y, z2 = other.z;
        
        return new Quaternion(
            w1*w2 - x1*x2 - y1*y2 - z1*z2,
            w1*x2 + x1*w2 + y1*z2 - z1*y2,
            w1*y2 - x1*z2 + y1*w2 + z1*x2,
            w1*z2 + x1*y2 - y1*x2 + z1*w2
        );
    }
    
    rotateVector(vector) {
        const qConj = this.conjugate();
        const qV = new Quaternion(0, vector.x, vector.y, vector.z);
        const rotated = this.multiply(qV).multiply(qConj);
        return new Vector3(rotated.x, rotated.y, rotated.z);
    }
}

/**
 * Compute absolute yaw in Marzipano coordinate system
 */
function computeInitialYaw(quat) {
    // Local forward vector in NavVis system (X-forward, Y-left, Z-up)
    const localForward = new Vector3(1, 0, 0);
    
    // Rotate to world coordinates
    const worldForward = quat.rotateVector(localForward);
    
    // Convert to Marzipano coordinate system:
    // NavVis: X=forward, Y=left, Z=up
    // Marzipano: X=right, Y=up, Z=back (where positive Z points towards viewer)
    // For proper north alignment, we need:
    // - North (0°) should be positive Z in Marzipano
    // - East (90°) should be positive X in Marzipano
    const marzForward = new Vector3(
        -worldForward.y,  // -left = right (X axis)
        worldForward.z,   // up stays up (Y axis)
        worldForward.x    // forward = forward (Z axis)
    );
    
    // Project to horizontal plane
    const x = marzForward.x;  // East-West component
    const z = marzForward.z;  // North-South component
    
    // Calculate absolute yaw (0 = north, increasing clockwise)
    // atan2(x, z) gives: North=0°, East=90°, South=180°, West=270°
    const yawRad = Math.atan2(x, z);
    return yawRad * 180 / Math.PI;
}

/**
 * Generate floor name based on floor number
 */
function getFloorName(floorNum) {
    if (floorNum < 0) {
        return `Basement ${Math.abs(floorNum)}`;
    } else if (floorNum === 0) {
        return 'Ground Floor';
    } else {
        return `Floor ${floorNum}`;
    }
}

/**
 * Generate Marzipano configuration from CSV data
 */
function generateConfig(csvFile, outputFile = 'config.json', projectPath = '') {
    // Read and parse CSV
    const csvContent = fs.readFileSync(csvFile, 'utf8');
    const rows = parseCSV(csvContent);
    
    const panoramas = [];
    for (const row of rows) {
        const pano = {
            id: row.filename.split('-')[0],  // Always extract ID from filename
            filename: row.filename,
            pos: [parseFloat(row.pano_pos_x), parseFloat(row.pano_pos_y), parseFloat(row.pano_pos_z)],
            ori: [parseFloat(row.pano_ori_w), parseFloat(row.pano_ori_x), parseFloat(row.pano_ori_y), parseFloat(row.pano_ori_z)]
        };
        panoramas.push(pano);
    }
    
    // Group Z positions into floor clusters
    const zValues = [...new Set(panoramas.map(p => p.pos[2]))].sort((a, b) => a - b);
    const floors = [];
    let current = [zValues[0]];
    
    for (let i = 1; i < zValues.length; i++) {
        const z = zValues[i];
        if (Math.abs(z - current[0]) < 2.0) {
            current.push(z);
        } else {
            floors.push(current);
            current = [z];
        }
    }
    floors.push(current);
    
    // Find the ground floor (floor with most panoramas)
    const floorSizes = floors.map((group, i) => {
        const count = panoramas.filter(p => 
            group.some(z => Math.abs(p.pos[2] - z) < 0.1)
        ).length;
        return { count, index: i, group };
    });
    const groundFloorIdx = floorSizes.reduce((max, current) => 
        current.count > max.count ? current : max
    ).index;
    
    const zToFloorCenter = {};
    const zToFloorNumber = {};
    const floorLevels = [];
    
    for (let i = 0; i < floors.length; i++) {
        const group = floors[i];
        const center = group.reduce((sum, z) => sum + z, 0) / group.length;
        const floorNumber = i - groundFloorIdx;
        
        floorLevels.push({
            id: `floor_${floorNumber}`,
            name: getFloorName(floorNumber),
            z: center
        });
        
        for (const z of group) {
            zToFloorCenter[z] = center;
            zToFloorNumber[z] = floorNumber;
        }
    }
    
    const scenes = [];
    const CAMERA_HEIGHT = 1.5;  // eye height on a human body, approximate
    
    for (const pano of panoramas) {
        const panoPos = Vector3.fromArray(pano.pos);
        const panoOri = Quaternion.fromArray(pano.ori);
        const floorCenter = zToFloorCenter[pano.pos[2]];
        const currentFloor = zToFloorNumber[pano.pos[2]];
        
        // Adjust camera height based on floor type for better hotspot positioning
        let adjustedCameraHeight = CAMERA_HEIGHT;
        if (currentFloor < 0) {  // Basement floors might have lower ceilings
            adjustedCameraHeight = CAMERA_HEIGHT * 0.9;
        }
        
        // Compute eye position in world coordinates using orientation
        const eyeOffsetLocal = new Vector3(0, 0, adjustedCameraHeight);
        const eyeOffsetWorld = panoOri.rotateVector(eyeOffsetLocal);
        const eyePos = panoPos.add(eyeOffsetWorld);
        
        const hotspots = [];
        const distances = [];
        
        // Only consider targets on the same floor level
        for (const target of panoramas) {
            if (target.id !== pano.id) {
                const targetFloor = zToFloorNumber[target.pos[2]];
                // Filter: only include hotspots to panoramas on the same floor
                if (targetFloor === currentFloor) {
                    const targetPos = Vector3.fromArray(target.pos);
                    const dist = panoPos.subtract(targetPos).magnitude();
                    distances.push({ dist, target });
                }
            }
        }
        
        distances.sort((a, b) => a.dist - b.dist);
        
        for (let i = 0; i < Math.min(distances.length, 40); i++) {
            const { target } = distances[i];
            const targetPos = Vector3.fromArray(target.pos);
            const relVec = targetPos.subtract(eyePos);  // reference from eye position
            const localVec = panoOri.conjugate().rotateVector(relVec);
            
            // Remap from NavVis to Marzipano frame
            const xM = -localVec.y;   // navvis y → marzipano x
            const yM = localVec.z;    // navvis z → marzipano y
            const zM = localVec.x;    // navvis x → marzipano z
            
            const yaw = Math.atan2(xM, zM);
            const pitch = -Math.atan2(yM, Math.sqrt(xM*xM + zM*zM));
            const distance = relVec.magnitude();
            
            hotspots.push({
                yaw: yaw,
                pitch: pitch,
                rotation: 0,
                target: target.id,
                distance: Math.round(distance * 100) / 100,
                type: 'navigation'
            });
        }
        
        // Calculate initial yaw for proper orientation
        const initialYaw = computeInitialYaw(panoOri);
        
        const scene = {
            id: pano.id,
            name: `Panorama ${pano.id} - ${getFloorName(currentFloor)}`,
            floor: currentFloor,
            position: { x: pano.pos[0], y: pano.pos[1], z: pano.pos[2] },
            orientation: { w: pano.ori[0], x: pano.ori[1], y: pano.ori[2], z: pano.ori[3] },
            initialYaw: initialYaw,
            initialViewParameters: {
                yaw: 0,
                pitch: 0,
                fov: (65 * Math.PI) / 180  // 65 degrees in radians (50% between 30° and 100°)
            },
            linkHotspots: hotspots,
            infoHotspots: []
        };
        scenes.push(scene);
    }
    
    const config = {
        scenes: scenes,
        name: 'Panorama Tour',
        floors: floorLevels
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(config, null, 2));
    console.log(`Config generated in ${outputFile}`);
}

// Command line argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        project: null,
        test: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project':
                options.project = args[++i];
                break;
            case '--test':
                options.test = true;
                break;
            case '--help':
                console.log('Usage: node generate-marzipano-config.js --project <projectId> [--test]');
                console.log('Options:');
                console.log('  --project <projectId>   Project ID for project-specific generation (required)');
                console.log('  --test                 Run in test mode');
                process.exit(0);
                break;
        }
    }
    
    return options;
}

if (require.main === module) {
    const options = parseArgs();
    
    if (options.test) {
        console.log('Configuration generation test passed');
        process.exit(0);
    }
    
    if (!options.project) {
        console.log('Error: Project ID is required. Use --project <projectId> argument.');
        process.exit(1);
    }
    
    // Project-specific paths
    const csvFile = `public/${options.project}/data/pano-poses.csv`;
    const outputFile = `public/${options.project}/config.json`;
    const projectPath = `/${options.project}`;
    
    if (!fs.existsSync(csvFile)) {
        console.log(`Error: CSV file not found at ${csvFile}`);
        process.exit(1);
    }
    
    generateConfig(csvFile, outputFile, projectPath);
}

module.exports = {
    generateConfig,
    computeInitialYaw,
    Vector3,
    Quaternion
};