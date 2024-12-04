// deviceManager.js
class DeviceManager {
    constructor() {
        this.currentUser = null;
        this.isFitbitDeviceConnected = false;
        this.lastSyncTime = null;
    }

    async initialize(user) {
        this.currentUser = user;
        //this.checkDeviceConnection();
        this.isFitbitDeviceConnected = 
                await db.isFitbitDeviceConnected(this.currentUser.userId);
        this.renderDeviceSelectionPage();
    }

    renderDeviceSelectionPage() {
        const container = document.getElementById('device');
        
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
    
        // Add click handler for Fitbit card
        document.getElementById('fitbitCard').addEventListener('click', () => {
            this.selectDevice('fitbit');
        });
    }

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

    selectDevice(deviceType) {
        if (deviceType === 'fitbit') {
            showSection('fitbit');
        } else {
            this.showNotification('This device type is not yet supported');
        }
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

// Initialize device manager
const deviceManager = new DeviceManager();
window.deviceManager = deviceManager;