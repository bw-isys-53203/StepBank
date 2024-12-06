/**
 * @fileoverview Electronics Access Control System
 * Manages access to gaming consoles and electronic devices through smart plug integration.
 * Handles device selection, time tracking, power control, and session management with
 * proper ramp up/down sequences for safe device operation.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Electronics control and time management implementation
 */

/**
 * ElectronicsManager class handles all electronic device access control including
 * device selection, time management, and power control through smart plugs.
 */
class ElectronicsManager {
    /**
     * Initializes manager with default state for tracking sessions and timing.
     * Sets up tracking for user context, device selection, and timing states.
     */
    constructor() {
        this.currentUser = null;
        this.selectedDevice = null;
        this.timeAvailable = 0; // in minutes
        this.countdownInterval = null;
        this.state = 'idle'; // idle, rampUp, active, rampDown
        this.sessionStartTime = null; // Track when active session starts
        this.timeUsed = 0; // Track time used in current session (minutes)
        this.hasUsedTime = false; // Track if time has been used in current session
    }

    /**
     * Initializes the manager with user context and sets up necessary data
     * 
     * @param {Object} user - Current user object
     */
    initialize(user) {
        this.currentUser = user;
        this.loadAvailableTime();
        this.setupEventListeners();
        this.renderElectronics();
    }

    /**
     * Loads available time based on user's spark balance
     * Converts sparks to minutes using 100:1 ratio
     */
    loadAvailableTime() {
        const totalAvailable = window.dashboardManager.calculateTotalAvailableSparks();
        this.timeAvailable = Math.ceil(totalAvailable / 100); // 100:1 conversion now
    }

    /**
     * Displays temporary notification messages to the user
     * 
     * @param {string} message - Message to display
     */
    showNotification(message) {
        // Create and setup notification element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        // Handle animation timing for appearance and removal
        setTimeout(() => toast.classList.add('visible'), 10);
        setTimeout(() => {
            toast.classList.remove('visible');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    }

    /**
     * Sets up event listeners for device selection and control
     */
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.device-option')) {
                this.selectDevice(e.target.dataset.device);
            }
            if (e.target.matches('.unlock-btn')) {
                this.startUnlock();
            }
        });
    }

    /**
     * Controls smart plug power state for selected device
     * 
     * @param {string} deviceId - Device identifier
     * @param {string} action - Control action ('on' or 'off')
     * @returns {Promise<boolean>} Success status of control operation
     */
    async controlPlug(deviceId, action) {
        try {
            // Verify device configuration
            const config = window.deviceConfigManager.getDeviceConfig(deviceId);
            if (!config || !config.enabled || !config.ip) {
                throw new Error('Device not configured or disabled');
            }
    
            // Send control request to smart plug
            const response = await fetch('http://localhost:3001/control-device', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    device: deviceId,
                    ip: config.ip,
                    action: action
                })
            });
    
            if (!response.ok) {
                throw new Error('Failed to control device');
            }
    
            const result = await response.json();
            return result.success;
        } catch (error) {
            console.error('Error controlling plug:', error);
            this.showNotification('Error controlling device. Please try again.');
            return false;
        }
    }

    /**
     * Updates selected device and refreshes display
     * 
     * @param {string} deviceId - Device identifier
     */
    selectDevice(deviceId) {
        this.selectedDevice = deviceId;
        this.renderElectronics();
    }

    /**
     * Initiates device unlock sequence including ramp-up period
     * Handles power control and session timing
     */
    async startUnlock() {
        if (!this.selectedDevice || this.timeAvailable <= 0) return;
    
        try {
            // Attempt to power on device
            const plugSuccess = await this.controlPlug(this.selectedDevice, 'on');
            if (!plugSuccess) {
                this.showNotification('Failed to turn on device. Please try again.');
                return;
            }
    
            // Initialize ramp-up sequence
            this.state = 'rampUp';
            const rampUpTime = 15; // 15 seconds for testing
            let timeLeft = rampUpTime;
    
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
            }
    
            // Start countdown sequence
            this.countdownInterval = setInterval(() => {
                if (timeLeft <= 0) {
                    if (this.state === 'rampUp') {
                        // Transition to active state
                        this.state = 'active';
                        this.sessionStartTime = Date.now();
                        timeLeft = this.timeAvailable * 60;
                        this.renderElectronics();
                    } else if (this.state === 'active' && timeLeft <= 0) {
                        // Time's up - start ramp down
                        this.updateTimeUsed();
                        this.state = 'rampDown';
                        timeLeft = 15;
                        this.renderElectronics();
                    } else if (this.state === 'rampDown' && timeLeft <= 0) {
                        this.endSession();
                        return;
                    }
                }
    
                this.updateCountdown(timeLeft);
                timeLeft--;
            }, 1000);
    
            this.renderElectronics();
        } catch (error) {
            console.error('Error during unlock process:', error);
            this.showNotification('Error controlling device. Please try again.');
            this.state = 'idle';
            this.renderElectronics();
        }
    }

    /**
     * Updates time used in current session
     */
    updateTimeUsed() {
        if (this.sessionStartTime && this.state === 'active') {
            const timeUsedMs = Date.now() - this.sessionStartTime;
            this.timeUsed = Math.ceil(timeUsedMs / (1000 * 60)); // Convert ms to minutes and round up
        }
    }

    /**
     * Ends current session and updates time tracking
     */
    async endSession() {
        this.updateTimeUsed();
        
        // Update available time and usage flag
        this.timeAvailable = Math.max(0, this.timeAvailable - this.timeUsed);
        this.hasUsedTime = true;
        
        // Power off device and reset session state
        await this.controlPlug(this.selectedDevice, 'off');
        
        clearInterval(this.countdownInterval);
        this.state = 'idle';
        this.selectedDevice = null;
        this.sessionStartTime = null;
        this.timeUsed = 0;
        
        this.renderElectronics();
    }

    /**
     * Updates countdown display based on current state
     * 
     * @param {number} seconds - Seconds remaining in current state
     */
    updateCountdown(seconds) {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        let display = '';
        let stateClass = '';
    
        // Set display text and style based on current state
        switch (this.state) {
            case 'rampUp':
                display = 'Time to Turn On Console';
                stateClass = 'countdown-transition';
                break;
            case 'active':
                const minutes = Math.floor(seconds / 60);
                const remainingSeconds = seconds % 60;
                display = `Time Until Zero: ${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
                stateClass = 'countdown-active';
                break;
            case 'rampDown':
                display = 'Time to Turn Off Console';
                stateClass = 'countdown-transition';
                break;
        }

        countdownElement.className = `countdown-display ${stateClass}`;
        countdownElement.textContent = display;
    }

    /**
     * Renders main electronics interface including time conversion display
     */
    renderElectronics() {
        const container = document.getElementById('electronics');
        const sparksValue = this.hasUsedTime ? 
            (this.timeAvailable * 100) : 
            window.dashboardManager.calculateTotalAvailableSparks();

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Electronics Access</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="conversion-display">
                <div class="currency-circle">
                    <div class="value">${sparksValue}</div>
                    <div class="label">SPARKS</div>
                </div>
                <div class="equals-sign">=</div>
                <div class="time-circle">
                    <div class="value">${this.timeAvailable}</div>
                    <div class="label">MINUTES</div>
                </div>
            </div>

            ${this.state === 'idle' ? this.renderDeviceSelection() : this.renderCountdown()}
        `;
    }

    /**
     * Renders device selection interface with enabled devices
     * 
     * @returns {string} HTML string for device selection
     */
    renderDeviceSelection() {
        const configs = window.deviceConfigManager.getAllConfigs();
        
        // Filter for enabled devices only
        const enabledDevices = Object.entries(configs)
            .filter(([_, config]) => config.enabled)
            .map(([id, config]) => ({
                id: id,
                name: config.name
            }));
    
        if (enabledDevices.length === 0) {
            return `
                <div class="devices-section">
                    <h2>Select Device</h2>
                    <div class="no-devices-message">
                        No devices are currently enabled. Please contact a parent to enable devices.
                    </div>
                </div>
            `;
        }
    
        return `
            <div class="devices-section">
                <h2>Select Device</h2>
                <div class="device-grid">
                    ${enabledDevices.map(device => `
                        <button class="device-option ${this.selectedDevice === device.id ? 'selected' : ''}"
                                data-device="${device.id}">
                            ${device.name}
                        </button>
                    `).join('')}
                </div>
                <button class="btn unlock-btn ${!this.selectedDevice ? 'disabled' : ''}"
                        ${!this.selectedDevice ? 'disabled' : ''}>
                    Unlock Selected Device
                </button>
            </div>
        `;
    }

    /**
     * Renders countdown interface for active sessions
     * 
     * @returns {string} HTML string for countdown display
     */
    renderCountdown() {
        return `
            <div class="countdown-section">
                <div id="countdown" class="countdown-display"></div>
                ${this.state === 'active' ? `
                    <button class="btn stop-btn" onclick="electronicsManager.stopSession()">
                        Stop Using Screen Time
                    </button>
                ` : ''}
            </div>
        `;
    }

    /**
     * Initiates manual session stop with ramp-down sequence
     */
    async stopSession() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
    
        this.updateTimeUsed();
        
        // Start ramp-down sequence
        this.state = 'rampDown';
        const rampDownTime = 15;
        let timeLeft = rampDownTime;
    
        const rampDownInterval = setInterval(() => {
            if (timeLeft <= 0) {
                clearInterval(rampDownInterval);
                this.endSession();
            }
            this.updateCountdown(timeLeft);
            timeLeft--;
        }, 1000);
    }

    /**
     * Performs cleanup when navigating away from electronics section
     * Ensures proper session closure and state reset
     */
    cleanup() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.state === 'active') {
            this.updateTimeUsed();
            this.endSession();
        }
        this.state = 'idle';
        this.selectedDevice = null;
        this.sessionStartTime = null;
        this.timeUsed = 0;
    }
}

// Initialize global instance of electronics manager
const electronicsManager = new ElectronicsManager();
window.electronicsManager = electronicsManager;