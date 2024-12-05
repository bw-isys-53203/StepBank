/**
 * @fileoverview Firebase Database Integration Module
 * Provides core database functionality for the StepBank application. Handles all Firebase
 * interactions including authentication, real-time updates, and data management for
 * user activities, rewards, and device configurations.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Firebase integration and core database functionality
 */

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAv4HMH3tRjgJPQMjtrXlJLxuZd4kiLfSs",
    authDomain: "step-bank-7ad4b.firebaseapp.com",
    projectId: "step-bank-7ad4b",
    storageBucket: "step-bank-7ad4b.firebasestorage.app",
    messagingSenderId: "807237773244",
    appId: "1:807237773244:web:46165a1e8b513af6a16db9"
};

// Database initialization tracking
let dbInitialized = false;
const dbReadyPromise = new Promise((resolve) => {
    /**
     * Firebase Database Manager Class
     * Handles all database operations and maintains connection state
     */
    class FirebaseDB {
        /**
         * Initializes Firebase and database connection
         * Sets up connection monitoring
         */
        constructor() {
            firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            this.checkConnection();
            resolve(dbInitialized);
        }

        /**
         * Monitors database connection state
         * Updates dbInitialized flag based on connection status
         */
        checkConnection() {
            this.database.ref('.info/connected').on('value', (snapshot) => {
                if (snapshot.val() === true) {
                    dbInitialized = true;
                    console.log('Connected to Firebase');
                } else {
                    dbInitialized = false;
                    console.log('Not connected to Firebase');
                }
            });
        }

        /**
         * Creates or updates data at specified path
         * @param {string} path - Database path
         * @param {any} data - Data to store
         * @returns {Promise<boolean>} Success status
         */
        async set(path, data) {
            try {
                await this.database.ref(path).set(data);
                console.log('Data written successfully');
                return true;
            } catch (error) {
                console.error('Error writing data:', error);
                throw error;
            }
        }

        /**
         * Retrieves data from specified path
         * @param {string} path - Database path
         * @returns {Promise<any>} Retrieved data
         */
        async get(path) {
            try {
                const snapshot = await this.database.ref(path).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error reading data:', error);
                throw error;
            }
        }

        /**
         * Updates specific fields at path
         * @param {string} path - Database path
         * @param {Object} data - Fields to update
         * @returns {Promise<boolean>} Success status
         */
        async update(path, data) {
            try {
                await this.database.ref(path).update(data);
                console.log('Data updated successfully');
                return true;
            } catch (error) {
                console.error('Error updating data:', error);
                throw error;
            }
        }

        /**
         * Deletes data at specified path
         * @param {string} path - Database path
         * @returns {Promise<boolean>} Success status
         */
        async delete(path) {
            try {
                await this.database.ref(path).remove();
                console.log('Data deleted successfully');
                return true;
            } catch (error) {
                console.error('Error deleting data:', error);
                throw error;
            }
        }

        /**
         * Sets up real-time value listener at path
         * @param {string} path - Database path
         * @param {Function} callback - Callback for value changes
         */
        onValue(path, callback) {
            this.database.ref(path).on('value', (snapshot) => {
                callback(snapshot.val());
            }, (error) => {
                console.error('Error listening to data:', error);
            });
        }

        /**
         * Removes value listener at path
         * @param {string} path - Database path to stop listening
         */
        offValue(path) {
            this.database.ref(path).off();
            console.log('Stopped listening to:', path);
        }

        /**
         * Queries data based on child value
         * @param {string} path - Database path
         * @param {string} queryKey - Key to query on
         * @param {any} queryValue - Value to match
         * @returns {Promise<any>} Query results
         */
        async query(path, queryKey, queryValue) {
            try {
                const snapshot = await this.database.ref(path)
                    .orderByChild(queryKey)
                    .equalTo(queryValue)
                    .once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error querying data:', error);
                throw error;
            }
        }

        /**
         * Adds a new child to parent's account
         * @param {string} parentId - Parent's user ID
         * @param {Object} childData - Child's information
         * @returns {Promise<Object>} Child ID and registration token
         */
        async addChild(parentId, childData) {
            try {
                // Generate unique identifiers
                const childId = 'user_' + Math.random().toString(36).substr(2, 9);
                const registrationToken = 'token_' + Math.random().toString(36).substr(2, 9);

                // Create child object with required fields
                const child = {
                    childName: childData.name,
                    childAge: childData.age,
                    goals: {
                        steps: childData.steps,
                        activeTime: childData.activeTime,
                        heartRate: childData.heartRate
                    },
                    registrationToken: registrationToken,
                    isRegistered: false,
                    createdAt: firebase.database.ServerValue.TIMESTAMP,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                };

                // Create reference under parent's children
                await this.database.ref(`users/${parentId}/children/${childId}`).set(child);

                return {
                    childId: childId,
                    registrationToken: registrationToken
                };

            } catch (error) {
                console.error('Error adding child:', error);
                throw error;
            }
        }

        /**
         * Retrieves all children for a parent
         * @param {string} parentId - Parent's user ID
         * @returns {Promise<Object>} Children data
         */
        async getChildrenByParentId(parentId) {
            try {
                const snapshot = await this.database.ref(`users/${parentId}/children`)
                .once('value');
                
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching children:', error);
                throw error;
            }
        }

        /**
         * Finds parent by child ID
         * @param {string} childId - Child's user ID
         * @returns {Promise<Object|null>} Parent data or null if not found
         */
        async getParentByChildId(childId) {
            try {
                // Get all users
                const snapshot = await this.database.ref('users').once('value');
                const users = snapshot.val();

                // Search through users to find parent
                for (const userId in users) {
                    const user = users[userId];
                    if (user.children && user.children[childId]) {
                        return {
                            userId: userId,
                            ...user
                        };
                    }
                }
                return null;
            } catch (error) {
                console.error('Error finding parent by child ID:', error);
                throw error;
            }
        }

        /**
         * Finds parent using registration token
         * @param {string} registrationToken - Child's registration token
         * @returns {Promise<Object|null>} Parent data or null if not found
         */
        async getParentByToken(registrationToken) {
            try {
                // Get all users
                const snapshot = await this.database.ref('users').once('value');
                const users = snapshot.val();

                // Search through users and their children for matching token
                for (const userId in users) {
                    const user = users[userId];
                    if (user.children) {
                        // Check each child for matching token
                        for (const childId in user.children) {
                            if (user.children[childId].registrationToken === registrationToken) {
                                return {
                                    userId: userId,
                                    ...user
                                };
                            }
                        }
                    }
                }
                return null;
            } catch (error) {
                console.error('Error finding parent by token:', error);
                throw error;
            }
        }

        /**
         * Retrieves all users
         * @returns {Promise<Object>} All users data
         */
        async getUsers() {
            try {
                const snapshot = await this.database.ref('users').once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching users:', error);
                throw error;
            }
        }

        /**
         * Gets children data for a parent
         * @param {string} parentId - Parent's user ID
         * @returns {Promise<Object>} Children data
         */
        async getParentChildren(parentId) {
            try {
                const snapshot = await this.database.ref(`users/${parentId}/children`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching parent\'s children:', error);
                throw error;
            }
        }

        /**
         * Retrieves specific child's data
         * @param {string} parentId - Parent's user ID
         * @param {string} childId - Child's ID
         * @returns {Promise<Object>} Child's data
         */
        async getChildData(parentId, childId) {
            try {
                const snapshot = await this.database.ref(`users/${parentId}/children/${childId}`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching child data:', error);
                throw error;
            }
        }

        /**
         * Updates goals for a specific child
         * @param {string} parentId - Parent's user ID
         * @param {string} childId - Child's ID
         * @param {Object} goals - New goals object
         * @returns {Promise<boolean>} Success status
         */
        async updateChildGoals(parentId, childId, goals) {
            try {
                await this.database.ref(`users/${parentId}/children/${childId}/goals`).update({
                    steps: goals.steps,
                    activeTime: goals.activeTime,
                    heartRate: goals.heartRate
                });
                return true;
            } catch (error) {
                console.error('Error updating child goals:', error);
                throw error;
            }
        }

        /**
         * Gets device configuration for a user
         * @param {string} userId - User ID
         * @returns {Promise<Object>} Device configuration
         */
        async getDeviceConfig(userId) {
            try {
                const snapshot = await this.database.ref(`users/${userId}/deviceConfig`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error getting device config:', error);
                throw error;
            }
        }

        /**
         * Saves device configuration for a user
         * @param {string} userId - User ID
         * @param {Object} config - Device configuration
         * @returns {Promise<boolean>} Success status
         */
        async saveDeviceConfig(userId, config) {
            try {
                await this.database.ref(`users/${userId}/deviceConfig`).set(config);
                return true;
            } catch (error) {
                console.error('Error saving device config:', error);
                throw error;
            }
        }

        /**
         * Checks if Fitbit device is connected for user
         * @param {string} userId - User ID
         * @returns {Promise<boolean>} Connection status
         */
        async isFitbitDeviceConnected(userId) {
            try {
                const deviceConfig = await this.database.ref(`users/${userId}/deviceConfig`)
                    .once('value');
                const deviceConfigVal = deviceConfig.val();
                console.log("Device Config:: ", deviceConfigVal);
                return deviceConfigVal.deviceType === 'fitbit' && deviceConfigVal.accessToken;
            } catch (error) {
                console.error('Error checking fitbit device connection:', error);
                return false;
            }
        }

        /**
         * Saves or updates activity data for a specific day
         * Maintains a 7-day rolling window of activity data
         * @param {string} userId - User ID
         * @param {string} date - Activity date
         * @param {Object} activityData - Activity metrics
         * @returns {Promise<boolean>} Success status
         */
        async saveActivityForDay(userId, date, activityData) {
            try {
                console.log("In saveActivityForDay");
                
                // Get existing activities
                const activitiesRef = this.database.ref(`users/${userId}/activities`);
                const snapshot = await activitiesRef.once('value');
                const activities = snapshot.val() || {};
                
                // Check if current date exists
                if (activities[date]) {
                    // Update existing record
                    const activity = {
                        steps: activityData.steps || 0,
                        activeMinutes: activityData.activeMinutes || 0,
                        averageHeartRate: activityData.averageHeartRate || 0,
                        points: activityData.points || 0
                    };
                    
                    await activitiesRef.child(date).update(activity);
                    console.log(`Activity data updated for ${date}`);
                    return true;
                }
                
                // Handle new day's data
                const sortedActivities = Object.entries(activities)
                    .sort((a, b) => new Date(b[0]) - new Date(a[0]));
                
                // Create new activity record
                const activity = {
                    steps: activityData.steps || 0,
                    activeMinutes: activityData.activeMinutes || 0,
                    averageHeartRate: activityData.averageHeartRate || 0,
                    points: activityData.points || 0
                };
        
                // Maintain 7-day window
                if (sortedActivities.length >= 7) {
                    // Remove oldest records beyond 7 days
                    const datesToRemove = sortedActivities.slice(6).map(([date]) => date);
                    
                    for (const oldDate of datesToRemove) {
                        await activitiesRef.child(oldDate).remove();
                    }
                }
        
                // Add new record
                await activitiesRef.child(date).set(activity);
                console.log(`New activity data saved for ${date}`);
                return true;
        
            } catch (error) {
                console.error('Error saving activity data:', error);
                throw error;
            }
        }

        /**
         * Retrieves activity data for past days
         * @param {string} userId - User ID
         * @param {number} days - Number of days to retrieve (default: 7)
         * @returns {Promise<Object|null>} Activity data organized by user ID
         */
    async getActivityDataForPastDays(userId, days = 7) {
        try {
            const activities = [];

            // Get activity data from database
            const activityRef = this.database.ref(`users/${userId}/activities`);
            const snapshot = await activityRef.orderByKey()
                .limitToLast(days)
                .once('value');
        
            const activityData = snapshot.val();

            if (activityData) {
                // Transform object to array and format data
                Object.keys(activityData).forEach(date => {
                    const activity = activityData[date];
                    activities.push({
                        steps: activity.steps || 0,
                        duration: activity.activeMinutes || 0,
                        avgHeartRate: activity.averageHeartRate || 0,
                        points: activity.points || 0,
                        day: date
                    });
                });

                // Sort activities by date (newest first)
                activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

                // Format data structure
                const storedActivityData = {
                    [userId]: activities
                };
                console.log("storedActivityData:: ",storedActivityData)
                return storedActivityData;
            }

            return null;

        } catch (error) {
            console.error('Error getting activity data:', error);
            return null;
        }
    }
}

// Initialize database instance
const db = new FirebaseDB();
window.db = db;
});

// Export database ready promise
window.dbReady = dbReadyPromise;