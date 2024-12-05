/**
 * @fileoverview Spark Points Calculator
 * Calculates reward points (sparks) based on user activity metrics. Uses a system of thresholds
 * and coefficients to convert physical activity (steps, active time, heart rate) into spark points
 * that can be redeemed for screen time and rewards.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Core spark points calculation system
 */

/**
 * Default configuration for spark point calculations
 * Defines thresholds and coefficients for different activity levels
 */
const DEFAULT_CONFIG = {
    // Step thresholds with corresponding multipliers
    stepThresholds: [
        { min: 0, max: 3000, coefficient: 0.8 },    // Below average activity
        { min: 3001, max: 6000, coefficient: 1.0 },  // Average activity
        { min: 6001, max: 9000, coefficient: 1.2 },  // Above average activity
        { min: 9001, max: 12000, coefficient: 1.5 }  // High activity
    ],
    // Active time thresholds in minutes
    timeThresholds: [
        { min: 0, max: 30, coefficient: 0.5 },      // Short activity duration
        { min: 31, max: 60, coefficient: 1.0 },     // Standard activity duration
        { min: 61, max: 120, coefficient: 1.5 },    // Extended activity
        { min: 121, max: null, coefficient: 2.0 }   // Long duration activity
    ],
    // Heart rate thresholds for intensity measurement
    heartRateThresholds: [
        { min: 0, max: 60, coefficient: 0.75 },     // Low intensity
        { min: 61, max: 80, coefficient: 1.0 },     // Moderate intensity
        { min: 81, max: null, coefficient: 1.25 }   // High intensity
    ],
    sparkCoefficient: 1000000  // Base multiplier for final spark calculation
};

/**
 * SparkCalculator class for computing reward points based on activity metrics
 */
class SparkCalculator {
    /**
     * @param {Object} config - Configuration object for calculations
     */
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }

    /**
     * Gets the appropriate coefficient based on a value and its thresholds
     * @param {number} value - Activity value to evaluate
     * @param {Array} thresholds - Array of threshold objects
     * @returns {number} Coefficient for the value
     */
    getCoefficient(value, thresholds) {
        for (const threshold of thresholds) {
            // Check if value falls within threshold range
            // null max value indicates no upper limit
            if (value >= threshold.min && 
                (threshold.max === null || value <= threshold.max)) {
                return threshold.coefficient;
            }
        }
        return 1.0; // Default coefficient if no match found
    }

    /**
     * Calculates spark points based on activity metrics
     * @param {number} steps - Step count
     * @param {number} timeMinutes - Active minutes
     * @param {number} avgHeartRate - Average heart rate
     * @returns {Object} Calculation results including spark points and component details
     */
    calculateSparks(steps, timeMinutes, avgHeartRate) {
        console.log('Input values:', { steps, timeMinutes, avgHeartRate });
    
        // Get coefficients for each activity metric
        const stepsCoef = this.getCoefficient(steps, this.config.stepThresholds);
        const timeCoef = this.getCoefficient(timeMinutes, this.config.timeThresholds);
        const heartRateCoef = this.getCoefficient(avgHeartRate, this.config.heartRateThresholds);
    
        console.log('Coefficients:', { stepsCoef, timeCoef, heartRateCoef });
    
        // Calculate weighted value based on all metrics
        const bigNumberValue = ((steps * stepsCoef) +
                             (timeMinutes * timeCoef) +
                             (avgHeartRate * heartRateCoef))
    
        console.log('Big Number:', bigNumberValue);
    
        // Convert to final spark points
        const sparkPoints = Math.floor(bigNumberValue);
    
        console.log('Final Spark Points:', sparkPoints);
    
        // Return both final points and calculation details
        return {
            sparkPoints,
            calculations: {
                stepsCoefficient: stepsCoef,
                timeCoefficient: timeCoef,
                heartRateCoefficient: heartRateCoef,
                bigNumberValue
            }
        };
    }
}

// Example usage section
// Assuming config is loaded from JSON
const calculator = new SparkCalculator(config);

// Example calculation
const result = calculator.calculateSparks(4500, 45, 75);
console.log(`Earned Sparks: ${result.sparkPoints}`);
console.log('Calculation details:', result.calculations);