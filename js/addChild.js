// addChild.js
class AddChildManager {
    constructor() {
        this.currentUser = null;
        this.children = [];
    }

    initialize(user) {
        this.currentUser = user;
        this.loadChildren();
        this.renderAddChildSection();
    }

    async loadChildren() {
        try {
            const children = await db.getChildrenByParentId(this.currentUser.userId);
            this.children = children ? Object.values(children) : [];
            this.renderAddChildSection();
        } catch (error) {
            console.error('Error loading children:', error);
        }
    }

    renderAddChildSection() {
        const container = document.getElementById('children');
        
        container.innerHTML = `
            <div class="add-child-container">
                <nav class="nav">
                    <div class="logo">
                        <div class="logo-icon"></div>
                        <span>Children</span>
                    </div>
                    <button class="btn" onclick="showSection('dashboard')">Back</button>
                </nav>
                
                <div class="children-list-container">
                    ${this.children.length > 0 ? this.renderChildrenList() : this.renderNoChildren()}
                </div>
                </br>

                <div class="add-child-form-container">
                    <h2>Add a Child</h2>
                    <form id="addChildForm" onsubmit="addChildManager.handleAddChild(event)">
                        <div class="form-group">
                            <label for="childName">Child's Name</label>
                            <input type="text" id="childName" required>
                        </div>

                        <div class="form-group">
                            <label for="childAge">Child's Age</label>
                            <input type="number" id="childAge" min="1" required>
                        </div>

                        <div class="form-group">
                            <label for="steps">Steps Goal</label>
                            <input type="number" id="steps" step="1000" required>
                        </div>

                        <div class="form-group">
                            <label for="activeTime">Active Time Goal (minutes)</label>
                            <input type="number" id="activeTime" required>
                        </div>

                        <div class="form-group">
                            <label for="heartRate">Heart Rate Goal (BPM)</label>
                            <input type="number" id="heartRate" required>
                        </div>

                        <button type="submit" class="btn submit-btn">Add Child</button>
                    </form>
                </div>

                
            </div>
        `;
    }

    renderChildrenList() {
        return `
            <div class="children-list">
                ${Object.values(this.children).map(child => `
                    <div class="child-card">
                        <div class="child-header">
                            <span class="child-name">${child.childName}</span>
                            <span class="child-age">Age: ${child.childAge}</span>
                        </div>
                        <div class="child-details">
                            <div class="daily-goal">Steps Goal: ${child.goals.steps} steps</div>
                            <div class="daily-goal">Active Time Goal: ${child.goals.activeTime} minutes</div>
                            <div class="daily-goal">Heart Rate Goal: ${child.goals.heartRate} BPM</div>
                            <div class="registration-status ${child.registered ? 'registered' : 'pending'}">
                                Status: ${child.registered ? 'Registered' : 'Pending Registration'}
                            </div>
                            ${!child.registered ? `
                                <div class="registration-token">
                                    Registration Token: ${child.registrationToken}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderNoChildren() {
        return `
            <div class="no-children">
                <div class="no-children-message">No children added yet</div>
            </div>
        `;
    }

    async handleAddChild(event) {
        event.preventDefault();
        
        const childData = {
            name: document.getElementById('childName').value,
            age: parseInt(document.getElementById('childAge').value),
            steps: parseInt(document.getElementById('steps').value),
            activeTime: parseInt(document.getElementById('activeTime').value),
            heartRate: parseInt(document.getElementById('heartRate').value)
        };

        console.log("Child data:: ",childData);

        try {
            await db.addChild(this.currentUser.userId, childData);
            this.showNotification('Child added successfully!');
            event.target.reset();
            await this.loadChildren();
        } catch (error) {
            console.error('Error adding child:', error);
            this.showNotification('Error adding child. Please try again.', 'error');
        }
    }

    showNotification(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
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
const addChildManager = new AddChildManager();
window.addChildManager = addChildManager;