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
      expect(moduleSelector.availableModules).toContain('moonbit');
      expect(moduleSelector.availableModules).toContain('javascript');
    });
  });

  describe('render', () => {
    it('should render module selector UI', () => {
      moduleSelector.render();

      // Check that title is rendered
      const title = container.querySelector('h3');
      expect(title).toBeTruthy();
      expect(title.textContent).toBe('Calculation Module');

      // Check that button container is rendered
      const buttonContainer = container.querySelector('.module-selector-buttons');
      expect(buttonContainer).toBeTruthy();
    });

    it('should create buttons for all available modules', () => {
      moduleSelector.render();

      const buttons = container.querySelectorAll('.module-button');
      expect(buttons.length).toBe(5); // Rust, C++, Go, Moonbit, JavaScript
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

  describe('updateRenderTime', () => {
    beforeEach(() => {
      moduleSelector.render();
    });

    it('should display render time in whole milliseconds', () => {
      moduleSelector.updateRenderTime(123.456);

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement).toBeTruthy();
      expect(renderTimeElement.textContent).toBe('Render time: 123ms');
    });

    it('should round render time to nearest whole number', () => {
      moduleSelector.updateRenderTime(99.7);

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.textContent).toBe('Render time: 100ms');
    });

    it('should handle zero render time', () => {
      moduleSelector.updateRenderTime(0);

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.textContent).toBe('Render time: 0ms');
    });

    it('should handle large render times', () => {
      moduleSelector.updateRenderTime(5432.1);

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.textContent).toBe('Render time: 5432ms');
    });

    it('should update render time when called multiple times', () => {
      moduleSelector.updateRenderTime(100);
      let renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.textContent).toBe('Render time: 100ms');

      moduleSelector.updateRenderTime(250);
      renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.textContent).toBe('Render time: 250ms');
    });

    it('should warn if render time element is not found', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Create a new selector without rendering
      const newSelector = new ModuleSelector(mockCallback);
      newSelector.updateRenderTime(100);
      
      expect(consoleSpy).toHaveBeenCalledWith('Render time element not found');
      
      consoleSpy.mockRestore();
    });
  });

  describe('render time display element', () => {
    it('should create render time display element on render', () => {
      moduleSelector.render();

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement).toBeTruthy();
      expect(renderTimeElement.textContent).toBe('Render time: --ms');
    });

    it('should have correct CSS class', () => {
      moduleSelector.render();

      const renderTimeElement = container.querySelector('.render-time');
      expect(renderTimeElement.className).toBe('render-time');
    });
  });

  describe('showError', () => {
    let modal;
    let modalMessage;
    let closeButton;

    beforeEach(() => {
      // Create modal DOM elements
      modal = document.createElement('div');
      modal.id = 'error-modal';
      modal.className = 'modal-overlay hidden';
      
      const modalContent = document.createElement('div');
      modalContent.className = 'modal-content';
      
      const modalTitle = document.createElement('h2');
      modalTitle.id = 'modal-title';
      modalTitle.textContent = 'Error';
      
      modalMessage = document.createElement('p');
      modalMessage.id = 'modal-message';
      
      closeButton = document.createElement('button');
      closeButton.id = 'modal-close';
      closeButton.textContent = 'Close';
      
      modalContent.appendChild(modalTitle);
      modalContent.appendChild(modalMessage);
      modalContent.appendChild(closeButton);
      modal.appendChild(modalContent);
      
      document.body.appendChild(modal);
    });

    afterEach(() => {
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });

    it('should display modal with error message', () => {
      const errorMessage = 'Failed to load module';
      moduleSelector.showError(errorMessage);

      expect(modal.classList.contains('hidden')).toBe(false);
      expect(modalMessage.textContent).toBe(errorMessage);
    });

    it('should hide modal when close button is clicked', () => {
      moduleSelector.showError('Test error');
      
      // Get the new close button (it gets replaced in showError)
      const newCloseButton = document.getElementById('modal-close');
      newCloseButton.click();

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should hide modal when overlay is clicked', () => {
      moduleSelector.showError('Test error');

      // Simulate clicking on the overlay (not the content)
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
      modal.dispatchEvent(clickEvent);

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should hide modal when Escape key is pressed', () => {
      moduleSelector.showError('Test error');

      // Simulate Escape key press
      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
      document.dispatchEvent(escapeEvent);

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should handle missing modal elements gracefully', () => {
      // Remove modal from DOM
      modal.parentNode.removeChild(modal);
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      moduleSelector.showError('Test error');
      
      expect(consoleSpy).toHaveBeenCalledWith('Modal elements not found in DOM');
      
      consoleSpy.mockRestore();
    });
  });

  describe('hideError', () => {
    let modal;

    beforeEach(() => {
      modal = document.createElement('div');
      modal.id = 'error-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    });

    afterEach(() => {
      if (modal && modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }
    });

    it('should hide the modal', () => {
      modal.classList.remove('hidden');
      
      moduleSelector.hideError();
      
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    it('should handle missing modal gracefully', () => {
      modal.parentNode.removeChild(modal);
      
      // Should not throw error
      expect(() => moduleSelector.hideError()).not.toThrow();
    });
  });
});
