#!/usr/bin/env python3
"""
calculate_north_offsets.py - Calculate northOffset values from quaternion orientations
"""

import json
import math
import numpy as np
from pathlib import Path

def quaternion_to_yaw(w, x, y, z):
    """
    Convert quaternion to yaw angle (rotation around Z-axis)
    Returns yaw in degrees
    """
    # Normalize quaternion
    norm = math.sqrt(w*w + x*x + y*y + z*z)
    if norm > 0:
        w, x, y, z = w/norm, x/norm, y/norm, z/norm
    
    # Calculate yaw from quaternion
    # yaw = atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z))
    yaw = math.atan2(2*(w*z + x*y), 1 - 2*(y*y + z*z))
    
    # Convert to degrees
    return math.degrees(yaw)

def calculate_north_offsets(config_file='public/config.json', reference_scene_id=None):
    """
    Calculate northOffset values for all scenes based on their quaternion orientations
    
    Args:
        config_file: Path to the config.json file
        reference_scene_id: ID of the scene to use as reference (0 offset)
                           If None, uses the first scene
    """
    
    # Load configuration
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    scenes = config['scenes']
    
    if not scenes:
        print("No scenes found in configuration")
        return
    
    # Determine reference scene
    if reference_scene_id is None:
        reference_scene = scenes[0]
        reference_scene_id = reference_scene['id']
    else:
        reference_scene = next((s for s in scenes if s['id'] == reference_scene_id), None)
        if not reference_scene:
            print(f"Reference scene {reference_scene_id} not found")
            return
    
    # Calculate reference yaw
    ref_orientation = reference_scene['orientation']
    reference_yaw = quaternion_to_yaw(
        ref_orientation['w'], 
        ref_orientation['x'], 
        ref_orientation['y'], 
        ref_orientation['z']
    )
    
    print(f"Using scene '{reference_scene_id}' as reference (yaw: {reference_yaw:.1f}°)")
    print("\nCalculated northOffset values:")
    print("-" * 50)
    
    # Calculate offsets for all scenes
    for scene in scenes:
        orientation = scene['orientation']
        scene_yaw = quaternion_to_yaw(
            orientation['w'], 
            orientation['x'], 
            orientation['y'], 
            orientation['z']
        )
        
        # Calculate offset relative to reference
        north_offset = scene_yaw - reference_yaw
        
        # Normalize to [-180, 180] range
        while north_offset > 180:
            north_offset -= 360
        while north_offset <= -180:
            north_offset += 360
        
        # Update scene with calculated offset
        scene['northOffset'] = round(north_offset, 1)
        
        print(f"Scene {scene['id']:6s}: yaw={scene_yaw:7.1f}° -> northOffset={north_offset:7.1f}°")
    
    # Save updated configuration
    backup_file = config_file + '.backup'
    print(f"\nCreating backup: {backup_file}")
    
    with open(backup_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"Updated {config_file} with calculated northOffset values")
    print(f"\nTotal scenes processed: {len(scenes)}")

def analyze_orientations(config_file='public/config.json'):
    """
    Analyze the orientation distribution of all scenes
    """
    with open(config_file, 'r') as f:
        config = json.load(f)
    
    scenes = config['scenes']
    yaws = []
    
    print("Scene Orientation Analysis:")
    print("-" * 60)
    print(f"{'Scene ID':10s} {'Yaw (°)':>10s} {'Current Offset':>15s}")
    print("-" * 60)
    
    for scene in scenes:
        orientation = scene['orientation']
        yaw = quaternion_to_yaw(
            orientation['w'], 
            orientation['x'], 
            orientation['y'], 
            orientation['z']
        )
        yaws.append(yaw)
        current_offset = scene.get('northOffset', 0)
        
        print(f"{scene['id']:10s} {yaw:10.1f} {current_offset:15.1f}")
    
    print("-" * 60)
    print(f"Yaw range: {min(yaws):.1f}° to {max(yaws):.1f}°")
    print(f"Yaw spread: {max(yaws) - min(yaws):.1f}°")
    print(f"Average yaw: {sum(yaws)/len(yaws):.1f}°")

if __name__ == '__main__':
    import sys
    
    if len(sys.argv) > 1:
        if sys.argv[1] == '--analyze':
            analyze_orientations()
        elif sys.argv[1] == '--reference' and len(sys.argv) > 2:
            calculate_north_offsets(reference_scene_id=sys.argv[2])
        else:
            print("Usage:")
            print("  python calculate_north_offsets.py                    # Calculate offsets using first scene as reference")
            print("  python calculate_north_offsets.py --reference 00005  # Use specific scene as reference")
            print("  python calculate_north_offsets.py --analyze          # Analyze current orientations")
    else:
        calculate_north_offsets()