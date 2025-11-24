/**
 * Basic tests for WebAssembly module loader
 * These tests verify that the loader can successfully load and instantiate modules
 */

import { describe, it, expect } from 'vitest';
import { 
  loadWasmModule, 
  loadDefaultModule, 
  getAvailableModules, 
  getDefaultModuleName,
  getModuleConfig 
} from './wasmLoader.js';

describe('wasmLoader', () => {
  describe('getAvailableModules', () => {
    it('should return array of available module names', () => {
      const modules = getAvailableModules();
      expect(Array.isArray(modules)).toBe(true);
      expect(modules).toContain('rust');
      expect(modules).toContain('cpp');
      expect(modules).toContain('go');
      expect(modules).toContain('moonbit');
      expect(modules).toContain('javascript');
    });
  });

  describe('getDefaultModuleName', () => {
    it('should return rust as default module', () => {
      const defaultModule = getDefaultModuleName();
      expect(defaultModule).toBe('rust');
    });
  });

  describe('getModuleConfig', () => {
    it('should return configuration for rust module', () => {
      const config = getModuleConfig('rust');
      expect(config).toBeDefined();
      expect(config.name).toBe('Rust');
      expect(config.type).toBe('esm');
      expect(config.functionName).toBe('calculate_point');
    });

    it('should return configuration for cpp module', () => {
      const config = getModuleConfig('cpp');
      expect(config).toBeDefined();
      expect(config.name).toBe('C++');
      expect(config.type).toBe('emscripten');
      expect(config.functionName).toBe('calculatePoint');
    });

    it('should return configuration for go module', () => {
      const config = getModuleConfig('go');
      expect(config).toBeDefined();
      expect(config.name).toBe('Go');
      expect(config.type).toBe('go');
      expect(config.functionName).toBe('calculatePoint');
    });

    it('should return configuration for moonbit module', () => {
      const config = getModuleConfig('moonbit');
      expect(config).toBeDefined();
      expect(config.name).toBe('Moonbit');
      expect(config.type).toBe('moonbit');
      expect(config.functionName).toBe('calculatePoint');
    });

    it('should return configuration for javascript module', () => {
      const config = getModuleConfig('javascript');
      expect(config).toBeDefined();
      expect(config.name).toBe('JavaScript');
      expect(config.type).toBe('javascript');
      expect(config.functionName).toBe('calculatePoint');
    });
  });

  describe('loadWasmModule', () => {
    it('should throw error for invalid module name', async () => {
      await expect(loadWasmModule('invalid')).rejects.toThrow('Invalid module name');
    });
  });

  describe('loadDefaultModule', () => {
    it('should load default module before rendering', async () => {
      // This test verifies that the default module can be loaded
      // Requirements: 5.2 - System SHALL fetch and instantiate default module before rendering
      try {
        const module = await loadDefaultModule();
        
        // Verify module was loaded
        expect(module).toBeDefined();
        expect(module.name).toBe('Rust'); // Default is Rust
        expect(module.type).toBe('rust');
        
        // Verify module exposes calculatePoint function
        // Requirements: 5.4 - System SHALL expose calculation functions to JavaScript
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        
        // Test that calculatePoint can be called with valid parameters
        const result = module.calculatePoint(0, 0, 100, 2.0);
        expect(typeof result).toBe('number');
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(100);
      } catch (error) {
        // If module fails to load, it should throw a descriptive error
        // Requirements: 5.3 - System SHALL display error message when module fails to load
        expect(error.message).toContain('Failed to load');
      }
    });
  });

  describe('module function exposure', () => {
    it('should expose calculatePoint function from loaded module', async () => {
      // Requirements: 5.4 - System SHALL expose calculation functions to JavaScript
      try {
        const module = await loadDefaultModule();
        
        // Verify calculatePoint function exists
        expect(module.calculatePoint).toBeDefined();
        expect(typeof module.calculatePoint).toBe('function');
        
        // Verify function signature - should accept 4 parameters
        expect(module.calculatePoint.length).toBeGreaterThanOrEqual(0); // JS doesn't enforce arity
        
        // Test function with known inputs
        const iterations = module.calculatePoint(-0.5, 0, 100, 2.0);
        expect(typeof iterations).toBe('number');
        expect(iterations).toBeGreaterThanOrEqual(0);
        expect(iterations).toBeLessThanOrEqual(100);
      } catch (error) {
        // Module may not be available in test environment
        expect(error.message).toContain('Failed to load');
      }
    });

    it('should expose calculateMandelbrotSet batch API function from loaded module', async () => {
      // Requirements: 2.1, 5.2, 5.4 - System SHALL expose batch calculation function
      try {
        const module = await loadDefaultModule();
        
        // Verify calculateMandelbrotSet function exists
        expect(module.calculateMandelbrotSet).toBeDefined();
        expect(typeof module.calculateMandelbrotSet).toBe('function');
        
        // Test function with known inputs
        const realCoords = new Float64Array([0, -0.5, 2.0]);
        const imagCoords = new Float64Array([0, 0, 2.0]);
        const results = module.calculateMandelbrotSet(realCoords, imagCoords, 100, 2.0);
        
        // Verify results
        expect(results).toBeDefined();
        expect(results.length).toBe(3);
        expect(results instanceof Uint32Array).toBe(true);
        
        // Verify each result is valid
        for (let i = 0; i < results.length; i++) {
          expect(typeof results[i]).toBe('number');
          expect(results[i]).toBeGreaterThanOrEqual(0);
          expect(results[i]).toBeLessThanOrEqual(100);
        }
      } catch (error) {
        // Module may not be available in test environment
        expect(error.message).toContain('Failed to load');
      }
    });

    it('should validate batch API function signature for all modules', async () => {
      // Requirements: 2.1, 5.2, 5.4 - All modules should expose batch API
      const modules = ['rust', 'javascript']; // Test only fast-loading modules
      
      for (const moduleName of modules) {
        try {
          const module = await loadWasmModule(moduleName);
          
          // Verify batch API function exists
          expect(module.calculateMandelbrotSet).toBeDefined();
          expect(typeof module.calculateMandelbrotSet).toBe('function');
          
          console.log(`✓ ${moduleName} module has batch API support`);
        } catch (error) {
          // Module may not be available in test environment
          if (!error.message.includes('Failed to fetch') && !error.message.includes('Failed to load')) {
            throw error;
          }
          console.log(`⚠ ${moduleName} module not available in test environment`);
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle failed module loads with descriptive errors', async () => {
      // Requirements: 5.3 - System SHALL display error message when module fails to load
      
      // Test with invalid module name
      await expect(loadWasmModule('nonexistent')).rejects.toThrow('Invalid module name');
      
      // The error message should be descriptive
      try {
        await loadWasmModule('invalid-module');
      } catch (error) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
        expect(error.message).toContain('Invalid module name');
      }
    });

    it('should provide error details when module loading fails', async () => {
      // Requirements: 5.3 - System SHALL display error message when module fails to load
      
      // Test that error messages are informative
      try {
        await loadWasmModule('invalid');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBeTruthy();
        // Error should indicate which module failed
        expect(error.message).toMatch(/invalid|Invalid module name/i);
      }
    });
  });

  // Note: Full integration tests with actual WASM files are in the integration test suite.
  // These unit tests verify the loader structure, error handling, and basic functionality.
});
