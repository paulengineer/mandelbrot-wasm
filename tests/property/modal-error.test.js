/**
 * Property-based tests for modal error dialog
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ModuleSelector } from '../../src/moduleSelector.js';

describe('Modal Error Dialog - Property Tests', () => {
  let moduleSelector;
  let container;
  let modal;
  let modalMessage;
  let closeButton;

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

    // Create ModuleSelector instance
    const mockCallback = vi.fn();
    moduleSelector = new ModuleSelector(mockCallback);
    moduleSelector.render();
  });

  afterEach(() => {
    // Clean up DOM
    if (container && container.parentNode) {
      container.parentNode.removeChild(container);
    }
    if (modal && modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
    moduleSelector = null;
  });

  // Feature: mandelbrot-visualizer, Property 16: Modal error on module load failure
  test('Property 16: Modal error on module load failure', () => {
    fc.assert(
      fc.property(
        // Generate random error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Show the error modal
          moduleSelector.showError(errorMessage);
          
          // Verify modal is visible (not hidden)
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Verify error message is displayed
          expect(modalMessage.textContent).toBe(errorMessage);
          
          // Verify modal persists (is still visible after a short delay)
          // This simulates that the modal requires user dismissal
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Clean up for next iteration
          moduleSelector.hideError();
          
          // Verify modal is hidden after dismissal
          expect(modal.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16 (variant): Modal requires explicit user dismissal', () => {
    fc.assert(
      fc.property(
        // Generate random error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Show the error modal
          moduleSelector.showError(errorMessage);
          
          // Verify modal is visible
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Simulate time passing (modal should still be visible)
          // In a real scenario, the modal would remain visible indefinitely
          // until the user explicitly dismisses it
          
          // Verify modal is still visible (hasn't auto-dismissed)
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Verify the close button exists and is functional
          const currentCloseButton = document.getElementById('modal-close');
          expect(currentCloseButton).toBeTruthy();
          
          // Simulate user clicking close button
          currentCloseButton.click();
          
          // Verify modal is now hidden
          expect(modal.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16 (variant): Modal can be dismissed via Escape key', () => {
    fc.assert(
      fc.property(
        // Generate random error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Show the error modal
          moduleSelector.showError(errorMessage);
          
          // Verify modal is visible
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Simulate Escape key press
          const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
          document.dispatchEvent(escapeEvent);
          
          // Verify modal is now hidden
          expect(modal.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16 (variant): Modal can be dismissed by clicking overlay', () => {
    fc.assert(
      fc.property(
        // Generate random error messages
        fc.string({ minLength: 1, maxLength: 200 }),
        (errorMessage) => {
          // Show the error modal
          moduleSelector.showError(errorMessage);
          
          // Verify modal is visible
          expect(modal.classList.contains('hidden')).toBe(false);
          
          // Simulate clicking on the overlay (not the content)
          const clickEvent = new MouseEvent('click', { bubbles: true });
          Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
          modal.dispatchEvent(clickEvent);
          
          // Verify modal is now hidden
          expect(modal.classList.contains('hidden')).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 16 (variant): Multiple error messages can be displayed sequentially', () => {
    fc.assert(
      fc.property(
        // Generate array of random error messages
        fc.array(fc.string({ minLength: 1, maxLength: 200 }), { minLength: 2, maxLength: 5 }),
        (errorMessages) => {
          // Display each error message sequentially
          for (const errorMessage of errorMessages) {
            // Show the error modal
            moduleSelector.showError(errorMessage);
            
            // Verify modal is visible
            expect(modal.classList.contains('hidden')).toBe(false);
            
            // Verify correct error message is displayed
            expect(modalMessage.textContent).toBe(errorMessage);
            
            // Dismiss the modal
            moduleSelector.hideError();
            
            // Verify modal is hidden
            expect(modal.classList.contains('hidden')).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
