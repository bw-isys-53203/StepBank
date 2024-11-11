const DEFAULT_CONFIG = {
    stepThresholds: [
        { min: 0, max: 3000, coefficient: 0.8 },
        { min: 3001, max: 6000, coefficient: 1.0 },
        { min: 6001, max: 9000, coefficient: 1.2 },
        { min: 9001, max: 12000, coefficient: 1.5 }
    ],
    timeThresholds: [
        { min: 0, max: 30, coefficient: 0.5 },
        { min: 31, max: 60, coefficient: 1.0 },
        { min: 61, max: 120, coefficient: 1.5 },
        { min: 121, max: null, coefficient: 2.0 }
    ],
    heartRateThresholds: [
        { min: 0, max: 60, coefficient: 0.75 },
        { min: 61, max: 80, coefficient: 1.0 },
        { min: 81, max: null, coefficient: 1.25 }
    ],
    sparkCoefficient: 1000000
};

// sparkCalculator.js
class SparkCalculator {
    constructor(config = DEFAULT_CONFIG) {
        this.config = config;
    }

    getCoefficient(value, thresholds) {
        for (const threshold of thresholds) {
            if (value >= threshold.min && 
                (threshold.max === null || value <= threshold.max)) {
                return threshold.coefficient;
            }
        }
        return 1.0; // Default coefficient if no match found
    }

    calculateSparks(steps, timeMinutes, avgHeartRate) {
        console.log('Input values:', { steps, timeMinutes, avgHeartRate });
    
        // Get coefficients based on values
        const stepsCoef = this.getCoefficient(steps, this.config.stepThresholds);
        const timeCoef = this.getCoefficient(timeMinutes, this.config.timeThresholds);
        const heartRateCoef = this.getCoefficient(avgHeartRate, this.config.heartRateThresholds);
    
        console.log('Coefficients:', { stepsCoef, timeCoef, heartRateCoef });
    
        // Calculate big number value
        const bigNumberValue = (steps * stepsCoef) * 
                             (timeMinutes * timeCoef) * 
                             (avgHeartRate * heartRateCoef);
    
        console.log('Big Number:', bigNumberValue);
    
        // Calculate spark points
        const sparkPoints = Math.floor(bigNumberValue / this.config.sparkCoefficient);
    
        console.log('Final Spark Points:', sparkPoints);
    
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

// Example usage:
// Assuming you've loaded the config from JSON
const calculator = new SparkCalculator(config);

// Example calculation
const result = calculator.calculateSparks(4500, 45, 75);
console.log(`Earned Sparks: ${result.sparkPoints}`);
console.log('Calculation details:', result.calculations);