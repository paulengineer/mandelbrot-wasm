/**
 * Main Application Entry Point
 * 
 * Initializes all components and wires up the Mandelbrot Visualizer application.
 * Handles loading the default WebAssembly module, setting up the canvas,
 * creating viewport and rendering systems, and establishing event handlers.
 */

import { loadDefaultModule, loadWasmModule, getDefaultModuleName } from './wasmLoader.js';
import { ViewportManager } from './viewportManager.js';
import { RenderEngine } from './renderEngine.js';
import { EventHandler } from './eventHandler.js';
import { ModuleSelector } from './moduleSelector.js';
import { ViewportInfo } from './viewportInfo.js';
import { ErrorDisplay } from './errorDisplay.js';

/**
 * Application state
 */
let canvas;
let viewportManager;
let renderEngine;
let eventHandler;
let moduleSelector;
let viewportInfo;
let currentWasmModule;
let errorDisplay;

/**
 * Display an error message to the user using modal dialog
 * @param {string} message - Error message to display
 */
function displayError(message) {
  console.error('Application error:', message);
  
  // Use modal dialog if errorDisplay is available
  if (errorDisplay) {
    errorDisplay.showError(message);
  }
}

/**
 * Hide the error message
 */
function hideError() {
  if (errorDisplay) {
    errorDisplay.hideError();
  }
}

/**
 * Initialize the canvas and set its dimensions to match the viewport
 */
function initializeCanvas() {
  canvas = document.getElementById('mandelbrot-canvas');
  
  if (!canvas) {
    throw new Error('Canvas element not found in DOM');
  }
  
  // Set canvas dimensions to match viewport
  resizeCanvas();
  
  return canvas;
}

/**
 * Resize the canvas to match the current viewport dimensions
 */
function resizeCanvas() {
  if (!canvas) return;
  
  // Set canvas dimensions to match window size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  console.log(`Canvas resized to ${canvas.width}x${canvas.height}`);
}

/**
 * Initialize the viewport manager with default bounds
 * @returns {ViewportManager} Initialized viewport manager
 */
function initializeViewport() {
  // Initial viewport showing the classic Mandelbrot set view
  const initialBounds = {
    minReal: -2.0,
    maxReal: 1.0,
    minImag: -1.0,
    maxImag: 1.0
  };
  
  // Pass canvas dimensions to enforce 1:1 aspect ratio
  viewportManager = new ViewportManager(initialBounds, canvas.width, canvas.height);
  console.log('Viewport initialized:', viewportManager.getBounds());
  
  return viewportManager;
}

/**
 * Handle render completion and update render time display
 * @param {number} renderTime - Render time in milliseconds
 */
function handleRenderComplete(renderTime) {
  if (moduleSelector) {
    moduleSelector.updateRenderTime(renderTime);
  }
}

/**
 * Handle module selection change
 * @param {string} newModuleName - Name of the newly selected module
 * @param {string} previousModuleName - Name of the previously selected module
 */
async function handleModuleChange(newModuleName, previousModuleName) {
  console.log(`Switching from ${previousModuleName} to ${newModuleName} module`);
  
  try {
    // Disable all buttons during module loading
    moduleSelector.setAllButtonsDisabled(true);
    moduleSelector.setModuleLoading(newModuleName, true);
    
    // Load the new WebAssembly module
    const newModule = await loadWasmModule(newModuleName);
    
    // Update the render engine with the new module
    // This preserves the current viewport state and triggers a render
    renderEngine.setWasmModule(newModule);
    
    // Update render time after module switch
    const renderTime = renderEngine.getLastRenderTime();
    handleRenderComplete(renderTime);
    
    // Store the new module
    currentWasmModule = newModule;
    
    console.log(`Successfully switched to ${newModuleName} module`);
    
  } catch (error) {
    console.error(`Failed to switch to ${newModuleName} module:`, error);
    
    // Display modal error to user
    errorDisplay.showError(`Failed to load ${newModuleName} module. ${error.message}`);
    
    // Revert to previous module in the UI
    moduleSelector.selectModule(previousModuleName);
    
  } finally {
    // Re-enable buttons
    moduleSelector.setAllButtonsDisabled(false);
    moduleSelector.setModuleLoading(newModuleName, false);
  }
}

/**
 * Perform a render and update the render time display
 */
function renderAndUpdateTime() {
  if (!renderEngine || !moduleSelector) return;
  
  const renderTime = renderEngine.render();
  moduleSelector.updateRenderTime(renderTime);
}

/**
 * Set up window resize listener
 */
function setupResizeListener() {
  window.addEventListener('resize', () => {
    // Resize canvas to match new viewport
    resizeCanvas();
    
    // Update viewport manager to enforce 1:1 aspect ratio with new canvas dimensions
    if (viewportManager) {
      viewportManager.resize(canvas.width, canvas.height);
    }
    
    // Update viewport info after resize
    if (viewportInfo) {
      viewportInfo.updateBounds();
    }
    
    // Trigger re-render with new canvas dimensions and update time
    renderAndUpdateTime();
  });
  
  console.log('Resize listener attached');
}

/**
 * Initialize and start the application
 */
async function initializeApplication() {
  try {
    console.log('Initializing Mandelbrot Visualizer...');
    
    // Step 0: Initialise error display handler
    errorDisplay = new ErrorDisplay();
    console.log('✓ Error Display handler initialized');

    // Step 1: Initialize canvas
    initializeCanvas();
    console.log('✓ Canvas initialized');
    
    // Step 2: Load default WebAssembly module
    console.log('Loading default WebAssembly module...');
    currentWasmModule = await loadDefaultModule();
    console.log('✓ WebAssembly module loaded');
    
    // Step 3: Initialize viewport manager
    initializeViewport();
    console.log('✓ Viewport manager initialized');
    
    // Step 4: Initialize render engine
    renderEngine = new RenderEngine(canvas, currentWasmModule, viewportManager);
    console.log('✓ Render engine initialized');
    
    // Step 5: Initialize viewport info UI
    viewportInfo = new ViewportInfo(viewportManager);
    viewportInfo.render();
    console.log('✓ Viewport info initialized');
    
    // Step 6: Initialize event handler for pan and zoom
    eventHandler = new EventHandler(canvas, viewportManager, renderEngine, handleRenderComplete, viewportInfo);
    console.log('✓ Event handler initialized');
    
    // Step 7: Initialize module selector UI
    moduleSelector = new ModuleSelector(handleModuleChange);
    moduleSelector.render();
    console.log('✓ Module selector initialized');
    
    // Step 8: Set up resize listener
    setupResizeListener();
    console.log('✓ Resize listener attached');
    
    // Step 9: Perform initial render
    console.log('Performing initial render...');
    renderAndUpdateTime();
    console.log('✓ Initial render complete');
    
    console.log('Mandelbrot Visualizer initialized successfully!');
    
  } catch (error) {
    console.error('Failed to initialize application:', error);
    displayError(`Failed to initialize application: ${error.message}`);
  }
}

/**
 * Start the application when the DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication);
} else {
  // DOM is already ready
  initializeApplication();
}

/**
 * Export for testing purposes
 */
export {
  initializeApplication,
  displayError,
  hideError,
  resizeCanvas
};
