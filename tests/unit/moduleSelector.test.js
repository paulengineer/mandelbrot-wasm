/**
 * Unit tests for ModuleSelector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ModuleSelector } from '../../src/moduleSelector.js';

describe('ModuleSelector', () => {
  let moduleSelector;
  let mockCallback;
  let container;

  beforeEach(() => {
    // Create mock DOM container
    container = document.createElement('div');
    container.id = 'module-selector';
    document.body.appendChild(container);

    // Create mock callback
    mockCallback = vi.fn();

    // Create ModuleSelector instance
    moduleSelector = new ModuleSelector(mockCallback);
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    moduleSelector = null;
  });

  describe('constructor', () => {
    it('should initialize with default module', () => {
      expect(moduleSelector.getCurrentModule()).toBe('rust');
    });

    it('should store the callback function', () => {
      expect(moduleSelector.onModuleChange).toBe(mockCallback);
    });

    it('should have available modules', () => {
      expect(moduleSelector.availableModules).toContain('rust');
      expect(moduleSelector.availableModules).toContain('cpp');
      expect(moduleSelector.availableModules).toContain('go');
    });
  });

  describe('render', () => {
    it('should render module selector UI', () => {
      moduleSelector.render();

      // Check that title is rendered
      const title = container.querySelector('h3');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('WebAssembly Module');

      // Check that button container is rendered
      const buttonContainer = container.querySelector('.module-selector-buttons');
      expect(buttonContainer).toBeTruthy();
    });

    it('should create buttons for all available modules', () => {
      moduleSelector.render();

      const buttons = container.querySelectorAll('.module-button');
      expect(buttons.length).toBe(3); // Rust, C++, Go
    });

    it('should mark default module as active', () => {
      moduleSelector.render();

      const activeButton = container.querySelector('.module-button.active');
      expect(activeButton).toBeTruthy();
      expect(activeButton.getAttribute('data-module')).toBe('rust');
    });

    it('should set aria-pressed attribute correctly', () => {
      moduleSelector.render();

      const rustButton = container.querySelector('[data-module="rust"]');
      expect(rustButton.getAttribute('aria-pressed')).toBe('true');

      const cppButton = container.querySelector('[data-module="cpp"]');
      expect(cppButton.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('selectModule', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should change current module', () => {
      moduleSelector.selectModule('cpp');
      expect(moduleSelector.getCurrentModule()).toBe('cpp');
    });

    it('should call callback with new module name', () => {
      moduleSelector.selectModule('cpp');
      expect(mockCallback).toHaveBeenCalledWith('cpp', 'rust');
    });

    it('should update button states', () => {
      moduleSelector.selectModule('cpp');

      const rustButton = container.querySelector('[data-module="rust"]');
      expect(rustButton.classList.contains('active')).toBe(false);
      expect(rustButton.getAttribute('aria-pressed')).toBe('false');

      const cppButton = container.querySelector('[data-module="cpp"]');
      expect(cppButton.classList.contains('active')).toBe(true);
      expect(cppButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('should handle invalid module name gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      moduleSelector.selectModule('invalid');
      
      expect(moduleSelector.getCurrentModule()).toBe('rust'); // Should not change
      expect(mockCallback).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('button click handling', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should select module when button is clicked', () => {
      const cppButton = container.querySelector('[data-module="cpp"]');
      cppButton.click();

      expect(moduleSelector.getCurrentModule()).toBe('cpp');
      expect(mockCallback).toHaveBeenCalledWith('cpp', 'rust');
    });

    it('should update UI when button is clicked', () => {
      const goButton = container.querySelector('[data-module="go"]');
      goButton.click();

      expect(goButton.classList.contains('active')).toBe(true);
      expect(goButton.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('setModuleLoading', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should disable button when loading', () => {
      moduleSelector.setModuleLoading('cpp', true);

      const cppButton = container.querySelector('[data-module="cpp"]');
      expect(cppButton.disabled).toBe(true);
      expect(cppButton.classList.contains('loading')).toBe(true);
    });

    it('should enable button when not loading', () => {
      moduleSelector.setModuleLoading('cpp', true);
      moduleSelector.setModuleLoading('cpp', false);

      const cppButton = container.querySelector('[data-module="cpp"]');
      expect(cppButton.disabled).toBe(false);
      expect(cppButton.classList.contains('loading')).toBe(false);
    });
  });

  describe('setAllButtonsDisabled', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should disable all buttons', () => {
      moduleSelector.setAllButtonsDisabled(true);

      const buttons = container.querySelectorAll('.module-button');
      buttons.forEach(button => {
        expect(button.disabled).toBe(true);
      });
    });

    it('should enable all buttons', () => {
      moduleSelector.setAllButtonsDisabled(true);
      moduleSelector.setAllButtonsDisabled(false);

      const buttons = container.querySelectorAll('.module-button');
      buttons.forEach(button => {
        expect(button.disabled).toBe(false);
      });
    });
  });

  describe('setVisible', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should hide the selector', () => {
      moduleSelector.setVisible(false);
      expect(container.style.display).toBe('none');
    });

    it('should show the selector', () => {
      moduleSelector.setVisible(false);
      moduleSelector.setVisible(true);
      expect(container.style.display).toBe('block');
    });
  });

  describe('getCurrentModule', () => {
    it('should return the current module name', () => {
      expect(moduleSelector.getCurrentModule()).toBe('rust');
      
      moduleSelector.render();
      moduleSelector.selectModule('cpp');
      
      expect(moduleSelector.getCurrentModule()).toBe('cpp');
    });
  });
});
