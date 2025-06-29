import {
  getEnvironmentConfig,
  loadPanoramaConfig,
  validateConfig,
  getDebugInfo,
  formatErrorMessage,
  checkConfigExists,
  getConfigStatus,
} from '../src/lib/config';

describe('Configuration Utilities', () => {
  describe('getEnvironmentConfig', () => {
    it('should return default configuration', () => {
      const config = getEnvironmentConfig();
      
      expect(config).toEqual({
        PANORAMA_CONFIG_MODE: 'standard',
        PANORAMA_YAW_OFFSET: 0,
        PANORAMA_PITCH_OFFSET: 0,
        PANORAMA_CAMERA_OFFSET: 1.2,
        PANORAMA_MAX_DISTANCE: 10.0,
        PANORAMA_MAX_CONNECTIONS: 6,
        NEXT_PUBLIC_DEV_MODE: true,
        NEXT_PUBLIC_SHOW_DEBUG_INFO: false,
      });
    });

    it('should parse environment variables correctly', () => {
      const originalEnv = process.env;
      process.env = {
        ...originalEnv,
        PANORAMA_YAW_OFFSET: '45.5',
        PANORAMA_MAX_CONNECTIONS: '8',
        NEXT_PUBLIC_DEV_MODE: 'false',
      };

      const config = getEnvironmentConfig();
      
      expect(config.PANORAMA_YAW_OFFSET).toBe(45.5);
      expect(config.PANORAMA_MAX_CONNECTIONS).toBe(8);
      expect(config.NEXT_PUBLIC_DEV_MODE).toBe(false);

      process.env = originalEnv;
    });
  });

  describe('loadPanoramaConfig', () => {
    it('should load configuration successfully', async () => {
      const mockConfig = {
        scenes: [{ id: 'test', position: { x: 0, y: 0, z: 0 } }],
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockConfig,
      });

      const config = await loadPanoramaConfig();
      expect(config).toEqual(mockConfig);
      expect(fetch).toHaveBeenCalledWith('/config.json');
    });

    it('should throw error when fetch fails', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      await expect(loadPanoramaConfig()).rejects.toThrow('Failed to load config: 404');
    });

    it('should throw error when network fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(loadPanoramaConfig()).rejects.toThrow('Network error');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        scenes: [
          {
            id: 'scene1',
            position: { x: 0, y: 0, z: 0 },
            orientation: { yaw: 0, pitch: 0, roll: 0 },
          },
        ],
      };

      expect(validateConfig(validConfig)).toBe(true);
    });

    it('should reject invalid configuration', () => {
      expect(validateConfig(null)).toBe(false);
      expect(validateConfig({})).toBe(false);
      expect(validateConfig({ scenes: [] })).toBe(false);
      expect(validateConfig({ scenes: [{ id: 'test' }] })).toBe(false);
    });
  });

  describe('getDebugInfo', () => {
    it('should return debug information', () => {
      const debugInfo = getDebugInfo();
      
      expect(debugInfo).toHaveProperty('timestamp');
      expect(debugInfo).toHaveProperty('environment');
      expect(debugInfo).toHaveProperty('performance');
      expect(debugInfo.environment).toHaveProperty('NODE_ENV', 'test');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error for development mode', () => {
      const error = new Error('Test error');
      const message = formatErrorMessage(error);
      
      expect(message).toBe('Test error');
    });

    it('should format string error', () => {
      const message = formatErrorMessage('String error');
      
      expect(message).toBe('String error');
    });
  });

  describe('checkConfigExists', () => {
    it('should return true when config exists', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: true });
      
      const exists = await checkConfigExists();
      expect(exists).toBe(true);
      expect(fetch).toHaveBeenCalledWith('/config.json', { method: 'HEAD' });
    });

    it('should return false when config does not exist', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({ ok: false });
      
      const exists = await checkConfigExists();
      expect(exists).toBe(false);
    });

    it('should return false when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const exists = await checkConfigExists();
      expect(exists).toBe(false);
    });
  });

  describe('getConfigStatus', () => {
    it('should return config status when exists', async () => {
      const mockHeaders = new Map([
        ['last-modified', 'Wed, 21 Oct 2015 07:28:00 GMT'],
        ['content-length', '1024'],
      ]);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        headers: {
          get: (key: string) => mockHeaders.get(key) || null,
        },
      });
      
      const status = await getConfigStatus();
      
      expect(status).toEqual({
        exists: true,
        lastModified: 'Wed, 21 Oct 2015 07:28:00 GMT',
        size: '1024',
      });
    });

    it('should return error status when fetch fails', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const status = await getConfigStatus();
      
      expect(status).toEqual({
        exists: false,
        error: 'Network error',
      });
    });
  });
});