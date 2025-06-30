#!/usr/bin/env python3
"""
generate_marzipano_config.py - Fine-tuning version
"""

import json
import csv
import numpy as np
from pathlib import Path
import math

# Camera height offset (positive 1.2 seems to work better than negative)
CAMERA_TO_GROUND_OFFSET = 1.2

def quaternion_to_rotation_matrix(w, x, y, z):
    """Convert quaternion to 3x3 rotation matrix"""
    norm = math.sqrt(w*w + x*x + y*y + z*z)
    if norm > 0:
        w, x, y, z = w/norm, x/norm, y/norm, z/norm
    
    return np.array([
        [1 - 2*(y**2 + z**2), 2*(x*y - w*z), 2*(x*z + w*y)],
        [2*(x*y + w*z), 1 - 2*(x**2 + z**2), 2*(y*z - w*x)],
        [2*(x*z - w*y), 2*(y*z + w*x), 1 - 2*(x**2 + y**2)]
    ])

def world_to_panorama_coordinates(target_pos, pano_pos, pano_orientation, 
                                  coordinate_mode='standard', yaw_offset=0, pitch_offset=0):
    """
    Convert world coordinates to panorama-relative yaw/pitch
    
    Args:
        target_pos: Target position [x, y, z]
        pano_pos: Panorama position [x, y, z]
        pano_orientation: Quaternion [w, x, y, z]
        coordinate_mode: 'standard', 'inverted_x', 'inverted_y', 'swapped_xy'
        yaw_offset: Additional yaw rotation in degrees
        pitch_offset: Additional pitch rotation in degrees
    """
    # Calculate relative position vector
    relative_pos = np.array(target_pos) - np.array(pano_pos)
    
    # Get rotation matrix from quaternion
    R = quaternion_to_rotation_matrix(*pano_orientation)
    
    # Transform to panorama's local coordinate system
    local_pos = R.T @ relative_pos
    
    x, y, z = local_pos
    
    # Try different coordinate interpretations
    if coordinate_mode == 'standard':
        forward = x
        right = -y
        up = z + CAMERA_TO_GROUND_OFFSET
    elif coordinate_mode == 'inverted_x':
        forward = -x
        right = y
        up = z + CAMERA_TO_GROUND_OFFSET
    elif coordinate_mode == 'inverted_y':
        forward = x
        right = y
        up = z + CAMERA_TO_GROUND_OFFSET
    elif coordinate_mode == 'swapped_xy':
        forward = y
        right = x
        up = z + CAMERA_TO_GROUND_OFFSET
    elif coordinate_mode == 'navvis':
        # NavVis style coordinate system
        forward = -y
        right = x
        up = z + CAMERA_TO_GROUND_OFFSET
    else:
        forward = x
        right = -y
        up = z + CAMERA_TO_GROUND_OFFSET
    
    # Calculate yaw and pitch
    yaw = math.atan2(right, forward) + math.radians(yaw_offset)
    
    distance_horizontal = math.sqrt(forward**2 + right**2)
    pitch = math.atan2(up, distance_horizontal) + math.radians(pitch_offset)
    
    return yaw, pitch

def test_coordinate_systems(panoramas):
    """Test different coordinate systems to find the best match"""
    if len(panoramas) < 2:
        return
    
    print("\n=== COORDINATE SYSTEM TEST ===")
    
    # Get two panoramas that should be aligned (e.g., in a hallway)
    pano1 = panoramas[0]
    pano2 = panoramas[1]
    
    pos1 = [pano1['pano_pos_x'], pano1['pano_pos_y'], pano1['pano_pos_z']]
    ori1 = [pano1['pano_ori_w'], pano1['pano_ori_x'], pano1['pano_ori_y'], pano1['pano_ori_z']]
    pos2 = [pano2['pano_pos_x'], pano2['pano_pos_y'], pano2['pano_pos_z']]
    
    # Calculate real-world angle
    dx = pos2[0] - pos1[0]
    dy = pos2[1] - pos1[1]
    real_angle = math.degrees(math.atan2(dy, dx))
    
    print(f"\nTesting panorama {pano1['id']} looking at {pano2['id']}")
    print(f"Real-world angle: {real_angle:.1f}°")
    
    # Test different coordinate modes
    modes = ['standard', 'inverted_x', 'inverted_y', 'swapped_xy', 'navvis']
    
    for mode in modes:
        yaw, pitch = world_to_panorama_coordinates(pos2, pos1, ori1, mode)
        print(f"\n{mode:12s}: yaw={math.degrees(yaw):6.1f}°, pitch={math.degrees(pitch):6.1f}°")

def calculate_distance(pos1, pos2):
    """Calculate 2D distance between two positions"""
    return math.sqrt((pos1[0] - pos2[0])**2 + (pos1[1] - pos2[1])**2)

def analyze_floor_distribution(panoramas):
    """Group panoramas into floors based on Z coordinate"""
    z_positions = sorted(set(p['pano_pos_z'] for p in panoramas))
    
    # Group Z positions into floors
    floor_groups = []
    current_group = [z_positions[0]]
    
    for i in range(1, len(z_positions)):
        if z_positions[i] - current_group[0] < 2.0:
            current_group.append(z_positions[i])
        else:
            floor_groups.append(current_group)
            current_group = [z_positions[i]]
    
    floor_groups.append(current_group)
    
    # Create Z to floor mapping
    z_to_floor = {}
    floor_pano_counts = []
    
    for i, group in enumerate(floor_groups):
        count = sum(1 for p in panoramas if p['pano_pos_z'] in group)
        floor_pano_counts.append(count)
    
    base_floor_idx = floor_pano_counts.index(max(floor_pano_counts))
    
    for i, group in enumerate(floor_groups):
        floor_number = i - base_floor_idx
        for z in group:
            z_to_floor[z] = floor_number
    
    # Apply floor mapping
    for pano in panoramas:
        pano['floor'] = z_to_floor[pano['pano_pos_z']]
    
    return panoramas

def find_connected_panoramas(panoramas, max_distance=10.0, max_connections=20):
    """Find connections between panoramas on the same floor"""
    connections = {}
    
    for pano in panoramas:
        pano_id = pano['id']
        pano_pos = [pano['pano_pos_x'], pano['pano_pos_y']]
        pano_floor = pano['floor']
        
        distances = []
        for other in panoramas:
            if other['id'] != pano_id and other['floor'] == pano_floor:
                other_pos = [other['pano_pos_x'], other['pano_pos_y']]
                dist = calculate_distance(pano_pos, other_pos)
                distances.append((dist, other['id']))
        
        distances.sort()
        connections[pano_id] = []
        
        for dist, other_id in distances[:max_connections]:
            if dist <= max_distance:
                connections[pano_id].append(other_id)
    
    return connections

def generate_config(csv_file, output_file='public/config.json', coordinate_mode='standard', 
                   yaw_offset=0, pitch_offset=0):
    """Generate Marzipano configuration"""
    
    # Read CSV data
    panoramas = []
    
    print(f"Reading CSV file: {csv_file}")
    print(f"Using offset: {CAMERA_TO_GROUND_OFFSET}m")
    print(f"Coordinate mode: {coordinate_mode}")
    if yaw_offset != 0:
        print(f"Yaw offset: {yaw_offset}°")
    if pitch_offset != 0:
        print(f"Pitch offset: {pitch_offset}°")
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        first_line = f.readline().strip()
        f.seek(0)
        
        delimiter = ';' if ';' in first_line else ','
        reader = csv.DictReader(f, delimiter=delimiter)
        
        for idx, row in enumerate(reader):
            try:
                cleaned_row = {k.strip(): v.strip() for k, v in row.items() if k and v}
                
                id_value = None
                for key in ['ID', 'id', 'Id']:
                    if key in cleaned_row:
                        id_value = cleaned_row[key]
                        break
                
                if not id_value:
                    filename = cleaned_row.get('filename', '')
                    id_value = filename.split('-')[0] if filename else str(idx).zfill(5)
                
                pano = {
                    'id': id_value,
                    'filename': cleaned_row.get('filename', f'{id_value}-pano.jpg'),
                    'pano_pos_x': float(cleaned_row.get('pano_pos_x', 0)),
                    'pano_pos_y': float(cleaned_row.get('pano_pos_y', 0)),
                    'pano_pos_z': float(cleaned_row.get('pano_pos_z', 0)),
                    'pano_ori_w': float(cleaned_row.get('pano_ori_w', 1)),
                    'pano_ori_x': float(cleaned_row.get('pano_ori_x', 0)),
                    'pano_ori_y': float(cleaned_row.get('pano_ori_y', 0)),
                    'pano_ori_z': float(cleaned_row.get('pano_ori_z', 0))
                }
                panoramas.append(pano)
                
            except Exception as e:
                print(f"Error processing row {idx}: {e}")
                continue
    
    print(f"Successfully loaded {len(panoramas)} panoramas")
    
    # Test coordinate systems
    test_coordinate_systems(panoramas)
    
    # Analyze floors
    panoramas = analyze_floor_distribution(panoramas)
    
    # Find connections
    connections = find_connected_panoramas(panoramas)
    
    # Generate scenes
    scenes = []
    
    for pano in panoramas:
        pano_pos = [pano['pano_pos_x'], pano['pano_pos_y'], pano['pano_pos_z']]
        pano_ori = [pano['pano_ori_w'], pano['pano_ori_x'], pano['pano_ori_y'], pano['pano_ori_z']]
        
        hotspots = []
        
        for target_id in connections.get(pano['id'], []):
            target_pano = next((p for p in panoramas if p['id'] == target_id), None)
            if not target_pano:
                continue
            
            target_pos = [target_pano['pano_pos_x'], target_pano['pano_pos_y'], target_pano['pano_pos_z']]
            
            # Calculate yaw and pitch with adjustments
            yaw, pitch = world_to_panorama_coordinates(
                target_pos, pano_pos, pano_ori, 
                coordinate_mode, yaw_offset, pitch_offset
            )
            
            distance = calculate_distance(pano_pos[:2], target_pos[:2])
            
            hotspot = {
                'yaw': yaw,
                'pitch': pitch,
                'rotation': 0,
                'target': target_id,
                'distance': round(distance, 2),
                'type': 'navigation'
            }
            hotspots.append(hotspot)
        
        hotspots.sort(key=lambda h: h['distance'])
        
        scene = {
            'id': pano['id'],
            'name': f"Panorama {pano['id']}",
            'floor': pano['floor'],
            'position': {
                'x': pano['pano_pos_x'],
                'y': pano['pano_pos_y'],
                'z': pano['pano_pos_z']
            },
            'orientation': {
                'w': pano['pano_ori_w'],
                'x': pano['pano_ori_x'],
                'y': pano['pano_ori_y'],
                'z': pano['pano_ori_z']
            },
            'levels': [
                {
                    'tileSize': 256,
                    'size': 256,
                    'fallbackOnly': True
                },
                {
                    'tileSize': 512,
                    'size': 512
                },
                {
                    'tileSize': 512,
                    'size': 1024
                },
                {
                    'tileSize': 512,
                    'size': 2048
                }
            ],
            'faceSize': 2048,
            'initialViewParameters': {
                'yaw': 0,
                'pitch': 0,
                'fov': 90
            },
            'linkHotspots': hotspots,
                        'infoHotspots': []
        }
        scenes.append(scene)
    
    # Generate final configuration
    config = {
        'scenes': scenes,
        'name': 'Panorama Tour',
        'settings': {
            'mouseViewMode': 'drag',
            'autorotateEnabled': False,
            'fullscreenButton': True,
            'viewControlButtons': True
        },
        'viewer': {
            'cameraToGroundOffset': CAMERA_TO_GROUND_OFFSET,
            'coordinateMode': coordinate_mode,
            'yawOffset': yaw_offset,
            'pitchOffset': pitch_offset
        }
    }
    
    # Write to file
    with open(output_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print(f"\nGenerated {output_file} with {len(scenes)} scenes")
    print(f"\nIf hotspots are still shifted, try these adjustments:")
    print("  --mode navvis        # Try NavVis coordinate system")
    print("  --yaw-offset 90      # Rotate hotspots by 90 degrees")
    print("  --pitch-offset -5    # Adjust pitch angle")
    print("  --offset 1.5         # Change camera height offset")


if __name__ == '__main__':
    import sys
    
    # Default values
    coordinate_mode = 'standard'
    yaw_offset = 0
    pitch_offset = 0
    
    # Parse command line arguments
    args = sys.argv[1:]
    i = 0
    while i < len(args):
        if args[i] == '--offset' and i + 1 < len(args):
            try:
                CAMERA_TO_GROUND_OFFSET = float(args[i + 1])
                i += 2
            except ValueError:
                print(f"Invalid offset value: {args[i + 1]}")
                i += 1
        elif args[i] == '--mode' and i + 1 < len(args):
            coordinate_mode = args[i + 1]
            i += 2
        elif args[i] == '--yaw-offset' and i + 1 < len(args):
            try:
                yaw_offset = float(args[i + 1])
                i += 2
            except ValueError:
                print(f"Invalid yaw offset: {args[i + 1]}")
                i += 1
        elif args[i] == '--pitch-offset' and i + 1 < len(args):
            try:
                pitch_offset = float(args[i + 1])
                i += 2
            except ValueError:
                print(f"Invalid pitch offset: {args[i + 1]}")
                i += 1
        elif args[i] == '--test':
            # Run in test mode to find best parameters
            print("Running coordinate system test...")
            generate_config('public/data/pano-poses.csv', 'config_test.json', 'standard', 0, 0)
            print("\nNow try different modes to see which one aligns best:")
            print("  python3 generate_marzipano_config.py --mode navvis")
            print("  python3 generate_marzipano_config.py --mode inverted_x")
            print("  python3 generate_marzipano_config.py --mode swapped_xy")
            sys.exit(0)
        else:
            i += 1
    
    # Generate configuration
    generate_config('public/data/pano-poses.csv', 'config.json', coordinate_mode, yaw_offset, pitch_offset)