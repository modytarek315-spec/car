/**
 * ==========================================
 * CAR HOUSE MAIN APPLICATION
 * ==========================================
 * Minimal entry point that orchestrates modules.
 */

window.AppState = {
  config: {
    store_name: "Car House 🚗",
    store_tagline: "Quality Parts for Your Vehicle",
    primary_color: "#2C2C2C",
    secondary_color: "#FFC700",
    accent_color: "#FFC700",
    background_color: "#1A1A1A"
  },
  cart: [],
  products: {},
  categories: [],
  servicePackages: [],
  currentCategory: 'home',
  currentSearchTerm: '',
  currentSortBy: 'name',
  currentFilterBrand: 'all',
  searchHistory: [],
  selectedService: null,
  includeParts: false,
  selectedParts: []
};

window.App = {
  async init() {
    console.log('Orchestrating App Modules...');

    // 1. Initial UI Setup
    window.UI.renderCategorySkeletons();
    window.UI.updateBreadcrumb([]);

    try {
      // 2. Fetch Core Data
      const categoriesResponse = await window.ProductsService.getCategories();
      window.AppState.categories = categoriesResponse.categories || [];

      this.renderDynamicNavigation();

      const [productsRes, serviceTypes] = await Promise.all([
        window.ProductsService.getProducts({ limit: 10 }), // Just get some featured ones
        window.BookingsService.getServiceTypes()
      ]);

      this.processServices(serviceTypes);

      // 3. Initial Render
      this.applyStyles();
      window.AuthUI.updateUI();

      if (window.location.pathname.includes('product.html')) {
        window.ProductDetailsPage.render();
      } else {
        window.Router.navigate('home');
      }

    } catch (e) {
      console.error('Initialization error:', e);
      window.UI.showToast('Failed to load application data', '#e74c3c');
    }

    // 4. Global Event Init
    this.initGlobalEvents();
    this.loadSearchHistory();
  },

  processProducts(allProducts) {
    window.AppState.products = {};
    window.AppState.categories.forEach(c => window.AppState.products[c.slug] = []);

    allProducts.forEach(p => {
      if (!p) return;
      const uiProduct = this.mapProductToUI(p);
      const cat = uiProduct.category;
      if (!window.AppState.products[cat]) window.AppState.products[cat] = [];
      window.AppState.products[cat].push(uiProduct);
    });
  },

  mapProductToUI(p) {
    let catSlug = p.categories?.slug || p.category?.slug;
    if (!catSlug && p.category_id) {
      const found = window.AppState.categories.find(c => c.id === p.category_id);
      if (found) catSlug = found.slug;
    }
    const categorySlug = catSlug || 'parts';
    const images = p.images || p.product_images || [];
    return {
      id: p.id,
      sku: p.sku,
      name: p.title || p.name,
      brand: p.brand || 'Generic',
      price: p.price,
      stock: p.stock !== undefined ? p.stock : 10,
      icon: images?.[0]?.url || p.image_url || 'https://via.placeholder.com/200',
      category: categorySlug,
      description: p.description,
      specifications: p.specifications || {}
    };
  },

  processServices(serviceTypes) {
    if (serviceTypes.success) {
      window.AppState.servicePackages = serviceTypes.services.map(s => ({
        id: s.id,
        title: s.name,
        km: s.name.replace(/[^0-9]/g, '') || "0",
        price: s.base_price || 0,
        products: (s.items || s.service_type_products || []).map(i => i.product).filter(p => !!p),
        items: (s.items || s.service_type_products || []).map(i => ({
          name: (i.product || i.products)?.name || 'Unknown Part',
          part: (i.product || i.products)?.id || null,
          required: i.is_required !== false
        }))
      }));
    }
  },

  renderDynamicNavigation() {
    const navList = document.querySelector('.nav-links');
    if (!navList) return;

    let html = '<li><button data-category="home" class="active">Home</button></li>';
    window.AppState.categories.forEach(c => {
      html += `<li><button data-category="${c.slug}">${c.name}</button></li>`;
    });
    html += '<li><button data-category="service">Service Booking</button></li>';
    html += '<li><button data-category="about">About Us</button></li>';

    navList.innerHTML = html;
    navList.onclick = (e) => {
      const btn = e.target.closest('button');
      if (btn?.dataset.category) window.Router.navigate(btn.dataset.category);
    };
  },

  applyStyles() {
    const root = document.documentElement;
    const config = window.AppState.config;
    root.style.setProperty('--primary-color', config.primary_color);
    root.style.setProperty('--secondary-color', config.secondary_color);
    root.style.setProperty('--accent-color', config.accent_color);
    root.style.setProperty('--background-color', config.background_color);
  },

  initGlobalEvents() {
    // Sync Cart
    window.AppState.cart = window.CartService.getCart();
    this.updateCartCount();

    window.addEventListener('cartUpdated', (e) => {
      window.AppState.cart = e.detail.cart;
      this.updateCartCount();
      if (window.AppState.currentCategory === 'cart') window.CartPage.render();
    });

    // Search Handlers
    document.getElementById('search-btn')?.addEventListener('click', () => this.performSearch());
    document.getElementById('cart-btn')?.addEventListener('click', () => window.Router.navigate('cart'));

    // Auth Actions
    document.getElementById('logout-btn')?.addEventListener('click', () => window.AuthUI.logout());

    // Delegate Page Clicks
    document.addEventListener('click', (e) => this.handleGlobalClick(e));
  },

  handleGlobalClick(e) {
    if (e.target.matches('.add-to-cart-btn')) {
      const pid = e.target.dataset.productId;
      const product = Object.values(window.AppState.products).flat().find(p => p.id === pid);
      if (product) {
        window.CartService.addToCart(product, 1);
        window.UI.flyToCart(e.target.closest('.product-card'));
        window.UI.bounceCartIcon();
      }
    }

    if (e.target.matches('.qty-btn')) {
      const pid = e.target.dataset.itemId;
      const qty = parseInt(e.target.dataset.quantity);
      window.CartService.updateQuantity(pid, qty);
    }

    if (e.target.matches('.remove-btn')) {
      window.CartService.removeFromCart(e.target.dataset.itemId);
    }

    if (e.target.matches('.view-details-btn')) {
      window.location.href = `product.html?id=${e.target.dataset.productId}`;
    }

    const serviceCard = e.target.closest('[data-service-index]');
    if (serviceCard) {
      window.ServicePage.selectService(parseInt(serviceCard.dataset.serviceIndex));
      return;
    }

    const categoryCard = e.target.closest('.category-card');
    if (categoryCard && categoryCard.dataset.category) {
      window.Router.navigate(categoryCard.dataset.category);
      return;
    }
  },

  updateCartCount() {
    const cartCount = document.getElementById('cart-count');
    if (cartCount) {
      cartCount.textContent = window.AppState.cart.reduce((sum, item) => sum + item.quantity, 0);
    }
  },

  loadSearchHistory() {
    const stored = localStorage.getItem('searchHistory');
    if (stored) window.AppState.searchHistory = JSON.parse(stored);
    this.renderSearchHistory();
  },

  renderSearchHistory() {
    const container = document.getElementById('search-history-container');
    if (!container) return;
    container.innerHTML = `
            <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                <span style="font-weight: 500; color: white;">Recent Searches</span>
                ${window.AppState.searchHistory.map(term => `<button class="search-history-btn" onclick="window.App.performSearch('${term}')">${term}</button>`).join('')}
            </div>
        `;
  },

  async performSearch(term) {
    const input = document.getElementById('search-input');
    const searchTerm = term || input?.value.trim();
    if (!searchTerm) return;

    if (input) input.value = searchTerm;
    window.AppState.currentSearchTerm = searchTerm;

    // Save History
    if (!window.AppState.searchHistory.includes(searchTerm)) {
      window.AppState.searchHistory.unshift(searchTerm);
      if (window.AppState.searchHistory.length > 5) window.AppState.searchHistory.pop();
      localStorage.setItem('searchHistory', JSON.stringify(window.AppState.searchHistory));
      this.renderSearchHistory();
    }

    // Render Search Results on a virtual category
    const allProducts = Object.values(window.AppState.products).flat();
    window.AppState.products['search'] = allProducts.filter(p =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    window.CategoryPage.render('search');
  }
};

document.addEventListener('DOMContentLoaded', () => window.App.init());
