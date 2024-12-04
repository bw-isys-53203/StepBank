// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAv4HMH3tRjgJPQMjtrXlJLxuZd4kiLfSs",
    authDomain: "step-bank-7ad4b.firebaseapp.com",
    projectId: "step-bank-7ad4b",
    storageBucket: "step-bank-7ad4b.firebasestorage.app",
    messagingSenderId: "807237773244",
    appId: "1:807237773244:web:46165a1e8b513af6a16db9"
};

// At the start of database.js
let dbInitialized = false;
const dbReadyPromise = new Promise((resolve) => {
    class FirebaseDB {
        constructor() {
            firebase.initializeApp(firebaseConfig);
            this.database = firebase.database();
            this.checkConnection();
            //dbInitialized = true;
            resolve(dbInitialized);
        }
        // Check database connection
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

        // Create or Update data
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

        // Read data once
        async get(path) {
            try {
                const snapshot = await this.database.ref(path).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error reading data:', error);
                throw error;
            }
        }

        // Update specific fields
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

        // Delete data
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

        // Listen for real-time updates
        onValue(path, callback) {
            this.database.ref(path).on('value', (snapshot) => {
                callback(snapshot.val());
            }, (error) => {
                console.error('Error listening to data:', error);
            });
        }

        // Stop listening to updates
        offValue(path) {
            this.database.ref(path).off();
            console.log('Stopped listening to:', path);
        }

        // Get data with query
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

        // In your database.js file where you have the FirebaseDB class

        // Inside FirebaseDB class
        async addChild(parentId, childData) {
            try {
                // Generate unique IDs
                const childId = 'user_' + Math.random().toString(36).substr(2, 9);
                const registrationToken = 'token_' + Math.random().toString(36).substr(2, 9);

                // Create child object with all required fields
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

                // Also create a reference under parent's children
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

        // Add a method to fetch children for a parent
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

        // Find parent by child ID
        async getParentByChildId(childId) {
            try {
                // Get all users
                const snapshot = await this.database.ref('users').once('value');
                const users = snapshot.val();

                // Loop through users to find the parent
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

        // Find parent by registration token
        async getParentByToken(registrationToken) {
            try {
                // Get all users
                const snapshot = await this.database.ref('users').once('value');
                const users = snapshot.val();

                // Loop through users to find the parent
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

        async getUsers() {
            try {
                const snapshot = await this.database.ref('users').once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching users:', error);
                throw error;
            }
        }

        async getParentChildren(parentId) {
            try {
                const snapshot = await this.database.ref(`users/${parentId}/children`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching parent\'s children:', error);
                throw error;
            }
        }

        async getChildData(parentId, childId) {
            try {
                const snapshot = await this.database.ref(`users/${parentId}/children/${childId}`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error fetching child data:', error);
                throw error;
            }
        }

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

        async getDeviceConfig(userId) {
            try {
                const snapshot = await this.database.ref(`users/${userId}/deviceConfig`).once('value');
                return snapshot.val();
            } catch (error) {
                console.error('Error getting device config:', error);
                throw error;
            }
        }

        async saveDeviceConfig(userId, config) {
            try {
                await this.database.ref(`users/${userId}/deviceConfig`).set(config);
                return true;
            } catch (error) {
                console.error('Error saving device config:', error);
                throw error;
            }
        }

        async isFitbitDeviceConnected(userId) {
            try {
                //const deviceConfig = await this.get(`users/${userId}/deviceConfig`);
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

        async saveActivityForDay(userId, date, activityData) {
            try {
                console.log("In saveActivityForDay");
                
                // Create the activity object
                const activity = {
                    steps: activityData.steps || 0,
                    activeMinutes: activityData.activeMinutes || 0,
                    averageHeartRate: activityData.averageHeartRate || 0
                };
        
                // Save to specific date path
                await this.database.ref(`users/${userId}/activities/${date}`).set(activity);
                console.log(`Activity data saved for ${date}`);
                return true;
                
            } catch (error) {
                console.error('Error saving activity data:', error);
                throw error;
            }
        }

        async getActivityDataForPastDays(userId, days = 10) {
            try {
                // Calculate dates
                const endDate = new Date();
                const activities = [];
        
                // Get activity data from database
                const activityRef = this.database.ref(`users/${userId}/activities`);
                const snapshot = await activityRef.orderByKey()
                    .limitToLast(days)
                    .once('value');
                
                const activityData = snapshot.val();
        
                if (activityData) {
                    // Convert object to array and format data
                    Object.keys(activityData).forEach(date => {
                        const activity = activityData[date];
                        activities.push({
                            steps: activity.steps || 0,
                            duration: activity.activeMinutes || 0,
                            avgHeartRate: activity.averageHeartRate || 0,
                            timestamp: activity.timestamp
                        });
                    });
        
                    // Sort by date (newest first)
                    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
                    // Store in the required format
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
    const db = new FirebaseDB();
    window.db = db;
});

// Export the ready promise
window.dbReady = dbReadyPromise;