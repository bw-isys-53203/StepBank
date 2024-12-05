/**
 * @fileoverview Device Configuration Management System
 * Manages the configuration and settings for various gaming devices including 
 * IP addresses, enabled states, and user preferences. Provides interfaces for
 * saving, loading, and updating device configurations with proper validation
 * and persistent storage.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Device configuration and management system implementation
 */

/**
 * DeviceConfigManager class handles all device configuration operations including
 * storage, validation, and UI rendering for device settings.
 */
class DeviceConfigManager {
    /**
     * Initializes a new DeviceConfigManager instance and loads existing configurations.
     * Sets up storage key and loads any previously saved device configurations.
     */
    constructor() {
        this.STORAGE_KEY = 'device_configurations';
        this.configs = this.loadConfigs();
    }

    /**
     * Loads device configurations from local storage or returns default configurations
     * if none exist. Provides initial setup for supported gaming devices with
     * default values.
     * 
     * @returns {Object} Device configurations object
     */
    loadConfigs() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (!stored) {
            // Initialize default configurations for supported gaming devices
            return {
                ps5: { name: 'PlayStation 5', ip: '192.168.1.144', enabled: true },
                xbox: { name: 'Xbox Series X', ip: '', enabled: false },
                switch: { name: 'Nintendo Switch', ip: '', enabled: false },
                pc: { name: 'Gaming PC', ip: '', enabled: false }
            };
        }
        return JSON.parse(stored);
    }

    /**
     * Persists current device configurations to local storage
     */
    saveConfigs() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.configs));
    }

    /**
     * Updates configuration for a specific device and saves changes
     * 
     * @param {string} deviceId - Identifier for the device to update
     * @param {Object} config - New configuration parameters
     */
    updateDeviceConfig(deviceId, config) {
        // Merge existing config with new config while maintaining other properties
        this.configs[deviceId] = {
            ...this.configs[deviceId],
            ...config
        };
        this.saveConfigs();
    }

    /**
     * Retrieves configuration for a specific device
     * 
     * @param {string} deviceId - Identifier for the device
     * @returns {Object|null} Device configuration or null if not found
     */
    getDeviceConfig(deviceId) {
        return this.configs[deviceId] || null;
    }

    /**
     * Retrieves all device configurations
     * 
     * @returns {Object} Complete device configurations object
     */
    getAllConfigs() {
        return this.configs;
    }

    /**
     * Renders the device configuration interface with input fields and controls
     * for each configured device. Displays IP address inputs and enabled toggles.
     * 
     * @param {HTMLElement} container - Container element for the configuration panel
     */
    renderConfigurationPanel(container) {
        // Generate configuration interface with cards for each device
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

    /**
     * Saves configuration changes for a specific device after validation.
     * Checks IP address format and updates storage if valid.
     * 
     * @param {string} deviceId - Identifier for the device being configured
     */
    saveDeviceConfig(deviceId) {
        const ipInput = document.getElementById(`${deviceId}-ip`);
        const enabledInput = document.getElementById(`${deviceId}-enabled`);
        
        if (!ipInput) return;

        // Validate IP address format before saving
        const ip = ipInput.value.trim();
        if (ip && !this.isValidIP(ip)) {
            this.showNotification('Please enter a valid IP address');
            return;
        }

        // Update configuration with new values
        this.updateDeviceConfig(deviceId, {
            ip: ip,
            enabled: enabledInput.checked
        });

        this.showNotification('Device configuration saved');
    }

    /**
     * Validates IP address format using regex pattern
     * Ensures IP address follows standard IPv4 format (xxx.xxx.xxx.xxx)
     * 
     * @param {string} ip - IP address to validate
     * @returns {boolean} True if IP address is valid
     */
    isValidIP(ip) {
        const pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        return pattern.test(ip);
    }

    /**
     * Displays a temporary notification message to the user
     * Creates a toast notification that automatically fades out
     * 
     * @param {string} message - Message to display in the notification
     */
    showNotification(message) {
        // Create and append notification element
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
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

// Initialize global instance of device configuration manager
const deviceConfigManager = new DeviceConfigManager();
window.deviceConfigManager = deviceConfigManager;