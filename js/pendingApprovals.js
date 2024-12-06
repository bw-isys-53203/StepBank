/**
 * @fileoverview Pending Approvals Management System
 * Handles parent approval workflow for marketplace purchases and item management.
 * Manages the approval/denial process, item catalog maintenance, and transaction
 * history tracking for the marketplace system.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Approval system and item management implementation
 */

/**
 * PendingApprovalsManager class handles all aspects of the approval workflow
 * including request management, item catalog maintenance, and transaction tracking.
 */
class PendingApprovalsManager {
    /**
     * Initializes manager with empty user state and storage key for items
     */
    constructor() {
        this.currentUser = null;
        this.storageKey = 'marketplaceItems';
    }

    /**
     * Initializes the approvals manager with user context
     * 
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
        this.renderApprovals();
    }

    /**
     * Renders the complete approvals interface including pending requests,
     * item management, and available items catalog
     */
    renderApprovals() {
        const container = document.getElementById('pendingApprovals');
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        const marketplaceItems = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        
        // Generate complete approvals interface HTML
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Pending Approvals</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>
    
            <div class="approvals-container">
                ${pendingApprovals.length > 0 ? `
                    <div class="pending-section">
                        <h3>Pending Requests</h3>
                        <div class="approval-requests">
                            ${pendingApprovals.map(request => `
                                <div class="approval-request">
                                    <div class="request-info">
                                        <strong>${request.childName}</strong>
                                        <span class="item-name">${request.itemName}</span>
                                        <span class="cost">$${request.dollarValue.toFixed(2)} (${request.cost.toLocaleString()} sparks)</span>
                                    </div>
                                    <div class="request-buttons">
                                        <button class="btn approve-btn" 
                                            onclick="pendingApprovalsManager.handleApproval('${request.id}', true)">
                                            Approve
                                        </button>
                                        <button class="btn deny-btn" 
                                            onclick="pendingApprovalsManager.handleApproval('${request.id}', false)">
                                            Deny
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
    
                <div class="add-item-form">
                    <h3>Add New Item</h3>
                    <div class="form-group">
                        <label>Item Name</label>
                        <input type="text" id="itemName" class="form-input">
                    </div>
                    <div class="form-group">
                        <label>Dollar Value</label>
                        <input type="number" id="itemValue" class="form-input" step="0.01" min="0">
                        <div class="spark-conversion">= <span id="sparkValue">0</span> sparks</div>
                    </div>
                    <button class="btn" onclick="pendingApprovalsManager.addItem()">Add Item</button>
                </div>
    
                <div class="available-items">
                    <h3>Available Items</h3>
                    <div class="items-grid">
                        ${marketplaceItems.map(item => {
                            const displayDollars = Math.ceil(item.dollarValue * 100) / 100;
                            return `
                                <div class="item-card">
                                    <div class="item-details">
                                        <h4>${item.name}</h4>
                                        <div class="item-value">$${displayDollars.toFixed(2)} (${(item.dollarValue * 1000).toLocaleString()} sparks)</div>
                                    </div>
                                    <button class="btn remove-btn" 
                                        onclick="pendingApprovalsManager.removeItem('${item.id}')">
                                        Remove
                                    </button>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
        `;
    
        // Setup live dollar to spark conversion
        const valueInput = document.getElementById('itemValue');
        if (valueInput) {
            valueInput.addEventListener('input', (e) => {
                const sparkValue = document.getElementById('sparkValue');
                const dollarValue = parseFloat(e.target.value) || 0;
                sparkValue.textContent = (dollarValue * 1000).toLocaleString();
            });
        }
    }

    /**
     * Adds new item to marketplace catalog
     * Validates input and updates storage
     */
    addItem() {
        const name = document.getElementById('itemName').value;
        const dollarValue = Number(document.getElementById('itemValue').value);

        // Validate required fields
        if (!name || !dollarValue) {
            alert('Please fill in all fields');
            return;
        }

        // Add new item to storage
        const items = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
        items.push({
            id: Date.now().toString(),
            name,
            dollarValue,
            addedBy: this.currentUser.userId
        });

        localStorage.setItem(this.storageKey, JSON.stringify(items));
        this.renderApprovals();
    }

    /**
     * Removes item from marketplace catalog
     * 
     * @param {string} itemId - ID of item to remove
     */
    removeItem(itemId) {
        try {
            const items = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
            const updatedItems = items.filter(item => item.id !== itemId);
            localStorage.setItem(this.storageKey, JSON.stringify(updatedItems));
            this.renderApprovals();
            window.dashboardManager.showNotification('Item removed successfully');
        } catch (error) {
            console.error('Error removing item:', error);
            window.dashboardManager.showNotification('Failed to remove item');
        }
    }

    /**
     * Renders list of pending approval requests
     * 
     * @returns {string} HTML string for pending requests
     */
    renderPendingRequests() {
        const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
        
        if (pendingApprovals.length === 0) {
            return '<p>No pending requests</p>';
        }

        return pendingApprovals.map(request => `
            <div class="approval-request">
                <div class="request-details">
                    <h4>${request.childName}</h4>
                    <p>${request.itemName}</p>
                    <p>${request.cost.toLocaleString()} sparks</p>
                </div>
                <div class="request-actions">
                    <button class="btn approve-btn" onclick="pendingApprovalsManager.handleApproval('${request.id}', true)">
                        Approve
                    </button>
                    <button class="btn deny-btn" onclick="pendingApprovalsManager.handleApproval('${request.id}', false)">
                        Deny
                    </button>
                </div>
            </div>
        `).join('');
    }

    /**
     * Handles approval or denial of purchase requests
     * Manages transaction records, item availability, and spark balance updates
     * 
     * @param {string} requestId - ID of request to process
     * @param {boolean} approved - True if request is approved, false if denied
     */
    handleApproval(requestId, approved) {
        try {
            // Retrieve and validate request
            const pendingApprovals = JSON.parse(localStorage.getItem('pendingApprovals') || '[]');
            const request = pendingApprovals.find(req => req.id === requestId);
            
            if (!request) {
                console.error('Request not found:', requestId);
                return;
            }
    
            // Remove from pending queue
            const updatedApprovals = pendingApprovals.filter(req => req.id !== requestId);
            localStorage.setItem('pendingApprovals', JSON.stringify(updatedApprovals));
    
            if (approved) {
                // Process approval
                
                // Record spark transaction
                const sparkTransactions = JSON.parse(localStorage.getItem('sparkTransactions') || '[]');
                sparkTransactions.push({
                    id: Date.now().toString(),
                    childId: request.childId,
                    amount: -request.cost,
                    type: 'purchase',
                    itemId: request.itemId,
                    itemName: request.itemName || 'Unknown Item',
                    cost: request.cost || 0,
                    dollarValue: request.dollarValue || 0,
                    timestamp: new Date().toISOString(),
                    approvedDate: new Date().toISOString(),
                    approvedBy: this.currentUser.userId
                });
                localStorage.setItem('sparkTransactions', JSON.stringify(sparkTransactions));
    
                // Update item availability
                const marketplaceItems = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
                const updatedItems = marketplaceItems.filter(item => item.id !== request.itemId);
                localStorage.setItem(this.storageKey, JSON.stringify(updatedItems));
    
                // Record purchase history
                const purchasedItems = JSON.parse(localStorage.getItem('purchasedItems') || '[]');
                purchasedItems.push({
                    ...request,
                    purchaseDate: new Date().toISOString(),
                    status: 'approved'
                });
                localStorage.setItem('purchasedItems', JSON.stringify(purchasedItems));
    
                // Release spark hold
                const sparkHolds = JSON.parse(localStorage.getItem('sparkHolds') || '[]');
                const updatedHolds = sparkHolds.filter(hold => hold.id !== request.id);
                localStorage.setItem('sparkHolds', JSON.stringify(updatedHolds));
            } else {
                // Process denial
                
                // Restore item availability if needed
                const marketplaceItems = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
                if (!marketplaceItems.some(item => item.id === request.itemId)) {
                    const itemToReturn = {
                        id: request.itemId,
                        name: request.itemName,
                        dollarValue: request.dollarValue,
                        addedBy: this.currentUser.userId
                    };
                    marketplaceItems.push(itemToReturn);
                    localStorage.setItem(this.storageKey, JSON.stringify(marketplaceItems));
                }
    
                // Record denial history
                const deniedItems = JSON.parse(localStorage.getItem('deniedItems') || '[]');
                deniedItems.push({
                    ...request,
                    deniedDate: new Date().toISOString(),
                    status: 'denied'
                });
                localStorage.setItem('deniedItems', JSON.stringify(deniedItems));
    
                // Release spark hold
                const sparkHolds = JSON.parse(localStorage.getItem('sparkHolds') || '[]');
                const updatedHolds = sparkHolds.filter(hold => hold.id !== request.id);
                localStorage.setItem('sparkHolds', JSON.stringify(updatedHolds));
            }
    
            // Update UI
            this.renderApprovals();
            window.dashboardManager.showNotification(
                `Request ${approved ? 'approved' : 'denied'} successfully!`
            );
    
            // Log action for debugging
            console.log('Approval action completed:', {
                requestId,
                approved,
                request,
                timestamp: new Date().toISOString()
            });
    
        } catch (error) {
            console.error('Error handling approval:', error);
            window.dashboardManager.showNotification('Error processing approval. Please try again.');
        }
    }
}

// Initialize global instance of approvals manager
const pendingApprovalsManager = new PendingApprovalsManager();
window.pendingApprovalsManager = pendingApprovalsManager;