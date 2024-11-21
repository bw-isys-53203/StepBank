// auth.js
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initializeListeners();
        
        // Temporary hardcoded users
        this.hardcodedUsers = {
            'Tommy': { password: '123456', id: 'child1', isParent: false },
            'Sarah': { password: '123456', id: 'child2', isParent: false }, 
            'Parent': { password: '123456', id: 'parent1', isParent: true }
        };
    }
 
    initializeListeners() {
        // Tab switching
        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', () => this.switchTab(tab));
        });
    }
 
    switchTab(tab) {
        // Update active tab
        document.querySelectorAll('.auth-tab').forEach(t => 
            t.classList.remove('active')
        );
        tab.classList.add('active');
 
        // Show corresponding form
        const formId = tab.dataset.tab + 'Form';
        document.querySelectorAll('.auth-form').forEach(form => 
            form.classList.add('hidden')
        );
        document.getElementById(formId).classList.remove('hidden');
    }
 /*
    async handleLogin(username, password) {
        // Temporary hardcoded login logic
        const hardcodedUser = this.hardcodedUsers[username];
        if (hardcodedUser && password === hardcodedUser.password) {
            this.currentUser = {
                username,
                ...hardcodedUser
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            showSection('dashboard');
            return;
        }
 
        // Original login logic (commented out for now)
        
        if (!this.validateCredentials(username, password)) {
            return;
        }
 
        try {
            this.currentUser = {
                username,
                isParent: false,
                id: 'user_' + Math.random().toString(36).substr(2, 9)
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            showSection('dashboard');
        } catch (error) {
            this.showError('loginForm', 'Login failed. Please try again.');
        }
 
        this.showError('loginForm', 'Invalid credentials');
    }
 */
    async handleLogin(username, password) {
        const hardcodedUser = this.hardcodedUsers[username];
        if (hardcodedUser && password === hardcodedUser.password) {
            this.currentUser = {
                username,
                id: hardcodedUser.id,  // Explicitly set these properties
                isParent: hardcodedUser.isParent
            };
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            showSection('dashboard');
            return;
        }
        this.showError('loginForm', 'Invalid credentials');
    }

    async handleRegister(username, password, isParent) {
        if (!this.validateCredentials(username, password)) {
            return;
        }
 
        try {
            // Simulate registration
            this.currentUser = {
                username,
                isParent,
                id: 'user_' + Math.random().toString(36).substr(2, 9)
            };
 
            // Store user data
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Navigate to dashboard
            showSection('dashboard');
        } catch (error) {
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }
 
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
 
    showError(formId, message) {
        const form = document.getElementById(formId);
        let errorDiv = form.querySelector('.auth-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'auth-error';
            form.appendChild(errorDiv);
        }
 
        errorDiv.textContent = message;
        errorDiv.classList.add('visible');
 
        // Hide error after 3 seconds
        setTimeout(() => {
            errorDiv.classList.remove('visible');
        }, 3000);
    }
 
    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        showSection('authSection');
        
        // Clear forms
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('registerUsername').value = '';
        document.getElementById('registerPassword').value = '';
        document.getElementById('isParent').checked = false;
    }
 
    checkAuthState() {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            showSection('dashboard');
        }
    }
 
    // Helper method to get current user
    getCurrentUser() {
        return this.currentUser;
    }
 
    // Helper method to check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    }
 
    // Helper method to check if current user is a parent
    isParent() {
        return this.currentUser?.isParent || false;
    }
 }
 
 // Initialize auth manager
 const authManager = new AuthManager();
 window.authManager = authManager; // Make it globally accessible