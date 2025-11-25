/**
 * Integration tests for error handling with modal dialogs
 * Verifies that errors from wasmLoader are properly displayed via modal
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadWasmModule } from '../../src/wasmLoader.js';
import { ErrorDisplay } from '../../src/errorDisplay.js';

describe('Error Handling Integration', () => {
  let container;
  let modal;
  let modalMessage;
  let closeButton;
  let errorDisplay;

  beforeEach(() => {
    // Create mock DOM container for module selector
    container = document.createElement('div');
    container.id = 'module-selector';
    document.body.appendChild(container);

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

    // Create ErrorDisplay instance
    errorDisplay = new ErrorDisplay();
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    errorDisplay = null;
  });

  test('wasmLoader errors should be displayable via modal', async () => {
    // Try to load an invalid module
    try {
      await loadWasmModule('invalid-module-name');
      // Should not reach here
      expect(true).toBe(false);
    } catch (error) {
      // Verify error was thrown
      expect(error).toBeTruthy();
      expect(error.message).toContain('Invalid module name');
      
      // Display the error via modal (simulating what main.js does)
      errorDisplay.showError(`Failed to load module. ${error.message}`);
      
      // Verify modal is visible
      expect(modal.classList.contains('hidden')).toBe(false);
      
      // Verify error message is displayed
      expect(modalMessage.textContent).toContain('Failed to load module');
      expect(modalMessage.textContent).toContain('Invalid module name');
    }
  });

  test('modal error persists until user dismisses', async () => {
    // Simulate a module load failure
    const errorMessage = 'Failed to load WebAssembly module';
    
    // Display error via modal
    errorDisplay.showError(errorMessage);
    
    // Verify modal is visible
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Verify error message is displayed
    expect(modalMessage.textContent).toBe(errorMessage);
    
    // Modal should persist (not auto-dismiss)
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // User must explicitly dismiss
    errorDisplay.hideError();
    
    // Now modal should be hidden
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('multiple errors can be displayed sequentially via modal', () => {
    const errors = [
      'Failed to load Rust module',
      'Failed to load C++ module',
      'Failed to load Go module'
    ];
    
    errors.forEach(errorMessage => {
      // Display error
      errorDisplay.showError(errorMessage);
      
      // Verify modal is visible
      expect(modal.classList.contains('hidden')).toBe(false);
      
      // Verify correct error message
      expect(modalMessage.textContent).toBe(errorMessage);
      
      // Dismiss modal
      errorDisplay.hideError();
      
      // Verify modal is hidden
      expect(modal.classList.contains('hidden')).toBe(true);
    });
  });

  test('modal can be dismissed via Escape key', () => {
    const errorMessage = 'Test error for Escape key';
    
    // Display error
    errorDisplay.showError(errorMessage);
    
    // Verify modal is visible
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Simulate Escape key press
    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    document.dispatchEvent(escapeEvent);
    
    // Verify modal is hidden
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('modal can be dismissed by clicking overlay', () => {
    const errorMessage = 'Test error for overlay click';
    
    // Display error
    errorDisplay.showError(errorMessage);
    
    // Verify modal is visible
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Simulate clicking on the overlay
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
    modal.dispatchEvent(clickEvent);
    
    // Verify modal is hidden
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
