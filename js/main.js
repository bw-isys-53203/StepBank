// main.js
// Global navigation function
// In main.js
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

    // Cleanup any active timers/state when switching sections
    if (window.electronicsManager && sectionId !== 'electronics') {
        window.electronicsManager.cleanup();
    }

    sections.forEach(section => {
        const element = document.getElementById(section);
        if (element) {  // Add this check to avoid null errors
            element.classList.add('hidden');
        }
    });

    // Show requested section
    const sectionElement = document.getElementById(sectionId);
    if (sectionElement) {  // Add this check
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

// Global login handler
function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    window.authManager.handleLogin(username, password);
}

// Global register handler
function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const accountType = document.getElementById('accountType').value;
    window.authManager.handleRegister(username, password, accountType);
}

// Global logout handler
function handleLogout() {
    window.authManager.handleLogout();
}

// Also ensure the DOMContentLoaded handler initializes everything properly:
/*document.addEventListener('DOMContentLoaded', () => {
    // Initialize all managers
    window.authManager = new AuthManager();
    window.dashboardManager = new DashboardManager();
    window.rewardsManager = new RewardsManager();
    window.marketplaceManager = new MarketplaceManager();

    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        window.authManager.currentUser = JSON.parse(savedUser);
        window.dashboardManager.initialize(window.authManager.currentUser);
        showSection('dashboard');
    }
});*/

document.addEventListener('DOMContentLoaded', () => {
    // Create an async function
    const initializeApp = async () => {
        try {
            // Wait for database to be ready
            await window.dbReady;
            
            // Initialize all managers
            window.authManager = new AuthManager();
            window.dashboardManager = new DashboardManager();
            window.rewardsManager = new RewardsManager();
            window.marketplaceManager = new MarketplaceManager();
            window.messageManager = new MessageManager();

            // Check if user is already logged in
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

    // Call the async function
    initializeApp();
});
