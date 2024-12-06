/**
 * @fileoverview Marketplace Management System
 * Manages the virtual marketplace where users can spend sparks on products.
 * Handles product display, purchase requests, transaction history, and 
 * integration with the approval system for parent oversight.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Marketplace and purchase management implementation
 */

/**
 * MarketplaceManager class handles all marketplace operations including
 * product display, purchase flows, and transaction history tracking.
 */
class MarketplaceManager {
    /**
     * Initializes marketplace manager with empty state
     */
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.storageKey = 'marketplaceItems';
    }

    /**
     * Initializes the marketplace with user context and loads necessary data
     * 
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
        this.loadProducts();
        this.setupEventListeners();
        this.renderMarketplace();
    }

    /**
     * Sets up event listeners for marketplace interactions
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.purchase-btn')) {
                this.showPurchaseModal(e.target.dataset.productId);
            }
        });
    }

    /**
     * Loads available products from local storage
     */
    loadProducts() {
        this.products = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    }

    /**
     * Renders the complete marketplace interface including products and balance
     */
    renderMarketplace() {
        const container = document.getElementById('marketplace');
        // Calculate available and remaining sparks considering pending approvals
        const availableSparks = window.dashboardManager.calculateTotalAvailableSparks();
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        const pendingItem = pendingApprovals.find(approval => 
            approval.childId === this.currentUser.userId && 
            approval.status === 'pending'
        );
    
        const remainingSparks = pendingItem ? availableSparks - pendingItem.cost : availableSparks;
        const remainingDollars = remainingSparks / 1000;
        
        // Generate marketplace HTML
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Buy Stuff</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>
    
            <div class="sparks-conversion">
                <div class="conversion-circle">
                    <div class="amount">${remainingSparks.toLocaleString()}</div>
                    <div class="label">SPARKS</div>
                </div>
                <div class="equals">=</div>
                <div class="conversion-circle">
                    <div class="amount">$${Math.ceil(remainingDollars * 100) / 100}</div>
                    <div class="label">DOLLARS</div>
                </div>
            </div>
    
            <div class="products-grid">
                ${this.products.map(product => {
                    const sparkCost = product.dollarValue * 1000;
                    const canAfford = remainingSparks >= sparkCost;
                    const isPending = this.isPendingApproval(product.id);
                    
                    return this.createProductCard(product, remainingSparks);
                }).join('')}
            </div>
    
            ${this.renderPurchaseHistory()}
        `;
    
        // Add event listeners for purchase interactions
        const purchaseButtons = container.querySelectorAll('.purchase-btn');
        purchaseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                this.showPurchaseModal(productId);
            });
        });
    }

    /**
     * Generates HTML for a single product card
     * 
     * @param {Object} product - Product data
     * @param {number} availableSparks - Available spark balance
     * @returns {string} HTML string for product card
     */
    createProductCard(product, availableSparks) {
        const sparkCost = product.dollarValue * 1000;
        const canAfford = availableSparks >= sparkCost;
        const isPending = this.isPendingApproval(product.id);
        
        const displayDollars = Math.ceil(product.dollarValue * 100) / 100;
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="/api/placeholder/400/320" alt="${product.name}">
                </div>
                <div class="product-details">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-cost">
                        <div class="cost-row">
                            <span>${sparkCost.toLocaleString()} sparks</span>
                            <span>$${displayDollars.toFixed(2)}</span>
                        </div>
                    </div>
                    ${isPending ? 
                        '<div class="pending-status">Pending Approval</div>' :
                        `<button class="btn purchase-btn" 
                            data-product-id="${product.id}"
                            ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? 'Request Purchase' : 'Not Enough Sparks'}
                        </button>`
                    }
                </div>
            </div>
        `;
    }

    /**
     * Displays purchase confirmation modal for selected product
     * 
     * @param {string} productId - ID of selected product
     */
    showPurchaseModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        // Create modal dialog
        const modal = document.createElement('div');
        modal.className = 'purchase-modal';
        modal.innerHTML = `
            <h2>Confirm Purchase</h2>
            <div class="modal-content">
                <p>Request purchase of ${product.name}?</p>
                <p>Cost: ${(product.dollarValue * 1000).toLocaleString()} sparks</p>
                <div class="modal-actions">
                    <button class="btn confirm-btn">
                        Confirm
                    </button>
                    <button class="btn cancel-btn">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Setup modal interaction handlers
        const confirmBtn = modal.querySelector('.confirm-btn');
        const cancelBtn = modal.querySelector('.cancel-btn');
        
        confirmBtn.addEventListener('click', () => {
            this.requestPurchase(productId);
        });
        
        cancelBtn.addEventListener('click', () => {
            this.closePurchaseModal();
        });
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        // Animate modal appearance
        setTimeout(() => {
            modal.classList.add('visible');
            overlay.classList.add('visible');
        }, 10);
    }

    /**
     * Checks if product has a pending approval request
     * 
     * @param {string} productId - Product identifier
     * @returns {boolean} True if approval is pending
     */
    isPendingApproval(productId) {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        return pendingApprovals.some(approval => 
            approval.itemId === productId && 
            approval.childId === this.currentUser.userId &&
            approval.status === 'pending'
        );
    }

    /**
     * Closes purchase confirmation modal with animation
     */
    closePurchaseModal() {
        const modal = document.querySelector('.purchase-modal');
        const overlay = document.querySelector('.modal-overlay');
        
        if (modal && overlay) {
            modal.classList.remove('visible');
            overlay.classList.remove('visible');
            setTimeout(() => {
                modal.remove();
                overlay.remove();
            }, 300);
        }
    }

    /**
     * Processes purchase request and creates approval request
     * 
     * @param {string} productId - ID of product to purchase
     */
    requestPurchase(productId) {
        try {
            // Validate product exists
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                console.error('Product not found:', productId);
                window.dashboardManager.showNotification('Error: Product not found');
                return;
            }
    
            // Validate sufficient funds
            const sparkCost = product.dollarValue * 1000;
            const availableSparks = window.dashboardManager.calculateTotalAvailableSparks();
    
            if (availableSparks < sparkCost) {
                window.dashboardManager.showNotification('Not enough sparks available');
                this.closePurchaseModal();
                return;
            }
    
            // Check for existing pending request
            const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
            const isAlreadyPending = pendingApprovals.some(
                approval => approval.itemId === productId && 
                           approval.childId === this.currentUser.userId &&
                           approval.status === 'pending'
            );
    
            if (isAlreadyPending) {
                window.dashboardManager.showNotification('This item is already pending approval');
                this.closePurchaseModal();
                return;
            }
    
            // Create purchase request
            const newRequest = {
                id: Date.now().toString(),
                childId: this.currentUser.userId,
                childName: this.currentUser.username,
                itemId: product.id,
                itemName: product.name,
                cost: sparkCost,
                dollarValue: Math.ceil(product.dollarValue * 100) / 100,
                type: 'Marketplace Purchase',
                timestamp: new Date().toISOString(),
                status: 'pending',
                originalProduct: {
                    ...product,
                    requestDate: new Date().toISOString()
                }
            };
    
            // Clean up modal
            const modal = document.querySelector('.purchase-modal');
            const overlay = document.querySelector('.modal-overlay');
            if (modal) {
                modal.remove();
            }
            if (overlay) {
                overlay.remove();
            }
    
            // Save pending approval
            pendingApprovals.push(newRequest);
            localStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
    
            // Create spark hold
            const sparkHolds = JSON.parse(localStorage.getItem('sparkHolds') || '[]');
            sparkHolds.push({
                id: newRequest.id,
                childId: this.currentUser.userId,
                amount: sparkCost,
                timestamp: new Date().toISOString(),
                type: 'purchase_hold'
            });
            localStorage.setItem('sparkHolds', JSON.stringify(sparkHolds));
    
            window.dashboardManager.showNotification('Purchase request sent to parent');
    
            console.log('Purchase request created:', {
                request: newRequest,
                availableSparks,
                remainingSparks: availableSparks - sparkCost
            });
    
            this.renderMarketplace();
    
        } catch (error) {
            console.error('Error processing purchase request:', error);
            window.dashboardManager.showNotification('Error processing request. Please try again.');
            this.closePurchaseModal();
        }
    }
    
    /**
     * Gets currently pending item for user if any exists
     * 
     * @returns {Object|undefined} Pending approval item
     */
    getSelectedPendingItem() {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        return pendingApprovals.find(approval => 
            approval.childId === this.currentUser.userId && 
            approval.status === 'pending'
        );
    }

    /**
     * Renders user's purchase history
     * 
     * @returns {string} HTML string for purchase history
     */
    renderPurchaseHistory() {
        try {
            // Get and filter transactions
            const sparkTransactions = JSON.parse(localStorage.getItem('sparkTransactions') || '[]');
            const approvedPurchases = sparkTransactions
                .filter(transaction => {
                    return transaction && 
                        transaction.type === 'purchase' && 
                        transaction.childId === this.currentUser.userId &&
                        transaction.dollarValue !== undefined;
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
            if (approvedPurchases.length === 0) {
                return '';
            }
    
            // Generate purchase history HTML
            return `
                <div class="purchase-history">
                    <h3>Purchase History</h3>
                    <div class="history-items">
                        ${approvedPurchases.map(purchase => {
                            const dollarValue = purchase.dollarValue || 0;
                            const cost = purchase.cost || 0;
                            const itemName = purchase.itemName || 'Unknown Item';
                            const timestamp = purchase.timestamp ? 
                                new Date(purchase.timestamp).toLocaleDateString() : 
                                'Unknown Date';
    
                            return `
                                <div class="history-item">
                                    <div class="item-details">
                                        <span class="item-name">${itemName}</span>
                                        <span class="item-cost">
                                            $${dollarValue.toFixed(2)} 
                                            (${cost.toLocaleString()} sparks)
                                        </span>
                                    </div>
                                    <div class="purchase-date">
                                        ${timestamp}
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error rendering purchase history:', error);
            return '';
        }
    }

    /**
     * Gets list of approved purchases for current user
     * 
     * @returns {Array} Sorted array of approved purchases
     */
    getApprovedPurchases() {
        const sparkTransactions = JSON.parse(localStorage.getItem('sparkTransactions') || '[]');
        return sparkTransactions
            .filter(transaction => 
                transaction.type === 'purchase' && 
                transaction.childId === this.currentUser.userId
            )
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
}

// Initialize global instance of marketplace manager
const marketplaceManager = new MarketplaceManager();
window.marketplaceManager = marketplaceManager;