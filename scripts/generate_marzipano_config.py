#!/usr/bin/env python3

import json
import csv
import numpy as np
import math

def quaternion_conjugate(q):
    w, x, y, z = q
    return np.array([w, -x, -y, -z])

def quaternion_multiply(a, b):
    w1, x1, y1, z1 = a
    w2, x2, y2, z2 = b
    return np.array([
        w1*w2 - x1*x2 - y1*y2 - z1*z2,
        w1*x2 + x1*w2 + y1*z2 - z1*y2,
        w1*y2 - x1*z2 + y1*w2 + z1*x2,
        w1*z2 + x1*y2 - y1*x2 + z1*w2
    ])

def quaternion_rotate_vector(q, v):
    q_conj = quaternion_conjugate(q)
    q_v = np.array([0] + list(v))
    rotated = quaternion_multiply(quaternion_multiply(q, q_v), q_conj)
    return rotated[1:]

def generate_config(csv_file, output_file='config.json'):
    panoramas = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        delimiter = ';' if ';' in f.readline() else ','
        f.seek(0)
        reader = csv.DictReader(f, delimiter=delimiter)
        reader.fieldnames = [name.strip() for name in reader.fieldnames]
        for row in reader:
            row = {k.strip(): v.strip() for k, v in row.items()}
            pano = {
                'id': row.get('ID') or row.get('id') or row.get('Id') or row.get('filename').split('-')[0],
                'filename': row.get('filename'),
                'pos': [float(row['pano_pos_x']), float(row['pano_pos_y']), float(row['pano_pos_z'])],
                'ori': [float(row['pano_ori_w']), float(row['pano_ori_x']), float(row['pano_ori_y']), float(row['pano_ori_z'])]
            }
            panoramas.append(pano)

    # group Z positions into floor clusters
    z_values = sorted(set(p['pos'][2] for p in panoramas))
    floors = []
    current = [z_values[0]]
    for z in z_values[1:]:
        if abs(z - current[0]) < 2.0:
            current.append(z)
        else:
            floors.append(current)
            current = [z]
    floors.append(current)

    # assign floor centers
    z_to_floor_center = {}
    for group in floors:
        center = sum(group) / len(group)
        for z in group:
            z_to_floor_center[z] = center

    scenes = []
    CAMERA_HEIGHT = 1.5  # eye height on a human body, approximate
    for pano in panoramas:
        pano_pos = pano['pos']
        pano_ori = pano['ori']
        floor_center = z_to_floor_center[pano_pos[2]]

        # compute eye position in world coordinates using orientation
        eye_offset_local = np.array([0, 0, CAMERA_HEIGHT])
        eye_offset_world = quaternion_rotate_vector(pano_ori, eye_offset_local)
        eye_pos = np.array(pano_pos) + eye_offset_world

        hotspots = []
        distances = []
        for target in panoramas:
            if target['id'] != pano['id']:
                dist = np.linalg.norm(np.array(target['pos']) - np.array(pano_pos))
                distances.append((dist, target))
        distances.sort(key=lambda x: x[0])
        for _, target in distances[:10]:
            target_pos = target['pos']
            rel_vec = np.array(target_pos) - eye_pos  # reference from eye position
            local_vec = quaternion_rotate_vector(quaternion_conjugate(pano_ori), rel_vec)

            # remap from NavVis to Marzipano frame
            x_m = -local_vec[1]   # navvis y → marzipano x
            y_m = local_vec[2]    # navvis z → marzipano y
            z_m = local_vec[0]    # navvis x → marzipano z

            yaw = math.atan2(x_m, z_m)
            pitch = -math.atan2(y_m, math.sqrt(x_m**2 + z_m**2))
            distance = np.linalg.norm(rel_vec)
            hotspots.append({
                'yaw': yaw,
                'pitch': pitch,
                'rotation': 0,
                'target': target['id'],
                'distance': round(distance, 2),
                'type': 'navigation'
            })
        scene = {
            'id': pano['id'],
            'name': f"Panorama {pano['id']}",
            'position': dict(zip(['x','y','z'], pano['pos'])),
            'orientation': dict(zip(['w','x','y','z'], pano['ori'])),
            'initialViewParameters': {
                'yaw': 0,
                'pitch': 0,
                'fov': math.radians(90)
            },
            'linkHotspots': hotspots,
            'infoHotspots': []
        }
        scenes.append(scene)
    config = {'scenes': scenes, 'name': 'Panorama Tour'}
    with open(output_file, 'w') as f:
        json.dump(config, f, indent=2)
    print(f"Config generated in {output_file}")

if __name__ == '__main__':
    generate_config('public/data/pano-poses.csv')
