package main

import (
	"syscall/js"
)

// calculatePoint calculates the number of iterations for a point in the Mandelbrot set
//
// Parameters:
//   - real: Real component of the complex number c
//   - imag: Imaginary component of the complex number c
//   - maxIterations: Maximum number of iterations to perform
//   - escapeRadius: Threshold beyond which a point is considered escaped
//
// Returns:
//   - The number of iterations before escape, or maxIterations if the point doesn't escape
func calculatePoint(this js.Value, args []js.Value) interface{} {
	if len(args) != 4 {
		return 0
	}

	real := args[0].Float()
	imag := args[1].Float()
	maxIterations := uint32(args[2].Int())
	escapeRadius := args[3].Float()

	cReal := real
	cImag := imag

	zReal := 0.0
	zImag := 0.0

	escapeRadiusSquared := escapeRadius * escapeRadius

	for iteration := uint32(0); iteration < maxIterations; iteration++ {
		// Calculate |z|^2 = z_real^2 + z_imag^2
		zMagnitudeSquared := zReal*zReal + zImag*zImag

		// Check if point has escaped
		if zMagnitudeSquared > escapeRadiusSquared {
			return iteration
		}

		// Calculate z = z^2 + c
		// (a + bi)^2 = a^2 - b^2 + 2abi
		zRealTemp := zReal*zReal - zImag*zImag + cReal
		zImag = 2.0*zReal*zImag + cImag
		zReal = zRealTemp
	}

	// Point did not escape within maxIterations
	return maxIterations
}

// calculateMandelbrotSet calculates the Mandelbrot set for multiple points in a single batch call
//
// Parameters:
//   - realCoords: Array of real components for all points
//   - imagCoords: Array of imaginary components for all points
//   - maxIterations: Maximum number of iterations to perform
//   - escapeRadius: Threshold beyond which a point is considered escaped
//
// Returns:
//   - Array of iteration counts, one for each input coordinate pair
func calculateMandelbrotSet(this js.Value, args []js.Value) interface{} {
	if len(args) != 4 {
		return js.ValueOf([]interface{}{})
	}

	realCoords := args[0]
	imagCoords := args[1]
	maxIterations := uint32(args[2].Int())
	escapeRadius := args[3].Float()

	// Get array lengths
	realLength := realCoords.Length()
	imagLength := imagCoords.Length()
	
	// Use minimum length to handle mismatched arrays
	length := realLength
	if imagLength < length {
		length = imagLength
	}

	// Pre-allocate result array
	results := make([]interface{}, length)
	
	escapeRadiusSquared := escapeRadius * escapeRadius

	// Process each coordinate pair
	for i := 0; i < length; i++ {
		cReal := realCoords.Index(i).Float()
		cImag := imagCoords.Index(i).Float()

		zReal := 0.0
		zImag := 0.0

		iteration := uint32(0)

		for iter := uint32(0); iter < maxIterations; iter++ {
			// Calculate |z|^2 = z_real^2 + z_imag^2
			zMagnitudeSquared := zReal*zReal + zImag*zImag

			// Check if point has escaped
			if zMagnitudeSquared > escapeRadiusSquared {
				iteration = iter
				break
			}

			// Calculate z = z^2 + c
			// (a + bi)^2 = a^2 - b^2 + 2abi
			zRealTemp := zReal*zReal - zImag*zImag + cReal
			zImag = 2.0*zReal*zImag + cImag
			zReal = zRealTemp

			iteration = iter + 1
		}

		results[i] = iteration
	}

	return js.ValueOf(results)
}

func main() {
	// Register the calculatePoint function to be callable from JavaScript
	js.Global().Set("calculatePoint", js.FuncOf(calculatePoint))
	
	// Register the batch calculation function
	js.Global().Set("calculateMandelbrotSet", js.FuncOf(calculateMandelbrotSet))

	// Keep the program running
	select {}
}
