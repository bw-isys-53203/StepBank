/**
 * @fileoverview Fitbit Integration Management System
 * Handles Fitbit API authentication, token management, and device configuration.
 * Implements OAuth2 PKCE flow for secure authentication and manages token
 * refresh cycles for maintaining API access.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Fitbit integration and OAuth implementation
 */

/**
 * FitbitManager class handles all aspects of Fitbit integration including
 * OAuth2 authentication, token management, and device configuration.
 */
class FitbitManager {
    /**
     * Initializes manager with null states for all authentication
     * and configuration parameters
     */
    constructor() {
        this.clientId = null;
        this.clientSecret = null;
        this.accessToken = null;
        this.refreshToken = null;
        this.codeVerifier = null;
        this.state = null;
        this.currentUser = null;
        this.userId = null;
        this.deviceConfig = null;
    }

    /**
     * Initializes the manager with user context and loads device configuration
     * 
     * @param {Object} user - Current user object
     */
    async initialize(user) {
        this.currentUser = user;
        this.userId = user.userId
        this.deviceConfig = await db.getDeviceConfig(this.userId);
        this.renderFitbitSetupPage();
    }

    /**
     * Renders the Fitbit setup interface with API configuration form
     */
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

    /**
     * Handles form submission for Fitbit API configuration
     * Initiates OAuth2 authorization process
     * 
     * @param {Event} event - Form submission event
     */
    async handleFitbitSetup(event) {
        event.preventDefault();
        
        try {
            // Store credentials temporarily and in database
            this.clientId = document.getElementById('clientId').value;
            this.clientSecret = document.getElementById('clientSecret').value;
            localStorage.setItem('clientId', this.clientId);
            localStorage.setItem('clientSecret', this.clientSecret);
    
            await this.saveFitbitConfig(this.userId, this.clientId, this.clientSecret);
            await this.startAuthorization();
        } catch (error) {
            console.error('Error in Fitbit setup:', error);
            this.showNotification('Failed to start Fitbit authorization');
        }
    }

    /**
     * Saves Fitbit API configuration to database
     * 
     * @param {string} userId - User identifier
     * @param {string} clientId - Fitbit API client ID
     * @param {string} clientSecret - Fitbit API client secret
     */
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
    
    /**
     * Generates random string for PKCE and state parameters
     * 
     * @param {number} length - Length of string to generate
     * @returns {string} Random string of specified length
     */
    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
    
    /**
     * Generates PKCE code challenge from verifier
     * Uses SHA-256 hashing and base64url encoding
     * 
     * @param {string} verifier - PKCE verifier string
     * @returns {Promise<string>} Generated code challenge
     */
    async generateCodeChallenge(verifier) {
        const encoder = new TextEncoder();
        const data = encoder.encode(verifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        return btoa(String.fromCharCode(...new Uint8Array(digest)))
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');
    }
    
    /**
     * Initializes PKCE parameters for OAuth2 flow
     * Generates and stores verifier and state values
     * 
     * @returns {Promise<string>} Generated code challenge
     */
    async initializePKCE() {
        // Generate and store PKCE values
        this.codeVerifier = this.generateRandomString(128);
        this.state = this.generateRandomString(32);
        
        const codeChallenge = await this.generateCodeChallenge(this.codeVerifier);
        
        // Store for state verification
        localStorage.setItem('fitbitCodeVerifier', this.codeVerifier);
        localStorage.setItem('fitbitState', this.state);
    
        return codeChallenge;
    }
    
    /**
     * Starts OAuth2 authorization process
     * Redirects to Fitbit authorization page
     */
    async startAuthorization() {
        try {
            const codeChallenge = await this.initializePKCE();
            
            // Build authorization URL with required parameters
            const authUrl = new URL('https://www.fitbit.com/oauth2/authorize');
            authUrl.searchParams.append('response_type', 'code');
            authUrl.searchParams.append('client_id', localStorage.getItem('clientId'));
            authUrl.searchParams.append('code_challenge', codeChallenge);
            authUrl.searchParams.append('code_challenge_method', 'S256');
            authUrl.searchParams.append('state', this.state);
            authUrl.searchParams.append('scope', 'activity heartrate profile');
            authUrl.searchParams.append('redirect_uri', window.location.origin+'/StepBank/');
    
            window.location.href = authUrl.toString();
        } catch (error) {
            console.error('Error starting authorization:', error);
            throw error;
        }
    }
    
    /**
     * Handles OAuth2 redirect with authorization code
     * Verifies state parameter and initiates token exchange
     * 
     * @param {string} code - Authorization code from OAuth redirect
     * @param {string} state - State parameter from OAuth redirect
     */
    async handleAuthRedirect(code, state) {
        const storedState = localStorage.getItem('fitbitState');
        const storedVerifier = localStorage.getItem('fitbitCodeVerifier');
    
        // CSRF protection
        if (state !== storedState) {
            throw new Error('State mismatch. Possible CSRF attack.');
        }
    
        if (code) {
            await this.exchangeCodeForTokens(code, storedVerifier);
        }
    }
    
    /**
     * Exchanges authorization code for access and refresh tokens
     * 
     * @param {string} code - Authorization code from OAuth
     * @param {string} verifier - PKCE verifier
     * @returns {Promise<boolean>} Success status
     */
    async exchangeCodeForTokens(code, verifier) {
        try {
            const tokenUrl = 'https://api.fitbit.com/oauth2/token';
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/'
            const redirectUri = `${window.location.origin}${window.location.pathname}`;
            const clientId = localStorage.getItem('clientId');
            const clientSecret = localStorage.getItem('clientSecret');              
    
            // Prepare token request parameters
            const formData = new URLSearchParams();
            formData.append('client_id', clientId);
            formData.append('grant_type', 'authorization_code');
            formData.append('redirect_uri', redirectUri);
            formData.append('code', code);
            formData.append('code_verifier', verifier);
    
            console.log('Making token request with:', {
                url: tokenUrl,
                redirectUri,
                formData: formData.toString()
            });
    
            // Exchange code for tokens
            const response = await fetch(encodeURI(proxyUrl+tokenUrl), {
                method: 'POST',
                headers: {
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
    
    /**
     * Saves OAuth tokens to database with timestamp
     * 
     * @param {string} clientId - Fitbit API client ID
     * @param {string} clientSecret - Fitbit API client secret
     * @param {Object} tokens - OAuth tokens response
     */
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

    /**
     * Checks if current access token is expired
     * 
     * @param {string} userId - User identifier
     * @returns {Promise<boolean>} True if token is expired
     */
    async isFitbitTokenExpired(userId) {
        try {
            const deviceConfig = await db.getDeviceConfig(userId);
            
            if (!deviceConfig || !deviceConfig.lastUpdated || !deviceConfig.expiresIn) {
                return true;
            }
    
            const tokenCreationTime = deviceConfig.lastUpdated;
            const expiryTime = tokenCreationTime + (deviceConfig.expiresIn * 1000);
            const currentTime = Date.now();
    
            return currentTime >= expiryTime;
        } catch (error) {
            console.error('Error checking token expiration:', error);
            return true;
        }
    }
    
    /**
     * Refreshes expired access token using refresh token
     * 
     * @param {string} userId - User identifier
     * @param {string} refreshToken - OAuth refresh token
     * @returns {Promise<string>} New access token
     */
    async refreshFitbitToken(userId, refreshToken) {
        try {
            const tokenUrl = 'https://api.fitbit.com/oauth2/token';
            const deviceConfig = await db.getDeviceConfig(userId);
    
            // Prepare token refresh request
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
    
            // Update stored tokens
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
    
    /**
     * Gets valid access token, refreshing if necessary
     * 
     * @param {string} userId - User identifier
     * @returns {Promise<string>} Valid access token
     */
    async getFitbitAccessToken(userId) {
        try {
            const deviceConfig = await db.getDeviceConfig(userId);
            
            if (!deviceConfig) {
                throw new Error('No device configuration found');
            }
    
            // Check expiration and refresh if needed
            const isExpired = await this.isFitbitTokenExpired(userId);
    
            if (!isExpired) {
                return deviceConfig.accessToken;
            }
    
            const newAccessToken = await this.refreshFitbitToken(userId, deviceConfig.refreshToken);
            return newAccessToken;
    
        } catch (error) {
            console.error('Error getting Fitbit access token:', error);
            throw error;
        }
    }
}

// Initialize global instance of Fitbit manager
const fitbitManager = new FitbitManager();
window.fitbitManager = fitbitManager;