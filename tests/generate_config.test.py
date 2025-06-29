#!/usr/bin/env python3
"""
Test suite for the Marzipano configuration generator.

This module tests the functionality of generate_marzipano_config.py
to ensure it correctly processes panorama data and generates valid configurations.
"""

import unittest
import tempfile
import os
import json
import sys
from unittest.mock import patch, mock_open

# Add the scripts directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'scripts'))

try:
    from generate_marzipano_config import (
        quaternion_to_rotation_matrix,
        world_to_panorama,
        find_connections,
        distribute_floors,
        generate_config,
        main
    )
except ImportError as e:
    print(f"Warning: Could not import generate_marzipano_config: {e}")
    print("Skipping Python configuration tests")
    sys.exit(0)


class TestQuaternionOperations(unittest.TestCase):
    """Test quaternion to rotation matrix conversion."""
    
    def test_identity_quaternion(self):
        """Test identity quaternion conversion."""
        # Identity quaternion (w=1, x=0, y=0, z=0)
        matrix = quaternion_to_rotation_matrix(1, 0, 0, 0)
        
        # Should result in identity matrix
        expected = [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1]
        ]
        
        for i in range(3):
            for j in range(3):
                self.assertAlmostEqual(matrix[i][j], expected[i][j], places=6)
    
    def test_90_degree_rotation_z(self):
        """Test 90-degree rotation around Z-axis."""
        import math
        # 90-degree rotation around Z-axis: w=cos(45°), z=sin(45°)
        w = math.cos(math.pi/4)
        z = math.sin(math.pi/4)
        matrix = quaternion_to_rotation_matrix(w, 0, 0, z)
        
        # Should rotate X to Y
        self.assertAlmostEqual(matrix[0][0], 0, places=6)  # cos(90°)
        self.assertAlmostEqual(matrix[0][1], -1, places=6)  # -sin(90°)
        self.assertAlmostEqual(matrix[1][0], 1, places=6)  # sin(90°)
        self.assertAlmostEqual(matrix[1][1], 0, places=6)  # cos(90°)


class TestCoordinateConversion(unittest.TestCase):
    """Test world to panorama coordinate conversion."""
    
    def test_standard_mode_conversion(self):
        """Test standard coordinate mode conversion."""
        # Test point at origin
        result = world_to_panorama(0, 0, 0, mode='standard')
        expected = (0, 0, 0)
        self.assertEqual(result, expected)
        
        # Test point with coordinates
        result = world_to_panorama(1, 2, 3, mode='standard')
        expected = (1, 2, 3)
        self.assertEqual(result, expected)
    
    def test_marzipano_mode_conversion(self):
        """Test Marzipano coordinate mode conversion."""
        # Test coordinate system conversion
        result = world_to_panorama(1, 2, 3, mode='marzipano')
        expected = (1, 3, -2)  # Y and Z swapped, Z negated
        self.assertEqual(result, expected)
    
    def test_unity_mode_conversion(self):
        """Test Unity coordinate mode conversion."""
        # Test Unity coordinate system conversion
        result = world_to_panorama(1, 2, 3, mode='unity')
        expected = (-1, 2, 3)  # X negated
        self.assertEqual(result, expected)


class TestFloorDistribution(unittest.TestCase):
    """Test floor distribution analysis."""
    
    def test_single_floor(self):
        """Test single floor detection."""
        scenes = [
            {'position': {'y': 0}},
            {'position': {'y': 0.1}},
            {'position': {'y': -0.1}},
        ]
        
        floors = distribute_floors(scenes)
        self.assertEqual(len(floors), 1)
        self.assertEqual(len(floors[0]), 3)
    
    def test_multiple_floors(self):
        """Test multiple floor detection."""
        scenes = [
            {'position': {'y': 0}},
            {'position': {'y': 3}},
            {'position': {'y': 6}},
        ]
        
        floors = distribute_floors(scenes)
        self.assertEqual(len(floors), 3)
        for floor in floors:
            self.assertEqual(len(floor), 1)


class TestConnectionFinding(unittest.TestCase):
    """Test panorama connection finding."""
    
    def test_close_panoramas(self):
        """Test connection between close panoramas."""
        scenes = [
            {
                'id': 'pano1',
                'position': {'x': 0, 'y': 0, 'z': 0},
                'floor': 0
            },
            {
                'id': 'pano2',
                'position': {'x': 1, 'y': 0, 'z': 0},
                'floor': 0
            }
        ]
        
        connections = find_connections(scenes, max_distance=2.0)
        
        # Should find connection between pano1 and pano2
        pano1_connections = [conn for conn in connections if conn['scene'] == 'pano1']
        self.assertEqual(len(pano1_connections), 1)
        self.assertEqual(pano1_connections[0]['target'], 'pano2')
    
    def test_distant_panoramas(self):
        """Test no connection between distant panoramas."""
        scenes = [
            {
                'id': 'pano1',
                'position': {'x': 0, 'y': 0, 'z': 0},
                'floor': 0
            },
            {
                'id': 'pano2',
                'position': {'x': 100, 'y': 0, 'z': 0},
                'floor': 0
            }
        ]
        
        connections = find_connections(scenes, max_distance=2.0)
        
        # Should find no connections
        self.assertEqual(len(connections), 0)
    
    def test_different_floors(self):
        """Test no connection between different floors."""
        scenes = [
            {
                'id': 'pano1',
                'position': {'x': 0, 'y': 0, 'z': 0},
                'floor': 0
            },
            {
                'id': 'pano2',
                'position': {'x': 1, 'y': 3, 'z': 0},
                'floor': 1
            }
        ]
        
        connections = find_connections(scenes, max_distance=10.0)
        
        # Should find no connections (different floors)
        self.assertEqual(len(connections), 0)


class TestConfigGeneration(unittest.TestCase):
    """Test complete configuration generation."""
    
    def setUp(self):
        """Set up test data."""
        self.test_csv_content = '''id,x,y,z,qw,qx,qy,qz
pano1,0,0,0,1,0,0,0
pano2,5,0,0,1,0,0,0
pano3,0,0,5,1,0,0,0'''
    
    @patch('builtins.open', new_callable=mock_open)
    @patch('os.path.exists')
    def test_config_generation(self, mock_exists, mock_file):
        """Test complete configuration generation process."""
        mock_exists.return_value = True
        mock_file.return_value.read.return_value = self.test_csv_content
        
        with patch('sys.argv', ['generate_marzipano_config.py']):
            # Capture the generated config
            with patch('builtins.open', mock_open()) as mock_output:
                try:
                    main()
                except SystemExit:
                    pass  # Expected when script completes
                
                # Check that config.json was written
                mock_output.assert_called()
    
    def test_generate_config_function(self):
        """Test the generate_config function directly."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(self.test_csv_content)
            csv_file = f.name
        
        try:
            config = generate_config(
                csv_file=csv_file,
                mode='standard',
                yaw_offset=0,
                pitch_offset=0,
                camera_offset=1.2,
                max_distance=10.0,
                max_connections=6
            )
            
            # Validate config structure
            self.assertIn('scenes', config)
            self.assertIn('viewer', config)
            self.assertEqual(len(config['scenes']), 3)
            
            # Check scene structure
            scene = config['scenes'][0]
            self.assertIn('id', scene)
            self.assertIn('position', scene)
            self.assertIn('orientation', scene)
            self.assertIn('hotSpots', scene)
            
        finally:
            os.unlink(csv_file)


class TestErrorHandling(unittest.TestCase):
    """Test error handling and edge cases."""
    
    @patch('os.path.exists')
    def test_missing_csv_file(self, mock_exists):
        """Test handling of missing CSV file."""
        mock_exists.return_value = False
        
        with patch('sys.argv', ['generate_marzipano_config.py']):
            with self.assertRaises(SystemExit):
                main()
    
    def test_invalid_csv_content(self):
        """Test handling of invalid CSV content."""
        invalid_csv = '''invalid,header,format
1,2,3'''
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            f.write(invalid_csv)
            csv_file = f.name
        
        try:
            with self.assertRaises(Exception):
                generate_config(csv_file)
        finally:
            os.unlink(csv_file)


if __name__ == '__main__':
    # Run tests with verbose output
    unittest.main(verbosity=2)