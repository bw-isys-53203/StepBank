/**
 * @fileoverview Authentication Management System
 * Handles all user authentication operations including login, registration,
 * and session management for both parent and child accounts. Manages credential
 * validation, token-based registration, and secure storage of user sessions.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Authentication system implementation
 */

/**
 * AuthManager class handles all authentication-related operations including
 * user registration, login, session management, and authentication state.
 */
class AuthManager {
    /**
     * Initializes the authentication manager and sets up event listeners.
     * Creates initial state with no logged-in user and sets up temporary
     * test accounts for development.
     */
    constructor() {
        this.currentUser = null;
        this.initializeListeners();
        
        // Temporary hardcoded users for testing and development
        this.hardcodedUsers = {
            'Tommy': { password: '123456', id: 'child1', isParent: false },
            'Sarah': { password: '123456', id: 'child2', isParent: false }, 
            'Parent': { password: '123456', id: 'parent1', isParent: true }
        };
    }
 
    /**
     * Sets up event listeners for authentication interface elements
     * Primarily handles tab switching between login and registration
     */
    initializeListeners() {
        // Initialize tab switching functionality
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });
    }
 
    /**
     * Handles switching between authentication interface tabs
     * Updates active states and shows corresponding form
     * 
     * @param {HTMLElement} tab - The tab element being switched to
     */
    switchTab(tab) {
        // Update visual state of tabs
        document.querySelectorAll('.auth-tab').forEach(t => 
            t.classList.remove('active')
        );
        tab.classList.add('active');
 
        // Show selected form and hide others
        const formId = tab.dataset.tab + 'Form';
        document.querySelectorAll('.auth-form').forEach(form => 
            form.classList.add('hidden')
        );
        document.getElementById(formId).classList.remove('hidden');
    }
 
    /**
     * Handles user login attempts by validating credentials against Firebase
     * Authenticates users and establishes their session if successful
     * 
     * @param {string} username - User's username
     * @param {string} password - User's password
     */
    async handleLogin(username, password) {
        try {
            // Retrieve all users from Firebase for authentication
            const users = await db.getUsers();
     
            if (!users) {
                this.showError('loginForm', 'Invalid credentials');
                return;
            }
     
            // Find user with matching username
            const user = Object.entries(users).find(([id, userData]) => 
                userData.username === username
            );
     
            if (!user) {
                this.showError('loginForm', 'Invalid credentials');
                return;
            }
     
            const [userId, userData] = user;
     
            // Validate password using hash comparison
            const hashedPassword = this.hashPassword(password);
            if (hashedPassword !== userData.passwordHash) {
                this.showError('loginForm', 'Invalid credentials');
                return;
            }
     
            // Setup user session with essential data
            this.currentUser = {
                userId,
                username: userData.username,
                accountType: userData.accountType,
                parentId: userData.parentId // Only exists for child accounts
            };
     
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            showSection('dashboard');
     
            console.log('Login successful!');
        } catch (error) {
            console.error('Login error:', error);
            this.showError('loginForm', 'Login failed. Please try again.');
        }
     }

    /**
     * Handles visibility of registration token field based on account type
     * Shows token field only for child account registration
     */
    handleAccountTypeChange() {
        const accountType = document.getElementById('accountType').value;
        const tokenGroup = document.getElementById('tokenGroup');
        
        if (accountType === 'child') {
            tokenGroup.style.display = 'block';
        } else {
            tokenGroup.style.display = 'none';
        }
    }

    /**
     * Handles user registration process for both parent and child accounts
     * Routes to appropriate registration handler based on account type
     * 
     * @param {string} username - Desired username
     * @param {string} password - Desired password
     */
    async handleRegister(username, password) {
        if (!this.validateCredentials(username, password)) {
            return;
        }
        const accountType = document.getElementById('accountType').value;
        if (accountType === 'child') {
            const token = document.getElementById('registrationToken').value;
            await this.handleChildRegistration(username, password, token);
        } else {
            await this.handleParentRegistration(username, password);
        }
    }

    /**
     * Handles parent account registration process
     * Creates new parent user record in Firebase
     * 
     * @param {string} username - Desired username
     * @param {string} password - Desired password
     */
    async handleParentRegistration(username, password) {
        try {
            const passwordHash = this.hashPassword(password);
            
            // Setup parent user data structure
            const userData = {
                userId: 'user_' + Math.random().toString(36).substr(2, 9),
                username,
                passwordHash,
                accountType: 'parent',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
    
            // Persist to Firebase and establish session
            await db.set(`users/${userData.userId}`, userData);
            
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            showSection('dashboard');
    
            console.log('Parent registered successfully!');
        } catch (error) {
            console.error('Parent registration error:', error);
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }

    /**
     * Handles child account registration using parent-provided token
     * Validates token and links child account to parent
     * 
     * @param {string} username - Desired username
     * @param {string} password - Desired password
     * @param {string} token - Registration token from parent
     */
    async handleChildRegistration(username, password, token) {
        try {
            // Validate token and find parent
            const parent = await db.getParentByToken(token);
            
            if (!parent) {
                this.showError('registerForm', 'Invalid registration token.');
                return;
            }
    
            // Find child record matching token
            let childId;
            let childData;
            
            for (const [id, child] of Object.entries(parent.children || {})) {
                if (child.registrationToken === token) {
                    childId = id;
                    childData = child;
                    break;
                }
            }
    
            // Validate child record and token status
            if (!childData) {
                this.showError('registerForm', 'Invalid registration token.');
                return;
            }
    
            if (childData.isRegistered) {
                this.showError('registerForm', 'This token has already been used.');
                return;
            }
    
            const passwordHash = this.hashPassword(password);
    
            // Create child user record
            const userData = {
                userId: childId,
                username,
                passwordHash,
                accountType: 'child',
                parentId: parent.userId,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
    
            // Update database and establish session
            await db.set(`users/${childId}`, userData);
            await db.set(`users/${parent.userId}/children/${childId}/isRegistered`, true);
    
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    
            showSection('dashboard');
    
            console.log('Child registered successfully!');
        } catch (error) {
            console.error('Child registration error:', error);
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }

    /**
     * Creates a simple hash of the password for storage
     * Note: This is a basic implementation and should be enhanced for production
     * 
     * @param {string} password - Password to hash
     * @returns {string} Hashed password
     */
    hashPassword(password) {
        return btoa(password);
    }
 
    /**
     * Validates username and password meet minimum requirements
     * 
     * @param {string} username - Username to validate
     * @param {string} password - Password to validate
     * @returns {boolean} True if credentials are valid
     */
    validateCredentials(username, password) {
        if (!username || username.length < 3) {
            this.showError('loginForm', 'Username must be at least 3 characters.');
            return false;
        }
 
        if (!password || password.length < 6) {
            this.showError('loginForm', 'Password must be at least 6 characters.');
            return false;
        }
 
        return true;
    }
 
    /**
     * Displays error message to user with automatic timeout
     * Creates or updates error message element within specified form
     * 
     * @param {string} formId - ID of form to show error in
     * @param {string} message - Error message to display
     */
    showError(formId, message) {
        const form = document.getElementById(formId);
        let errorDiv = form.querySelector('.auth-error');
        
        // Create error element if it doesn't exist
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error';
            form.appendChild(errorDiv);
        }
 
        // Show error with automatic timeout
        errorDiv.textContent = message;
        errorDiv.classList.add('visible');
 
        setTimeout(() => {
            errorDiv.classList.remove('visible');
        }, 3000);
    }
 
    /**
     * Handles user logout by clearing session data and resetting forms
     */
    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        showSection('authSection');
        
        // Reset all form fields
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('accountType').value = '';
    }
 
    /**
     * Checks for existing authentication state on page load
     * Restores user session if valid data exists in storage
     */
    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            showSection('dashboard');
        }
    }
 
    /**
     * Returns current user object if logged in
     * @returns {Object|null} Current user data or null if not logged in
     */
    getCurrentUser() {
        return this.currentUser;
    }
 
    /**
     * Checks if a user is currently logged in
     * @returns {boolean} True if user is logged in
     */
    isLoggedIn() {
        return this.currentUser !== null;
    }
 
    /**
     * Checks if current user has parent privileges
     * @returns {boolean} True if current user is a parent
     */
    isParent() {
        return this.currentUser?.isParent || false;
    }
 }
 
 // Initialize global instance of authentication manager
 const authManager = new AuthManager();
 window.authManager = authManager;