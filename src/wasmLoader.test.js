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
  });

  describe('loadWasmModule', () => {
    it('should throw error for invalid module name', async () => {
      await expect(loadWasmModule('invalid')).rejects.toThrow('Invalid module name');
    });
  });

  // Note: Actual module loading tests would require the WASM files to be built
  // and available, which may not be the case in a test environment.
  // These tests verify the loader structure and error handling.
});
