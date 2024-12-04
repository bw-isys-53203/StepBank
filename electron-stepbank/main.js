const { app, BrowserWindow, Tray, Menu } = require('electron');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

let tray = null;
let mainWindow = null;

// Function to get the correct icon path
function getIconPath() {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'tray-icon.png');
    }
    return path.join(__dirname, 'tray-icon.png');
}

// Environment detection with more robust fallback
let BUILD_ENV = 'development';

// First try reading from .env file
try {
    const envPath = path.join(process.resourcesPath, '.env');
    console.log('Checking for .env at:', envPath);
    
    if (fs.existsSync(envPath)) {
        BUILD_ENV = fs.readFileSync(envPath, 'utf8').trim();
        console.log('Found .env file, BUILD_ENV set to:', BUILD_ENV);
    }
} catch (error) {
    console.error('Error reading .env file:', error);
}

// Then check NODE_ENV environment variable
if (process.env.NODE_ENV) {
    BUILD_ENV = process.env.NODE_ENV;
    console.log('Using NODE_ENV value:', BUILD_ENV);
}

// Finally, check if we're packaged (additional production check)
if (app.isPackaged) {
    console.log('App is packaged, forcing production environment');
    BUILD_ENV = 'production';
}

console.log('Final BUILD_ENV:', BUILD_ENV);

// Set the URL based on environment
const APP_URL = BUILD_ENV === 'production'
    ? 'https://bw-isys-53203.github.io/StepBank/'
    : 'http://127.0.0.1:5500/newprog/StepBank/index.html';

console.log('Using APP_URL:', APP_URL);

function getScriptPath() {
    if (app.isPackaged) {
        console.log('App path:', app.getAppPath());
        console.log('Resource path:', process.resourcesPath);
        return path.join(process.resourcesPath, 'plug.py');
    }
    return path.join(__dirname, 'plug.py');
}

function setupServer() {
    console.log('Setting up Express server...');
    const server = express();
    server.use(cors());
    server.use(express.json());

    server.post('/control-device', (req, res) => {
        console.log('Received control-device request:', req.body);
        const { device, action, ip } = req.body;
        const scriptPath = getScriptPath();
    
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

function createTray() {
    try {
        const iconPath = getIconPath();
        console.log('Attempting to create tray with icon path:', iconPath);
        
        if (!fs.existsSync(iconPath)) {
            console.error('Tray icon not found at:', iconPath);
            throw new Error('Tray icon not found');
        }

        tray = new Tray(iconPath);
        console.log('Tray created successfully');

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

        tray.setToolTip('StepBank Controller');
        tray.setContextMenu(contextMenu);

        // Optional: Double-click on tray icon to show window
        tray.on('double-click', () => {
            if (mainWindow) {
                mainWindow.show();
            }
        });

    } catch (error) {
        console.error('Error in createTray:', error);
        // Create window as fallback if tray creation fails
        if (mainWindow) {
            mainWindow.show();
        }
    }
}

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

    setTimeout(() => {
        console.log('Loading application from:', APP_URL);
        mainWindow.loadURL(APP_URL);
        
        if (BUILD_ENV !== 'production') {
            mainWindow.webContents.openDevTools();
        }
    }, 1000);

    mainWindow.on('close', (event) => {
        if (!app.isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });
}

// Initialize everything
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

// Add error handling
process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

