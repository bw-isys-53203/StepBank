// main.js
// Global navigation function
// In main.js
function showSection(sectionId) {
    const sections = ['authSection', 'dashboard', 'rewards', 'marketplace', 'electronics', 'pendingApprovals'];
    
    // Cleanup any active timers/state when switching sections
    if (window.electronicsManager && sectionId !== 'electronics') {
        window.electronicsManager.cleanup();
    }

    sections.forEach(section => {
        document.getElementById(section).classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');

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
    const isParent = document.getElementById('isParent').checked;
    window.authManager.handleRegister(username, password, isParent);
}

// Global logout handler
function handleLogout() {
    window.authManager.handleLogout();
}

// Also ensure the DOMContentLoaded handler initializes everything properly:
document.addEventListener('DOMContentLoaded', () => {
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
});