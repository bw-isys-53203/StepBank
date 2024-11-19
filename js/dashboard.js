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
    }

    async initialize(user) {
        this.currentUser = user;
        await this.loadConfig();
        this.generateNewActivityData(); // Generate initial values
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

    generateNewActivityData() {
        this.currentActivityData = {
            steps: this.generateSteps(),
            minutes: this.generateMinutes(),
            heartRate: this.generateHeartRate()
        };
        console.log('Generated new activity data:', this.currentActivityData);
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

    async loadDashboardData() {
        this.activities = this.generateMockActivities();
        
        if (this.currentUser.isParent) {
            this.children = [
                { id: 'child1', username: 'Tommy', age: 10, dailyGoal: 10000 },
                { id: 'child2', username: 'Sarah', age: 8, dailyGoal: 8000 }
            ];
            this.selectedChildId = this.children[0].id;
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
        return this.currentActivityData.steps;
    }

    getActivityMinutes() {
        return this.currentActivityData.minutes;
    }

    getActivityTime() {
        const minutes = this.currentActivityData.minutes;
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    getAverageHR() {
        return this.currentActivityData.heartRate;
    }

    calculateCurrentDaySparks() {
        const steps = this.getTotalSteps();
        const activityTime = this.getActivityMinutes();
        const avgHR = this.getAverageHR();
    
        console.log('Calculating sparks with:', { steps, activityTime, avgHR });
    
        if (this.sparkCalculator) {
            const result = this.sparkCalculator.calculateSparks(
                steps,
                activityTime,
                avgHR
            );
            
            console.log('Spark calculation result:', result);
            return result.sparkPoints;
        }
        
        return 0;
    }

    refreshActivityData() {
        this.generateNewActivityData();
        this.renderDashboard();
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
        const selectedChild = this.children.find(child => child.id === this.selectedChildId);
        if (!selectedChild) return;

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Parent Dashboard</span>
                </div>
                <div class="nav-buttons">
                    <button class="btn" onclick="showSection('rewards')">Manage Rewards</button>
                    <button class="btn" onclick="showSection('marketplace')">Marketplace</button>
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
                                value="${selectedChild.dailyGoal}">
                        </div>
                        <button class="btn update-goals-btn">Update Goals</button>
                    </div>
                </div>
            </div>

            <div class="child-card">
                <h3>${selectedChild.username}'s Progress</h3>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-value">${this.getChildStats(selectedChild.id).totalSteps.toLocaleString()}</div>
                        <div class="stat-label">Today's Steps</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.getChildStats(selectedChild.id).progress}%</div>
                        <div class="stat-label">Goal Progress</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.getChildStats(selectedChild.id).rewards}</div>
                        <div class="stat-label">Rewards Earned</div>
                    </div>
                </div>
                <div class="activity-chart-container">
                    <canvas id="activityChart"></canvas>
                </div>
            </div>

            <div class="approval-requests">
                <h3>Pending Approvals</h3>
                ${this.renderPendingApprovals()}
            </div>
        `;

        this.initializeChart('activityChart', this.getChildActivityData(selectedChild.id));
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
        if (isNaN(stepsGoal) || stepsGoal <= 0) {
            this.showNotification('Please enter a valid goal value');
            return;
        }
        
        const childIndex = this.children.findIndex(child => child.id === this.selectedChildId);
        if (childIndex !== -1) {
            this.children[childIndex].dailyGoal = stepsGoal;
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
        const seedMultiplier = childId === 'child1' ? 1 : 1.5;
        return this.generateMockActivities(seedMultiplier);
    }

    calculateTotalAvailableSparks() {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentActivities = this.activities.filter(activity => 
            new Date(activity.timestamp) >= thirtyDaysAgo
        );

        let totalEarned = 0;
        recentActivities.forEach(activity => {
            const sparkResult = this.sparkCalculator.calculateSparks(
                activity.steps,
                activity.activeMinutes || Math.floor(activity.duration / 60),
                activity.avgHeartRate
            );
            totalEarned += sparkResult.sparkPoints;
        });

        const totalSpent = this.getSpentSparks();
        return totalEarned - totalSpent;
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
                points: Math.floor(Math.random() * 100) + 50,
                timestamp: date.toISOString(),
                redeemed: Math.random() > 0.7
            });
        }

        return activities;
    }

    initializeChart(canvasId, activityData) {
        const ctx = document.getElementById(canvasId).getContext('2d');
        
        if (this.activityChart) {
            this.activityChart.destroy();
        }

        const chartData = this.prepareChartData(activityData);
        
        this.activityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Daily Steps',
                    data: chartData.steps,
                    borderColor: '#FF4B4B',
                    backgroundColor: 'rgba(255, 75, 75, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(30, 32, 40, 0.9)',
                        titleColor: '#FFFFFF',
                        bodyColor: '#FFFFFF',
                        borderColor: '#FF4B4B',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#A1A1AA'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#A1A1AA'
                        }
                    }
                }
            }
        });
    }

    prepareChartData(activities) {
        const data = {
            labels: [],
            steps: []
        };

        const dailySteps = activities.reduce((acc, activity) => {
            const date = new Date(activity.timestamp).toLocaleDateString();
            acc[date] = (acc[date] || 0) + activity.steps;
            return acc;
        }, {});

        Object.entries(dailySteps).forEach(([date, steps]) => {
            data.labels.push(date);
            data.steps.push(steps);
        });

        return data;
    }

    renderPendingApprovals() {
        const pendingApprovals = [
            { id: 1, childName: 'Tommy', type: 'Screen Time', amount: '30 minutes' },
            { id: 2, childName: 'Sarah', type: 'Marketplace Purchase', amount: 'Nintendo Switch' }
        ];

        if (pendingApprovals.length === 0) {
            return '<p class="no-approvals">No pending approvals</p>';
        }

        return `
            <div class="approval-list">
                ${pendingApprovals.map(approval => `
                    <div class="approval-item">
                        <div class="approval-details">
                            <span class="child-name">${approval.childName}</span>
                            <span class="approval-type">${approval.type}</span>
                            <span class="approval-amount">${approval.amount}</span>
                        </div>
                        <div class="approval-actions">
                            <button class="btn approve-btn" onclick="dashboardManager.handleApproval(${approval.id}, true)">
                                Approve
                            </button>
                            <button class="btn deny-btn" onclick="dashboardManager.handleApproval(${approval.id}, false)">
                                Deny
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    handleApproval(approvalId, isApproved) {
        const action = isApproved ? 'approved' : 'denied';
        this.showNotification(`Request ${action} successfully!`);
        this.renderDashboard();
    }

    showNotification(message) {
        alert(message);
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