// deviceConfig.js
class DeviceConfigManager {
    constructor() {
        this.STORAGE_KEY = 'device_configurations';
        this.configs = this.loadConfigs();
    }

    loadConfigs() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) {
            // Default configurations
            return {
                ps5: { name: 'PlayStation 5', ip: '192.168.1.144', enabled: true },
                xbox: { name: 'Xbox Series X', ip: '', enabled: false },
                switch: { name: 'Nintendo Switch', ip: '', enabled: false },
                pc: { name: 'Gaming PC', ip: '', enabled: false }
            };
        }
        return JSON.parse(stored);
    }

    saveConfigs() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.configs));
    }

    updateDeviceConfig(deviceId, config) {
        this.configs[deviceId] = {
            ...this.configs[deviceId],
            ...config
        };
        this.saveConfigs();
    }

    getDeviceConfig(deviceId) {
        return this.configs[deviceId] || null;
    }

    getAllConfigs() {
        return this.configs;
    }

    renderConfigurationPanel(container) {
        container.innerHTML = `
            <div class="settings-section">
                <h2>Device Configurations</h2>
                <div class="device-config-grid">
                    ${Object.entries(this.configs).map(([deviceId, config]) => `
                        <div class="device-config-card">
                            <h3>${config.name}</h3>
                            <div class="form-group">
                                <label>IP Address:</label>
                                <input type="text" 
                                    class="config-input" 
                                    id="${deviceId}-ip"
                                    value="${config.ip}"
                                    placeholder="e.g., 192.168.1.100">
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                        id="${deviceId}-enabled"
                                        ${config.enabled ? 'checked' : ''}>
                                    Device Enabled
                                </label>
                            </div>
                            <button class="btn save-config-btn" 
                                onclick="deviceConfigManager.saveDeviceConfig('${deviceId}')">
                                Save Changes
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    saveDeviceConfig(deviceId) {
        const ipInput = document.getElementById(`${deviceId}-ip`);
        const enabledInput = document.getElementById(`${deviceId}-enabled`);
        
        if (!ipInput) return;

        const ip = ipInput.value.trim();
        if (ip && !this.isValidIP(ip)) {
            this.showNotification('Please enter a valid IP address');
            return;
        }

        this.updateDeviceConfig(deviceId, {
            ip: ip,
            enabled: enabledInput.checked
        });

        this.showNotification('Device configuration saved');
    }

    isValidIP(ip) {
        const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return pattern.test(ip);
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
const deviceConfigManager = new DeviceConfigManager();
window.deviceConfigManager = deviceConfigManager;