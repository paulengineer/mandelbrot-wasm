# Design Document: Mandelbrot Visualizer

## Overview

The Mandelbrot Visualizer is a high-performance web application that renders the Mandelbrot set fractal with real-time pan and zoom interactions. The system architecture separates concerns between the presentation layer (HTML/JavaScript), the computation engine (WebAssembly), and the rendering pipeline (Canvas API).

The application follows a request-render cycle where user interactions update viewport parameters, trigger WebAssembly calculations for each pixel, and render the results to a full-screen canvas. Performance is achieved through WebAssembly's near-native execution speed and efficient memory sharing between JavaScript and Wasm.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser Window                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │              HTML5 Canvas (Full Screen)           │  │
│  │  ┌──────────────────────┐  ┌──────────────────┐  │  │
│  │  │  Module Selector UI  │  │ Viewport Info    │  │  │
│  │  │[Rust|C++|Go|Moonbit  │  │ Real: -2.0..1.0  │  │  │
│  │  │ |JavaScript]          │  │ Imag: -1.0..1.0  │  │  │
│  │  │ Render time: 123ms   │  │                  │  │  │
│  │  └──────────────────────┘  └──────────────────┘  │  │
│  │  ┌──────────────────────────────────────────┐    │  │
│  │  │     Rendered Mandelbrot Set              │    │  │
│  │  │                                          │    │  │
│  │  └──────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────┘  │
│                         ▲                                │
│                         │                                │
│  ┌──────────────────────┴──────────────────────────┐    │
│  │         JavaScript Application Layer            │    │
│  │  ┌────────────┐  ┌──────────┐  ┌─────────┐     │    │
│  │  │  Event     │  │ Viewport │  │ Render  │     │    │
│  │  │  Handler   │→ │ Manager  │→ │ Engine  │     │    │
│  │  └────────────┘  └──────────┘  └────┬────┘     │    │
│  │  ┌────────────┐  ┌──────────┐       │          │    │
│  │  │  Module    │  │ Viewport │───────┘          │    │
│  │  │  Selector  │  │ Info UI  │                  │    │
│  │  └────────────┘  └──────────┘                  │    │
│  └─────────────────────────┬────────────────────────┘   │
│                            │                             │
│  ┌─────────────────────────▼───────────────────────┐    │
│  │    Computation Modules                          │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │    │
│  │  │   Rust   │  │   C++    │  │    Go    │      │    │
│  │  │  Module  │  │  Module  │  │  Module  │      │    │
│  │  └──────────┘  └──────────┘  └──────────┘      │    │
│  │  ┌──────────┐  ┌──────────┐                    │    │
│  │  │ Moonbit  │  │JavaScript│                    │    │
│  │  │  Module  │  │  Module  │                    │    │
│  │  └──────────┘  └──────────┘                    │    │
│  │  All expose same calculation interface         │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **Initialization**: Page loads → Fetch and instantiate default module → Initialize canvas with 1:1 aspect ratio → Render module selector UI → Render viewport info UI → Render initial view (-2.0 to 1.0 real, -1.0 to 1.0 imaginary)
2. **User Interaction**: Mouse/wheel event → Event handler updates viewport → Update viewport info display → Trigger debounced render (for zoom) or immediate render (for pan)
3. **Module Selection**: User selects module (WASM or JavaScript) → Load new module → Preserve viewport → Re-render with new module → Display render time
4. **Render Cycle**: Viewport parameters → Module calculation for each pixel → Measure calculation time → Color mapping → Canvas draw → Update render time display
5. **Zoom Interaction**: Wheel event → Scale existing canvas image → Start debounce timer (1000ms) → If no additional zoom, trigger full re-render → Update viewport info
6. **Resize**: Window resize → Adjust canvas dimensions → Maintain scale unchanged → Anchor top-left complex plane position at top-left of canvas → Adjust complex plane bounds to match new canvas dimensions → Maintain aspect ratio matching canvas → Update viewport info → Trigger render
7. **Error Handling**: Module load failure → Display modal error → User must dismiss modal → Fall back to previous working module

## Components and Interfaces

### 1. HTML/CSS Layer

**Responsibility**: Provide the full-screen canvas element and basic page structure.

**Interface**:
- Single HTML page with a `<canvas>` element
- CSS styling to ensure canvas fills viewport (width: 100vw, height: 100vh)
- Responsive to window resize events

### 2. JavaScript Application Layer

#### 2.1 Event Handler

**Responsibility**: Capture and process user input events (mouse drag, wheel scroll).

**Interface**:
```javascript
class EventHandler {
  constructor(canvas, viewportManager, renderEngine)
  
  // Mouse event handlers
  onMouseDown(event)
  onMouseMove(event)
  onMouseUp(event)
  
  // Wheel event handler with debouncing
  onWheel(event)
  
  // Debounce timer management
  startZoomDebounce()
  cancelZoomDebounce()
}
```

**Behavior**:
- Tracks mouse state (pressed/released, position)
- Calculates delta movements for panning
- Calculates zoom factor and focal point from wheel events
- Delegates viewport updates to ViewportManager
- Implements debounced rendering for zoom operations (1000ms delay)
- Scales existing canvas image immediately on zoom for responsive feel
- Triggers full re-render after debounce period expires

#### 2.2 Viewport Manager

**Responsibility**: Maintain and update the current view into the complex plane with 1:1 aspect ratio.

**Interface**:
```javascript
class ViewportManager {
  constructor(initialBounds)
  
  // Get current viewport bounds
  getBounds() // Returns { minReal, maxReal, minImag, maxImag }
  
  // Update viewport for panning
  pan(deltaX, deltaY, canvasWidth, canvasHeight)
  
  // Update viewport for zooming
  zoom(zoomFactor, focalX, focalY, canvasWidth, canvasHeight)
  
  // Update viewport for window resize (maintain scale, anchor top-left position)
  resize(newCanvasWidth, newCanvasHeight)
  
  // Convert canvas coordinates to complex plane coordinates
  canvasToComplex(canvasX, canvasY, canvasWidth, canvasHeight)
}
```

**Behavior**:
- Stores current viewport boundaries in complex plane coordinates
- Translates pixel deltas to complex plane deltas for panning
- Scales viewport around focal point for zooming
- Maintains aspect ratio matching canvas dimensions (complex plane aspect ratio = canvas aspect ratio)
- During resize: maintains scale unchanged and anchors top-left complex plane position at top-left of canvas
- Adjusts complex plane bounds to match new canvas dimensions while preserving scale
- Ensures viewport dimensions match canvas aspect ratio at all times

#### 2.3 Render Engine

**Responsibility**: Orchestrate the calculation and rendering of the Mandelbrot set with performance timing.

**Interface**:
```javascript
class RenderEngine {
  constructor(canvas, calculationModule, viewportManager)
  
  // Trigger a full render with timing
  render() // Returns render time in milliseconds
  
  // Scale existing canvas image (for responsive zoom)
  scaleCanvas(scaleFactor, focalX, focalY)
  
  // Map iteration count to color
  iterationToColor(iterations, maxIterations)
  
  // Switch to a different calculation module (WASM or JavaScript)
  setCalculationModule(newModule)
  
  // Get last render time
  getLastRenderTime() // Returns time in milliseconds
}
```

**Behavior**:
- Iterates over each pixel in the canvas
- Converts pixel coordinates to complex plane coordinates
- Calls calculation function (WASM or JavaScript) for each point
- Measures calculation time from request to response
- Maps iteration results to colors
- Draws pixels to canvas using ImageData API
- Supports hot-swapping between WASM and JavaScript modules while preserving viewport state
- Provides immediate visual feedback by scaling existing canvas during zoom
- Returns render time for display in UI

### 3. Calculation Modules

**Responsibility**: Perform Mandelbrot set calculations using different implementations for performance comparison.

**Multiple Module Support**: The system supports multiple calculation modules:
- **WebAssembly modules** compiled from different source languages:
  - Rust implementation
  - C/C++ implementation  
  - Go implementation
  - Moonbit implementation
- **JavaScript implementation** for baseline comparison

All modules expose the same interface for interoperability.

**Interface** (exposed to JavaScript):
```javascript
// Module exports (consistent across all implementations)
{
  // Calculate iterations for a single point
  calculatePoint(real, imag, maxIterations, escapeRadius) // Returns iteration count
  
  // Calculate iterations for a buffer of points (optional optimization)
  calculateBuffer(bufferPtr, length, maxIterations, escapeRadius)
}
```

**Implementation** (Rust/C++/Go/Moonbit/JavaScript):
- Iterative calculation: z = z² + c
- Early exit when |z| > escapeRadius
- Return iteration count or maxIterations

**Memory Management**:
- WASM: Use shared memory between JavaScript and Wasm for buffer-based calculations
- WASM: JavaScript allocates and passes memory pointers to Wasm
- JavaScript: Direct function calls without memory management overhead

### 4. Module Selector UI Component

**Responsibility**: Provide user interface for selecting between available calculation modules and displaying performance metrics.

**Interface**:
```javascript
class ModuleSelector {
  constructor(availableModules, onModuleChange)
  
  // Get currently selected module
  getCurrentModule()
  
  // Change active module
  selectModule(moduleName)
  
  // Update render time display
  updateRenderTime(timeMs)
  
  // Show modal error dialog
  showError(message)
  
  // Render selector UI
  render()
}
```

**Behavior**:
- Displays as an overlay control on the canvas
- Shows available modules (Rust, C/C++, Go, Moonbit, JavaScript)
- Highlights currently selected module
- Displays last render time in milliseconds
- Triggers module reload and re-render when selection changes
- Preserves current viewport when switching modules
- Shows modal error dialog when module fails to load (user must dismiss to clear)

### 5. Viewport Info UI Component

**Responsibility**: Display current viewport boundaries in the complex plane.

**Interface**:
```javascript
class ViewportInfo {
  constructor(viewportManager)
  
  // Update displayed viewport bounds
  updateBounds()
  
  // Render viewport info UI
  render()
}
```

**Behavior**:
- Displays as an overlay control on the canvas
- Shows current min/max values for real and imaginary axes
- Updates automatically after zoom, pan, or resize operations
- Formats values with appropriate precision for readability

## Data Models

### Viewport

Represents the current view into the complex plane.

```javascript
{
  minReal: number,    // Minimum real component (left edge)
  maxReal: number,    // Maximum real component (right edge)
  minImag: number,    // Minimum imaginary component (bottom edge)
  maxImag: number     // Maximum imaginary component (top edge)
}
```

**Initial Values**:
- minReal: -2.0
- maxReal: 1.0
- minImag: -1.0
- maxImag: 1.0
- Initial viewport should be centered in canvas with no cropping

**Constraints**:
- Must maintain aspect ratio matching canvas: (maxReal - minReal) / (maxImag - minImag) = canvasWidth / canvasHeight
- During resize: scale remains unchanged, top-left complex plane position anchored at top-left of canvas
- Complex plane bounds adjust to match new canvas dimensions while preserving scale
- Viewport must not be cropped during transformations

### Calculation Parameters

Configuration for Mandelbrot calculations.

```javascript
{
  maxIterations: number,    // Maximum iteration count (e.g., 256, 512, 1000)
  escapeRadius: number      // Escape threshold (typically 2.0)
}
```

### Color Palette

Mapping from iteration counts to RGB colors.

```javascript
{
  palette: Array<{r: number, g: number, b: number}>,  // Pre-computed color array
  setColor: {r: number, g: number, b: number}         // Color for points in the set
}
```

**Color Mapping Strategy**:
- Use smooth color gradients (e.g., HSV to RGB conversion)
- Map iteration count to palette index
- Apply continuous coloring to avoid banding: `smoothed = iterations + 1 - log(log(|z|)) / log(2)`


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Canvas dimensions match viewport on resize

*For any* window resize event, the canvas width and height should equal the new viewport width and height respectively.

**Validates: Requirements 1.2**

### Property 2: Iteration count bounded by maximum

*For any* complex point and calculation parameters, the returned iteration count should be less than or equal to maxIterations.

**Validates: Requirements 2.2**

### Property 3: Escape detection accuracy

*For any* complex point that escapes, if we manually iterate the Mandelbrot function, the point should exceed the escape radius at exactly the returned iteration count.

**Validates: Requirements 2.3**

### Property 4: Non-escaping points return maximum iterations

*For any* complex point that does not escape within maxIterations, the calculation function should return exactly maxIterations.

**Validates: Requirements 2.4**

### Property 5: Pan translates viewport proportionally

*For any* viewport and mouse movement delta, panning should translate the viewport boundaries by a distance in the complex plane that is proportional to the pixel delta and the current viewport scale.

**Validates: Requirements 3.2**

### Property 6: Zoom direction affects viewport size correctly

*For any* viewport, zooming in (positive zoom factor) should decrease the viewport size, and zooming out (negative zoom factor) should increase the viewport size.

**Validates: Requirements 4.1, 4.2**

### Property 7: Zoom preserves focal point

*For any* viewport and cursor position, the complex plane coordinate at the cursor position should remain unchanged after a zoom operation.

**Validates: Requirements 4.3**

### Property 8: Zoom preserves aspect ratio

*For any* viewport and zoom factor, the aspect ratio (width/height) of the viewport should remain constant before and after the zoom operation.

**Validates: Requirements 4.4**

### Property 9: Iteration count maps to valid color

*For any* iteration count between 0 and maxIterations, the color mapping function should return a valid RGB color object with r, g, b values in the range [0, 255].

**Validates: Requirements 6.1**

### Property 10: Maximum iterations map to set color

*For any* point where the iteration count equals maxIterations, the color mapping function should return the designated set color (typically black).

**Validates: Requirements 6.2**

### Property 11: Module switch preserves viewport

*For any* viewport state and calculation module change (WASM or JavaScript), the viewport boundaries should remain unchanged after switching modules.

**Validates: Requirements 5.6**

### Property 12: Viewport scale and top-left position preserved on resize

*For any* viewport and canvas resize operation, the scale (units per pixel) should remain unchanged and the top-left corner complex plane position should remain anchored at the top-left of the canvas, with complex plane bounds adjusting to match the new canvas dimensions.

**Validates: Requirements 1.2**

### Property 13: Aspect ratio matches canvas

*For any* viewport state, the ratio of (maxReal - minReal) to (maxImag - minImag) should equal the ratio of canvas width to canvas height, maintaining aspect ratio matching between complex plane and canvas dimensions.

**Validates: Requirements 1.6**

### Property 14: Canvas scales on zoom

*For any* zoom operation, the existing canvas image should be immediately scaled before the full re-render completes, providing responsive visual feedback.

**Validates: Requirements 4.6**

### Property 15: Debounced render after zoom

*For any* sequence of zoom operations, if no additional zoom occurs within 1000ms of the last zoom, a full re-render should be triggered exactly once.

**Validates: Requirements 4.5**

### Property 16: Modal error on module load failure

*For any* module load failure, a modal error dialog should be displayed and remain visible until the user explicitly dismisses it.

**Validates: Requirements 5.3**

### Property 17: Render time displayed

*For any* completed render operation, the module selector overlay should display the calculation time in whole milliseconds.

**Validates: Requirements 5.2.1**

### Property 18: Accurate timing measurement

*For any* WASM module calculation, the displayed time should accurately reflect the total time between making the request to the module and receiving the response.

**Validates: Requirements 5.2.2**

### Property 19: Viewport info updates on zoom

*For any* zoom operation, the viewport info overlay should update to display the new min/max values for real and imaginary axes.

**Validates: Requirements 7.1**

### Property 20: Viewport info updates on pan

*For any* pan operation, the viewport info overlay should update to display the new min/max values for real and imaginary axes.

**Validates: Requirements 7.2**

### Property 21: Viewport info updates on resize

*For any* window resize operation, the viewport info overlay should update to display the new min/max values for real and imaginary axes.

**Validates: Requirements 7.3**

## Error Handling

### Module Loading Errors

**Scenario**: WASM or JavaScript module fails to fetch or instantiate.

**Handling**:
- Display modal error dialog with user-friendly message
- User must explicitly dismiss the modal to clear it from UI
- Log detailed error to console for debugging
- Prevent render attempts until module is loaded
- If switching modules, fall back to previously working module

**Implementation**:
```javascript
try {
  const module = await loadModule(moduleName);
} catch (error) {
  showModalError(`Failed to load ${moduleName} calculation engine. Please try another module.`);
  console.error("Module loading error:", error);
  // Fall back to previous module if switching
  if (previousModule) {
    return previousModule;
  }
  return;
}
```

### Invalid Viewport State

**Scenario**: Viewport boundaries become invalid (e.g., minReal >= maxReal).

**Handling**:
- Validate viewport after each transformation
- Clamp zoom to prevent viewport collapse
- Reset to default viewport if state becomes corrupted

**Implementation**:
- Minimum viewport size: 1e-10 in complex plane units
- Maximum zoom level: prevent viewport smaller than minimum

### Canvas Context Errors

**Scenario**: Unable to get 2D rendering context from canvas.

**Handling**:
- Display error message
- Gracefully degrade or suggest browser upgrade

### Calculation Overflow

**Scenario**: Complex number calculations produce NaN or Infinity.

**Handling**:
- Wasm module checks for overflow conditions
- Return maxIterations for overflow cases
- Ensure escape radius check prevents most overflow scenarios

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples and edge cases:

**Canvas Initialization**:
- Test that canvas is created with correct initial dimensions
- Test that initial viewport matches specification (-2.0 to 1.0 real, -1.0 to 1.0 imaginary)
- Test that initial viewport is centered in canvas with no cropping
- Test that canvas maintains aspect ratio matching canvas dimensions on initialization
- Test that default calculation module is loaded before first render
- Test that module selector UI is present on page load with all modules (Rust, C++, Go, Moonbit, JavaScript)
- Test that viewport info UI is present on page load
- Test that default module is selected in the UI

**Event Handling**:
- Test mousedown initiates pan mode
- Test mouseup completes pan and triggers immediate render
- Test wheel event triggers zoom with canvas scaling
- Test that debounce timer starts after zoom
- Test that additional zooms reset the debounce timer
- Test that render is called after debounce period expires
- Test that viewport info updates after pan, zoom, and resize

**Module Selection**:
- Test that all modules (Rust, C/C++, Go, Moonbit, JavaScript) are available in selector
- Test that selecting a module triggers module load
- Test that module switch triggers re-render with timing
- Test that render time is displayed after each render
- Test that failed module load displays modal error
- Test that modal error requires user dismissal
- Test that failed load falls back to previous module

**Coordinate Conversion**:
- Test canvas-to-complex coordinate conversion with known values
- Test edge cases (0,0), (width, height), (width/2, height/2)

**Color Mapping**:
- Test that maxIterations maps to set color
- Test that 0 iterations maps to first palette color
- Test that mid-range iterations map to appropriate palette colors

**Error Handling**:
- Test module load failure displays modal error message
- Test modal error persists until user dismisses
- Test invalid viewport state is handled gracefully
- Test viewport scale preservation and top-left anchoring during resize
- Test aspect ratio matching canvas is maintained during all operations

### Property-Based Testing

Property-based tests will verify universal properties across many randomly generated inputs using a PBT library (fast-check for JavaScript, or proptest if testing Rust Wasm code).

**Configuration**: Each property test should run a minimum of 100 iterations.

**Test Tagging**: Each property-based test must include a comment with the format:
`// Feature: mandelbrot-visualizer, Property {number}: {property_text}`

**Properties to Test**:

1. **Canvas Resize Property** (Property 1)
   - Generate random viewport dimensions
   - Verify canvas dimensions match after resize

2. **Iteration Bound Property** (Property 2)
   - Generate random complex points and maxIterations values
   - Verify returned iterations ≤ maxIterations

3. **Escape Detection Property** (Property 3)
   - Generate random escaping points
   - Verify manual iteration matches returned count

4. **Non-Escape Property** (Property 4)
   - Generate random non-escaping points (known to be in set)
   - Verify returned iterations === maxIterations

5. **Pan Translation Property** (Property 5)
   - Generate random viewports and pan deltas
   - Verify viewport translates proportionally

6. **Zoom Direction Property** (Property 6)
   - Generate random viewports and zoom factors
   - Verify zoom in decreases size, zoom out increases size

7. **Zoom Focal Point Property** (Property 7)
   - Generate random viewports, cursor positions, and zoom factors
   - Verify focal point coordinate remains constant

8. **Zoom Aspect Ratio Property** (Property 8)
   - Generate random viewports and zoom factors
   - Verify aspect ratio unchanged

9. **Color Validity Property** (Property 9)
   - Generate random iteration counts
   - Verify color values in valid range [0, 255]

10. **Set Color Property** (Property 10)
    - Test with maxIterations value
    - Verify returns designated set color

11. **Module Switch Viewport Preservation** (Property 11)
    - Generate random viewport states
    - Switch between random modules (WASM and JavaScript)
    - Verify viewport boundaries unchanged

12. **Viewport Scale and Top-Left Position Preserved on Resize** (Property 12)
    - Generate random viewports and canvas dimensions
    - Perform resize operation
    - Verify scale (units per pixel) remains unchanged
    - Verify top-left corner complex plane position remains anchored at top-left of canvas
    - Verify complex plane bounds adjust to match new canvas dimensions

13. **Aspect Ratio Matches Canvas** (Property 13)
    - Generate random viewport states and canvas dimensions
    - Verify complex plane aspect ratio equals canvas aspect ratio

14. **Canvas Scales on Zoom** (Property 14)
    - Generate random zoom operations
    - Verify canvas is scaled immediately before re-render

15. **Debounced Render After Zoom** (Property 15)
    - Generate sequences of zoom operations
    - Verify render triggered after 1000ms of no additional zooms
    - Verify only one render occurs per debounce period

16. **Modal Error on Module Load Failure** (Property 16)
    - Simulate module load failures
    - Verify modal error is displayed
    - Verify modal persists until dismissed

17. **Render Time Displayed** (Property 17)
    - Generate random render operations
    - Verify time is displayed in overlay

18. **Accurate Timing Measurement** (Property 18)
    - Generate random calculations
    - Verify displayed time matches actual calculation time

19. **Viewport Info Updates on Zoom** (Property 19)
    - Generate random zoom operations
    - Verify viewport info displays correct bounds

20. **Viewport Info Updates on Pan** (Property 20)
    - Generate random pan operations
    - Verify viewport info displays correct bounds

21. **Viewport Info Updates on Resize** (Property 21)
    - Generate random resize operations
    - Verify viewport info displays correct bounds

### Integration Testing

- Test complete render cycle: user interaction → viewport update → calculation → rendering → timing display
- Test pan and zoom in sequence to verify state consistency
- Test rapid zoom interactions to verify debouncing works correctly
- Test module switching during active rendering
- Test that all calculation modules (WASM and JavaScript) produce equivalent results for the same input
- Test viewport info updates correctly across all interaction types
- Test resize operations maintain scale, top-left anchoring, and aspect ratio matching canvas
- Test modal error flow from display to dismissal

### Performance Testing

While not part of automated correctness testing, performance should be manually validated:
- Render time for initial view should be < 1 second
- Pan and zoom should feel responsive (< 100ms to start render)
- Deep zoom levels should maintain acceptable performance

## Implementation Notes

### Technology Choices

**Calculation Module Languages**: Multiple implementations for performance comparison
- **Rust**: Memory safety and excellent Wasm tooling (wasm-pack, wasm-bindgen)
- **C/C++**: Mature compilers and optimization (Emscripten)
- **Go**: Simplicity and built-in Wasm support (TinyGo for smaller binaries)
- **Moonbit**: Modern language with WebAssembly-first design
- **JavaScript**: Baseline implementation for performance comparison (no WASM overhead)

**JavaScript Framework**: Vanilla JavaScript (no framework needed)
- Simple application doesn't require React/Vue overhead
- Direct DOM and Canvas API access for maximum performance

**Build Tools**:
- Rust: wasm-pack for building Wasm modules
- C/C++: Emscripten for compilation to Wasm
- Go: TinyGo for optimized Wasm output
- Moonbit: Moonbit compiler for Wasm generation
- JavaScript: No build step required (native implementation)
- Bundler: Vite for development and production builds
- Static file server for testing

### Performance Optimizations

**Calculation Optimizations**:
- Use escape radius of 2.0 (standard for Mandelbrot)
- Implement early bailout when |z| > escape radius
- Consider adaptive iteration counts based on zoom level

**Rendering Optimizations**:
- Use ImageData API for batch pixel updates
- Scale existing canvas image immediately on zoom for responsive feel
- Debounce full re-renders during zoom (1000ms delay)
- Measure and display calculation time
- Consider Web Workers for parallel calculation (future enhancement)
- Implement progressive rendering for deep zooms (future enhancement)

**Memory Management**:
- Reuse ImageData buffer across renders
- Minimize allocations in hot paths
- Use typed arrays for efficient data transfer

### Browser Compatibility

**Minimum Requirements**:
- WebAssembly support (all modern browsers since 2017)
- HTML5 Canvas support
- ES6 JavaScript support

**Tested Browsers**:
- Chrome/Edge 57+
- Firefox 52+
- Safari 11+

### File Structure

```
mandelbrot-visualizer/
├── index.html              # Main HTML page
├── styles.css              # Canvas and page styling
├── src/
│   ├── main.js            # Application entry point
│   ├── eventHandler.js    # Mouse/wheel event handling
│   ├── viewportManager.js # Viewport state management
│   ├── renderEngine.js    # Rendering orchestration
│   ├── colorPalette.js    # Color mapping functions
│   ├── wasmLoader.js      # WASM module loading
│   ├── jsCalculator.js    # JavaScript calculation implementation
│   ├── moduleSelector.js  # Module selection UI with timing display
│   └── viewportInfo.js    # Viewport info overlay UI
├── wasm/
│   ├── rust/
│   │   ├── src/
│   │   │   └── lib.rs     # Rust source for Wasm module
│   │   ├── Cargo.toml     # Rust project configuration
│   │   └── pkg/           # Built Rust Wasm output
│   ├── cpp/
│   │   ├── mandelbrot.cpp # C++ source for Wasm module
│   │   └── build/         # Built C++ Wasm output
│   ├── go/
│   │   ├── mandelbrot.go  # Go source for Wasm module
│   │   └── build/         # Built Go Wasm output
│   └── moonbit/
│       ├── mandelbrot.mbt # Moonbit source for Wasm module
│       └── build/         # Built Moonbit Wasm output
└── tests/
    ├── unit/              # Unit tests
    └── property/          # Property-based tests
```
