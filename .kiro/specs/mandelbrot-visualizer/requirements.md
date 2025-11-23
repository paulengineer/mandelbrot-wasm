# Requirements Document

## Introduction

The Mandelbrot Visualizer is a web-based application that renders the Mandelbrot set fractal in real-time with interactive pan and zoom capabilities. The system uses WebAssembly for high-performance computation of the fractal, enabling smooth interaction even at deep zoom levels.

## Glossary

- **Mandelbrot Set**: A set of complex numbers for which the iterative function f(z) = z² + c does not diverge when iterated from z = 0
- **Canvas**: An HTML5 canvas element that provides a drawable surface for rendering graphics
- **WebAssembly (Wasm)**: A binary instruction format that enables near-native performance for web applications
- **Viewport**: The visible region of the complex plane being rendered on the canvas
- **Complex Plane**: A two-dimensional plane where each point represents a complex number (real + imaginary components)
- **Iteration Count**: The number of times the Mandelbrot function is applied before determining if a point is in the set
- **Escape Radius**: The threshold value beyond which a point is considered to have escaped to infinity

## Requirements

### Requirement 1

**User Story:** As a user, I want to see a full-screen canvas displaying the Mandelbrot set, so that I can maximise the browser's view area while exploring the fractal visualization.

#### Acceptance Criteria

1. WHEN the page loads, THE Canvas SHALL fill the entire browser viewport
2. WHEN the browser window is resized, THE Complex Plane bounds SHALL adjust in line with the Canvas dimensions, with scale unchanged and top left Complex Plane position anchored at top left of canvas.
3. WHEN the Canvas is rendered, THE Mandelbrot Set SHALL be displayed
4. WHEN the Canvas is rendered, THE System SHALL use color gradients to represent iteration counts for visual clarity
5. WHEN the initial Canvas render occurs, THE System SHALL use initial values of -2.0 to 1.0 on the real axis and -1.0 to 1.0 on the imaginary axis, centered in the canvas and scaled to fit.
6. THE Complex Plane bounds SHALL maintain same aspect ratio as the Canvas dimensions

### Requirement 2

**User Story:** As a user, I want the Mandelbrot calculations to be performed using WebAssembly, so that I experience fast rendering and smooth interactions.

#### Acceptance Criteria

1. WHEN the Mandelbrot Set is calculated, THE System SHALL execute the computation using WebAssembly modules
2. WHEN a pixel requires calculation, THE Wasm Module SHALL iterate the Mandelbrot function up to a maximum iteration count
3. WHEN a point escapes the escape radius, THE Wasm Module SHALL return the iteration count at which escape occurred
4. WHEN a point does not escape within the maximum iterations, THE Wasm Module SHALL return the maximum iteration count
5. WHEN the Wasm Module is invoked, THE System SHALL pass viewport coordinates and iteration parameters to the module

### Requirement 3

**User Story:** As a user, I want to pan across the Mandelbrot set by clicking and dragging, so that I can explore different regions of the fractal.

#### Acceptance Criteria

1. WHEN a user presses the left mouse button on the Canvas, THE System SHALL initiate pan mode
2. WHILE the mouse button is held down and the cursor moves, THE System SHALL translate the viewport coordinates proportionally to cursor movement
3. WHEN the mouse button is released, THE System SHALL complete the pan operation and render the new viewport
4. WHEN panning occurs, THE System SHALL update the viewport boundaries to reflect the new position in the complex plane
5. WHEN the viewport changes due to panning, THE System SHALL trigger a re-calculation and re-render of the Mandelbrot Set

### Requirement 4

**User Story:** As a user, I want to zoom into and out of the Mandelbrot set using the mouse wheel, so that I can examine fine details or view broader context.

#### Acceptance Criteria

1. WHEN a user scrolls the mouse wheel forward, THE System SHALL decrease the viewport size to zoom in toward the cursor position
2. WHEN a user scrolls the mouse wheel backward, THE System SHALL increase the viewport size to zoom out from the cursor position
3. WHEN zooming occurs, THE System SHALL maintain the cursor position as the zoom focal point in the complex plane
4. WHEN the zoom level changes, THE System SHALL adjust viewport boundaries proportionally while preserving the aspect ratio
6. WHEN a zoom operation completes, THE system SHALL resize the existing image so that the zooming is fast and feels responsive.
5. WHEN a configurable amount of time has elapsed (1000ms) since the last zoom operation and no additional zoom has occurred, THE System SHALL trigger a re-calculation and re-render of the Mandelbrot Set.  

### Requirement 5

**User Story:** As a user, I want to be able to select from multiple WebAssembly modules, so that I can compare the performance of different source languages.  

#### Acceptance Criteria

1. WHEN the WebAssembly modules are built, THE System SHALL compile source code written in Rust, C/C++, Moonbit and Golang to Wasm format
2. WHEN the page loads, THE System SHALL fetch and instantiate the default WebAssembly module before rendering
3. WHEN the Wasm module fails to load, THE System SHALL display a modal error message to the user, and the user must close the message to clear it from the UI.
4. WHEN the Wasm module is instantiated, THE System SHALL expose calculation functions to JavaScript
5. WHEN calculation functions are called, THE System SHALL pass memory buffers efficiently between JavaScript and WebAssembly
6. WHEN the user changes the webassembly, the current viewport shall be retained.
7. WHEN the page loads, there must be a control overlaying the canvas to allow the user to select between available webassembly modules, with the default module currently selected.

### Requirement 5.1

**User Story:** As a user, I want to be able to select 'Javascript' as an additional option to the list of WebAssembly modules so that I can compare the performance of Mandlebrot implementation in pure javascript.

#### Acceptance Criteria

1. THE System SHALL have a mode of operation where the Mandelbrot Set written in Javascript is used instead of any WASM module. 
2. WHEN the web assembly module selector is displayed, THE System SHALL include a Javascript option in addition to the web assembly module options.

### Requirement 5.2

**User Story:** As a user, I want to see the time (in whole miliseconds) that it took to perform the Mandelbrot Set calculations for the current render.

#### Acceptance Criteria

1. WHEN a render occurs, THE System SHALL display the time taken in the web assembly overlay.
2. WHEN a web assembly module is selected, THE System SHALL use the total time between making the request to the WASM module and receiving the response.

### Requirement 6

**User Story:** As a user, I want the visualization to use appropriate color schemes, so that I can distinguish between different iteration depths and appreciate the fractal's beauty.

#### Acceptance Criteria

1. WHEN a pixel is rendered, THE System SHALL map the iteration count to a color value using a defined color palette
2. WHEN a point is in the Mandelbrot Set (maximum iterations reached), THE System SHALL render it in black or a designated set color
3. WHEN a point escapes quickly (low iteration count), THE System SHALL render it in colors representing the exterior of the set
4. WHEN rendering colors, THE System SHALL apply smooth color gradients to avoid banding artifacts
5. WHEN the color mapping is applied, THE System SHALL ensure visual contrast between adjacent iteration levels

### Requirement 7

**User Story** As a user, I want to see the min/max values of real and imaginary axis according to the curent Complex Plane in the current canvas dimensions, displayed in an overlay.

#### Acceptance Criteria
1. WHEN a zoom operation occurs, THE System SHALL update the min/max values.
1. WHEN a pan operation occurs, THE System SHALL update the min/max values.
1. WHEN the browser window is resized, THE System SHALL update the min/max values.