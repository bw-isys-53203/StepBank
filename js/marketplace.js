// marketplace.js
class MarketplaceManager {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.currentPage = 1;
        this.itemsPerPage = 8;
        this.currentCategory = 'all';
        this.searchQuery = '';
    }

    initialize(user) {
        this.currentUser = user;
        this.loadProducts();
        this.setupEventListeners();
        this.renderMarketplace();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            if (e.target.matches('.category-btn')) {
                this.handleCategoryFilter(e.target.dataset.category);
            }
            
            if (e.target.matches('.purchase-btn')) {
                this.showPurchaseModal(e.target.dataset.productId);
            }
            
            if (e.target.matches('.page-btn')) {
                this.handlePageChange(parseInt(e.target.dataset.page));
            }
        });

        // Search input debouncing
        let searchTimeout;
        document.querySelector('.search-input')?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.handleSearch(e.target.value);
            }, 300);
        });
    }

    loadProducts() {
        // In a real app, this would fetch from an API
        this.products = [
            {
                id: 'switch_1',
                name: 'Nintendo Switch',
                category: 'Electronics',
                description: 'Latest Nintendo Switch gaming console',
                points: 200000,
                image: '/api/placeholder/400/320'
            },
            {
                id: 'lego_1',
                name: 'LEGO Star Wars Set',
                category: 'Toys',
                description: 'Build your own Star Wars universe',
                points: 50000,
                image: '/api/placeholder/400/320'
            },
            {
                id: 'game_1',
                name: 'Minecraft',
                category: 'Games',
                description: 'Digital download code for Minecraft',
                points: 25000,
                image: '/api/placeholder/400/320'
            },
            // Add more products as needed
        ];
    }

    renderMarketplace() {
        const container = document.getElementById('marketplace');
        const filteredProducts = this.getFilteredProducts();
        const paginatedProducts = this.paginateProducts(filteredProducts);

        container.innerHTML = `
            <nav class="nav">
                <div class="logo">
                    <span>Marketplace</span>
                </div>
                <button class="btn" onclick="showSection('dashboard')">Back</button>
            </nav>

            <div class="search-container">
                <div class="search-bar">
                    <input type="text" 
                        class="search-input" 
                        placeholder="Search products..."
                        value="${this.searchQuery}">
                </div>
                
                <div class="category-filters">
                    ${this.renderCategoryButtons()}
                </div>
            </div>

            <div class="products-grid">
                ${paginatedProducts.map(product => this.createProductCard(product)).join('')}
            </div>

            ${this.renderPagination(filteredProducts.length)}
        `;
    }

    renderCategoryButtons() {
        const categories = ['All', 'Toys', 'Electronics', 'Games'];
        return categories.map(category => `
            <button class="category-btn ${this.currentCategory === category.toLowerCase() ? 'active' : ''}"
                    data-category="${category.toLowerCase()}">
                ${category}
            </button>
        `).join('');
    }

    createProductCard(product) {
        const canAfford = this.getAvailablePoints() >= product.points;
        
        return `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="product-details">
                    <div class="product-category">${product.category}</div>
                    <h3 class="product-name">${product.name}</h3>
                    <p class="product-description">${product.description}</p>
                    <div class="product-points">${product.points.toLocaleString()} points</div>
                    <button class="btn purchase-btn" 
                        data-product-id="${product.id}"
                        ${!canAfford ? 'disabled' : ''}>
                        ${canAfford ? 'Purchase' : 'Not Enough Points'}
                    </button>
                </div>
            </div>
        `;
    }

    renderPagination(totalItems) {
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        if (totalPages <= 1) return '';

        let pages = [];
        for (let i = 1; i <= totalPages; i++) {
            pages.push(`
                <button class="page-btn ${this.currentPage === i ? 'active' : ''}"
                        data-page="${i}">
                    ${i}
                </button>
            `);
        }

        return `
            <div class="pagination">
                <button class="page-btn" 
                    data-page="${this.currentPage - 1}"
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                    Previous
                </button>
                ${pages.join('')}
                <button class="page-btn" 
                    data-page="${this.currentPage + 1}"
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Next
                </button>
            </div>
        `;
    }

    getFilteredProducts() {
        return this.products.filter(product => {
            const matchesCategory = this.currentCategory === 'all' || 
                product.category.toLowerCase() === this.currentCategory;
            
            const matchesSearch = !this.searchQuery || 
                product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                product.description.toLowerCase().includes(this.searchQuery.toLowerCase());

            return matchesCategory && matchesSearch;
        });
    }

    paginateProducts(products) {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return products.slice(start, end);
    }

    handleCategoryFilter(category) {
        this.currentCategory = category;
        this.currentPage = 1;
        this.renderMarketplace();
    }

    handleSearch(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.renderMarketplace();
    }

    handlePageChange(page) {
        this.currentPage = page;
        this.renderMarketplace();
    }

    showPurchaseModal(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        const modal = document.createElement('div');
        modal.className = 'purchase-modal';
        modal.innerHTML = `
            <h2 class="modal-title">Confirm Purchase</h2>
            <div class="modal-product-info">
                <div class="modal-product-image">
                    <img src="${product.image}" alt="${product.name}">
                </div>
                <div class="modal-product-details">
                    <h3>${product.name}</h3>
                    <p>${product.points.toLocaleString()} points</p>
                </div>
            </div>
            <div class="confirmation-message">
                This purchase will be sent to your parent for approval.
            </div>
            <div class="modal-actions">
                <button class="btn" onclick="marketplaceManager.handlePurchase('${productId}')">
                    Confirm Purchase
                </button>
                <button class="btn" onclick="marketplaceManager.closePurchaseModal()">
                    Cancel
                </button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
        
        setTimeout(() => {
            modal.classList.add('visible');
            overlay.classList.add('visible');
        }, 10);
    }

    closePurchaseModal() {
        const modal = document.querySelector('.purchase-modal');
        const overlay = document.querySelector('.modal-overlay');
        
        if (modal && overlay) {
            modal.classList.remove('visible');
            overlay.classList.remove('visible');
            
            setTimeout(() => {
                modal.remove();
                overlay.remove();
            }, 300);
        }
    }

    async handlePurchase(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        if (this.currentUser.isParent) {
            await this.processPurchase(product);
        } else {
            await this.requestParentApproval(product);
        }

        this.closePurchaseModal();
        this.renderMarketplace();
    }

    async processPurchase(product) {
        // In a real app, this would make API calls
        console.log(`Processing purchase for ${product.name}`);
        // Update points balance
        // Generate order confirmation
        // etc.
    }

    async requestParentApproval(product) {
        // In a real app, this would make API calls
        console.log(`Requesting parent approval for ${product.name}`);
        // Add to pending approvals
        // Notify parent
        // etc.
    }

    getAvailablePoints() {
        // Fallback points if dashboard manager isn't available
        const defaultPoints = 1000;
        
        try {
            if (window.dashboardManager) {
                const stats = window.dashboardManager.calculateStatistics();
                return stats.availablePoints;
            }
            return defaultPoints;
        } catch (error) {
            console.warn('Error getting points:', error);
            return defaultPoints;
        }
    }
}

// Initialize marketplace manager
const marketplaceManager = new MarketplaceManager();
window.marketplaceManager = marketplaceManager; // Make it globally accessible