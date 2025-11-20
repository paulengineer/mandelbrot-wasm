# Implementation Plan

- [x] 1. Set up project structure and build configuration
  - Create directory structure for HTML, CSS, JavaScript, and WebAssembly modules
  - Set up build tools for Rust (wasm-pack), C++ (Emscripten), and Go (TinyGo)
  - Create package.json for JavaScript dependencies
  - Set up static file server configuration
  - _Requirements: 5.1_

- [x] 2. Implement Rust WebAssembly module
  - Create Rust project with Cargo.toml configuration
  - Implement Mandelbrot calculation function in Rust
  - Expose calculatePoint function to JavaScript via wasm-bindgen
  - Build Rust module to WebAssembly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

- [x] 2.1 Write property test for Rust Wasm calculation
  - **Property 2: Iteration count bounded by maximum**
  - **Validates: Requirements 2.2**

- [x] 2.2 Write property test for escape detection
  - **Property 3: Escape detection accuracy**
  - **Validates: Requirements 2.3**

- [x] 2.3 Write property test for non-escaping points
  - **Property 4: Non-escaping points return maximum iterations**
  - **Validates: Requirements 2.4**

- [x] 3. Implement C++ WebAssembly module
  - Create C++ source file with Mandelbrot calculation
  - Implement same calculatePoint interface as Rust module
  - Configure Emscripten build settings
  - Build C++ module to WebAssembly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

- [ ]* 3.1 Write property test for C++ Wasm calculation
  - **Property 2: Iteration count bounded by maximum**
  - **Validates: Requirements 2.2**

- [x] 4. Implement Go WebAssembly module
  - Create Go source file with Mandelbrot calculation
  - Implement same calculatePoint interface as other modules
  - Configure TinyGo build settings for optimized output
  - Build Go module to WebAssembly
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 5.1_

- [ ]* 4.1 Write property test for Go Wasm calculation
  - **Property 2: Iteration count bounded by maximum**
  - **Validates: Requirements 2.2**

- [x] 5. Create HTML structure and CSS styling
  - Create index.html with full-screen canvas element
  - Implement CSS for canvas to fill viewport (100vw x 100vh)
  - Add CSS for module selector overlay UI
  - Ensure responsive design for window resizing
  - _Requirements: 1.1, 1.2, 5.7_

- [x] 6. Implement WebAssembly module loader
  - Create wasmLoader.js to fetch and instantiate Wasm modules
  - Implement loading for all three module types (Rust, C++, Go)
  - Add error handling for failed module loads
  - Verify module exposes required functions
  - Set default module to Rust
  - _Requirements: 2.5, 5.2, 5.3, 5.4_

- [ ]* 6.1 Write unit tests for Wasm loader
  - Test default module loads before rendering
  - Test module exposes calculatePoint function
  - Test error handling for failed loads
  - _Requirements: 5.2, 5.3, 5.4_

- [x] 7. Implement Viewport Manager
  - Create ViewportManager class to track complex plane boundaries
  - Implement getBounds() method
  - Implement canvasToComplex() coordinate conversion
  - Set initial viewport to (-2.5 to 1.0 real, -1.0 to 1.0 imaginary)
  - _Requirements: 1.3, 1.5_

- [ ]* 7.1 Write unit tests for viewport initialization
  - Test initial viewport bounds match specification
  - Test coordinate conversion with known values
  - _Requirements: 1.3, 1.5_

- [x] 8. Implement pan functionality in Viewport Manager
  - Implement pan() method to translate viewport based on pixel deltas
  - Calculate complex plane deltas from canvas pixel movements
  - Update viewport boundaries proportionally
  - _Requirements: 3.2, 3.4_

- [ ]* 8.1 Write property test for pan translation
  - **Property 5: Pan translates viewport proportionally**
  - **Validates: Requirements 3.2**

- [x] 9. Implement zoom functionality in Viewport Manager
  - Implement zoom() method with zoom factor and focal point
  - Scale viewport around focal point in complex plane
  - Preserve aspect ratio during zoom
  - Ensure focal point coordinate remains constant
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 9.1 Write property test for zoom direction
  - **Property 6: Zoom direction affects viewport size correctly**
  - **Validates: Requirements 4.1, 4.2**

- [ ]* 9.2 Write property test for zoom focal point preservation
  - **Property 7: Zoom preserves focal point**
  - **Validates: Requirements 4.3**

- [ ]* 9.3 Write property test for zoom aspect ratio preservation
  - **Property 8: Zoom preserves aspect ratio**
  - **Validates: Requirements 4.4**

- [x] 10. Implement color palette and mapping
  - Create colorPalette.js with color gradient generation
  - Implement iterationToColor() function
  - Use smooth color gradients (HSV to RGB conversion)
  - Define set color (black) for maximum iterations
  - Apply continuous coloring to avoid banding
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 10.1 Write property test for color validity
  - **Property 9: Iteration count maps to valid color**
  - **Validates: Requirements 6.1**

- [ ]* 10.2 Write property test for set color mapping
  - **Property 10: Maximum iterations map to set color**
  - **Validates: Requirements 6.2**

- [x] 11. Implement Render Engine
  - Create RenderEngine class
  - Implement render() method to iterate over all canvas pixels
  - Convert each pixel to complex plane coordinates
  - Call Wasm calculatePoint for each pixel
  - Map iteration results to colors using color palette
  - Draw pixels to canvas using ImageData API
  - _Requirements: 1.3, 2.1, 2.5, 6.1_

- [x] 11.1 Write unit tests for render engine
  - Test render calls Wasm calculation function
  - Test pixels are drawn to canvas
  - _Requirements: 1.3, 2.1_

- [x] 12. Implement module switching in Render Engine
  - Add setWasmModule() method to RenderEngine
  - Support hot-swapping Wasm modules
  - Trigger re-render after module change
  - _Requirements: 5.6_

- [x] 13. Implement Event Handler for panning
  - Create EventHandler class
  - Implement onMouseDown to initiate pan mode
  - Implement onMouseMove to track cursor movement while button held
  - Implement onMouseUp to complete pan operation
  - Calculate pixel deltas and pass to ViewportManager.pan()
  - Trigger render after pan completes
  - _Requirements: 3.1, 3.2, 3.3, 3.5_

- [ ]* 13.1 Write unit tests for pan event handling
  - Test mousedown initiates pan mode
  - Test mouseup completes pan and triggers render
  - _Requirements: 3.1, 3.3, 3.5_

- [x] 14. Implement Event Handler for zooming
  - Implement onWheel event handler
  - Calculate zoom factor from wheel delta
  - Get cursor position as focal point
  - Pass zoom parameters to ViewportManager.zoom()
  - Trigger render after zoom completes
  - _Requirements: 4.1, 4.2, 4.5_

- [ ]* 14.1 Write unit tests for zoom event handling
  - Test wheel event triggers zoom
  - Test render is called after zoom
  - _Requirements: 4.5_

- [x] 15. Implement Module Selector UI component
  - Create ModuleSelector class
  - Render overlay UI with buttons for Rust, C++, and Go
  - Highlight currently selected module
  - Position selector overlay on canvas
  - Style selector for visibility and usability
  - _Requirements: 5.7_

- [ ]* 15.1 Write unit tests for module selector UI
  - Test selector displays on page load
  - Test all three modules are available
  - Test default module is selected
  - _Requirements: 5.7_

- [x] 16. Implement module selection functionality
  - Add click handlers to module selector buttons
  - Implement selectModule() method
  - Load new Wasm module when selection changes
  - Preserve current viewport during module switch
  - Update RenderEngine with new module
  - Trigger re-render with new module
  - Handle module load failures with fallback
  - _Requirements: 5.6, 5.7_

- [ ]* 16.1 Write property test for viewport preservation during module switch
  - **Property 11: Module switch preserves viewport**
  - **Validates: Requirements 5.6**

- [x] 17. Implement canvas resize handling
  - Add window resize event listener
  - Update canvas dimensions to match new viewport size
  - Trigger re-render after resize
  - _Requirements: 1.2_

- [ ]* 17.1 Write property test for canvas resize
  - **Property 1: Canvas dimensions match viewport on resize**
  - **Validates: Requirements 1.2**

- [x] 18. Wire up main application entry point
  - Create main.js to initialize all components
  - Load default Wasm module
  - Initialize canvas and viewport
  - Create and wire up EventHandler, ViewportManager, RenderEngine, ModuleSelector
  - Perform initial render
  - Set up resize listener
  - Add error handling for initialization failures
  - _Requirements: 1.1, 1.3, 5.2_

- [x] 18.1 Write integration tests
  - Test complete render cycle
  - Test pan and zoom in sequence
  - Test module switching during rendering
  - Test all three modules produce equivalent results
  - _Requirements: All_

- [x] 19. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
