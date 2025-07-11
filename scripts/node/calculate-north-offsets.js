#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Convert quaternion to yaw angle (rotation around Z-axis)
 * Returns yaw in degrees
 */
function quaternionToYaw(w, x, y, z) {
    // Normalize quaternion
    const norm = Math.sqrt(w*w + x*x + y*y + z*z);
    if (norm > 0) {
        w = w/norm;
        x = x/norm;
        y = y/norm;
        z = z/norm;
    }
    
    // Calculate yaw from quaternion
    // yaw = atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z))
    const yaw = Math.atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z));
    
    // Convert to degrees
    return yaw * 180 / Math.PI;
}

/**
 * Calculate northOffset values for all scenes based on their quaternion orientations
 */
function calculateNorthOffsets(configFile, referenceSceneId = null) {
    // Load configuration
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const scenes = config.scenes;
    
    if (!scenes || scenes.length === 0) {
        console.log('No scenes found in configuration');
        return;
    }
    
    // Determine reference scene
    let referenceScene;
    if (referenceSceneId === null) {
        referenceScene = scenes[0];
        referenceSceneId = referenceScene.id;
    } else {
        referenceScene = scenes.find(s => s.id === referenceSceneId);
        if (!referenceScene) {
            console.log(`Reference scene ${referenceSceneId} not found`);
            return;
        }
    }
    
    // Calculate reference yaw
    const refOrientation = referenceScene.orientation;
    const referenceYaw = quaternionToYaw(
        refOrientation.w,
        refOrientation.x,
        refOrientation.y,
        refOrientation.z
    );
    
    console.log(`Using scene '${referenceSceneId}' as reference (yaw: ${referenceYaw.toFixed(1)}°)`);
    console.log('\nCalculated northOffset values:');
    console.log('-'.repeat(50));
    
    // Calculate offsets for all scenes
    for (const scene of scenes) {
        const orientation = scene.orientation;
        const sceneYaw = quaternionToYaw(
            orientation.w,
            orientation.x,
            orientation.y,
            orientation.z
        );
        
        // Calculate offset relative to reference
        let northOffset = sceneYaw - referenceYaw;
        
        // Normalize to [-180, 180] range
        while (northOffset > 180) {
            northOffset -= 360;
        }
        while (northOffset <= -180) {
            northOffset += 360;
        }
        
        // Update scene with calculated offset
        scene.northOffset = Math.round(northOffset * 10) / 10;
        
        console.log(`Scene ${scene.id.padEnd(6)}: yaw=${sceneYaw.toFixed(1).padStart(7)}° -> northOffset=${northOffset.toFixed(1).padStart(7)}°`);
    }
    
    // Save updated configuration
    const backupFile = configFile + '.backup';
    console.log(`\nCreating backup: ${backupFile}`);
    
    fs.writeFileSync(backupFile, JSON.stringify(config, null, 2));
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    
    console.log(`Updated ${configFile} with calculated northOffset values`);
    console.log(`\nTotal scenes processed: ${scenes.length}`);
}

/**
 * Analyze the orientation distribution of all scenes
 */
function analyzeOrientations(configFile) {
    const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    const scenes = config.scenes;
    const yaws = [];
    
    console.log('Scene Orientation Analysis:');
    console.log('-'.repeat(60));
    console.log(`${'Scene ID'.padEnd(10)} ${'Yaw (°)'.padStart(10)} ${'Current Offset'.padStart(15)}`);
    console.log('-'.repeat(60));
    
    for (const scene of scenes) {
        const orientation = scene.orientation;
        const yaw = quaternionToYaw(
            orientation.w,
            orientation.x,
            orientation.y,
            orientation.z
        );
        yaws.push(yaw);
        const currentOffset = scene.northOffset || 0;
        
        console.log(`${scene.id.padEnd(10)} ${yaw.toFixed(1).padStart(10)} ${currentOffset.toFixed(1).padStart(15)}`);
    }
    
    console.log('-'.repeat(60));
    console.log(`Yaw range: ${Math.min(...yaws).toFixed(1)}° to ${Math.max(...yaws).toFixed(1)}°`);
    console.log(`Yaw spread: ${(Math.max(...yaws) - Math.min(...yaws)).toFixed(1)}°`);
    console.log(`Average yaw: ${(yaws.reduce((a, b) => a + b, 0) / yaws.length).toFixed(1)}°`);
}

// Command line argument parsing
function parseArgs() {
    const args = process.argv.slice(2);
    const options = {
        project: null,
        reference: null,
        analyze: false
    };
    
    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--project':
                options.project = args[++i];
                break;
            case '--reference':
                options.reference = args[++i];
                break;
            case '--analyze':
                options.analyze = true;
                break;
            case '--help':
                console.log('Usage: node calculate-north-offsets.js --project <projectId> [--reference <sceneId>] [--analyze]');
                console.log('Options:');
                console.log('  --project <projectId>   Project ID for project-specific calculation (required)');
                console.log('  --reference <sceneId>   Reference scene ID to use as 0 offset');
                console.log('  --analyze              Analyze current orientations');
                process.exit(0);
                break;
        }
    }
    
    return options;
}

if (require.main === module) {
    const options = parseArgs();
    
    if (!options.project) {
        console.log('Error: Project ID is required. Use --project <projectId> argument.');
        process.exit(1);
    }
    
    // Project-specific paths
    const configFile = `public/${options.project}/config.json`;
    
    if (!fs.existsSync(configFile)) {
        console.log(`Error: Config file not found at ${configFile}`);
        process.exit(1);
    }
    
    if (options.analyze) {
        analyzeOrientations(configFile);
    } else if (options.reference) {
        calculateNorthOffsets(configFile, options.reference);
    } else {
        calculateNorthOffsets(configFile);
    }
}

module.exports = {
    quaternionToYaw,
    calculateNorthOffsets,
    analyzeOrientations
};