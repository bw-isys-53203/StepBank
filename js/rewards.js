/**
 * @fileoverview Rewards Management System
 * Handles reward catalog, redemption process, and parent approval workflow.
 * Manages point-based rewards including gift cards and screen time bonuses,
 * with support for parental oversight of redemptions.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Rewards system and redemption implementation
 */

/**
 * RewardsManager class handles all aspects of the rewards system including
 * catalog management, redemption processing, and approval workflow.
 */
class RewardsManager {
    /**
     * Initializes manager with empty states for user context and rewards
     */
    constructor() {
        this.currentUser = null;
        this.rewards = [];
        this.pendingRewards = [];
    }

    /**
     * Initializes the rewards manager with user context and sets up interface
     * 
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
        this.loadRewards();
        this.setupEventListeners();
        this.renderRewards();
    }

    /**
     * Sets up event listeners for reward interactions
     * Handles redemption and approval/denial actions
     */
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

    /**
     * Loads reward catalog and pending redemptions
     * Currently uses static data, but designed for API integration
     */
    loadRewards() {
        // Static reward catalog (would be API-driven in production)
        this.rewards = [
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

        // Load pending redemptions from storage
        this.pendingRewards = JSON.parse(localStorage.getItem('pendingRewards') || '[]');
    }

    /**
     * Renders complete rewards interface including available rewards
     * and pending approvals for parent users
     */
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

    /**
     * Creates HTML for individual reward card
     * 
     * @param {Object} reward - Reward item data
     * @param {number} availablePoints - User's current point balance
     * @returns {string} HTML string for reward card
     */
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

    /**
     * Renders pending approval section for parent users
     * 
     * @returns {string} HTML string for pending approvals section
     */
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

    /**
     * Handles reward redemption request based on user type
     * Routes to direct processing for parents or approval flow for children
     * 
     * @param {string} rewardId - ID of reward to redeem
     */
    async handleRewardRedemption(rewardId) {
        const reward = this.rewards.find(r => r.id === rewardId);
        if (!reward) return;

        // Parent users can redeem directly, children require approval
        if (this.currentUser.isParent) {
            await this.processReward(reward);
        } else {
            this.requestParentApproval(reward);
        }

        this.renderRewards();
    }

    /**
     * Processes approved reward redemption
     * Handles different reward types (screen time, gift cards)
     * 
     * @param {Object} reward - Reward to process
     */
    async processReward(reward) {
        // Placeholder for API integration
        switch (reward.type) {
            case 'screen_time':
                console.log(`Added ${reward.duration} minutes of screen time`);
                break;
            case 'gift_card':
                console.log(`Generated $${reward.value} gift card`);
                break;
        }
    }

    /**
     * Creates parent approval request for child reward redemption
     * 
     * @param {Object} reward - Reward being requested
     */
    requestParentApproval(reward) {
        const pendingReward = {
            rewardId: reward.id,
            childUsername: this.currentUser.username,
            requestedAt: new Date().toISOString()
        };

        this.pendingRewards.push(pendingReward);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
    }

    /**
     * Processes approved reward request
     * 
     * @param {string} rewardId - ID of reward to approve
     */
    async approveReward(rewardId) {
        const pendingReward = this.pendingRewards.find(pr => pr.rewardId === rewardId);
        if (!pendingReward) return;

        const reward = this.rewards.find(r => r.id === rewardId);
        await this.processReward(reward);

        // Remove from pending list after processing
        this.pendingRewards = this.pendingRewards.filter(pr => pr.rewardId !== rewardId);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
        
        this.renderRewards();
    }

    /**
     * Denies pending reward request
     * 
     * @param {string} rewardId - ID of reward to deny
     */
    denyReward(rewardId) {
        this.pendingRewards = this.pendingRewards.filter(pr => pr.rewardId !== rewardId);
        localStorage.setItem('pendingRewards', JSON.stringify(this.pendingRewards));
        
        this.renderRewards();
    }

    /**
     * Gets user's current available point balance
     * 
     * @returns {number} Available points balance
     */
    getAvailablePoints() {
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

// Initialize global instance of rewards manager
const rewardsManager = new RewardsManager();
window.rewardsManager = rewardsManager;