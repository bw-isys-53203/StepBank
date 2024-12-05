// dashboard.js
class DashboardManager {
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

    async initialize(user) {
        this.currentUser = user;
        await this.loadConfig();

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

    formatActiveTime(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    }

    generateSteps() {
        const baseSteps = Math.floor(Math.random() * 8000) + 2000;
        const extraSteps = Math.floor(Math.random() * 2000);
        return baseSteps + (Math.random() > 0.7 ? extraSteps : 0);
    }

    generateMinutes() {
        const baseMinutes = Math.floor(Math.random() * 60) + 15;
        const extraMinutes = Math.floor(Math.random() * 180);
        return baseMinutes + (Math.random() > 0.3 ? extraMinutes : 0);
    }

    generateHeartRate() {
        const baseHR = Math.floor(Math.random() * 20) + 75;
        const extraHR = Math.floor(Math.random() * 25);
        return baseHR + (Math.random() > 0.7 ? extraHR : 0);
    }

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

    getTotalScreenTime(childId) {
        return this.screenTimeUsage[childId]
            .reduce((total, day) => total + day.minutes, 0);
    }

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
                    
                    // You might want to load activities or other child-specific data here
                    console.log("Loaded child data:", childData);
                } else {
                    console.error("Could not load child data");
                }
            }
        } catch (error) {
            console.error("Error loading dashboard data:", error);
            // You might want to show an error message to the user
        }
    }

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

    getTotalSteps(userId) {
        /*if (this.currentUser.accountType === 'child') {
            return this.getChildActivityData(this.currentUser.id)[0]?.steps || 0;
        }*/
       console.log("this.currentActivityData:: ",this.currentActivityData);
        return this.currentActivityData[userId].steps;
    }

    getActivityMinutes(userId) {
        /*if (this.currentUser.accountType === 'child') {
            return this.getChildActivityData(this.currentUser.id)[0]?.duration || 0;
        }*/
        return this.currentActivityData[userId].activeMinutes;
    }

    getActivityTime(userId) {
        let minutes;
        /*if (this.currentUser.accountType === 'child') {
            minutes = this.getChildActivityData(this.currentUser.id)[0]?.duration || 0;
        } else {*/
            minutes = this.currentActivityData[userId].activeMinutes;
        //}
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    getAverageHR(userId) {
        /*if (this.currentUser.accountType === 'child') {
            return this.getChildActivityData(this.currentUser.id)[0]?.avgHeartRate || 0;
        }*/
        return this.currentActivityData[userId].averageHeartRate;
    }

    deductScreenTime(childId, minutes) {
        const availableSparks = this.calculateTotalAvailableSparks();
        const newTotal = Math.max(0, availableSparks - Math.floor(minutes));
        // Store the new total
        // Update all relevant displays
        this.renderDashboard();
    }

    calculateDaySparks(steps, activeMinutes, averageHR) {
        console.log("Calculate Today's Sparks");
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

    calculateCurrentDaySparks(userId) {
        console.log("Calculate Today's Sparks");
        const steps = this.getTotalSteps(userId);
        const activityTime = this.getActivityMinutes(userId);
        const avgHR = this.getAverageHR(userId);
        
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

    renderDashboard() {
        const dashboardContainer = document.getElementById('dashboard');
        
        if (this.currentUser.accountType === 'parent') {
            this.renderParentDashboard(dashboardContainer);
        } else if (this.currentUser.accountType === 'child') {
            this.renderChildDashboard(dashboardContainer);
        } else {
            console.error('Invalid account type');
        }
    }

    updateSelectedChild(childId) {
        this.selectedChildId = childId;
        const selectedChild = this.children.find(child => child.id === childId);
        if (selectedChild) {
            document.getElementById('stepsGoal').value = selectedChild.dailyGoal;
            document.getElementById('activeTimeGoal').value = selectedChild.activeTimeGoal;
            document.getElementById('heartRateGoal').value = selectedChild.heartRateGoal;
        }
        this.renderDashboard();
    }

    renderParentDashboard(container) {
        console.log("rendering parent dashboard with selectedChildId:", this.selectedChildId);
        console.log("children array:", this.children);

        // Check if there are any children
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
               <!--     <button class="btn" onclick="showSection('rewards')">Manage Rewards</button>
                    <button class="btn" onclick="showSection('marketplace')">Marketplace</button> -->
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

        //this.updateChart(selectedChild.id);
        if (selectedChild && selectedChild.isRegistered) {
            this.updateChart(selectedChild.id);
        } else {
            console.log(`Child ${selectedChild?.username} is not registered. Skipping chart update.`);
        }
    }

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

    calculateArcLength() {
        return 2 * Math.PI * 45;
    }

    calculateProgress(userId) {
        const progress = this.getProgressPercentage(userId);
        const arcLength = this.calculateArcLength();
        const degrees = (progress / 100) * 150;
        return arcLength - (degrees / 360) * arcLength;
    }

    getProgressPercentage(userId) {
        const dailyGoal = 10000; // Default daily goal
        const todaySteps = this.getTotalSteps(userId);
        return Math.min(Math.round((todaySteps / dailyGoal) * 100), 100);
    }

    animateSparks() {
        const sparkCount = document.querySelector('.spark-count');
        if (!sparkCount) return;

        const finalValue = this.calculateCurrentDaySparks(this.currentUser.userId);
        const duration = 2000;
        const fps = 60;
        const frames = duration / (1000 / fps);
        const increment = finalValue / frames;
        let currentValue = 0;

        const sparkContainer = document.createElement('div');
        sparkContainer.className = 'sparkle-container';
        sparkCount.parentElement.appendChild(sparkContainer);

        const animation = setInterval(() => {
            currentValue += increment;
            if (currentValue >= finalValue) {
                currentValue = finalValue;
                clearInterval(animation);
                setTimeout(() => {
                    sparkContainer.remove();
                }, 1000);
            }
            sparkCount.textContent = Math.floor(currentValue);
            
            if (Math.random() > 0.7) {
                this.createSparkle(sparkContainer);
            }
        }, 1000 / fps);
    }

    createSparkle(container) {
        const sparkle = document.createElement('div');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${Math.random() * 100}%`;
        sparkle.style.top = `${Math.random() * 100}%`;
        container.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 1000);
    }

    async updateGoals() {
        const stepsGoal = parseInt(document.getElementById('stepsGoal').value);
        const activeTimeGoal = parseInt(document.getElementById('activeTimeGoal').value);
        const heartRateGoal = parseInt(document.getElementById('heartRateGoal').value);
        
        // Validate input values
        if (isNaN(stepsGoal) || stepsGoal <= 0 || 
            isNaN(activeTimeGoal) || activeTimeGoal <= 0 ||
            isNaN(heartRateGoal) || heartRateGoal <= 0) {
            this.showNotification('Please enter valid goal values');
            return;
        }
        
        try {
            // Update in local array
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

    getChildStats(childId) {
        const child = this.children.find(c => c.id === childId);
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

    getChildActivityData(childId) {
        /*if (!this.storedActivityData || !this.storedActivityData[childId]) {
            this.storedActivityData = {
                ...this.storedActivityData,
                [childId]: this.generateMockActivities(childId === 'child1' ? 1 : 1.5)
            };
        }*/
        return this.storedActivityDataInDB[childId];
    }

    calculateTotalAvailableSparks() {
        try {
            if (!this.storedActivityDataInDB) {
                console.log('No activity data found');
                return 0;
            }
    
            const userActivities = this.storedActivityDataInDB[this.currentUser.userId];
            if (!Array.isArray(userActivities)) {
                console.log('No activities found for user');
                return 0;
            }
    
            // Calculate total earned points
            const totalEarnedPoints = userActivities.reduce((sum, activity) => {
                return sum + (activity.points || 0);
            }, 0);
    
            const screenTimeData = this.screenTimeUsage[this.currentUser.userId];
            if (!screenTimeData) {
                console.log('No screen time data found');
                return totalEarnedPoints;
            }
    
            // Calculate total used points
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

    // Add method to get screen time data for specific day
    getScreenTimeForDate(childId, date) {
        const usage = this.screenTimeUsage[childId];
        const dayUsage = usage.find(day => day.date === date);
        return dayUsage?.minutes || 0;
    }

    // Add method to get available time for specific day
    getAvailableTimeForDate(childId, date) {
        const usage = this.screenTimeUsage[childId];
        const dayUsage = usage.find(day => day.date === date);
        return dayUsage?.availableMinutes || 0;
    }

    getSpentSparks() {
        return 0;
    }

    generateMockActivities(seedMultiplier = 1) {
        const activities = [];
        const types = ['Walking', 'Running', 'Cycling', 'Swimming'];
        const now = new Date();
    
        for (let i = 0; i < 30; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            activities.push({
                type: types[Math.floor(Math.random() * types.length)],
                steps: Math.floor((Math.random() * 5000 + 3000) * (seedMultiplier || 1)),
                duration: Math.floor(Math.random() * 180) + 30, // 30-210 minutes
                avgHeartRate: Math.floor(Math.random() * 40) + 80, // 80-120 BPM
                points: Math.floor(Math.random() * 100) + 50,
                timestamp: date.toISOString(),
                redeemed: Math.random() > 0.7
            });
        }
    
        return activities;
    }

    updateChart(childId) {
        const ctx = document.getElementById('activityChart').getContext('2d');
        if (this.activityChart) {
            this.activityChart.destroy();
        }
     
        const activities = this.getChildActivityData(childId);
        const chartData = this.prepareChartData(activities, this.currentMetric);
        
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
                    max: 500,  
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

     prepareChartData(activities, metric) {
        if (metric === 'screenTime') {
            const screenTimeData = this.screenTimeUsage[this.selectedChildId];
            const sortedData = screenTimeData.sort((a, b) => new Date(a.date) - new Date(b.date));
            
            // Get all activity data for this child
            const userActivities = this.storedActivityDataInDB[this.selectedChildId];
            
            // Calculate total earned points (same as calculateTotalAvailableSparks)
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

    handleApproval(approvalId, isApproved) {
        const action = isApproved ? 'approved' : 'denied';
        this.showNotification(`Request ${action} successfully!`);
        this.renderDashboard();
    }

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

    debugCurrentStats() {
        const steps = this.getTotalSteps(this.currentUser.userId);
        const activityTime = this.getActivityMinutes(this.currentUser.userId);
        const avgHR = this.getAverageHR(this.currentUser.userId);
        
        console.log('Current Stats:', {
            steps,
            activityTime,
            avgHR
        });

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
    async fetchFitbitData(userId) {
        try {
            console.log("fetchFitbitData device config of userId:: ",userId);
            const deviceConfig = await db.getDeviceConfig(userId);
            if (!deviceConfig?.accessToken) {
                console.log('No Fitbit access token found');
                return null;
            }
            const accessToken = await window.fitbitManager.getFitbitAccessToken(userId);
            const clientId = localStorage.getItem('clientId')    
            const today = new Date().toLocaleDateString('en-CA').split('T')[0];  // Format: YYYY-MM-DD
            
            // Fetch activity data
            const activityResponse = 
                await fetch(`https://api.fitbit.com/1/user/${clientId}/activities/date/${today}.json`, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                }
            });
    
            if (!activityResponse.ok) {
                throw new Error(`HTTP error! status: ${activityResponse.status}`);
            }
    
            const activityData = await activityResponse.json();
            const points = await this.calculateDaySparks(activityData.summary.steps, 
                activityData.summary.veryActiveMinutes 
                + activityData.summary.fairlyActiveMinutes 
                    + activityData.summary.lightlyActiveMinutes, activityData.summary.averageHeartRate);
            console.log("ActivityData:: ", activityData);
            
            // Update dashboard with new data
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
            //return activityData;
    
        } catch (error) {
            console.error('Error fetching Fitbit data:', error);
            return null;
        }
    }

   renderSettings() {
        // Check user type using accountType
        if (this.currentUser?.accountType === 'parent') {
            this.renderParentSettings();
        } else {
            this.renderChildSettings();
        }
    }

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
