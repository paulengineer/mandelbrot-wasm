#include <emscripten.h>
#include <cmath>
#include <cstdlib>

/**
 * Calculate the number of iterations for a point in the Mandelbrot set
 * 
 * @param real Real component of the complex number c
 * @param imag Imaginary component of the complex number c
 * @param max_iterations Maximum number of iterations to perform
 * @param escape_radius Threshold beyond which a point is considered escaped
 * @return The number of iterations before escape, or max_iterations if the point doesn't escape
 */
extern "C" {
    EMSCRIPTEN_KEEPALIVE
    unsigned int calculatePoint(double real, double imag, unsigned int max_iterations, double escape_radius) {
        double c_real = real;
        double c_imag = imag;
        
        double z_real = 0.0;
        double z_imag = 0.0;
        
        double escape_radius_squared = escape_radius * escape_radius;
        
        for (unsigned int iteration = 0; iteration < max_iterations; iteration++) {
            // Calculate |z|^2 = z_real^2 + z_imag^2
            double z_magnitude_squared = z_real * z_real + z_imag * z_imag;
            
            // Check if point has escaped
            if (z_magnitude_squared > escape_radius_squared) {
                return iteration;
            }
            
            // Calculate z = z^2 + c
            // (a + bi)^2 = a^2 - b^2 + 2abi
            double z_real_temp = z_real * z_real - z_imag * z_imag + c_real;
            z_imag = 2.0 * z_real * z_imag + c_imag;
            z_real = z_real_temp;
        }
        
        // Point did not escape within max_iterations
        return max_iterations;
    }

    /**
     * Calculate the Mandelbrot set for multiple points in a single batch call
     * 
     * @param real_coords Pointer to array of real components for all points
     * @param imag_coords Pointer to array of imaginary components for all points
     * @param length Number of coordinate pairs
     * @param max_iterations Maximum number of iterations to perform
     * @param escape_radius Threshold beyond which a point is considered escaped
     * @return Pointer to array of iteration counts (caller must free this memory)
     */
    EMSCRIPTEN_KEEPALIVE
    unsigned int* calculateMandelbrotSet(
        const double* real_coords,
        const double* imag_coords,
        unsigned int length,
        unsigned int max_iterations,
        double escape_radius
    ) {
        // Allocate result array
        unsigned int* results = (unsigned int*)malloc(length * sizeof(unsigned int));
        if (!results) {
            return nullptr;
        }
        
        double escape_radius_squared = escape_radius * escape_radius;
        
        // Process each coordinate pair
        for (unsigned int i = 0; i < length; i++) {
            double c_real = real_coords[i];
            double c_imag = imag_coords[i];
            
            double z_real = 0.0;
            double z_imag = 0.0;
            
            unsigned int iteration = 0;
            
            for (unsigned int iter = 0; iter < max_iterations; iter++) {
                // Calculate |z|^2 = z_real^2 + z_imag^2
                double z_magnitude_squared = z_real * z_real + z_imag * z_imag;
                
                // Check if point has escaped
                if (z_magnitude_squared > escape_radius_squared) {
                    iteration = iter;
                    break;
                }
                
                // Calculate z = z^2 + c
                // (a + bi)^2 = a^2 - b^2 + 2abi
                double z_real_temp = z_real * z_real - z_imag * z_imag + c_real;
                z_imag = 2.0 * z_real * z_imag + c_imag;
                z_real = z_real_temp;
                
                iteration = iter + 1;
            }
            
            results[i] = iteration;
        }
        
        return results;
    }

    /**
     * Free memory allocated by calculateMandelbrotSet
     * 
     * @param ptr Pointer to memory to free
     */
    EMSCRIPTEN_KEEPALIVE
    void freeResults(unsigned int* ptr) {
        free(ptr);
    }
}
