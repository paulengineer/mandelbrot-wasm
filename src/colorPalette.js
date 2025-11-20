/**
 * ColorPalette
 * 
 * Provides color mapping functionality for Mandelbrot set visualization.
 * Maps iteration counts to RGB colors using smooth gradients.
 */

/**
 * Convert HSV color values to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value/Brightness (0-1)
 * @returns {Object} RGB color {r, g, b} with values 0-255
 */
function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r, g, b;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  };
}

/**
 * Generate a color palette with smooth gradients
 * @param {number} size - Number of colors in the palette
 * @returns {Array<Object>} Array of RGB color objects
 */
export function generatePalette(size = 256) {
  const palette = [];
  
  for (let i = 0; i < size; i++) {
    // Create a smooth color gradient using HSV
    // Hue cycles through the spectrum (0-360 degrees)
    const hue = (i / size) * 360;
    const saturation = 0.8;
    const value = 0.9;
    
    palette.push(hsvToRgb(hue, saturation, value));
  }
  
  return palette;
}

/**
 * The designated color for points in the Mandelbrot set (maximum iterations)
 */
export const SET_COLOR = { r: 0, g: 0, b: 0 }; // Black

/**
 * Default color palette
 */
const defaultPalette = generatePalette(256);

/**
 * Map iteration count to a color using smooth continuous coloring
 * @param {number} iterations - Number of iterations before escape
 * @param {number} maxIterations - Maximum iteration count
 * @param {number} [zMagnitude] - Optional: magnitude of z at escape for smooth coloring
 * @param {Array<Object>} [palette] - Optional: custom color palette
 * @returns {Object} RGB color {r, g, b} with values 0-255
 */
export function iterationToColor(iterations, maxIterations, zMagnitude = null, palette = defaultPalette) {
  // Points in the set (reached max iterations) are rendered in the set color
  if (iterations >= maxIterations) {
    return SET_COLOR;
  }

  // Apply continuous coloring to avoid banding
  // This creates smooth color transitions between iteration bands
  let smoothed = iterations;
  
  if (zMagnitude !== null && zMagnitude > 0) {
    // Continuous coloring formula: iterations + 1 - log(log(|z|)) / log(2)
    // This smooths the color transitions based on how far the point escaped
    const logZMag = Math.log(zMagnitude);
    if (logZMag > 0) {
      smoothed = iterations + 1 - Math.log(logZMag) / Math.log(2);
    }
  }

  // Map smoothed iteration to palette index
  const paletteIndex = Math.floor(smoothed * (palette.length / maxIterations)) % palette.length;
  
  return palette[paletteIndex];
}
