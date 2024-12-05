// marketplace.js
class MarketplaceManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.storageKey = 'marketplaceItems';
    }

    initialize(user) {
        this.currentUser = user;
        this.loadProducts();
        this.setupEventListeners();
        this.renderMarketplace();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.purchase-btn')) {
                this.showPurchaseModal(e.target.dataset.productId);
            }
        });
    }

    loadProducts() {
        // Load from localStorage
        this.products = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    }

    renderMarketplace() {
        const container = document.getElementById('marketplace');
        const availableSparks = window.dashboardManager.calculateTotalAvailableSparks();
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        const pendingItem = pendingApprovals.find(approval => 
            approval.childId === this.currentUser.userId && 
            approval.status === 'pending'
        );
    
        // Calculate remaining balance after pending item
        const remainingSparks = pendingItem ? availableSparks - pendingItem.cost : availableSparks;
        const remainingDollars = remainingSparks / 1000;
        
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
                                        <span>$${Math.ceil(product.dollarValue * 100) / 100}</span>
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
                }).join('')}
            </div>
    
            ${this.renderPurchaseHistory()}
        `;
    
        // Add event listeners for purchase buttons
        const purchaseButtons = container.querySelectorAll('.purchase-btn');
        purchaseButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const productId = e.target.dataset.productId;
                this.showPurchaseModal(productId);
            });
        });
    }

    createProductCard(product, availableSparks) {
        const sparkCost = product.dollarValue * 1000;
        const canAfford = availableSparks >= sparkCost;
        const isPending = this.isPendingApproval(product.id);
        
        // Round up to nearest cent for display
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

    showPurchaseModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

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

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        // Add proper event listeners
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
        
        setTimeout(() => {
            modal.classList.add('visible');
            overlay.classList.add('visible');
        }, 10);
    }

    isPendingApproval(productId) {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        return pendingApprovals.some(approval => 
            approval.itemId === productId && 
            approval.childId === this.currentUser.userId &&
            approval.status === 'pending'
        );
    }

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

    requestPurchase(productId) {
        try {
            // Find the product
            const product = this.products.find(p => p.id === productId);
            if (!product) {
                console.error('Product not found:', productId);
                window.dashboardManager.showNotification('Error: Product not found');
                return;
            }
    
            // Calculate costs
            const sparkCost = product.dollarValue * 1000;
            const availableSparks = window.dashboardManager.calculateTotalAvailableSparks();
    
            // Validate sufficient sparks
            if (availableSparks < sparkCost) {
                window.dashboardManager.showNotification('Not enough sparks available');
                this.closePurchaseModal();
                return;
            }
    
            // Check if already pending
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
    
            // Create new request
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
    
            // First, ensure modal is removed from DOM
            const modal = document.querySelector('.purchase-modal');
            const overlay = document.querySelector('.modal-overlay');
            if (modal) {
                modal.remove();
            }
            if (overlay) {
                overlay.remove();
            }
    
            // Add to pending approvals
            pendingApprovals.push(newRequest);
            localStorage.setItem('pendingApprovals', JSON.stringify(pendingApprovals));
    
            // Create a temporary hold on sparks
            const sparkHolds = JSON.parse(localStorage.getItem('sparkHolds') || '[]');
            sparkHolds.push({
                id: newRequest.id,
                childId: this.currentUser.userId,
                amount: sparkCost,
                timestamp: new Date().toISOString(),
                type: 'purchase_hold'
            });
            localStorage.setItem('sparkHolds', JSON.stringify(sparkHolds));
    
            // Show notification
            window.dashboardManager.showNotification('Purchase request sent to parent');
    
            // Log the transaction attempt
            console.log('Purchase request created:', {
                request: newRequest,
                availableSparks,
                remainingSparks: availableSparks - sparkCost
            });
    
            // Re-render the marketplace to show updated status
            this.renderMarketplace();
    
        } catch (error) {
            console.error('Error processing purchase request:', error);
            window.dashboardManager.showNotification('Error processing request. Please try again.');
            // Ensure modal is closed even on error
            const modal = document.querySelector('.purchase-modal');
            const overlay = document.querySelector('.modal-overlay');
            if (modal) {
                modal.remove();
            }
            if (overlay) {
                overlay.remove();
            }
        }
    }
    
    getSelectedPendingItem() {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        return pendingApprovals.find(approval => 
            approval.childId === this.currentUser.userId && 
            approval.status === 'pending'
        );
    }

    renderPurchaseHistory() {
        try {
            const sparkTransactions = JSON.parse(localStorage.getItem('sparkTransactions') || '[]');
            const approvedPurchases = sparkTransactions
                .filter(transaction => {
                    return transaction && 
                        transaction.type === 'purchase' && 
                        transaction.childId === this.currentUser.userId &&
                        transaction.dollarValue !== undefined;  // Add null check for dollarValue
                })
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
            if (approvedPurchases.length === 0) {
                return '';
            }
    
            return `
                <div class="purchase-history">
                    <h3>Purchase History</h3>
                    <div class="history-items">
                        ${approvedPurchases.map(purchase => {
                            // Add null checks and default values
                            const dollarValue = purchase.dollarValue || 0;
                            const cost = purchase.cost || 0;
                            const itemName = purchase.itemName || 'Unknown Item';
                            const timestamp = purchase.timestamp ? new Date(purchase.timestamp).toLocaleDateString() : 'Unknown Date';
    
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
            return ''; // Return empty string on error
        }
    }

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

// Initialize marketplace manager
const marketplaceManager = new MarketplaceManager();
window.marketplaceManager = marketplaceManager;