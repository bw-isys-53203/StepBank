/**
 * @fileoverview Child Management System
 * Manages the addition and display of children profiles in the application.
 * Handles parent-child relationships, goal setting, and registration status
 * tracking with proper data persistence and UI updates.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Child profile management implementation
 */

/**
 * AddChildManager class handles all operations related to adding and managing
 * children profiles including form handling, display, and data persistence.
 */
class AddChildManager {
    /**
     * Initializes manager with empty state for current user and children
     */
    constructor() {
        this.currentUser = null;
        this.children = [];
    }

    /**
     * Initializes the manager with user context and loads existing children
     * 
     * @param {Object} user - The currently logged-in parent user
     */
    initialize(user) {
        this.currentUser = user;
        this.loadChildren();
        this.renderAddChildSection();
    }

    /**
     * Loads children data from database for current parent user
     * Updates local state and triggers re-render of the UI
     */
    async loadChildren() {
        try {
            const children = await db.getChildrenByParentId(this.currentUser.userId);
            this.children = children ? Object.values(children) : [];
            this.renderAddChildSection();
        } catch (error) {
            console.error('Error loading children:', error);
        }
    }

    /**
     * Renders the complete child management interface including
     * existing children list and add child form
     */
    renderAddChildSection() {
        const container = document.getElementById('children');
        
        // Generate complete interface with navigation, list, and form
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

    /**
     * Renders list of existing children with their details and goals
     * Includes registration status and token information
     * 
     * @returns {string} HTML string for children list
     */
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
                            <div class="registration-status ${child.isRegistered ? 'registered' : 'pending'}">
                                Status: ${child.isRegistered ? 'Registered' : 'Pending Registration'}
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

    /**
     * Renders placeholder content when no children are added
     * 
     * @returns {string} HTML string for empty state
     */
    renderNoChildren() {
        return `
            <div class="no-children">
                <div class="no-children-message">No children added yet</div>
            </div>
        `;
    }

    /**
     * Handles form submission for adding a new child
     * Validates and processes form data, updates database, and refreshes display
     * 
     * @param {Event} event - Form submission event
     */
    async handleAddChild(event) {
        event.preventDefault();
        
        // Collect and format child data from form
        const childData = {
            name: document.getElementById('childName').value,
            age: parseInt(document.getElementById('childAge').value),
            steps: parseInt(document.getElementById('steps').value),
            activeTime: parseInt(document.getElementById('activeTime').value),
            heartRate: parseInt(document.getElementById('heartRate').value)
        };

        console.log("Child data:: ",childData);

        try {
            // Save to database and update UI
            await db.addChild(this.currentUser.userId, childData);
            this.showNotification('Child added successfully!');
            event.target.reset();
            await this.loadChildren();
        } catch (error) {
            console.error('Error adding child:', error);
            this.showNotification('Error adding child. Please try again.', 'error');
        }
    }

    /**
     * Displays a temporary notification message to the user
     * Creates a toast notification that automatically fades out
     * 
     * @param {string} message - Message to display
     * @param {string} type - Notification type ('success' or 'error')
     */
    showNotification(message, type = 'success') {
        // Create and setup notification element
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        // Handle animation timing for smooth appearance and disappearance
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize global instance of child management
const addChildManager = new AddChildManager();
window.addChildManager = addChildManager;