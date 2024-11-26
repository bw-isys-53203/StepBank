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
        this.currentActivityData = {
            steps: 0,
            minutes: 0,
            heartRate: 0
        };
        this.currentMetric = 'steps';
        this.switchMetric = this.switchMetric.bind(this);

    }

    async initialize(user) {
        this.currentUser = user;
        await this.loadConfig();
        
        // Initialize screen time usage after sparkCalculator is ready
        this.screenTimeUsage = {
            child1: await this.generateScreenTimeUsage('child1'),
            child2: await this.generateScreenTimeUsage('child2')
        };
        
        this.loadDashboardData();
        this.setupEventListeners();
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
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(now - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            
            try {
                const dayActivities = this.getChildActivityData(childId)
                    .filter(activity => activity.timestamp.startsWith(dateStr));
                
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
                const actualUsage = Math.floor(Math.random() * maxUsage);
    
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
        this.activities = this.generateMockActivities();
        
        if (this.currentUser.isParent) {
            // Simulate loading children data for parent
            this.children = [
                { 
                    id: 'child1', 
                    username: 'Tommy', 
                    age: 10, 
                    dailyGoal: 10000,
                    activeTimeGoal: 60,    // 60 minutes
                    heartRateGoal: 90      // 90 BPM
                },
                { 
                    id: 'child2', 
                    username: 'Sarah', 
                    age: 8, 
                    dailyGoal: 8000,
                    activeTimeGoal: 45,    // 45 minutes
                    heartRateGoal: 85      // 85 BPM
                }
            ];
            // Set initial selected child
            this.selectedChildId = this.children[0].id;
            console.log("Loaded children data:", this.children);
            console.log("Set initial selectedChildId:", this.selectedChildId);
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

    getTotalSteps() {
        if (this.currentUser.id.startsWith('child')) {
            return this.getChildActivityData(this.currentUser.id)[0]?.steps || 0;
        }
        return this.currentActivityData.steps;
    }

    getActivityMinutes() {
        if (this.currentUser.id.startsWith('child')) {
            return this.getChildActivityData(this.currentUser.id)[0]?.duration || 0;
        }
        return this.currentActivityData.minutes;
    }

    getActivityTime() {
        let minutes;
        if (this.currentUser.id.startsWith('child')) {
            minutes = this.getChildActivityData(this.currentUser.id)[0]?.duration || 0;
        } else {
            minutes = this.currentActivityData.minutes;
        }
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    getAverageHR() {
        if (this.currentUser.id.startsWith('child')) {
            return this.getChildActivityData(this.currentUser.id)[0]?.avgHeartRate || 0;
        }
        return this.currentActivityData.heartRate;
    }

    deductScreenTime(childId, minutes) {
        const availableSparks = this.calculateTotalAvailableSparks();
        const newTotal = Math.max(0, availableSparks - Math.floor(minutes));
        // Store the new total
        // Update all relevant displays
        this.renderDashboard();
    }

    calculateCurrentDaySparks() {
        const steps = this.getTotalSteps();
        const activityTime = this.getActivityMinutes();
        const avgHR = this.getAverageHR();
        
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
        
        if (this.currentUser.isParent) {
            this.renderParentDashboard(dashboardContainer);
        } else {
            this.renderChildDashboard(dashboardContainer);
        }
    }

    updateSelectedChild(childId) {
        this.selectedChildId = childId;
        const selectedChild = this.children.find(child => child.id === childId);
        if (selectedChild) {
            document.getElementById('stepsGoal').value = selectedChild.dailyGoal;
        }
        this.renderDashboard();
    }

    renderParentDashboard(container) {
        console.log("rendering parent dashboard with selectedChildId:", this.selectedChildId);
        console.log("children array:", this.children);
        const selectedChild = this.children.find(child => child.id === this.selectedChildId);
        
        if (!selectedChild) return;

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Parent Dashboard</span>
                </div>
                <div class="nav-buttons">
               <!--     <button class="btn" onclick="showSection('rewards')">Manage Rewards</button>
                    <button class="btn" onclick="showSection('marketplace')">Marketplace</button> -->
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
                <div class="metrics-grid">
                    <div class="metric-box">
                        <div class="metric-label">Steps</div>
                        <div class="metric-value">${this.getChildStats(selectedChild.id).totalSteps.toLocaleString()}</div>
                        <div class="metric-progress">${Math.min(this.getChildStats(selectedChild.id).progress, 100)}% of goal</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Active Time</div>
                        <div class="metric-value">${this.formatActiveTime(this.getChildActivityData(selectedChild.id)[0]?.duration || 0)}</div>
                        <div class="metric-progress">${Math.min(Math.round(((this.getChildActivityData(selectedChild.id)[0]?.duration || 0) / selectedChild.activeTimeGoal) * 100), 100)}% of goal</div>
                    </div>
                    <div class="metric-box">
                        <div class="metric-label">Heart Rate</div>
                        <div class="metric-value">${this.getChildActivityData(selectedChild.id)[0]?.avgHeartRate || 0} BPM</div>
                        <div class="metric-progress">${Math.min(Math.round(((this.getChildActivityData(selectedChild.id)[0]?.avgHeartRate || 0) / selectedChild.heartRateGoal) * 100), 100)}% of goal</div>
                    </div>
                </div>
            </div>
            <div class="child-card">
                ${this.renderMetricControls()}
                <div class="activity-chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
            </div>
        `;

        this.updateChart(selectedChild.id);
    }

    renderChildDashboard(container) {
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>StepBank</span>
                </div>
                <div class="nav-buttons">
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
                            stroke-dashoffset="${this.calculateProgress()}"
                            transform="rotate(210 50 50)"
                        />
                        <text x="50" y="45" class="spark-count" text-anchor="middle">
                            ${this.calculateCurrentDaySparks()}
                        </text>
                        <text x="50" y="60" class="spark-label" text-anchor="middle">
                            TODAY'S SPARKS
                        </text>
                    </svg>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.getTotalSteps().toLocaleString()}</div>
                    <div class="metric-label">Steps</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.getActivityTime()}</div>
                    <div class="metric-label">Active Time</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.getAverageHR()}</div>
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

    calculateProgress() {
        const progress = this.getProgressPercentage();
        const arcLength = this.calculateArcLength();
        const degrees = (progress / 100) * 150;
        return arcLength - (degrees / 360) * arcLength;
    }

    getProgressPercentage() {
        const dailyGoal = 10000; // Default daily goal
        const todaySteps = this.getTotalSteps();
        return Math.min(Math.round((todaySteps / dailyGoal) * 100), 100);
    }

    animateSparks() {
        const sparkCount = document.querySelector('.spark-count');
        if (!sparkCount) return;

        const finalValue = this.calculateCurrentDaySparks();
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

    updateGoals() {
        const stepsGoal = parseInt(document.getElementById('stepsGoal').value);
        const activeTimeGoal = parseInt(document.getElementById('activeTimeGoal').value);
        const heartRateGoal = parseInt(document.getElementById('heartRateGoal').value);
    
        if (isNaN(stepsGoal) || stepsGoal <= 0 || 
            isNaN(activeTimeGoal) || activeTimeGoal <= 0 ||
            isNaN(heartRateGoal) || heartRateGoal <= 0) {
            this.showNotification('Please enter valid goal values');
            return;
        }
        
        const childIndex = this.children.findIndex(child => child.id === this.selectedChildId);
        if (childIndex !== -1) {
            this.children[childIndex].dailyGoal = stepsGoal;
            this.children[childIndex].activeTimeGoal = activeTimeGoal;
            this.children[childIndex].heartRateGoal = heartRateGoal;
            this.showNotification('Goals updated successfully!');
            this.renderDashboard();
        }
    }

    getChildStats(childId) {
        const child = this.children.find(c => c.id === childId);
        if (!child) return { totalSteps: 0, progress: 0, rewards: 0 };

        const activities = this.getChildActivityData(childId);
        const todaySteps = activities[0]?.steps || Math.floor(Math.random() * 8000) + 2000;
        const progress = Math.round((todaySteps / child.dailyGoal) * 100);

        return {
            totalSteps: todaySteps,
            progress: Math.min(progress, 100),
            rewards: Math.floor(todaySteps / 1000)
        };
    }

    getChildActivityData(childId) {
        if (!this.storedActivityData || !this.storedActivityData[childId]) {
            this.storedActivityData = {
                ...this.storedActivityData,
                [childId]: this.generateMockActivities(childId === 'child1' ? 1 : 1.5)
            };
        }
        return this.storedActivityData[childId];
    }
/*
    calculateTotalAvailableSparks() {
        if (this.currentUser.id.startsWith('child')) {
            const activities = this.getChildActivityData(this.currentUser.id);
            // Get last 7 days of activities
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const recentActivities = activities.filter(activity => 
                new Date(activity.timestamp) >= sevenDaysAgo
            );
    
            let totalEarned = 0;
            recentActivities.forEach(activity => {
                const sparkResult = this.sparkCalculator.calculateSparks(
                    activity.steps,
                    activity.duration,
                    activity.avgHeartRate
                );
                totalEarned += sparkResult.sparkPoints;
            });
    
            return totalEarned;
        }
        return 0;
    }
*/

    calculateTotalAvailableSparks() {
        if (this.currentUser.id.startsWith('child')) {
            const screenTimeData = this.screenTimeUsage[this.currentUser.id];
            // Sum all available minutes from the last 7 days
            const totalAvailable = screenTimeData.reduce((total, day) => total + day.availableMinutes, 0);
            // Sum all used minutes
            const totalUsed = screenTimeData.reduce((total, day) => total + day.minutes, 0);
        
            // Store this value to ensure consistency across screens
            if (!this._cachedTotalAvailable) {
                this._cachedTotalAvailable = totalAvailable - totalUsed;
            }
        
            return this._cachedTotalAvailable;
        }
        return 0;
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
            
            // Calculate total available (running total)
            const totalAvailable = sortedData.reduce((total, day) => 
                total + (day.availableMinutes - day.minutes), 0);
    
            return {
                labels: sortedData.map(day => new Date(day.date).toLocaleDateString()),
                datasets: [{
                    label: 'Used Screen Time',
                    data: sortedData.map(day => day.minutes),
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }, {
                    label: 'Daily Available Time',
                    data: sortedData.map(day => day.availableMinutes),
                    borderColor: '#2E7D32',
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                    tension: 0.4,
                    borderWidth: 2,
                    borderDash: [5, 5],
                    fill: false
                }, {
                    label: `Total Available: ${totalAvailable} minutes`,
                    data: sortedData.map(() => totalAvailable),
                    borderColor: '#1B5E20',
                    borderWidth: 2,
                    borderDash: [10, 5],
                    fill: false
                }]
            };
        } else {
            // Existing logic for other metrics
            const data = {
                labels: [],
                values: []
            };
            
            const dailyData = activities.reduce((acc, activity) => {
                const date = new Date(activity.timestamp).toLocaleDateString();
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
        const steps = this.getTotalSteps();
        const activityTime = this.getActivityMinutes();
        const avgHR = this.getAverageHR();
        
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
}

// Initialize dashboard manager
const dashboardManager = new DashboardManager();
window.dashboardManager = dashboardManager;