/**
 * Unit tests for ErrorDisplay
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ErrorDisplay } from '../../src/errorDisplay.js';

describe('ErrorDisplay', () => {
    let errorDisplay;

    beforeEach(() => {
        // Create ErrorDisplay instance
        errorDisplay = new ErrorDisplay();
    });

    afterEach(() => {
        errorDisplay = null;
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
            errorDisplay.showError(errorMessage);

            expect(modal.classList.contains('hidden')).toBe(false);
            expect(modalMessage.textContent).toBe(errorMessage);
        });

        it('should hide modal when close button is clicked', () => {
            errorDisplay.showError('Test error');

            // Get the new close button (it gets replaced in showError)
            const newCloseButton = document.getElementById('modal-close');
            newCloseButton.click();

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should hide modal when overlay is clicked', () => {
            errorDisplay.showError('Test error');

            // Simulate clicking on the overlay (not the content)
            const clickEvent = new MouseEvent('click', { bubbles: true });
            Object.defineProperty(clickEvent, 'target', { value: modal, enumerable: true });
            modal.dispatchEvent(clickEvent);

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should hide modal when Escape key is pressed', () => {
            errorDisplay.showError('Test error');

            // Simulate Escape key press
            const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
            document.dispatchEvent(escapeEvent);

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should handle missing modal elements gracefully', () => {
            // Remove modal from DOM
            modal.parentNode.removeChild(modal);

            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            errorDisplay.showError('Test error');

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

            errorDisplay.hideError();

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        it('should handle missing modal gracefully', () => {
            modal.parentNode.removeChild(modal);

            // Should not throw error
            expect(() => errorDisplay.hideError()).not.toThrow();
        });
    });
});