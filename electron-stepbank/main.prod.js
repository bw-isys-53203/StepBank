/**
 * @fileoverview StepBank Electron Bridge Application (Production)
 * Production version of the Electron application that provides system tray integration
 * and smart plug control capabilities. Creates a bridge between the hosted web application
 * and local network devices through an Express server. Includes production-specific
 * configurations and security measures.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Production Electron bridge implementation
 */

const { app, BrowserWindow, Tray, Menu } = require('electron');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Global references to prevent garbage collection
let tray = null;
let mainWindow = null;

// Production environment configuration
const APP_URL = 'https://bw-isys-53203.github.io/StepBank/';
const BUILD_ENV = 'production';
console.log('Running in production mode');
console.log('Using APP_URL:', APP_URL);

/**
 * Resolves the correct path to the tray icon based on packaging state
 * Handles both development and production resource paths
 * 
 * @returns {string} Path to the tray icon
 */
function getIconPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'tray-icon.png');
    }
    return path.join(__dirname, 'tray-icon.png');
}

/**
 * Resolves the correct path to the Python smart plug control script
 * Ensures correct resource access in packaged production environment
 * 
 * @returns {string} Path to the Python script
 */
function getScriptPath() {
    if (app.isPackaged) {
        console.log('App path:', app.getAppPath());
        console.log('Resource path:', process.resourcesPath);
        return path.join(process.resourcesPath, 'plug.py');
    }
    return path.join(__dirname, 'plug.py');
}

/**
 * Sets up Express server to handle smart plug control requests
 * Creates a secure bridge between web app and Python control script
 * Production configuration with minimal logging
 */
function setupServer() {
    console.log('Setting up Express server...');
    const server = express();
    server.use(cors());
    server.use(express.json());

    // Handle device control requests from hosted web app
    server.post('/control-device', (req, res) => {
        console.log('Received control-device request:', req.body);
        const { device, action, ip } = req.body;
        const scriptPath = getScriptPath();
    
        // Execute Python script with proper path resolution
        const command = `python "${scriptPath}" ${device} ${action} --ip "${ip}"`;
        console.log('Executing command:', command);
    
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error: ${error}`);
                console.error(`stderr: ${stderr}`);
                return res.status(500).json({ 
                    error: error.message,
                    stderr: stderr
                });
            }
            console.log('Python script output:', stdout);
            res.json({ success: true, output: stdout });
        });
    });

    server.listen(3001, () => {
        console.log('Bridge server running on port 3001');
    });
}

/**
 * Creates system tray icon and context menu for production environment
 * Provides minimal interface for application control
 */
function createTray() {
    try {
        // Setup production tray icon
        const iconPath = getIconPath();
        console.log('Attempting to create tray with icon path:', iconPath);
        
        if (!fs.existsSync(iconPath)) {
            console.error('Tray icon not found at:', iconPath);
            throw new Error('Tray icon not found');
        }

        tray = new Tray(iconPath);
        console.log('Tray created successfully');

        // Create production context menu
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Show App',
                click: () => {
                    if (mainWindow) {
                        mainWindow.show();
                    }
                }
            },
            {
                label: 'Server: Running',
                enabled: false
            },
            { type: 'separator' },
            {
                label: 'Exit',
                click: () => {
                    app.isQuitting = true;
                    app.quit();
                }
            }
        ]);

        tray.setToolTip('StepBank Controller (Prod)');
        tray.setContextMenu(contextMenu);

        // Add double-click handler for window access
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
            }
        });

    } catch (error) {
        console.error('Error in createTray:', error);
        // Fallback to window if tray creation fails
        if (mainWindow) {
            mainWindow.show();
        }
    }
}

/**
 * Creates main application window for production environment
 * Loads hosted version of application with security configurations
 */
function createWindow() {
    console.log('Creating main window...');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: false,
    });

    // Load production URL with delay to ensure server readiness
    setTimeout(() => {
        console.log('Loading application from:', APP_URL);
        mainWindow.loadURL(APP_URL);
        // DevTools explicitly disabled in production
    }, 1000);

    // Minimize to tray instead of closing
    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

// Production application lifecycle events
app.on('ready', () => {
    console.log('App ready event fired');
    setupServer();
    createWindow();
    createTray();
    console.log('Initialization complete');
});

app.on('window-all-closed', () => {
    console.log('All windows closed event');
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    console.log('Activate event fired');
    if (mainWindow === null) {
        createWindow();
    }
});

app.on('before-quit', () => {
    console.log('Before quit event fired');
    app.isQuitting = true;
});

// Production error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});