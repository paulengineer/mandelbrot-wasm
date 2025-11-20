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

func main() {
	// Register the calculatePoint function to be callable from JavaScript
	js.Global().Set("calculatePoint", js.FuncOf(calculatePoint))

	// Keep the program running
	select {}
}
