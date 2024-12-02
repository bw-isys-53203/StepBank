const { app, BrowserWindow } = require('electron');
const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

// Use environment variable for URL selection
const APP_URL = process.env.NODE_ENV === 'production'
    ? 'https://bw-isys-53203.github.io/StepBank/'
    : 'http://127.0.0.1:5500/newprog/StepBank/index.html';

console.log('Current NODE_ENV:', process.env.NODE_ENV);
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

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false // Note: In production, you might want to enable this
        }
    });

    setupServer();
    
    // Add delay to ensure server is ready
    setTimeout(() => {
        console.log('Loading application from:', APP_URL);
        win.loadURL(APP_URL);
        
        // Open DevTools in development
        if (process.env.NODE_ENV !== 'production') {
            win.webContents.openDevTools();
        }
    }, 1000);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
