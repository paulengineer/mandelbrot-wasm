/**
 * ModuleSelector
 * 
 * Provides user interface for selecting between available WebAssembly modules.
 * Displays as an overlay control on the canvas with buttons for each module.
 */

import { getAvailableModules, getDefaultModuleName, getModuleConfig } from './wasmLoader.js';

export class ModuleSelector {
  /**
   * Create a new ModuleSelector
   * @param {Function} onModuleChange - Callback function called when module selection changes
   *                                    Receives the new module name as parameter
   */
  constructor(onModuleChange) {
    this.onModuleChange = onModuleChange;
    this.currentModule = getDefaultModuleName();
    this.availableModules = getAvailableModules();
    this.container = null;
    this.buttons = {};
  }

  /**
   * Get the currently selected module name
   * @returns {string} Current module name
   */
  getCurrentModule() {
    return this.currentModule;
  }

  /**
   * Change the active module
   * @param {string} moduleName - Name of the module to select
   */
  selectModule(moduleName) {
    if (!this.availableModules.includes(moduleName)) {
      console.error(`Invalid module name: ${moduleName}`);
      return;
    }

    // Update current module
    const previousModule = this.currentModule;
    this.currentModule = moduleName;

    // Update button states
    this.updateButtonStates();

    // Notify callback of module change
    if (this.onModuleChange && typeof this.onModuleChange === 'function') {
      this.onModuleChange(moduleName, previousModule);
    }
  }

  /**
   * Update the visual state of module buttons to reflect current selection
   */
  updateButtonStates() {
    Object.keys(this.buttons).forEach(moduleName => {
      const button = this.buttons[moduleName];
      if (moduleName === this.currentModule) {
        button.classList.add('active');
        button.setAttribute('aria-pressed', 'true');
      } else {
        button.classList.remove('active');
        button.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Create a button element for a module
   * @param {string} moduleName - Name of the module
   * @returns {HTMLButtonElement} Button element
   */
  createModuleButton(moduleName) {
    const config = getModuleConfig(moduleName);
    const button = document.createElement('button');
    
    button.className = 'module-button';
    button.textContent = config.name;
    button.setAttribute('data-module', moduleName);
    button.setAttribute('role', 'button');
    button.setAttribute('aria-pressed', moduleName === this.currentModule ? 'true' : 'false');
    const moduleType = config.type === 'javascript' ? 'calculation module' : 'WebAssembly module';
    button.setAttribute('aria-label', `Select ${config.name} ${moduleType}`);
    
    // Add active class to default module
    if (moduleName === this.currentModule) {
      button.classList.add('active');
    }

    // Add click handler
    button.addEventListener('click', () => {
      this.selectModule(moduleName);
    });

    return button;
  }

  /**
   * Update the render time display
   * @param {number} timeMs - Render time in milliseconds
   */
  updateRenderTime(timeMs) {
    if (!this.renderTimeElement) {
      console.warn('Render time element not found');
      return;
    }

    // Display time in whole milliseconds
    const wholeMs = Math.round(timeMs);
    this.renderTimeElement.textContent = `Render time: ${wholeMs}ms`;
  }

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

  /**
   * Render the module selector UI
   * Creates and populates the selector overlay with module buttons
   */
  render() {
    // Find or create the container element
    this.container = document.getElementById('module-selector');
    
    if (!this.container) {
      console.error('Module selector container not found in DOM');
      return;
    }

    // Clear existing content
    this.container.innerHTML = '';

    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Calculation Module';
    this.container.appendChild(title);

    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'module-selector-buttons';

    // Create buttons for each available module
    this.availableModules.forEach(moduleName => {
      const button = this.createModuleButton(moduleName);
      this.buttons[moduleName] = button;
      buttonContainer.appendChild(button);
    });

    this.container.appendChild(buttonContainer);

    // Create render time display
    this.renderTimeElement = document.createElement('div');
    this.renderTimeElement.className = 'render-time';
    this.renderTimeElement.textContent = 'Render time: --ms';
    this.container.appendChild(this.renderTimeElement);
  }

  /**
   * Set loading state for a specific module button
   * @param {string} moduleName - Name of the module
   * @param {boolean} isLoading - Whether the module is loading
   */
  setModuleLoading(moduleName, isLoading) {
    const button = this.buttons[moduleName];
    if (button) {
      button.disabled = isLoading;
      if (isLoading) {
        button.classList.add('loading');
      } else {
        button.classList.remove('loading');
      }
    }
  }

  /**
   * Disable all module buttons (e.g., during module switching)
   * @param {boolean} disabled - Whether to disable buttons
   */
  setAllButtonsDisabled(disabled) {
    Object.values(this.buttons).forEach(button => {
      button.disabled = disabled;
    });
  }

  /**
   * Show or hide the module selector
   * @param {boolean} visible - Whether the selector should be visible
   */
  setVisible(visible) {
    if (this.container) {
      this.container.style.display = visible ? 'block' : 'none';
    }
  }

  /**
   * Destroy the module selector and clean up event listeners
   */
  destroy() {
    // Remove event listeners from buttons
    Object.values(this.buttons).forEach(button => {
      button.replaceWith(button.cloneNode(true));
    });
    
    // Clear references
    this.buttons = {};
    this.container = null;
  }
}
