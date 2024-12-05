/**
 * @fileoverview Main Application Controller
 * Controls navigation between different sections of the application and initializes
 * core managers. Handles the application's startup sequence and manages global
 * event handlers for authentication and navigation.
 * 
 * @revision SB-00001 - Brian W. - 12/05/2024 - Initial Release - Core application controller implementation
 */

/**
 * Controls visibility of different application sections
 * @param {string} sectionId - ID of the section to show
 */
function showSection(sectionId) {
    const sections = [
        'authSection',
        'dashboard',
        'rewards',
        'marketplace',
        'electronics',
        'pendingApprovals',
        'children',
        'settings',
        'family',
        'messages',
        'device', 
        'fitbit'
    ];

    // Clean up any active timers/state when switching sections
    if (window.electronicsManager && sectionId !== 'electronics') {
        window.electronicsManager.cleanup();
    }

    // Hide all sections
    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {  // Check to avoid null errors
            element.classList.add('hidden');
        }
    });

    // Show requested section
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {  // Verify element exists
        sectionElement.classList.remove('hidden');
    }

    // Initialize relevant manager based on section
    switch (sectionId) {
        case 'dashboard':
            window.dashboardManager.initialize(window.authManager.currentUser);
            break;
        case 'pendingApprovals':
            window.pendingApprovalsManager.initialize(window.authManager.currentUser);
            break;
        case 'rewards':
            window.rewardsManager.initialize(window.authManager.currentUser);
            break;
        case 'marketplace':
            window.marketplaceManager.initialize(window.authManager.currentUser);
            break;
        case 'electronics':
            window.electronicsManager.initialize(window.authManager.currentUser);
            break;
        case 'children':
            window.addChildManager.initialize(window.authManager.currentUser);
            break;
        case 'device':
            window.deviceManager.initialize(window.authManager.currentUser);
            break;
        case 'fitbit':
            window.fitbitManager.initialize(window.authManager.currentUser);
            break;     
        case 'settings':
            window.dashboardManager.renderSettings();
            break;
        case 'messages':
            window.messageManager.initialize(window.authManager.currentUser);
            break;
    }
}

/**
 * Handles user login attempt
 * Retrieves credentials from form and passes to auth manager
 */
function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    window.authManager.handleLogin(username, password);
}

/**
 * Handles new user registration
 * Collects registration data and passes to auth manager
 */
function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const accountType = document.getElementById('accountType').value;
    window.authManager.handleRegister(username, password, accountType);
}

/**
 * Handles user logout
 * Delegates to auth manager for cleanup and logout processing
 */
function handleLogout() {
    window.authManager.handleLogout();
}

/**
 * Initializes application when DOM is ready
 * Sets up managers and checks for existing login
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create an async initialization function
    const initializeApp = async () => {
        try {
            // Wait for database to be ready
            await window.dbReady;
            
            // Initialize core managers
            window.authManager = new AuthManager();
            window.dashboardManager = new DashboardManager();
            window.rewardsManager = new RewardsManager();
            window.marketplaceManager = new MarketplaceManager();
            window.messageManager = new MessageManager();

            // Check for existing login session
            const savedUser = localStorage.getItem('currentUser');
            if (savedUser) {
                window.authManager.currentUser = JSON.parse(savedUser);
                await window.dashboardManager.initialize(window.authManager.currentUser);
                showSection('dashboard');
            }
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    };

    // Start initialization
    initializeApp();
});