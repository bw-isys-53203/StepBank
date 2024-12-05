/**
 * @fileoverview Activity Data Management System
 * Manages user fitness activity data including steps, heart rate, and active minutes.
 * Handles data generation, storage, and retrieval with support for historical data
 * and user management functions.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Activity tracking and data management implementation
 */

/**
 * ActivityDataManager class handles all aspects of user activity data including
 * storage, generation of mock data, and data retrieval operations.
 */
class ActivityDataManager {
    /**
     * Initializes storage keys for activities and user data
     * Separates storage concerns for better data organization
     */
    constructor() {
        this.STORAGE_KEYS = {
            ACTIVITIES: 'user_activities',
            USERS: 'registered_users'
        };
    }

    /**
     * Ensures a user has historical activity data, generating it if needed.
     * Creates 120 days of historical data for new users.
     * 
     * @param {string} userId - User identifier
     * @returns {Array} Array of activity data objects
     */
    initializeUserData(userId) {
        const existingData = this.getUserActivities(userId);
        if (!existingData || !existingData.length) {
            const historicalData = this.generateHistoricalData(120);
            this.saveUserActivities(userId, historicalData);
            return historicalData;
        }
        return existingData;
    }

    /**
     * Generates synthetic historical activity data for specified number of days
     * Creates realistic looking fitness data with natural variations
     * 
     * @param {number} days - Number of days of historical data to generate
     * @returns {Array} Array of daily activity objects
     */
    generateHistoricalData(days) {
        const data = [];
        const now = new Date();

        // Generate data for each day working backwards from today
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            data.push({
                userId: null, // Placeholder - set during saving
                date: date.toISOString().split('T')[0],
                steps: this.generateSteps(),
                activeMinutes: this.generateActiveMinutes(),
                avgHeartRate: this.generateHeartRate(),
                timestamp: date.toISOString()
            });
        }
        return data;
    }

    /**
     * Generates realistic daily step counts between 2000-10000 steps
     * with natural variations
     * 
     * @returns {number} Generated step count
     */
    generateSteps() {
        const baseSteps = Math.floor(Math.random() * 8000) + 2000;
        const variation = Math.floor(Math.random() * 2000);
        return baseSteps + variation;
    }

    /**
     * Generates daily active minutes between 30-120 minutes
     * with natural variations
     * 
     * @returns {number} Generated active minutes
     */
    generateActiveMinutes() {
        const baseMinutes = Math.floor(Math.random() * 60) + 30;
        const variation = Math.floor(Math.random() * 30);
        return baseMinutes + variation;
    }

    /**
     * Generates realistic heart rate values between 65-100 BPM
     * with natural variations
     * 
     * @returns {number} Generated heart rate
     */
    generateHeartRate() {
        const baseHR = Math.floor(Math.random() * 20) + 65;
        const variation = Math.floor(Math.random() * 15);
        return baseHR + variation;
    }

    /**
     * Saves a new user to storage with generated ID
     * 
     * @param {Object} userData - User information to save
     * @returns {Object} Saved user object with generated ID
     */
    saveUser(userData) {
        const users = this.getUsers();
        users.push({
            ...userData,
            id: 'user_' + Math.random().toString(36).substr(2, 9)
        });
        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
        return users[users.length - 1];
    }

    /**
     * Retrieves all registered users from storage
     * 
     * @returns {Array} Array of user objects
     */
    getUsers() {
        const users = localStorage.getItem(this.STORAGE_KEYS.USERS);
        return users ? JSON.parse(users) : [];
    }

    /**
     * Authenticates user based on credentials
     * 
     * @param {string} username - User's username
     * @param {string} password - User's password
     * @returns {Object|undefined} User object if found
     */
    getUserByCredentials(username, password) {
        const users = this.getUsers();
        return users.find(user => 
            user.username === username && user.password === password
        );
    }

    /**
     * Saves activities for a specific user, replacing any existing data
     * 
     * @param {string} userId - User identifier
     * @param {Array} activities - Array of activity objects to save
     * @returns {Array} Saved activity objects
     */
    saveUserActivities(userId, activities) {
        const allActivities = this.getAllActivities();
        // Assign userId to each activity
        const userActivities = activities.map(activity => ({
            ...activity,
            userId
        }));
        
        // Filter out old activities for this user
        const otherUserActivities = allActivities.filter(a => a.userId !== userId);
        
        // Combine and save all activities
        const updatedActivities = [...otherUserActivities, ...userActivities];
        localStorage.setItem(this.STORAGE_KEYS.ACTIVITIES, JSON.stringify(updatedActivities));
        return userActivities;
    }

    /**
     * Retrieves activities for a specific user with optional day limit
     * 
     * @param {string} userId - User identifier
     * @param {number} days - Number of days of data to retrieve (default 30)
     * @returns {Array} Array of activity objects
     */
    getUserActivities(userId, days = 30) {
        const allActivities = this.getAllActivities();
        const userActivities = allActivities
            .filter(a => a.userId === userId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        if (days) {
            return userActivities.slice(-days);
        }
        return userActivities;
    }

    /**
     * Retrieves all stored activities across all users
     * 
     * @returns {Array} Array of all activity objects
     */
    getAllActivities() {
        const activities = localStorage.getItem(this.STORAGE_KEYS.ACTIVITIES);
        return activities ? JSON.parse(activities) : [];
    }

    /**
     * Retrieves specific metric data for a user over time
     * 
     * @param {string} userId - User identifier
     * @param {string} metric - Metric name to retrieve (steps, activeMinutes, avgHeartRate)
     * @param {number} days - Number of days of data to retrieve (default 30)
     * @returns {Array} Array of metric data objects with dates
     */
    getMetricData(userId, metric, days = 30) {
        const activities = this.getUserActivities(userId, days);
        return activities.map(activity => ({
            date: activity.date,
            value: activity[metric],
            timestamp: activity.timestamp
        }));
    }
}

// Initialize global instance of activity data manager
const activityDataManager = new ActivityDataManager();
window.activityDataManager = activityDataManager;