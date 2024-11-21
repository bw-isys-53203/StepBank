class PendingApprovalsManager {
    constructor() {
        this.currentUser = null;
        this.pendingApprovals = [
            { id: 1, childName: 'Tommy', type: 'Marketplace Purchase', amount: 'New Balance Tennis Shoes' },
            { id: 2, childName: 'Sarah', type: 'Marketplace Purchase', amount: 'Nintendo Switch' }
        ];
    }

    initialize(user) {
        this.currentUser = user;
        this.renderPendingApprovals();
    }

    renderPendingApprovals() {
        const container = document.getElementById('pendingApprovals');
        
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Pending Approvals</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="approvals-container">
                <h2>Pending Approvals</h2>
                ${this.pendingApprovals.length > 0 ? this.renderApprovalsList() : this.renderNoApprovals()}
            </div>
        `;
    }

    renderApprovalsList() {
        return `
            <div class="approval-list">
                ${this.pendingApprovals.map(approval => `
                    <div class="approval-card">
                        <div class="approval-header">
                            <span class="child-name">${approval.childName}</span>
                            <span class="approval-type">${approval.type}</span>
                        </div>
                        <div class="approval-details">
                            <span class="approval-amount">${approval.amount}</span>
                            <div class="approval-time">Requested 2 hours ago</div>
                        </div>
                        <div class="approval-actions">
                            <button class="btn approve-btn" onclick="pendingApprovalsManager.handleApproval(${approval.id}, true)">
                                Approve
                            </button>
                            <button class="btn deny-btn" onclick="pendingApprovalsManager.handleApproval(${approval.id}, false)">
                                Deny
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNoApprovals() {
        return `
            <div class="no-approvals">
                <div class="no-approvals-message">No pending approvals</div>
            </div>
        `;
    }

    handleApproval(approvalId, isApproved) {
        // Remove the approval from the list
        this.pendingApprovals = this.pendingApprovals.filter(a => a.id !== approvalId);
        
        // Show notification
        const action = isApproved ? 'approved' : 'denied';
        this.showNotification(`Request ${action} successfully`);
        
        // Re-render the approvals list
        this.renderPendingApprovals();
    }

    showNotification(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize manager
const pendingApprovalsManager = new PendingApprovalsManager();
window.pendingApprovalsManager = pendingApprovalsManager;