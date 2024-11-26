class ElectronicsManager {
    constructor() {
        this.currentUser = null;
        this.selectedDevice = null;
        this.timeAvailable = 0; // in minutes
        this.countdownInterval = null;
        this.state = 'idle'; // idle, rampUp, active, rampDown
    }

    initialize(user) {
        this.currentUser = user;
        this.loadAvailableTime();
        this.setupEventListeners();
        this.renderElectronics();
    }

    loadAvailableTime() {
        // Use total available sparks from dashboard manager
        const totalAvailable = window.dashboardManager.calculateTotalAvailableSparks();
        this.timeAvailable = totalAvailable; // 1:1 conversion now
    }

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

    selectDevice(deviceId) {
        this.selectedDevice = deviceId;
        this.renderElectronics();
    }

    startUnlock() {
        if (!this.selectedDevice || this.timeAvailable <= 0) return;

        this.state = 'rampUp';
        const rampUpTime = 15; // 15 seconds for testing (would be 5 minutes in production)
        let timeLeft = rampUpTime;

        // Clear any existing interval
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }

        // Start ramp up countdown
        this.countdownInterval = setInterval(() => {
            if (timeLeft <= 0) {
                if (this.state === 'rampUp') {
                    // Transition to active state
                    this.state = 'active';
                    timeLeft = this.timeAvailable * 60; // Convert minutes to seconds
                    this.renderElectronics();
                } else if (this.state === 'active' && timeLeft <= 0) {
                    // Transition to ramp down
                    this.state = 'rampDown';
                    timeLeft = 15; // 15 seconds for testing
                    this.renderElectronics();
                } else if (this.state === 'rampDown' && timeLeft <= 0) {
                    // End session
                    clearInterval(this.countdownInterval);
                    this.state = 'idle';
                    this.selectedDevice = null;
                    this.renderElectronics();
                    return;
                }
            }

            this.updateCountdown(timeLeft);
            timeLeft--;
        }, 1000);

        this.renderElectronics();
    }

    // In ElectronicsManager class, update the updateCountdown method:
    updateCountdown(seconds) {
        const countdownElement = document.getElementById('countdown');
        if (!countdownElement) return;

        let display = '';
        let stateClass = '';
    
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

        // Preserve the countdown-display class and add the state class
        countdownElement.className = `countdown-display ${stateClass}`;
        countdownElement.textContent = display;
    }

    renderElectronics() {
        const container = document.getElementById('electronics');
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
                    <div class="value">${window.dashboardManager.calculateTotalAvailableSparks()}</div>
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

    renderDeviceSelection() {
        const devices = [
            { id: 'switch', name: 'Nintendo Switch' },
            { id: 'xbox', name: 'Xbox Series X' },
            { id: 'ps5', name: 'PlayStation 5' },
            { id: 'pc', name: 'Gaming PC' }
        ];

        return `
            <div class="devices-section">
                <h2>Select Device</h2>
                <div class="device-grid">
                    ${devices.map(device => `
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
        // Add this new method
    stopSession() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.state = 'idle';
        this.selectedDevice = null;
        this.renderElectronics();
    }

    // Add cleanup method
    cleanup() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        this.state = 'idle';
        this.selectedDevice = null;
    }
}

// Initialize electronics manager
const electronicsManager = new ElectronicsManager();
window.electronicsManager = electronicsManager;