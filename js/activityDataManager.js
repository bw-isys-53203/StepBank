class ActivityDataManager {
    constructor() {
        this.STORAGE_KEYS = {
            ACTIVITIES: 'user_activities',
            USERS: 'registered_users'
        };
    }

    // Initialize historical data for a user if not exists
    initializeUserData(userId) {
        const existingData = this.getUserActivities(userId);
        if (!existingData || !existingData.length) {
            const historicalData = this.generateHistoricalData(120);
            this.saveUserActivities(userId, historicalData);
            return historicalData;
        }
        return existingData;
    }

    generateHistoricalData(days) {
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            
            data.push({
                userId: null, // Will be set when saving
                date: date.toISOString().split('T')[0],
                steps: this.generateSteps(),
                activeMinutes: this.generateActiveMinutes(),
                avgHeartRate: this.generateHeartRate(),
                timestamp: date.toISOString()
            });
        }
        return data;
    }

    generateSteps() {
        const baseSteps = Math.floor(Math.random() * 8000) + 2000;
        const variation = Math.floor(Math.random() * 2000);
        return baseSteps + variation;
    }

    generateActiveMinutes() {
        const baseMinutes = Math.floor(Math.random() * 60) + 30;
        const variation = Math.floor(Math.random() * 30);
        return baseMinutes + variation;
    }

    generateHeartRate() {
        const baseHR = Math.floor(Math.random() * 20) + 65;
        const variation = Math.floor(Math.random() * 15);
        return baseHR + variation;
    }

    // User Management
    saveUser(userData) {
        const users = this.getUsers();
        users.push({
            ...userData,
            id: 'user_' + Math.random().toString(36).substr(2, 9)
        });
        localStorage.setItem(this.STORAGE_KEYS.USERS, JSON.stringify(users));
        return users[users.length - 1];
    }

    getUsers() {
        const users = localStorage.getItem(this.STORAGE_KEYS.USERS);
        return users ? JSON.parse(users) : [];
    }

    getUserByCredentials(username, password) {
        const users = this.getUsers();
        return users.find(user => 
            user.username === username && user.password === password
        );
    }

    // Activity Management
    saveUserActivities(userId, activities) {
        const allActivities = this.getAllActivities();
        const userActivities = activities.map(activity => ({
            ...activity,
            userId
        }));
        
        // Remove existing activities for this user
        const otherUserActivities = allActivities.filter(a => a.userId !== userId);
        
        // Add new activities
        const updatedActivities = [...otherUserActivities, ...userActivities];
        localStorage.setItem(this.STORAGE_KEYS.ACTIVITIES, JSON.stringify(updatedActivities));
        return userActivities;
    }

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

    getAllActivities() {
        const activities = localStorage.getItem(this.STORAGE_KEYS.ACTIVITIES);
        return activities ? JSON.parse(activities) : [];
    }

    // Data retrieval for specific metrics
    getMetricData(userId, metric, days = 30) {
        const activities = this.getUserActivities(userId, days);
        return activities.map(activity => ({
            date: activity.date,
            value: activity[metric],
            timestamp: activity.timestamp
        }));
    }
}

// Initialize data manager
const activityDataManager = new ActivityDataManager();
window.activityDataManager = activityDataManager;