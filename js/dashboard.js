/**
 * @fileoverview Dashboard Manager Module - Core module for managing the application's dashboard interface
 * This module handles both parent and child dashboard views, activity tracking, device connections,
 * and screen time management. It serves as the primary interface for users to interact with their
 * fitness data and manage rewards/screen time.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Core application controller implementation
 */

// dashboard.js
class DashboardManager {
    /**
     * Initialize dashboard manager with default values
     * Manages user state, activity tracking, and screen time calculations
     */
    constructor() {
        this.currentUser = null;
        this.activityChart = null;
        this.timeRange = 'week';
        this.activities = [];
        this.children = [];
        this.selectedChildId = null;
        this.sparkCalculator = null;
        this.currentActivityData = {};
        this.currentMetric = 'steps';
        this.switchMetric = this.switchMetric.bind(this);
        this.isConnected = false;
        this.storedActivityDataInDB = null;
        this.screenTimeUsage = {}; // Will store all generated screen time data
        this.generatedScreenTimeIds = new Set(); // Track which IDs have been generated
    }

    /**
     * Initializes the dashboard with user data and loads necessary configurations
     * Handles different initialization flows for parent and child accounts
     * @param {Object} user - Current user object
     */
    async initialize(user) {
        this.currentUser = user;
        await this.loadConfig();

        // Check if current user is a parent account
        if (this.currentUser.accountType === 'parent') {
            const childrenSnapshot = await db.getParentChildren(this.currentUser.userId);
            
            if (childrenSnapshot) {
                // Don't reset screenTimeUsage if it already exists
                if (!Object.keys(this.screenTimeUsage).length) {
                    this.screenTimeUsage = {};
                }

                // Process each child
                for (const [childId, childData] of Object.entries(childrenSnapshot)) {
                    if (childData.isRegistered) {
                        this.isConnected = await db.isFitbitDeviceConnected(childId);
                        if (this.isConnected) {
                            await this.fetchFitbitData(childId);
                        }
                        this.storedActivityDataInDB = await db.getActivityDataForPastDays(childId);
                        
                        // Only generate screen time if not already generated
                        if (!this.generatedScreenTimeIds.has(childId)) {
                            this.screenTimeUsage[childId] = await this.generateScreenTimeUsage(childId);
                            this.generatedScreenTimeIds.add(childId);
                            console.log(`Generated screen time for child: ${childId}`);
                        } else {
                            console.log(`Skipping screen time generation for child: ${childId} (already exists)`);
                        }
                    }
                }
            }
        } else if (this.currentUser.accountType === 'child') {
            // Check if Fitbit is connected and fetch data
            this.isConnected = await db.isFitbitDeviceConnected(this.currentUser.userId);
            if (this.isConnected) {
                await this.fetchFitbitData(this.currentUser.userId);
            }
            this.storedActivityDataInDB = await db.getActivityDataForPastDays(this.currentUser.userId);
            
            // Only generate screen time if not already generated (by parent or previous child session)
            if (!this.generatedScreenTimeIds.has(this.currentUser.userId)) {
                this.screenTimeUsage[this.currentUser.userId] = await this.generateScreenTimeUsage(this.currentUser.userId);
                this.generatedScreenTimeIds.add(this.currentUser.userId);
                console.log(`Generated screen time for child user: ${this.currentUser.userId}`);
            } else {
                console.log(`Skipping screen time generation for child user: ${this.currentUser.userId} (already exists)`);
            }
        }
        
        await this.loadDashboardData();
        await this.setupEventListeners();
        this.renderDashboard();
    }

    /**
     * Sets up event listeners for dashboard interactions
     * Handles time range changes, goal updates, and child selection
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.time-range-btn')) {
                this.updateTimeRange(e.target.dataset.range);
            }
            if (e.target.matches('.update-goals-btn')) {
                this.updateGoals();
            }
        });

        document.addEventListener('change', (e) => {
            if (e.target.matches('.child-select')) {
                this.updateSelectedChild(e.target.value);
            }
        });
    }

    /**
     * Formats activity time from minutes into hours and minutes display format
     * @param {number} minutes - Total minutes to format
     * @returns {string} Formatted time string (e.g., "2h 30m")
     */
    formatActiveTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    /**
     * Generates simulated step data for testing or when device data is unavailable
     * @returns {number} Generated step count between 2000-10000
     */
    generateSteps() {
        const baseSteps = Math.floor(Math.random() * 8000) + 2000;
        const extraSteps = Math.floor(Math.random() * 2000);
        return baseSteps + (Math.random() > 0.7 ? extraSteps : 0);
    }

    /**
     * Generates simulated active minutes for testing or when device data is unavailable
     * @returns {number} Generated active minutes
     */
    generateMinutes() {
        const baseMinutes = Math.floor(Math.random() * 60) + 15;
        const extraMinutes = Math.floor(Math.random() * 180);
        return baseMinutes + (Math.random() > 0.3 ? extraMinutes : 0);
    }

    /**
     * Generates simulated heart rate data for testing or when device data is unavailable
     * @returns {number} Generated heart rate between 75-120 BPM
     */
    generateHeartRate() {
        const baseHR = Math.floor(Math.random() * 20) + 75;
        const extraHR = Math.floor(Math.random() * 25);
        return baseHR + (Math.random() > 0.7 ? extraHR : 0);
    }

    /**
     * Generates screen time usage data based on activity performance
     * Uses spark points to calculate available screen time
     * @param {string} childId - Child's identifier
     * @returns {Array} Array of daily screen time usage records
     */
    async generateScreenTimeUsage(childId) {
        console.log('Generating screen time for child:', childId);
        const usage = [];
        const now = new Date();
        
        for (let i = 0; i < 8; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            try {
                const dayActivities = this.getChildActivityData(childId)
                    .filter(activity => activity.day.startsWith(dateStr));
                
                console.log('Activities for day:', dateStr, dayActivities);

                const availableMinutes = dayActivities.reduce((total, activity) => {
                    const sparkResult = this.sparkCalculator.calculateSparks(
                        activity.steps,
                        activity.duration,
                        activity.avgHeartRate
                    );
                    console.log('Spark result for activity:', sparkResult);
                    return total + sparkResult.sparkPoints;
                }, 0);
    
                const maxUsage = Math.min(availableMinutes, 120);
                const actualUsage = Math.min(Math.floor(Math.random() * maxUsage), availableMinutes / 100);
    
                console.log('Generated usage for day:', {
                    date: dateStr,
                    minutes: actualUsage,
                    availableMinutes: availableMinutes
                });
    
                usage.push({
                    date: dateStr,
                    minutes: actualUsage,
                    availableMinutes: availableMinutes
                });
            } catch (error) {
                console.error('Error generating screen time for date:', dateStr, error);
            }
        }
        return usage;
    }

    /**
     * Gets total screen time usage for a specific child
     * @param {string} childId - Child's identifier
     * @returns {number} Total minutes of screen time used
     */
    getTotalScreenTime(childId) {
        return this.screenTimeUsage[childId]
            .reduce((total, day) => total + day.minutes, 0);
    }

    /**
     * Renders metric control buttons for switching between different activity metrics
     * @returns {string} HTML string for metric control buttons
     */
    renderMetricControls() {
        return `
            <div class="metric-controls">
                <button class="btn metric-btn ${this.currentMetric === 'steps' ? 'active' : ''}" 
                        onclick="window.dashboardManager.switchMetric('steps')">
                    Steps
                </button>
                <button class="btn metric-btn ${this.currentMetric === 'activeTime' ? 'active' : ''}" 
                        onclick="window.dashboardManager.switchMetric('activeTime')">
                    Active Time
                </button>
                <button class="btn metric-btn ${this.currentMetric === 'heartRate' ? 'active' : ''}" 
                        onclick="window.dashboardManager.switchMetric('heartRate')">
                    Heart Rate
                </button>
                <button class="btn metric-btn ${this.currentMetric === 'screenTime' ? 'active' : ''}" 
                        onclick="window.dashboardManager.switchMetric('screenTime')">
                    Screen Time
                </button>
            </div>
        `;
    }

    /**
     * Handles switching between different metric views (steps, active time, heart rate, screen time)
     * Updates the UI and chart visualization accordingly
     * @param {string} metric - Type of metric to display
     */
    switchMetric(metric) {
        console.log('Switching to metric:', metric);
        this.currentMetric = metric;
        
        // Re-render the entire parent dashboard to update the buttons
        this.renderDashboard();
        
        // Update chart after re-render
        if (this.selectedChildId) {
            this.updateChart(this.selectedChildId);
        }
    }
    
    /**
     * Loads initial dashboard data including children information and goals
     * Different behavior for parent and child accounts
     */
    async loadDashboardData() {
        try {
            if (this.currentUser.accountType === 'parent') {
                // Use the database method to get children
                const childrenData = await db.getParentChildren(this.currentUser.userId);

                if (childrenData) {
                    // Transform children data into array format
                    this.children = Object.entries(childrenData).map(([childId, child]) => ({
                        id: childId,
                        username: child.childName,
                        age: child.childAge,
                        dailyGoal: child.goals.steps,
                        activeTimeGoal: child.goals.activeTime,
                        heartRateGoal: child.goals.heartRate,
                        isRegistered: child.isRegistered
                    }));
    
                    // Set initial selected child if there are children
                    if (this.children.length > 0) {
                        this.selectedChildId = this.children[0].id;
                    }
    
                    console.log("Loaded children data:", this.children);
                    console.log("Set initial selectedChildId:", this.selectedChildId);
                } else {
                    this.children = [];
                    console.log("No children found for this parent");
                }
            } else if (this.currentUser.accountType === 'child') {
                // Get child's own data using the new method
                const childData = await db.getChildData(this.currentUser.parentId, this.currentUser.userId);

                if (childData) {
                    this.goals = {
                        dailyGoal: childData.goals.steps,
                        activeTimeGoal: childData.goals.activeTime,
                        heartRateGoal: childData.goals.heartRate
                    };
                    
                    console.log("Loaded child data:", childData);
                } else {
                    console.error("Could not load child data");
                }
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }

    /**
     * Loads spark calculator configuration and thresholds
     * Sets up calculation parameters for converting activity into spark points
     */
    async loadConfig() {
        try {
            const defaultConfig = {
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
            this.sparkCalculator = new SparkCalculator(defaultConfig);
            console.log('SparkCalculator initialized with config:', this.sparkCalculator.config);
        } catch (error) {
            console.error('Error loading config:', error);
            throw error;
        }
    }

    /**
     * Calculates statistics from activity data for display
     * @returns {Object} Object containing total steps, redeemed points, and available points
     */
    calculateStatistics() {
        const activities = this.activities || this.generateMockActivities();
        const relevantActivities = this.filterActivitiesByTimeRange();
    
        return {
            totalSteps: relevantActivities.reduce((sum, activity) => sum + activity.steps, 0),
            redeemedPoints: relevantActivities.reduce((sum, activity) => 
                sum + (activity.redeemed ? activity.points : 0), 0),
            availablePoints: relevantActivities.reduce((sum, activity) => 
                sum + (activity.redeemed ? 0 : activity.points), 0)
        };
    }

    /**
     * Gets total steps for a specific user
     * @param {string} userId - User identifier
     * @returns {number} Total steps count
     */
    getTotalSteps(userId) {
        console.log("this.currentActivityData:: ",this.currentActivityData);
        return this.currentActivityData[userId].steps;
    }

    /**
     * Gets activity minutes for a specific user
     * @param {string} userId - User identifier
     * @returns {number} Total activity minutes
     */
    getActivityMinutes(userId) {
        return this.currentActivityData[userId].activeMinutes;
    }

    /**
     * Gets formatted activity time string for a user
     * @param {string} userId - User identifier
     * @returns {string} Formatted activity time (e.g., "2h 30m")
     */
    getActivityTime(userId) {
        let minutes = this.currentActivityData[userId].activeMinutes;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    /**
     * Gets average heart rate for a specific user
     * @param {string} userId - User identifier
     * @returns {number} Average heart rate
     */
    getAverageHR(userId) {
        return this.currentActivityData[userId].averageHeartRate;
    }

    /**
     * Deducts screen time from available sparks
     * @param {string} childId - Child's identifier
     * @param {number} minutes - Minutes to deduct
     */
    deductScreenTime(childId, minutes) {
        // Calculate sparks to deduct based on available balance
        const availableSparks = this.calculateTotalAvailableSparks();
        // Ensure balance never goes below zero
        const newTotal = Math.max(0, availableSparks - Math.floor(minutes));
        // Store the new total and refresh display
        this.renderDashboard();
    }

    /**
     * Calculates spark points earned for a specific day's activities
     * @param {number} steps - Step count for the day
     * @param {number} activeMinutes - Active minutes for the day
     * @param {number} averageHR - Average heart rate for the day
     * @returns {number} Calculated spark points
     */
    calculateDaySparks(steps, activeMinutes, averageHR) {
        console.log("Calculate Today's Sparks");
        // Check if spark calculator is initialized before calculation
        if (this.sparkCalculator) {
            const result = this.sparkCalculator.calculateSparks(
                steps,
                activeMinutes,
                averageHR
            );
            return result.sparkPoints;
        }
        return 0;
    }

    /**
     * Calculates spark points for current day based on user's activity
     * @param {string} userId - User identifier
     * @returns {number} Today's earned spark points
     */
    calculateCurrentDaySparks(userId) {
        console.log("Calculate Today's Sparks");
        const steps = this.getTotalSteps(userId);
        const activityTime = this.getActivityMinutes(userId);
        const avgHR = this.getAverageHR(userId);
        
        // Only calculate if spark calculator is properly initialized
        if (this.sparkCalculator) {
            const result = this.sparkCalculator.calculateSparks(
                steps,
                activityTime,
                avgHR
            );
            return result.sparkPoints;
        }
        return 0;
    }

    /**
     * Renders the appropriate dashboard based on user type
     */
    renderDashboard() {
        const dashboardContainer = document.getElementById('dashboard');
        
        // Determine which dashboard to render based on account type
        if (this.currentUser.accountType === 'parent') {
            this.renderParentDashboard(dashboardContainer);
        } else if (this.currentUser.accountType === 'child') {
            this.renderChildDashboard(dashboardContainer);
        } else {
            console.error('Invalid account type');
        }
    }

    /**
     * Updates selected child and refreshes related display elements
     * @param {string} childId - Selected child's identifier
     */
    updateSelectedChild(childId) {
        this.selectedChildId = childId;
        // Find the selected child's data to update goal inputs
        const selectedChild = this.children.find(child => child.id === childId);
        if (selectedChild) {
            document.getElementById('stepsGoal').value = selectedChild.dailyGoal;
            document.getElementById('activeTimeGoal').value = selectedChild.activeTimeGoal;
            document.getElementById('heartRateGoal').value = selectedChild.heartRateGoal;
        }
        this.renderDashboard();
    }

    /**
     * Renders the parent dashboard interface
     * @param {HTMLElement} container - Dashboard container element
     */
    renderParentDashboard(container) {
        console.log("rendering parent dashboard with selectedChildId:", this.selectedChildId);
        console.log("children array:", this.children);

        // Show empty dashboard message if no children are registered
        if (!this.children || this.children.length === 0) {
            container.innerHTML = `
                <nav class="nav">
                    <div class="logo">
                        <div class="logo-icon"></div>
                        <span>Parent Dashboard</span>
                    </div>
                    <div class="nav-buttons">
                        <button class="btn" onclick="showSection('children')">Children</button>
                        <button class="btn" onclick="handleLogout()">Logout</button>
                    </div>
                </nav>

                <div class="no-children-message">
                    <h3>No Children Added Yet</h3>
                    <p>Click on 'Children' button to add your first child.</p>
                </div>
            `;
            return;
        }
        
        const selectedChild = this.children.find(child => child.id === this.selectedChildId);
        
        // If no child is selected, default to first child in the list
        if (!selectedChild) {
            this.selectedChildId = this.children[0].id;
        }

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Parent Dashboard</span>
                </div>
                <div class="nav-buttons">
                    <button class="btn" onclick="showSection('children')">Children</button>
                    <button class="btn" onclick="showSection('pendingApprovals')">Approvals</button>
                    <button class="btn" onclick="handleLogout()">Logout</button>
                </div>
            </nav>

            <div class="parent-controls">
                <div class="child-selector">
                    <label>Select Child:</label>
                    <select class="child-select" onchange="dashboardManager.updateSelectedChild(this.value)">
                        ${this.children.map(child => `
                            <option value="${child.id}" ${child.id === this.selectedChildId ? 'selected' : ''}>
                                ${child.username}
                            </option>
                        `).join('')}
                    </select>
                </div>

                <div class="goal-settings">
                <h3>Daily Goals</h3>
                <div class="goal-form">
                    <div class="form-group">
                        <label>Steps Goal:</label>
                        <input type="number" class="goal-input" id="stepsGoal" 
                            value="${selectedChild.dailyGoal || 10000}">
                    </div>
                    <div class="form-group">
                        <label>Active Time Goal (minutes):</label>
                        <input type="number" class="goal-input" id="activeTimeGoal" 
                            value="${selectedChild.activeTimeGoal || 60}">
                    </div>
                    <div class="form-group">
                        <label>Heart Rate Goal (BPM):</label>
                        <input type="number" class="goal-input" id="heartRateGoal" 
                            value="${selectedChild.heartRateGoal || 90}">
                    </div>
                    <button class="btn update-goals-btn">Update Goals</button>
                </div>
            </div>
            
            <div class="metrics-overview">
                <h3>Current Activity Stats</h3>
                ${selectedChild.isRegistered ? `
                    <div class="metrics-grid">
                        <div class="metric-box">
                            <div class="metric-label">Steps</div>
                            <div class="metric-value">${this.currentActivityData[selectedChild.id].steps.toLocaleString()}</div>
                            <div class="metric-progress">${Math.min(Math.round(((this.currentActivityData[selectedChild.id].steps || 0) / selectedChild.dailyGoal) * 100), 100)}% of goal</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-label">Active Time</div>
                            <div class="metric-value">${this.formatActiveTime(this.currentActivityData[selectedChild.id].activeMinutes || 0)}</div>
                            <div class="metric-progress">${Math.min(Math.round(((this.currentActivityData[selectedChild.id].activeMinutes || 0) / selectedChild.activeTimeGoal) * 100), 100)}% of goal</div>
                        </div>
                        <div class="metric-box">
                            <div class="metric-label">Heart Rate</div>
                            <div class="metric-value">${this.currentActivityData[selectedChild.id].averageHeartRate || 0} BPM</div>
                            <div class="metric-progress">${Math.min(Math.round(((this.currentActivityData[selectedChild.id].averageHeartRate || 0) / selectedChild.heartRateGoal) * 100), 100)}% of goal</div>
                        </div>
                    </div>
                ` : `
                    <div class="not-registered-message">
                        <div class="warning-icon">⚠️</div>
                        <h4>${selectedChild.username} is not registered yet</h4>
                        <p>Share the registration token with your child to complete setup.</p>
                    </div>
                `}
            </div>
            <div class="child-card">
                ${selectedChild.isRegistered ? `
                    ${this.renderMetricControls()}
                    <div class="activity-chart-container">
                        <canvas id="activityChart"></canvas>
                    </div>
                ` : `
                    <div class="no-data-message">
                        <div class="message-icon">📊</div>
                        <h4>Activity Data Not Available</h4>
                        <p>Charts will be visible once ${selectedChild.username} registers and starts tracking activities.</p>
                        <div class="setup-steps">
                            <p>To complete setup:</p>
                            <ol>
                                <li>Share the registration token with your child</li>
                                <li>Have them create an account using the token</li>
                                <li>Help them connect their fitness device</li>
                            </ol>
                        </div>
                    </div>
                `}
            </div>
            <div class="bottom-nav">
                <button class="nav-btn" onclick="showSection('family')">
                    <i class="family-icon">👨‍👩‍👧‍👦</i>
                    <span>Family</span>
                </button>
                <button class="nav-btn" onclick="showSection('settings')">
                    <i class="settings-icon">⚙️</i>
                    <span>Settings</span>
                </button>
                <button class="nav-btn" onclick="showSection('messages')">
                    <i class="message-icon">💬</i>
                    <span>Messages</span>
                </button>
            </div>
        `;

        // Initialize chart if child is registered
        if (selectedChild && selectedChild.isRegistered) {
            this.updateChart(selectedChild.id);
        } else {
            console.log(`Child ${selectedChild?.username} is not registered. Skipping chart update.`);
        }
    }

    /**
     * Renders the child dashboard interface
     * Shows activity progress, available sparks, and screen time options
     * @param {HTMLElement} container - Dashboard container element
     */
    renderChildDashboard(container) {
        console.log("Rendering Child Dashboard:: ", this.currentUser.userId);
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>StepBank</span>
                </div>
                <div class="nav-buttons">
                    <button class="btn connect-btn ${this.isConnected ? 'active' : ''}" onclick="showSection('device')">
                    ${this.isConnected ? 'Device Connected' : 'Connect Device'}
                </button>
                    <button class="btn" onclick="handleLogout()">Logout</button>
                </div>
            </nav>
    
            <div class="sparks-info">
                <div class="total-sparks">
                    <div class="label">Total Available Sparks</div>
                    <div class="value">${this.calculateTotalAvailableSparks().toLocaleString()}</div>
                </div>
            </div>
    
            <div class="progress-container">
                <div class="spark-circle">
                    <svg viewBox="0 0 100 100" class="progress-ring">
                        <path
                            d="M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                            fill="none"
                            stroke="#2A2D37"
                            stroke-width="10"
                            stroke-dasharray="${this.calculateArcLength()}"
                            stroke-dashoffset="0"
                            transform="rotate(210 50 50)"
                        />
                        <path
                            d="M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                            fill="none"
                            stroke="#FF4B4B"
                            stroke-width="10"
                            stroke-dasharray="${this.calculateArcLength()}"
                            stroke-dashoffset="${this.calculateProgress(this.currentUser.userId)}"
                            transform="rotate(210 50 50)"
                        />
                        <text x="50" y="45" class="spark-count" text-anchor="middle">
                            ${this.calculateCurrentDaySparks(this.currentUser.userId)}
                        </text>
                        <text x="50" y="60" class="spark-label" text-anchor="middle">
                            TODAY'S SPARKS
                        </text>
                    </svg>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.getTotalSteps(this.currentUser.userId).toLocaleString()}</div>
                    <div class="metric-label">Steps</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.getActivityTime(this.currentUser.userId)}</div>
                    <div class="metric-label">Active Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.getAverageHR(this.currentUser.userId)}</div>
                    <div class="metric-label">Avg HR</div>
                </div>
            </div>

            <div class="action-buttons">
                <button class="primary-btn" onclick="showSection('electronics')">
                    Unlock Electronics
                </button>
                <button class="primary-btn" onclick="showSection('marketplace')">
                    Buy Stuff
                </button>
            </div>

            <div class="bottom-nav">
                <button class="nav-btn" onclick="showSection('family')">
                    <i class="family-icon">👨‍👩‍👧‍👦</i>
                    <span>Family</span>
                </button>
                <button class="nav-btn" onclick="showSection('settings')">
                    <i class="settings-icon">⚙️</i>
                    <span>Settings</span>
                </button>
                <button class="nav-btn" onclick="showSection('messages')">
                    <i class="message-icon">💬</i>
                    <span>Messages</span>
                </button>
            </div>
        `;

        this.animateSparks();
    }

    /**
     * Calculates the arc length for the progress circle
     * @returns {number} Arc length value
     */
    calculateArcLength() {
        return 2 * Math.PI * 45;
    }

    /**
     * Calculates the progress circle's stroke offset based on user's progress
     * @param {string} userId - User identifier
     * @returns {number} Stroke offset value for SVG path
     */
    calculateProgress(userId) {
        const progress = this.getProgressPercentage(userId);
        const arcLength = this.calculateArcLength();
        const degrees = (progress / 100) * 150;
        return arcLength - (degrees / 360) * arcLength;
    }

    /**
     * Calculates user's progress as a percentage of their daily goal
     * @param {string} userId - User identifier
     * @returns {number} Progress percentage (0-100)
     */
    getProgressPercentage(userId) {
        const dailyGoal = 10000; // Default daily goal
        const todaySteps = this.getTotalSteps(userId);
        // Cap progress at 100%
        return Math.min(Math.round((todaySteps / dailyGoal) * 100), 100);
    }

    /**
     * Creates animation for spark points display
     * Includes both number counting and particle effects
     */
    animateSparks() {
        const sparkCount = document.querySelector('.spark-count');
        // Only proceed if spark count element exists
        if (!sparkCount) return;

        const finalValue = this.calculateCurrentDaySparks(this.currentUser.userId);
        const duration = 2000;
        const fps = 60;
        const frames = duration / (1000 / fps);
        const increment = finalValue / frames;
        let currentValue = 0;

        // Create container for spark particles
        const sparkContainer = document.createElement('div');
        sparkContainer.className = 'sparkle-container';
        sparkCount.parentElement.appendChild(sparkContainer);

        const animation = setInterval(() => {
            currentValue += increment;
            // Check if animation should end
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(animation);
                setTimeout(() => {
                    sparkContainer.remove();
                }, 1000);
            }
            sparkCount.textContent = Math.floor(currentValue);
            
            // Randomly add sparkle effects
            if (Math.random() > 0.7) {
                this.createSparkle(sparkContainer);
            }
        }, 1000 / fps);
    }

    /**
     * Creates individual sparkle effect for animations
     * @param {HTMLElement} container - Container for sparkle effects
     */
    createSparkle(container) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        container.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 1000);
    }

    /**
     * Updates activity goals for selected child
     * Validates inputs and updates both local and database values
     */
    async updateGoals() {
        const stepsGoal = parseInt(document.getElementById('stepsGoal').value);
        const activeTimeGoal = parseInt(document.getElementById('activeTimeGoal').value);
        const heartRateGoal = parseInt(document.getElementById('heartRateGoal').value);
        
        // Validate that all goals are positive numbers
        if (isNaN(stepsGoal) || stepsGoal <= 0 || 
            isNaN(activeTimeGoal) || activeTimeGoal <= 0 ||
            isNaN(heartRateGoal) || heartRateGoal <= 0) {
            this.showNotification('Please enter valid goal values');
            return;
        }
        
        try {
            // Find child in local array
            const childIndex = this.children.findIndex(child => child.id === this.selectedChildId);
            if (childIndex !== -1) {
                // Update local data
                this.children[childIndex].dailyGoal = stepsGoal;
                this.children[childIndex].activeTimeGoal = activeTimeGoal;
                this.children[childIndex].heartRateGoal = heartRateGoal;
        
                // Update in Firebase
                await db.updateChildGoals(
                    this.currentUser.userId, 
                    this.selectedChildId, 
                    {
                        steps: stepsGoal,
                        activeTime: activeTimeGoal,
                        heartRate: heartRateGoal
                    }
                );
    
                this.showNotification('Goals updated successfully!');
                this.renderDashboard();
            }
        } catch (error) {
            console.error('Error updating goals:', error);
            this.showNotification('Failed to update goals. Please try again.');
        }
    }

    /**
     * Retrieves statistics for a specific child
     * @param {string} childId - Child's identifier
     * @returns {Object} Child's activity statistics
     */
    getChildStats(childId) {
        const child = this.children.find(c => c.id === childId);
        // Return default values if child not found
        if (!child) return { totalSteps: 0, progress: 0, rewards: 0 };

        const activities = this.getChildActivityData(childId);
        const todaySteps =  [0]?.steps || Math.floor(Math.random() * 8000) + 2000;
        const progress = Math.round((todaySteps / child.dailyGoal) * 100);

        return {
            totalSteps: todaySteps,
            progress: Math.min(progress, 100),
            rewards: Math.floor(todaySteps / 1000)
        };
    }

    /**
     * Retrieves activity data for a specific child
     * @param {string} childId - Child's identifier
     * @returns {Array} Child's activity data
     */
    getChildActivityData(childId) {
        return this.storedActivityDataInDB[childId];
    }

    /**
     * Calculates total available spark points for current user
     * Considers earned points minus points spent on screen time
     * @returns {number} Available spark points
     */
    calculateTotalAvailableSparks() {
        try {
            // Check if activity data exists
            if (!this.storedActivityDataInDB) {
                console.log('No activity data found');
                return 0;
            }
    
            const userActivities = this.storedActivityDataInDB[this.currentUser.userId];
            // Verify activities array exists
            if (!Array.isArray(userActivities)) {
                console.log('No activities found for user');
                return 0;
            }
    
            // Calculate total earned points
            const totalEarnedPoints = userActivities.reduce((sum, activity) => {
                return sum + (activity.points || 0);
            }, 0);
    
            const screenTimeData = this.screenTimeUsage[this.currentUser.userId];

            // Return total points if no screen time usage exists
            if (!screenTimeData) {
                console.log('No screen time data found');
                return totalEarnedPoints;
            }
            // Calculate total points used for screen time
            const totalUsedPoints = screenTimeData.reduce((sum, day) => {
                return sum + (day.minutes * 100);
            }, 0);
    
            const netAvailable = totalEarnedPoints - totalUsedPoints;
            console.log('Total earned:', totalEarnedPoints);
            console.log('Total used:', totalUsedPoints);
            console.log('Net available:', netAvailable);
            
            return Math.max(0, Math.round(netAvailable));
        } catch (error) {
            console.error('Error calculating total points:', error);
            return 0;
        }
    }

    /**
     * Gets screen time usage for a specific date
     * @param {string} childId - Child's identifier
     * @param {string} date - Date to check
     * @returns {number} Minutes used on specified date
     */
    getScreenTimeForDate(childId, date) {
        const usage = this.screenTimeUsage[childId];
        const dayUsage = usage.find(day => day.date === date);
        return dayUsage?.minutes || 0;
    }

    /**
     * Gets available screen time for a specific date
     * @param {string} childId - Child's identifier
     * @param {string} date - Date to check
     * @returns {number} Available minutes for specified date
     */
    getAvailableTimeForDate(childId, date) {
        const usage = this.screenTimeUsage[childId];
        const dayUsage = usage.find(day => day.date === date);
        return dayUsage?.availableMinutes || 0;
    }

    /**
     * Tracks total sparks spent on screen time and rewards
     * @returns {number} Total spent sparks
     */
    getSpentSparks() {
        return 0;
    }

    /**
     * Generates mock activity data for testing purposes
     * @param {number} seedMultiplier - Multiplier for generated values
     * @returns {Array} Array of mock activity records
     */
    generateMockActivities(seedMultiplier = 1) {
        const activities = [];
        const types = ['Walking', 'Running', 'Cycling', 'Swimming'];
        const now = new Date();
    
        // Generate 30 days of mock data
        for (let i = 0; i < 30; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            activities.push({
                type: types[Math.floor(Math.random() * types.length)],
                steps: Math.floor((Math.random() * 5000 + 3000) * (seedMultiplier || 1)),
                duration: Math.floor(Math.random() * 180) + 30, // 30-210 minutes
                avgHeartRate: Math.floor(Math.random() * 40) + 80, // 80-120 BPM
                points: Math.floor(Math.random() * 100) + 50,
                timestamp: date.toISOString(),
                redeemed: Math.random() > 0.7 // 30% chance of being redeemed
            });
        }
    
        return activities;
    }

/**
     * Updates the activity visualization chart
     * Handles different metric types and their specific display configurations
     * @param {string} childId - Child's identifier
     */
    updateChart(childId) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        // Destroy existing chart if it exists to prevent memory leaks
        if (this.activityChart) {
            this.activityChart.destroy();
        }
     
        const activities = this.getChildActivityData(childId);
        const chartData = this.prepareChartData(activities, this.currentMetric);
        
        // Configure different metrics with their specific display settings
        const metricConfigs = {
            steps: {
                label: 'Daily Steps',
                color: '#4CAF50'
            },
            activeTime: {
                label: 'Active Minutes',
                color: '#4CAF50'
            },
            heartRate: {
                label: 'Average Heart Rate',
                color: '#4CAF50'
            },
            screenTime: {
                label: 'Screen Time (Minutes)',
                color: '#4CAF50',
                yAxis: {
                    min: 0,
                    max: 500,  // Maximum screen time limit
                    stepSize: 60  // Show increments of 1 hour
                }
            }
        };
     
        const config = metricConfigs[this.currentMetric];
     
        this.activityChart = new Chart(ctx, {
            type: 'line',
            data: this.currentMetric === 'screenTime' ? chartData : {
                labels: chartData.labels,
                datasets: [{
                    label: config.label,
                    data: chartData.values,
                    borderColor: config.color,
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: this.currentMetric === 'screenTime'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(76, 175, 80, 0.9)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#4CAF50',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        },
                        ticks: {
                            color: '#666666',
                            ...(config.yAxis || {})
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#666666'
                        }
                    }
                }
            }
        });
     }

     /**
      * Prepares data for chart visualization based on selected metric
      * Handles different data formats for steps, active time, heart rate, and screen time
      * @param {Array} activities - Activity data array
      * @param {string} metric - Selected metric type
      * @returns {Object} Formatted chart data
      */
     prepareChartData(activities, metric) {
        // Handle screen time data differently from other metrics
        if (metric === 'screenTime') {
            const screenTimeData = this.screenTimeUsage[this.selectedChildId];
            const sortedData = screenTimeData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Get all activity data for this child
            const userActivities = this.storedActivityDataInDB[this.selectedChildId];
            
            // Calculate total earned points
            const totalEarnedPoints = userActivities.reduce((sum, activity) => {
                return sum + (activity.points || 0);
            }, 0);
            
            // Calculate running used total and net available
            let usedTotal = 0;
            const netAvailableData = sortedData.map(day => {
                usedTotal += (day.minutes * 100);
                return totalEarnedPoints - usedTotal;
            });
    
            // Calculate daily available spark using sparkCalculator
            const dailyAvailableSpark = sortedData.map(day => {
                const dayActivities = userActivities.filter(activity => 
                    activity.day === day.date
                );
                
                // For each day, if we have steps and minutes, calculate sparks
                if (dayActivities.length > 0) {
                    const activity = dayActivities[0];
                    if (activity.steps && activity.duration) {
                        console.log(`Calculating sparks for ${day.date}:`, {
                            steps: activity.steps,
                            duration: activity.duration,
                            avgHeartRate: activity.avgHeartRate || 0
                        });
                        
                        const result = this.sparkCalculator.calculateSparks(
                            activity.steps,
                            activity.duration,
                            activity.avgHeartRate || 0  // Default to 0 if not available
                        );
                        console.log(`Spark result for ${day.date}:`, result);
                        return result.sparkPoints;
                    }
                }
                console.log(`No valid activity data for ${day.date}`);
                return 0;
            });
    
            // Log values to verify calculations
            console.log('Parent View Calculations:', {
                childId: this.selectedChildId,
                totalEarned: totalEarnedPoints,
                finalUsedTotal: usedTotal,
                finalNetAvailable: netAvailableData[netAvailableData.length - 1],
                dates: sortedData.map(d => d.date),
                dailyAvailable: dailyAvailableSpark
            });
    
            return {
                labels: sortedData.map(day => new Date(day.date).toLocaleDateString()),
                datasets: [{
                    label: 'Daily Used Spark',
                    data: sortedData.map(day => day.minutes * 100),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Daily Available Spark',
                    data: dailyAvailableSpark,
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                }, {
                    label: 'Total Available Spark',
                    data: netAvailableData,
                    borderColor: '#1B5E20',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    fill: false
                }]
            };
        } else {
            // Handle other metrics (steps, activeTime, heartRate)
            const data = {
                labels: [],
                values: []
            };
            console.log("prepareChartData activities:: ", activities);
            const dailyData = activities.reduce((acc, activity) => {
                const date = activity.day;
                let value;
                
                // Select appropriate value based on metric type
                switch(metric) {
                    case 'steps':
                        value = activity.steps;
                        break;
                    case 'activeTime':
                        value = activity.duration;
                        break;
                    case 'heartRate':
                        value = activity.avgHeartRate;
                        break;
                    default:
                        value = activity.steps;
                }
                
                acc[date] = value;
                return acc;
            }, {});
    
            // Sort dates chronologically (oldest to newest)
            const sortedDates = Object.keys(dailyData).sort((a, b) => 
                new Date(a) - new Date(b)
            );
    
            sortedDates.forEach(date => {
                data.labels.push(date);
                data.values.push(dailyData[date]);
            });
            console.log("prepareChartData:: ", data);
            return data;
        }
    }

    /**
     * Handles approval or denial of pending requests
     * @param {string} approvalId - Request identifier
     * @param {boolean} isApproved - Approval status
     */
    handleApproval(approvalId, isApproved) {
        const action = isApproved ? 'approved' : 'denied';
        this.showNotification(`Request ${action} successfully!`);
        this.renderDashboard();
    }

    /**
     * Displays notification messages to users
     * Creates and manages toast notification elements
     * @param {string} message - Message to display
     */
    showNotification(message) {
        const existingToast = document.querySelector('.toast-notification');
        if (existingToast) {
            existingToast.remove();
        }
    
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
    
        // Trigger animation
        setTimeout(() => toast.classList.add('visible'), 10);
    
        // Remove after 2 seconds
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Debug function to log current activity statistics and spark calculations
     * Outputs detailed information about current user's activity metrics
     */
    debugCurrentStats() {
        const steps = this.getTotalSteps(this.currentUser.userId);
        const activityTime = this.getActivityMinutes(this.currentUser.userId);
        const avgHR = this.getAverageHR(this.currentUser.userId);
        
        console.log('Current Stats:', {
            steps,
            activityTime,
            avgHR
        });

        // Check if spark calculator is initialized before calculating
        if (this.sparkCalculator) {
            const result = this.sparkCalculator.calculateSparks(
                steps,
                activityTime,
                avgHR
            );
            console.log('Spark Calculation Result:', result);
        } else {
            console.log('Spark Calculator not initialized!');
        }
    }

    /**
     * Fetches activity data from Fitbit API and processes it
     * @param {string} userId - User identifier
     * @returns {Promise<null|void>} Resolves when data is fetched and processed
     */
    async fetchFitbitData(userId) {
        try {
            console.log("fetchFitbitData device config of userId:: ",userId);
            const deviceConfig = await db.getDeviceConfig(userId);
            // Verify device has valid access token
            if (!deviceConfig?.accessToken) {
                console.log('No Fitbit access token found');
                return null;
            }
            const accessToken = await window.fitbitManager.getFitbitAccessToken(userId);
            const clientId = localStorage.getItem('clientId')    
            const today = new Date().toLocaleDateString('en-CA').split('T')[0];  // Format: YYYY-MM-DD
            
            // Fetch activity data from Fitbit API
            const activityResponse = 
                await fetch(`https://api.fitbit.com/1/user/${clientId}/activities/date/${today}.json`, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                }
            });
    
            // Check for API response errors
            if (!activityResponse.ok) {
                throw new Error(`HTTP error! status: ${activityResponse.status}`);
            }
    
            const activityData = await activityResponse.json();
            const points = await this.calculateDaySparks(activityData.summary.steps, 
                activityData.summary.veryActiveMinutes 
                + activityData.summary.fairlyActiveMinutes 
                    + activityData.summary.lightlyActiveMinutes, activityData.summary.averageHeartRate);
            console.log("ActivityData:: ", activityData);
            
            // Format activity data for storage
            const activityDataJson = {
                steps: activityData.summary.steps || 0,
                activeMinutes: activityData.summary.veryActiveMinutes 
                            + activityData.summary.fairlyActiveMinutes 
                                + activityData.summary.lightlyActiveMinutes || 0,
                averageHeartRate: activityData.summary.averageHeartRate || 0,
                points: points || 0
            };

            console.log("fetchFitbitData currentActivityData:: ",this.currentActivityData);
            this.currentActivityData = {
                [userId]: activityDataJson
            };
            console.log("fetchFitbitData currentActivityData:: ",this.currentActivityData);
            await db.saveActivityForDay(userId, today, activityDataJson);
    
        } catch (error) {
            console.error('Error fetching Fitbit data:', error);
            return null;
        }
    }

    /**
     * Renders appropriate settings view based on user type
     */
    renderSettings() {
        // Determine which settings view to show based on account type
        if (this.currentUser?.accountType === 'parent') {
            this.renderParentSettings();
        } else {
            this.renderChildSettings();
        }
    }

    /**
     * Renders settings view for parent accounts
     * Includes device configuration and management options
     */
    renderParentSettings() {
        const container = document.getElementById('settings');
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Parent Settings</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="settings-container">
                <div id="device-config-panel"></div>
            </div>`;

        // Initialize device configuration panel
        window.deviceConfigManager.renderConfigurationPanel(
            document.getElementById('device-config-panel')
        );
    }

    /**
     * Renders settings view for child accounts
     * Includes notification preferences and display settings
     */
    renderChildSettings() {
        const container = document.getElementById('settings');
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Settings</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="settings-container">
                <div class="settings-section">
                    <h2>Notification Preferences</h2>
                    <!-- Add child notification settings -->
                </div>

                <div class="settings-section">
                    <h2>Display Preferences</h2>
                    <!-- Add display settings -->
                </div>

                <div class="settings-section">
                    <h2>Account Settings</h2>
                    <!-- Add account settings -->
                </div>
            </div>`;
    }
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();
window.dashboardManager = dashboardManager;