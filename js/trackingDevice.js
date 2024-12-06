/**
 * @fileoverview Device Tracking and Management System
 * Handles fitness device integration and management interface.
 * Provides unified device selection and connection status tracking for
 * various fitness devices, with primary focus on Fitbit integration.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Fitness device tracking and management implementation
 */

/**
 * DeviceManager class handles all aspects of fitness device integration
 * including device selection, connection state tracking, and setup routing.
 */
class DeviceManager {
    /**
     * Initializes manager with empty states for user context and device tracking.
     * Sets up tracking for Fitbit connection state and synchronization timing.
     */
    constructor() {
        this.currentUser = null;
        this.isFitbitDeviceConnected = false;
        this.lastSyncTime = null;
    }

    /**
     * Initializes the device manager with user context and loads connection state
     * Checks existing device connections and prepares selection interface
     * 
     * @param {Object} user - Current user object
     */
    async initialize(user) {
        this.currentUser = user;
        //this.checkDeviceConnection();
        // Verify Fitbit connection status from database
        this.isFitbitDeviceConnected = 
                await db.isFitbitDeviceConnected(this.currentUser.userId);
        this.renderDeviceSelectionPage();
    }

    /**
     * Renders the device selection interface showing available and future devices
     * Displays connection status for supported devices and placeholders for upcoming options
     */
    renderDeviceSelectionPage() {
        const container = document.getElementById('device');
        
        // Generate complete device selection interface with status indicators
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Devices</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>
    
            <div class="device-selection-container">
                
                <div class="device-grid" id="deviceGrid">
                    <div class="device-card" id="fitbitCard">
                        <div class="device-icon">
                            <i class="device-icon-fitbit">⌚</i>
                        </div>
                        <h3>Fitbit</h3>
                        <p>${this.isFitbitDeviceConnected ? 'Connected' : 'Connect your Fitbit device'}</p>
                    </div>
                    
                    <div class="device-card disabled">
                        <div class="device-icon">
                            <i class="device-icon-apple">⌚</i>
                        </div>
                        <h3>Apple Watch</h3>
                        <p>Coming soon</p>
                    </div>
    
                    <div class="device-card disabled">
                        <div class="device-icon">
                            <i class="device-icon-samsung">⌚</i>
                        </div>
                        <h3>Samsung Watch</h3>
                        <p>Coming soon</p>
                    </div>
                </div>
            </div>
        `;
    
        // Initialize click handler for Fitbit setup flow
        document.getElementById('fitbitCard').addEventListener('click', () => {
            this.selectDevice('fitbit');
        });
    }

    /**
     * Sets up event listeners for active device selection cards
     * Excludes disabled/future device options from click handling
     */
    setupDeviceCardListeners() {
        const deviceCards = document.querySelectorAll('.device-card:not(.disabled)');
        deviceCards.forEach(card => {
            card.addEventListener('click', (e) => {
                const deviceType = card.dataset.deviceType;
                if (deviceType) {
                    this.selectDevice(deviceType);
                }
            });
        });
    }

    /**
     * Handles device selection and routes to appropriate setup interface
     * Currently supports Fitbit with placeholder handling for future devices
     * 
     * @param {string} deviceType - Type of device selected ('fitbit', etc.)
     */
    selectDevice(deviceType) {
        if (deviceType === 'fitbit') {
            showSection('fitbit');
        } else {
            this.showNotification('This device type is not yet supported');
        }
    }

    /**
     * Displays temporary notification messages to the user
     * Creates a toast notification with automatic fadeout
     * 
     * @param {string} message - Message to display to user
     */
    showNotification(message) {
        // Create and setup notification element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Handle animation timing for smooth appearance and removal
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }
}

// Initialize global instance of device manager
const deviceManager = new DeviceManager();
window.deviceManager = deviceManager;