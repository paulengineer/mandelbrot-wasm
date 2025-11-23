/**
 * Unit tests for main.js error handling with modal dialogs
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { displayError, hideError } from '../../src/main.js';

describe('Main.js Error Handling', () => {
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
    // Clean up DOM
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  });

  test('displayError should use modal dialog instead of inline error', () => {
    const errorMessage = 'Test error message';
    
    // Call displayError
    displayError(errorMessage);
    
    // Verify modal is visible (not hidden)
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Verify error message is displayed in modal
    expect(modalMessage.textContent).toBe(errorMessage);
  });

  test('displayError should set up close button handler', () => {
    const errorMessage = 'Test error message';
    
    // Call displayError
    displayError(errorMessage);
    
    // Verify modal is visible
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Click the close button
    closeButton.click();
    
    // Verify modal is now hidden
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('hideError should hide the modal', () => {
    // Show the modal first
    modal.classList.remove('hidden');
    
    // Call hideError
    hideError();
    
    // Verify modal is hidden
    expect(modal.classList.contains('hidden')).toBe(true);
  });

  test('displayError should work with different error messages', () => {
    const errorMessages = [
      'Failed to load module',
      'Network error occurred',
      'Invalid configuration'
    ];
    
    errorMessages.forEach(errorMessage => {
      // Call displayError
      displayError(errorMessage);
      
      // Verify modal is visible
      expect(modal.classList.contains('hidden')).toBe(false);
      
      // Verify correct error message is displayed
      expect(modalMessage.textContent).toBe(errorMessage);
      
      // Hide the modal for next iteration
      hideError();
    });
  });

  test('modal should persist until explicitly dismissed', () => {
    const errorMessage = 'Persistent error message';
    
    // Call displayError
    displayError(errorMessage);
    
    // Verify modal is visible
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Simulate time passing (modal should still be visible)
    // In a real scenario, the modal would remain visible indefinitely
    expect(modal.classList.contains('hidden')).toBe(false);
    
    // Only after explicit dismissal should it be hidden
    closeButton.click();
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
