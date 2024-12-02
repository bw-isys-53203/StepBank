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
        try {
            // Get all users from Firebase
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
     
            // Check password
            const hashedPassword = this.hashPassword(password);
            if (hashedPassword !== userData.passwordHash) {
                this.showError('loginForm', 'Invalid credentials');
                return;
            }
     
            // Set current user with minimal required data
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

    handleAccountTypeChange() {
        const accountType = document.getElementById('accountType').value;
        const tokenGroup = document.getElementById('tokenGroup');
        
        if (accountType === 'child') {
            tokenGroup.style.display = 'block';
        } else {
            tokenGroup.style.display = 'none';
        }
    }

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

    async handleParentRegistration(username, password) {
        try {
            const passwordHash = this.hashPassword(password);
            
            // Create parent user object
            const userData = {
                userId: 'user_' + Math.random().toString(36).substr(2, 9),
                username,
                passwordHash,
                accountType: 'parent',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
    
            // Save to Firebase
            await db.set(`users/${userData.userId}`, userData);
            
            // Store user data locally
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Navigate to dashboard
            showSection('dashboard');
    
            console.log('Parent registered successfully!');
        } catch (error) {
            console.error('Parent registration error:', error);
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }

    async handleParentRegistration(username, password) {
        try {
            const passwordHash = this.hashPassword(password);
            
            // Create parent user object
            const userData = {
                userId: 'user_' + Math.random().toString(36).substr(2, 9),
                username,
                passwordHash,
                accountType: 'parent',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };

            // Save to Firebase
            await db.set(`users/${userData.userId}`, userData);
            
            // Store user data locally
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            
            // Navigate to dashboard
            showSection('dashboard');

            console.log('Parent registered successfully!');
        } catch (error) {
            console.error('Parent registration error:', error);
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }

    async handleChildRegistration(username, password, token) {
        try {
            // First, find parent using registration token
            const parent = await db.getParentByToken(token);
            
            if (!parent) {
                this.showError('registerForm', 'Invalid registration token.');
                return;
            }
    
            // Find the child using token
            let childId;
            let childData;
            
            for (const [id, child] of Object.entries(parent.children || {})) {
                if (child.registrationToken === token) {
                    childId = id;
                    childData = child;
                    break;
                }
            }
    
            if (!childData) {
                this.showError('registerForm', 'Invalid registration token.');
                return;
            }
    
            if (childData.isRegistered) {
                this.showError('registerForm', 'This token has already been used.');
                return;
            }
    
            const passwordHash = this.hashPassword(password);
    
            // Create new child user
            const userData = {
                userId: childId, // Use the same childId as userId
                username,
                passwordHash,
                accountType: 'child',
                parentId: parent.userId,
                createdAt: firebase.database.ServerValue.TIMESTAMP
            };
    
            // Save child as a new user
            await db.set(`users/${childId}`, userData);
    
            // Update parent's child record to mark as registered
            await db.set(`users/${parent.userId}/children/${childId}/isRegistered`, true);
    
            // Store user data locally
            this.currentUser = userData;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
    
            // Navigate to dashboard
            showSection('dashboard');
    
            console.log('Child registered successfully!');
        } catch (error) {
            console.error('Child registration error:', error);
            this.showError('registerForm', 'Registration failed. Please try again.');
        }
    }

    hashPassword(password) {
        return btoa(password);
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
        document.getElementById('accountType').value = '';
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