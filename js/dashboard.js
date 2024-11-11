// dashboard.js
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.activityChart = null;
        this.timeRange = 'week';
        this.activities = [];
        this.children = [];
        this.selectedChildId = null;
        this.sparkCalculator = null; // Will be initialized when config loads
    }

    async initialize(user) {
        this.currentUser = user;
        await this.loadConfig(); // Add this line
        this.loadDashboardData();
        this.setupEventListeners();
        this.renderDashboard();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.time-range-btn')) {
                this.updateTimeRange(e.target.dataset.range);
            }
            if (e.target.matches('.update-goals-btn')) { // Add this handler
                this.updateGoals();
            }
        });

        // Listen for child selection changes
        document.addEventListener('change', (e) => {
            if (e.target.matches('.child-select')) {
                this.updateSelectedChild(e.target.value);
            }
        });
    }

    async loadDashboardData() {
        // Simulate loading data
        this.activities = this.generateMockActivities();
        
        if (this.currentUser.isParent) {
            // Simulate loading children data for parent
            this.children = [
                { id: 'child1', username: 'Tommy', age: 10, dailyGoal: 10000 },
                { id: 'child2', username: 'Sarah', age: 8, dailyGoal: 8000 }
            ];
            // Set initial selected child
            this.selectedChildId = this.children[0].id;
        }
    }

    // Add this method to the DashboardManager class
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

    renderDashboard() {
        const dashboardContainer = document.getElementById('dashboard');
        
        if (this.currentUser.isParent) {
            this.renderParentDashboard(dashboardContainer);
        } else {
            this.renderChildDashboard(dashboardContainer);
        }
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

        // Initialize chart for selected child
        this.initializeChart('activityChart', this.getChildActivityData(selectedChild.id));
    }

    updateSelectedChild(childId) {
        this.selectedChildId = childId;
        const selectedChild = this.children.find(child => child.id === childId);
        if (selectedChild) {
            document.getElementById('stepsGoal').value = selectedChild.dailyGoal;
        }
        this.renderDashboard();
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
                        <!-- Background arc (210° to 150°) -->
                        <path
                            d="M50,50 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0"
                            fill="none"
                            stroke="#2A2D37"
                            stroke-width="10"
                            stroke-dasharray="${this.calculateArcLength()}"
                            stroke-dashoffset="0"
                            transform="rotate(210 50 50)"
                        />
                        <!-- Progress arc -->
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
/*
        const metricsGrid = container.querySelector('.metrics-grid');
        if (metricsGrid) {
            const refreshButton = document.createElement('button');
            refreshButton.className = 'btn refresh-btn';
            refreshButton.textContent = 'Generate New Activity';
            refreshButton.onclick = () => this.refreshActivityData();
            metricsGrid.insertAdjacentElement('afterend', refreshButton);
        }
*/
        // Add sparks animation
        this.animateSparks();
    }

    calculateArcLength() {
        return 2 * Math.PI * 45; // Circumference of the circle
    }

    calculateProgress() {
        const progress = this.getProgressPercentage();
        const arcLength = this.calculateArcLength();
        // Convert progress to degrees (150° maximum)
        const degrees = (progress / 100) * 150;
        // Convert degrees to stroke-dashoffset
        return arcLength - (degrees / 360) * arcLength;
    }

    animateSparks() {
        const sparkCount = document.querySelector('.spark-count');
        if (!sparkCount) return;
    
        const finalValue = this.calculateCurrentDaySparks();  // Changed from calculateSparks
        const duration = 2000; // 2 seconds
        const fps = 60;
        const frames = duration / (1000 / fps);
        const increment = finalValue / frames;
        let currentValue = 0;
    
        // Add sparkle effect elements
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
            
            // Add random sparkles during animation
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

    getActivityTime() {
        const minutes = this.getActivityMinutes();
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }

    getActivityMinutes() {
        // Mock data - replace with real activity tracking
        return Math.floor(Math.random() * 180) + 30; // 30-210 minutes
    }

    getAverageHR() {
        // Mock data - replace with real heart rate tracking
        return Math.floor(Math.random() * 40) + 80; // 80-120 BPM
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
            rewards: Math.floor(todaySteps / 1000) // Example: 1 reward per 1000 steps
        };
    }

    // Update the getChildActivityData method
    getChildActivityData(childId) {
        // Generate different patterns for different children
        const seedMultiplier = childId === 'child1' ? 1 : 1.5;
        return this.generateMockActivities(seedMultiplier);
    }

    renderPendingApprovals() {
        // Simulate pending approvals
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

    // Add these methods to the DashboardManager class

    // Update the generateMockActivities method
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

        // Group activities by date
        const dailySteps = activities.reduce((acc, activity) => {
            const date = new Date(activity.timestamp).toLocaleDateString();
            acc[date] = (acc[date] || 0) + activity.steps;
            return acc;
        }, {});

        // Convert to arrays for chart
        Object.entries(dailySteps).forEach(([date, steps]) => {
            data.labels.push(date);
            data.steps.push(steps);
        });

        return data;
    }

    updateTimeRange(range) {
        this.timeRange = range;
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        this.renderDashboard();
    }

    getTotalSteps() {
        return this.activities
            .filter(a => new Date(a.timestamp).toDateString() === new Date().toDateString())
            .reduce((sum, activity) => sum + activity.steps, 0);
    }

    getRedeemedPoints() {
        return this.activities
            .filter(a => a.redeemed)
            .reduce((sum, activity) => sum + activity.points, 0);
    }

    getAvailableRewards() {
        const points = this.activities
            .filter(a => !a.redeemed)
            .reduce((sum, activity) => sum + activity.points, 0);
        return Math.floor(points / 100); // Convert points to rewards
    }

    calculateProgress() {
        const dailyGoal = 10000; // Default daily goal
        const todaySteps = this.getTotalSteps();
        return Math.min(Math.round((todaySteps / dailyGoal) * 100), 100);
    }

    renderRecentActivities() {
        const recentActivities = this.activities
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 5);

        if (recentActivities.length === 0) {
            return '<p class="no-activities">No recent activities</p>';
        }

        return `
            <div class="activity-list">
                ${recentActivities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-info">
                            <div class="activity-icon">
                                ${this.getActivityIcon(activity.type)}
                            </div>
                            <div class="activity-details">
                                <span class="activity-type">${activity.type}</span>
                                <span class="activity-time">
                                    ${new Date(activity.timestamp).toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div class="activity-points">+${activity.points} points</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    getActivityIcon(type) {
        const icons = {
            walking: '🚶',
            running: '🏃',
            cycling: '🚲',
            swimming: '🏊'
        };
        return icons[type.toLowerCase()] || '⭐';
    }

    handleApproval(approvalId, isApproved) {
        // In a real app, this would make an API call
        const action = isApproved ? 'approved' : 'denied';
        this.showNotification(`Request ${action} successfully!`);
        this.renderDashboard();
    }

    showNotification(message) {
        // Implementation for showing notifications
        alert(message); // Replace with better UI notification
    }

    async loadConfig() {
        // Just use default config
        this.sparkCalculator = new SparkCalculator();
        
        // For debugging
        console.log('SparkCalculator initialized with config:', this.sparkCalculator.config);
    }

    /*
    async loadConfig() {
        try {
            const response = await fetch('/config.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const config = await response.json();
            this.sparkCalculator = new SparkCalculator(config);
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback to default config if loading fails
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
        }
    }
*/

    calculateSparks() {
        const steps = this.getTotalSteps();
        const activeMinutes = this.getActivityMinutes();
        const avgHR = this.getAverageHR();
    
        return this.sparkCalculator.calculateSparks(
            steps,
            activeMinutes,
            avgHR
        ).sparkPoints;
    }

    calculateCurrentDaySparks() {
        const steps = this.getTotalSteps();
        
        // Convert hours and minutes to total minutes
        const activityTime = this.getActivityMinutes(); // This should already return total minutes
        const avgHR = this.getAverageHR();
    
        // For debugging
        console.log('Calculating sparks with:', {
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
            
            // For debugging
            console.log('Spark calculation result:', result);
            
            return result.sparkPoints;
        }
        
        return 0; // Return 0 if sparkCalculator isn't initialized
    }
    
    calculateTotalAvailableSparks() {
        // Get last 30 days of activities
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Filter activities for last 30 days
        const recentActivities = this.activities.filter(activity => 
            new Date(activity.timestamp) >= thirtyDaysAgo
        );
    
        // Calculate total earned sparks
        let totalEarned = 0;
        recentActivities.forEach(activity => {
            const sparkResult = this.sparkCalculator.calculateSparks(
                activity.steps,
                activity.activeMinutes || Math.floor(activity.duration / 60),
                activity.avgHeartRate
            );
            totalEarned += sparkResult.sparkPoints;
        });
    
        // Get total spent (you'll need to implement this based on your rewards system)
        const totalSpent = this.getSpentSparks();
    
        return totalEarned - totalSpent;
    }
    
    getSpentSparks() {
        // Implement based on your rewards tracking system
        // For now, returning mock data
        return 0;
    }

    getTotalSteps() {
        // Generate between 2000 and 12000 steps
        // More likely to be in middle ranges
        const baseSteps = Math.floor(Math.random() * 8000) + 2000;
        const extraSteps = Math.floor(Math.random() * 2000); // occasional extra burst
        return baseSteps + (Math.random() > 0.7 ? extraSteps : 0);
    }
    
    getActivityMinutes() {
        // Generate between 15 minutes and 4 hours (240 minutes)
        // More likely to be 1-2 hours
        const baseMinutes = Math.floor(Math.random() * 60) + 15; // at least 15 minutes
        const extraMinutes = Math.floor(Math.random() * 180); // up to 3 more hours
        return baseMinutes + (Math.random() > 0.3 ? extraMinutes : 0);
    }
    
    getActivityTime() {
        const minutes = this.getActivityMinutes();
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    
    getAverageHR() {
        // Generate between 60 and 120 BPM
        // More likely to be in 75-95 range
        const baseHR = Math.floor(Math.random() * 20) + 75; // 75-95 base range
        const extraHR = Math.floor(Math.random() * 25); // possible spike
        return baseHR + (Math.random() > 0.7 ? extraHR : 0);
    }

    /*
    getActivityMinutes() {
        // Mock data - replace with real activity tracking
        const totalMinutes = Math.floor(Math.random() * 180) + 30; // 30-210 minutes
        return totalMinutes;
    }
    
    getActivityTime() {
        const totalMinutes = this.getActivityMinutes();
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
*/

    refreshActivityData() {
        // Calculate new values
        const newSteps = this.getTotalSteps();
        const newTime = this.getActivityTime();
        const newHR = this.getAverageHR();
    
        // Log for debugging
        console.log('New Activity Data:', {
            steps: newSteps,
            time: newTime,
            heartRate: newHR
        });

        // Re-render dashboard with new values
        this.renderDashboard();
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