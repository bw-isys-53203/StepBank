// rewards.js
class RewardsManager {
    constructor() {
        this.currentUser = null;
        this.rewards = [];
        this.pendingRewards = [];
    }

    initialize(user) {
        this.currentUser = user;
        this.loadRewards();
        this.setupEventListeners();
        this.renderRewards();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.redeem-btn')) {
                const rewardId = e.target.dataset.rewardId;
                this.handleRewardRedemption(rewardId);
            }
            
            if (e.target.matches('.approve-btn')) {
                const rewardId = e.target.dataset.rewardId;
                this.approveReward(rewardId);
            }
            
            if (e.target.matches('.deny-btn')) {
                const rewardId = e.target.dataset.rewardId;
                this.denyReward(rewardId);
            }
        });
    }

    loadRewards() {
        // In a real app, this would fetch from an API
        this.rewards = [
            {
                id: 'screen_time_1',
                title: 'Extra Screen Time',
                description: '30 minutes of additional screen time',
                points: 100,
                type: 'screen_time',
                duration: 30
            },
            {
                id: 'roblox_1',
                title: 'Roblox Gift Card',
                description: '$10 Roblox gift card',
                points: 500,
                type: 'gift_card',
                value: 10
            },
            {
                id: 'amazon_1',
                title: 'Amazon Gift Card',
                description: '$25 Amazon gift card',
                points: 1000,
                type: 'gift_card',
                value: 25
            }
        ];

        // Load pending rewards from localStorage
        this.pendingRewards = JSON.parse(localStorage.getItem('pendingRewards') || '[]');
    }

    renderRewards() {
        const container = document.getElementById('rewards');
        const availablePoints = this.getAvailablePoints();

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <span>Rewards</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="balance-card">
                <div class="balance-label">StepBank Balance</div>
                <div class="balance-value">${availablePoints.toLocaleString()} points</div>
            </div>

            <div class="rewards-section">
                <h2 class="rewards-section-title">Available Rewards</h2>
                <div class="rewards-grid">
                    ${this.rewards.map(reward => this.createRewardCard(reward, availablePoints)).join('')}
                </div>
            </div>

            ${this.currentUser.isParent ? this.renderPendingApprovals() : ''}
        `;
    }

    createRewardCard(reward, availablePoints) {
        const isPending = this.pendingRewards.some(pr => pr.rewardId === reward.id);
        const canAfford = availablePoints >= reward.points;

        return `
            <div class="reward-card">
                <h3 class="reward-title">${reward.title}</h3>
                <p class="reward-description">${reward.description}</p>
                <div class="reward-cost">
                    <span>${reward.points.toLocaleString()} points</span>
                </div>
                <div class="reward-actions">
                    ${isPending ? 
                        '<div class="pending-approval">Pending Parent Approval</div>' :
                        `<button class="btn redeem-btn" 
                            data-reward-id="${reward.id}"
                            ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? 'Redeem' : 'Not Enough Points'}
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    renderPendingApprovals() {
        if (this.pendingRewards.length === 0) return '';

        return `
            <div class="rewards-section">
                <h2 class="rewards-section-title">Pending Approvals</h2>
                <div class="rewards-grid">
                    ${this.pendingRewards.map(pending => {
                        const reward = this.rewards.find(r => r.id === pending.rewardId);
                        return `
                            <div class="reward-card">
                                <h3 class="reward-title">${reward.title}</h3>
                                <p class="reward-description">
                                    Requested by: ${pending.childUsername}<br>
                                    ${reward.description}
                                </p>
                                <div class="reward-actions">
                                    <button class="btn approve-btn" data-reward-id="${reward.id}">
                                        Approve
                                    </button>
                                    <button class="btn deny-btn" data-reward-id="${reward.id}">
                                        Deny
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    async handleRewardRedemption(rewardId) {
        const reward = this.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        if (this.currentUser.isParent) {
            await this.processReward(reward);
        } else {
            this.requestParentApproval(reward);
        }

        this.renderRewards();
    }

    async processReward(reward) {
        // In a real app, this would make API calls
        switch (reward.type) {
            case 'screen_time':
                // Implement screen time addition
                console.log(`Added ${reward.duration} minutes of screen time`);
                break;
            case 'gift_card':
                // Implement gift card generation
                console.log(`Generated $${reward.value} gift card`);
                break;
        }
    }

    requestParentApproval(reward) {
        const pendingReward = {
            rewardId: reward.id,
            childUsername: this.currentUser.username,
            requestedAt: new Date().toISOString()
        };

        this.pendingRewards.push(pendingReward);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
    }

    async approveReward(rewardId) {
        const pendingReward = this.pendingRewards.find(pr => pr.rewardId === rewardId);
        if (!pendingReward) return;

        const reward = this.rewards.find(r => r.id === rewardId);
        await this.processReward(reward);

        this.pendingRewards = this.pendingRewards.filter(pr => pr.rewardId !== rewardId);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
        
        this.renderRewards();
    }

    denyReward(rewardId) {
        this.pendingRewards = this.pendingRewards.filter(pr => pr.rewardId !== rewardId);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
        
        this.renderRewards();
    }

    getAvailablePoints() {
        // Fallback points if dashboard manager isn't available
        const defaultPoints = 1000;
        
        try {
            if (window.dashboardManager) {
                const stats = window.dashboardManager.calculateStatistics();
                return stats.availablePoints;
            }
            return defaultPoints;
        } catch (error) {
            console.warn('Error getting points:', error);
            return defaultPoints;
        }
    }
}

// Initialize rewards manager
const rewardsManager = new RewardsManager();
window.rewardsManager = rewardsManager; // Make it globally accessible