// fitbit.js
class FitbitManager {
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.codeVerifier = null;
        this.state = null;
        this.currentUser = null;
        this.userId = null;
        this.deviceConfig  = null;
    }

    async initialize(user) {
        console.log("In initialize user:: ", user)
        this.currentUser = user;
        this.userId = user.userId
        this.deviceConfig = await db.getDeviceConfig(this.userId);
        this.renderFitbitSetupPage();
    }

    renderFitbitSetupPage() {
        const container = document.getElementById('fitbit');
        
        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <div class="logo-icon"></div>
                    <span>Fitbit Configuration</span>
                </div>
                <button class="btn" onclick="showSection('device')">Back</button>
            </nav>

            <div class="device-setup-container">
                <div class="device-form-card">
                    <h2>Fitbit API Configuration</h2>
                    <form id="fitbitSetupForm" onsubmit="fitbitManager.handleFitbitSetup(event)">
                        <div class="form-group">
                            <label for="clientId">Client ID</label>
                            <input type="text" id="clientId" required>
                            <small class="help-text">Found in your Fitbit Developer Console</small>
                        </div>

                        <div class="form-group">
                            <label for="clientSecret">Client Secret</label>
                            <input type="password" id="clientSecret" required>
                            <small class="help-text">Found in your Fitbit Developer Console</small>
                        </div>

                        <button type="submit" class="btn submit-btn">Connect Fitbit</button>
                    </form>
                </div>

                <div class="device-instructions">
                    <h3>How to Get Your Fitbit Credentials</h3>
                    <ol>
                        <li>Visit the <a href="https://dev.fitbit.com/apps" target="_blank">Fitbit Developer Portal</a></li>
                        <li>Log in with your Fitbit account</li>
                        <li>Register a new application</li>
                        <li>Copy the Client ID and Client Secret</li>
                    </ol>
                </div>
            </div>
        `;
    }

    async handleFitbitSetup(event) {
        event.preventDefault();
        
        try {
            this.clientId = document.getElementById('clientId').value;
            this.clientSecret = document.getElementById('clientSecret').value;
            localStorage.setItem('clientId', this.clientId);
            localStorage.setItem('clientSecret', this.clientSecret);
    
            // Save clientId and clientSecret to the database
            await this.saveFitbitConfig(this.userId, this.clientId, this.clientSecret);
        
            // Start the authorization process
            await this.startAuthorization();
        } catch (error) {
            console.error('Error in Fitbit setup:', error);
            this.showNotification('Failed to start Fitbit authorization');
        }
    }

    async saveFitbitConfig(userId, clientId, clientSecret) {
        try {
            await db.saveDeviceConfig(userId, {
                clientId: clientId,
                clientSecret: clientSecret            
            });
        } catch (error) {
            console.error('Error saving Fitbit config:', error);
            throw error;
        }
    }
    
        // Generate a random string for PKCE and state
        generateRandomString(length) {
            const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
            let text = '';
            for (let i = 0; i < length; i++) {
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            }
            return text;
        }
    
        // Generate code challenge from verifier
        async generateCodeChallenge(verifier) {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            return btoa(String.fromCharCode(...new Uint8Array(digest)))
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        }
    
        // Step 1: Initialize PKCE values
        async initializePKCE() {
            // Generate and store PKCE values
            this.codeVerifier = this.generateRandomString(128);
            this.state = this.generateRandomString(32);
            
            // Generate code challenge
            const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
            
            // Store values in localStorage for state management
            localStorage.setItem('fitbitCodeVerifier', this.codeVerifier);
            localStorage.setItem('fitbitState', this.state);
    
            return codeChallenge;
        }
    
        // Step 2: Start Authorization
        async startAuthorization() {
            try {
                const codeChallenge = await this.initializePKCE();
                
                const authUrl = new URL('https://www.fitbit.com/oauth2/authorize');
                authUrl.searchParams.append('response_type', 'code');
                authUrl.searchParams.append('client_id', localStorage.getItem('clientId'));
                authUrl.searchParams.append('code_challenge', codeChallenge);
                authUrl.searchParams.append('code_challenge_method', 'S256');
                authUrl.searchParams.append('state', this.state);
                authUrl.searchParams.append('scope', 'activity heartrate profile');
                authUrl.searchParams.append('redirect_uri', window.location.origin+'/StepBank/');
    
                // Redirect to Fitbit authorization page
                window.location.href = authUrl.toString();
            } catch (error) {
                console.error('Error starting authorization:', error);
                throw error;
            }
        }
    
        // Step 3: Handle redirect and token exchange
        async handleAuthRedirect(code, state) {
            const storedState = localStorage.getItem('fitbitState');
            const storedVerifier = localStorage.getItem('fitbitCodeVerifier');
    
            // Verify state matches to prevent CSRF attacks
            if (state !== storedState) {
                throw new Error('State mismatch. Possible CSRF attack.');
            }
    
            if (code) {
                await this.exchangeCodeForTokens(code, storedVerifier);
            }
        }
    
        // Step 4: Exchange code for tokens
        async exchangeCodeForTokens(code, verifier) {
            try {
                const tokenUrl = 'https://api.fitbit.com/oauth2/token';
                const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
                const redirectUri = `${window.location.origin}${window.location.pathname}`;
                const clientId = localStorage.getItem('clientId');
                const clientSecret = localStorage.getItem('clientSecret');              
        
                const formData = new URLSearchParams();
                formData.append('client_id', clientId);
                formData.append('grant_type', 'authorization_code');
                formData.append('redirect_uri', redirectUri);
                formData.append('code', code);
                formData.append('code_verifier', verifier);
        
                //const authHeader = 'Basic ' + btoa(`${this.clientId}:${this.clientSecret}`);
        
                console.log('Making token request with:', {
                    url: tokenUrl,
                    redirectUri,
                    formData: formData.toString()
                });
        
                const response = await fetch(encodeURI(proxyUrl+tokenUrl), {
                    method: 'POST',
                    headers: {
                        //'Authorization': authHeader,
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Origin': window.location.origin,
                        'Access-Control-Allow-Origin': '*'
                    },
                    body: formData
                });
        
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Token exchange error:', {
                        status: response.status,
                        statusText: response.statusText,
                        error: errorText
                    });
                    throw new Error(`Token exchange failed: ${response.status}`);
                }
        
                const tokens = await response.json();
                console.log('Token exchange successful');
                
                this.accessToken = tokens.access_token;
                this.refreshToken = tokens.refresh_token;
        
                await this.saveTokens(clientId, clientSecret, tokens);
                return true;
            } catch (error) {
                console.error('Error in token exchange:', error);
                throw error;
            }
        }
    
        // Save tokens to database
        async saveTokens(clientId, clientSecret, tokens) {
            try {
                await db.saveDeviceConfig(window.authManager.currentUser.userId, {
                    deviceType: 'fitbit',
                    clientId: clientId,
                    clientSecret: clientSecret,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresIn: tokens.expires_in,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
            } catch (error) {
                console.error('Error saving tokens:', error);
                throw error;
            }
        }

        async isFitbitTokenExpired(userId) {
            try {
                console.log("isFitbitTokenExpired");
                const deviceConfig = await db.getDeviceConfig(userId);
                console.log("deviceConfig:: ", deviceConfig);
                
                if (!deviceConfig || !deviceConfig.lastUpdated || !deviceConfig.expiresIn) {
                    console.log("isFitbitTokenExpired expired");
                    return true;
                }
        
                const tokenCreationTime = deviceConfig.lastUpdated;
                const expiryTime = tokenCreationTime + (deviceConfig.expiresIn * 1000); // Convert expiresIn to milliseconds
                const currentTime = Date.now();
        
                return currentTime >= expiryTime;
            } catch (error) {
                console.error('Error checking token expiration:', error);
                return true;
            }
        }
        
        async refreshFitbitToken(userId, refreshToken) {
            try {
                const tokenUrl = 'https://api.fitbit.com/oauth2/token';
                const deviceConfig = await db.getDeviceConfig(userId);
        
                const formData = new URLSearchParams();
                formData.append('grant_type', 'refresh_token');
                formData.append('refresh_token', refreshToken);
                formData.append('client_id', deviceConfig.clientId);
        
                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Basic ' + btoa(`${deviceConfig.clientId}:${deviceConfig.clientSecret}`)
                    },
                    body: formData
                });
        
                if (!response.ok) {
                    throw new Error('Token refresh failed');
                }
        
                const tokens = await response.json();
        
                // Save new tokens to database
                await db.saveDeviceConfig(userId, {
                    ...deviceConfig,
                    accessToken: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    expiresIn: tokens.expires_in,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
        
                return tokens.access_token;
            } catch (error) {
                console.error('Error refreshing token:', error);
                throw error;
            }
        }
        
        async getFitbitAccessToken(userId) {
            try {
                console.log("getFitbitAccessToken");
                const deviceConfig = await db.getDeviceConfig(userId);
                
                if (!deviceConfig) {
                    throw new Error('No device configuration found');
                }
        
                // Check if token is expired
                const isExpired = await this.isFitbitTokenExpired(userId);
        
                if (!isExpired) {
                    console.log("Device Config not expired");
                    console.log("getFitbitAccessToken deviceConig ::", deviceConfig);
                    console.log("getFitbitAccessToken deviceConig accessToken ::", deviceConfig.accessToken);
                    return deviceConfig.accessToken;
                }
        
                console.log("Device Config expired");
                // If token is expired, refresh it
                const newAccessToken = await this.refreshFitbitToken(userId, deviceConfig.refreshToken);
                return newAccessToken;
        
            } catch (error) {
                console.error('Error getting Fitbit access token:', error);
                throw error;
            }
        }

}

// Initialize Fitbit manager
const fitbitManager = new FitbitManager();
window.fitbitManager = fitbitManager;