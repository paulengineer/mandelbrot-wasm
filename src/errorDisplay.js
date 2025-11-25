/**
 * Error Display
 * 
 * Displays error message modal dialog
 */

export class ErrorDisplay {
    /**
     * Show modal error dialog
     * @param {string} message - Error message to display
     */
    showError(message) {
        const modal = document.getElementById('error-modal');
        const modalMessage = document.getElementById('modal-message');
        const closeButton = document.getElementById('modal-close');

        if (!modal || !modalMessage || !closeButton) {
            console.error('Modal elements not found in DOM');
            return;
        }

        // Set the error message
        modalMessage.textContent = message;

        // Show the modal
        modal.classList.remove('hidden');

        // Focus the close button for accessibility
        setTimeout(() => closeButton.focus(), 100);

        // Set up close handler (remove any existing listeners first)
        const newCloseButton = closeButton.cloneNode(true);
        closeButton.parentNode.replaceChild(newCloseButton, closeButton);

        // Add click handler to close button
        newCloseButton.addEventListener('click', () => {
            this.hideError();
        });

        // Add click handler to overlay (clicking outside modal closes it)
        const handleOverlayClick = (event) => {
            if (event.target === modal) {
                this.hideError();
                modal.removeEventListener('click', handleOverlayClick);
            }
        };
        modal.addEventListener('click', handleOverlayClick);

        // Add escape key handler
        const handleEscapeKey = (event) => {
            if (event.key === 'Escape') {
                this.hideError();
                document.removeEventListener('keydown', handleEscapeKey);
            }
        };
        document.addEventListener('keydown', handleEscapeKey);
    }

    /**
     * Hide modal error dialog
     */
    hideError() {
        const modal = document.getElementById('error-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }
}