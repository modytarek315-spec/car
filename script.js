
const defaultConfig = {
  store_name: "Car House 🚗",
  store_tagline: "Quality Parts for Your Vehicle",
  contact_phone: "+1 (555) 123-4567",
  contact_email: "info@autoparts.com",
  primary_color: "#2C2C2C",
  secondary_color: "#FFC700",
  accent_color: "#FFC700",
  success_color: "#FFD700",
  background_color: "#1A1A1A",
  font_family: "Segoe UI",
  font_size: 16
};

let config = { ...defaultConfig };
let cart = [];
let currentCategory = 'home';
let currentSearchTerm = '';
let currentSortBy = 'name';
let currentFilterBrand = 'all';
let searchHistory = [];


// Data store - Populated from Supabase

// Data store - Populated from Supabase
let products = {}; // Dynamic keys based on DB categories
let categories = []; // Dynamic categories list
let servicePackages = [];


// ==========================================
// EMERGENCY SERVICE WORKER CLEANUP
// ==========================================
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    if (registrations.length > 0) console.log('Found', registrations.length, 'SWs. Unregistering to clean environment...');
    for (let registration of registrations) {
      registration.unregister().then(success => {
        console.log('Service Worker unregistered:', success);
        // We don't auto-reload here to avoid loops, but user will see log
      });
    }
  });
}

// Helper to map Supabase product to UI format




function mapProductToUI(p) {
  // Handle unaliased relations or raw category_id lookup
  let catSlug = p.categories?.slug || p.category?.slug;

  // If relation is missing (Safe Mode), try lookup by ID from global categories
  if (!catSlug && p.category_id && typeof categories !== 'undefined') {
    const found = categories.find(c => c.id === p.category_id);
    if (found) catSlug = found.slug;
  }

  const categorySlug = catSlug || 'parts';
  const imageData = p.images || p.product_images || [];

  return {
    id: p.id,
    sku: p.sku,
    name: p.title || p.name,
    brand: p.brand || 'Generic',
    price: p.price,
    stock: p.stock !== undefined ? p.stock : 10,
    icon: imageData?.[0]?.url || p.image_url || 'https://via.placeholder.com/200',
    category: categorySlug,
    description: p.description,
    specifications: p.specifications || {},
    'background-image': imageData?.[0]?.url ? `url('${imageData[0].url}')` : 'none'
  };
}




let selectedService = null;
let includeParts = false;
let selectedParts = [];


// Data Sync Handler (Legacy support for UI)
const dataHandler = {
  onDataChanged(data) {
    // Cart updates are now handled by CartService events, 
    // but we keep this if anything calls legacy notifyDataChange
    updateCartCount();
    if (currentCategory === 'cart') renderCartPage();
  }
};


// ==========================================
// UX HELPERS
// ==========================================

// Helper for Breadcrumbs
function updateBreadcrumb(items = []) {
  const container = document.getElementById('breadcrumb');
  if (!container) return;

  const homeItem = { label: 'Home', action: () => window.showCategory('home') };
  const allItems = [homeItem, ...items];

  container.innerHTML = allItems.map((item, index) => {
    const isActive = index === allItems.length - 1;
    if (isActive) return `<span class="breadcrumb-item active">${item.label}</span>`;
    return `
      <span class="breadcrumb-item" data-breadcrumb-index="${index}">
        ${item.label}
      </span>
      <span class="breadcrumb-separator">/</span>
    `;
  }).join('');

  container.querySelectorAll('.breadcrumb-item[data-breadcrumb-index]').forEach(el => {
    el.onclick = () => {
      const idx = el.getAttribute('data-breadcrumb-index');
      allItems[idx].action();
    };
  });
}

// Helper for Skeletons
function renderProductSkeletons() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  const title = mainContent.querySelector('.page-title')?.textContent || 'Loading...';
  mainContent.innerHTML = `
    <h1 class="page-title">${title}</h1>
    <p class="page-subtitle">Finding the best parts for you...</p>
    <div class="products-grid" id="products-grid">
      ${Array(8).fill(0).map(() => `
        <div class="product-card" style="background: #252525; border: 1px solid #333;">
          <div class="skeleton-img skeleton" style="height: 180px; width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; height: 12px; margin-top: 10px;"></div>
          <div class="skeleton skeleton-text" style="width: 80%; height: 20px;"></div>
          <div class="skeleton skeleton-text" style="width: 30%; height: 25px;"></div>
          <div class="skeleton skeleton-text" style="width: 100%; height: 40px; border-radius: 6px; margin-top: 10px;"></div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCategorySkeletons() {
  const mainContent = document.getElementById('main-content');
  if (!mainContent) return;

  mainContent.innerHTML = `
    <div class="flex flex-col items-center">
      <div class="skeleton skeleton-text" style="width: 300px; height: 40px; margin-bottom: 15px;"></div>
      <div class="skeleton skeleton-text" style="width: 200px; height: 20px; margin-bottom: 40px;"></div>
    </div>
    <div class="category-grid">
      ${Array(4).fill(0).map(() => `
        <div class="category-card" style="background: #252525; border: 1px solid #333;">
          <div class="category-card-image-wrapper skeleton" style="background: #333; height: 120px; width: 100%;"></div>
          <div class="skeleton skeleton-text" style="width: 60%; margin: 15px auto 10px;"></div>
          <div class="skeleton skeleton-text" style="width: 40%; margin: 0 auto;"></div>
        </div>
      `).join('')}
    </div>
  `;
}



async function initApp() {
  console.log('Initializing App with Supabase Services...');

  // 1. Show skeletons immediately so user sees something is happening
  renderCategorySkeletons();
  updateBreadcrumb([]);

  try {
    // 2. Fetch categories FIRST to build the core navigation structure
    const categoriesResponse = await window.ProductsService.getCategories();
    categories = categoriesResponse.categories || [];

    if (typeof renderDynamicNavigation === 'function') {
      renderDynamicNavigation();
    }

    // 3. Parallel fetch for products and services
    const [productsResponse, serviceTypes] = await Promise.all([
      window.ProductsService.getProducts({ limit: 40 }), // Fetch first 40 for initial load
      window.BookingsService.getServiceTypes()
    ]);

    const allProducts = (productsResponse.products || []).filter(p => p && p.id);

    // 4. Map products to categories
    products = {};
    categories.forEach(c => products[c.slug] = []);
    allProducts.forEach(p => {
      const uiProduct = mapProductToUI(p);
      const cat = uiProduct.category;
      if (!products[cat]) products[cat] = [];
      products[cat].push(uiProduct);
    });

    // 5. Build Service Packages
    if (serviceTypes.success) {
      servicePackages = serviceTypes.services.map(s => {
        const dynamicItems = s.items || s.service_type_products || [];
        // Map products for the service summary and parts section
        const serviceProducts = dynamicItems.map(i => i.product).filter(p => !!p);

        return {
          id: s.id,
          title: s.name,
          km: s.name.replace(/[^0-9]/g, '') || "0",
          price: s.base_price || 0,
          products: serviceProducts, // Needed for summary calculation
          items: dynamicItems.map(i => ({
            name: (i.product || i.products)?.name || 'Unknown Part',
            part: (i.product || i.products)?.id || null,
            required: i.is_required !== false
          }))
        };
      });
    }


    // 6. Initial Render
    applyInitialStyles();

    if (window.location.pathname.endsWith('product.html')) {
      renderProductDetailsPage();
    } else {
      showCategory('home');
    }

  } catch (e) {
    console.error('Initialization error:', e);
    window.CarHouseSupabase.showToast('Failed to load application data', 'info');
  }


  // Final touches
  cart = window.CartService.getCart();
  updateCartCount();

  window.addEventListener('cartUpdated', (e) => {
    cart = e.detail.cart;
    updateCartCount();
    if (currentCategory === 'cart') renderCartPage();
  });
  loadSearchHistory();
  renderSearchHistory();

}

function applyInitialStyles() {
  const root = document.documentElement;
  root.style.setProperty('--primary-color', config.primary_color || defaultConfig.primary_color);
  root.style.setProperty('--secondary-color', config.secondary_color || defaultConfig.secondary_color);
  root.style.setProperty('--accent-color', config.accent_color || defaultConfig.accent_color);
  root.style.setProperty('--success-color', config.success_color || defaultConfig.success_color);
  root.style.setProperty('--background-color', config.background_color || defaultConfig.background_color);

  const storeName = document.getElementById('store-name');
  if (storeName) storeName.textContent = config.store_name || defaultConfig.store_name;

  document.body.style.fontFamily = `${config.font_family || defaultConfig.font_family}, sans-serif`;

  const cartBtnLabel = document.getElementById('cart-btn-label');
  if (cartBtnLabel) cartBtnLabel.textContent = "Cart";
  const navHome = document.getElementById('nav-home');
  if (navHome) navHome.textContent = "Home";
  const navAbout = document.getElementById('nav-about');
  if (navAbout) navAbout.textContent = "About Us";
}


function loadSearchHistory() {
  const storedHistory = localStorage.getItem('searchHistory');
  if (storedHistory) {
    searchHistory = JSON.parse(storedHistory);
  }
}

function renderSearchHistory() {
  const historyContainer = document.getElementById('search-history-container');
  if (historyContainer) {
    historyContainer.innerHTML = `
                <div style="margin-top: 10px; display: flex; gap: 10px; align-items: center;">
                    <span style="font-weight: 500; color: white;">Recent Searches</span>
                    ${searchHistory.map(term => `<button class="search-history-btn" onclick="performSearchFromHistory('${term}')">${term}</button>`).join('')}
                </div>
            `;
  }
}

function performSearchFromHistory(term) {
  document.getElementById('search-input').value = term;
  performSearch();
}

function adjustColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
    (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
    (B < 255 ? B < 1 ? 0 : B : 255))
    .toString(16).slice(1);
}

function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
  }
}


function showCategory(category) {
  currentCategory = category;
  currentSearchTerm = '';
  document.getElementById('search-input').value = '';

  // Scroll to top for better UX
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update logic
  document.querySelectorAll('.nav-links button').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.querySelector(`[data-category="${category}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const mainContent = document.getElementById('main-content');

  // Reset content to trigger animation
  mainContent.classList.remove('fade-in-up');
  void mainContent.offsetWidth; // Force reflow
  mainContent.classList.add('fade-in-up');

  if (category === 'home') {
    renderHomePage();
  } else if (category === 'cart') {
    updateBreadcrumb([{ label: 'Shopping Cart', action: () => showCategory('cart') }]);
    renderCartPage();
  } else if (category === 'checkout') {
    updateBreadcrumb([
      { label: 'Cart', action: () => showCategory('cart') },
      { label: 'Checkout', action: () => showCategory('checkout') }
    ]);
    renderCheckoutPage();
  } else if (category === 'service') {
    updateBreadcrumb([{ label: 'Service Booking', action: () => showCategory('service') }]);
    renderServicePage();
  } else if (category === 'favorites') {
    updateBreadcrumb([{ label: 'My Favorites', action: () => showCategory('favorites') }]);
    renderFavoritesPage();
  } else if (category === 'about') {
    updateBreadcrumb([{ label: 'About Us', action: () => showCategory('about') }]);
    renderAboutPage();
  } else {
    renderCategoryPage(category);
  }
}

function renderAboutPage() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
            <h1 class="page-title">About Us</h1>
            <p class="page-subtitle">Your trusted source for quality auto parts</p>
            <div style="background: black; padding: 80px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <p>Welcome to Car House , your one-stop shop for high-quality auto parts. We are passionate about cars and dedicated to providing our customers with the best parts and service in the industry.</p>
                <p>Our mission is to make it easy and affordable for you to keep your vehicle in top condition. We offer a wide selection of parts for all makes and models, backed by our expert team and commitment to customer satisfaction.</p>
                <p>Thank you for choosing Car House . We look forward to serving you!</p>
            </div>
        `;
}


function renderDynamicNavigation() {
  const navList = document.querySelector('.nav-links');
  if (!navList) return;

  // Build HTML
  let html = '<li><button data-category="home" class="active" id="nav-home">Home</button></li>';

  if (categories && categories.length > 0) {
    categories.forEach(c => {
      html += `<li><button data-category="${c.slug}">${c.name}</button></li>`;
    });
  }

  html += '<li><button data-category="service" id="nav-service">Service Booking</button></li>';
  html += '<li><button data-category="about" id="nav-about">About Us</button></li>';

  navList.innerHTML = html;

  // Attach Event Delegation
  // Remove old listeners? The old buttons are gone, so their listeners are garbage collected.
  // We need to ensure we don't add multiple listeners to navList if called multiple times.
  // Ideally, use a named function or 'once' option, but for now assuming initApp runs once.

  // Note: Existing code might assume specific IDs exist (e.g. applyConfig).
  // Dynamic buttons won't have the hardcoded IDs like 'nav-engine' unless we add them,
  // but applyConfig checks for existence. 

  // We add a click listener to the UL
  navList.onclick = (e) => {
    const btn = e.target.closest('button');
    if (btn && btn.dataset.category) {
      showCategory(btn.dataset.category);
    }
  };
}


function renderHomePage() {
  const mainContent = document.getElementById('main-content');
  updateBreadcrumb([]);

  const categoryCards = categories.map((c, index) => `
      <div class="category-card fade-in-up" data-category="${c.slug}" style="animation-delay: ${index * 0.1}s">
        <div class="category-card-image-wrapper">
          <img src="${c.image_url || c.icon || 'https://via.placeholder.com/300'}" alt="${c.name}" class="category-card-image" onerror="this.src='https://via.placeholder.com/300?text=${c.name}';">
        </div>
        <h3 class="category-card-title">${c.name}</h3>
        <p class="category-card-description">${c.description || 'Browse products'}</p>
      </div>
  `).join('');

  // Add Service Booking Card manually
  const serviceCard = `
      <div class="category-card fade-in-up" data-category="service" style="animation-delay: ${categories.length * 0.1}s">
        <div class="category-card-image-wrapper">
          <img src="https://toyotacorporate.sitedemo.com.my/wp-content/uploads/2022/01/v2-services-image4.jpg" alt="Service Booking" class="category-card-image" onerror="this.src=''; this.alt='Service Booking'; this.style.display='none';">
        </div>
        <h3 class="category-card-title">Service Booking</h3>
        <p class="category-card-description">Inspection Repair Scheduling</p>
      </div>
  `;

  mainContent.innerHTML = `
    <h1 class="page-title">Welcome to ${config.store_name || defaultConfig.store_name}</h1>
    <p class="page-subtitle">Expert parts and maintenance for your automotive needs</p>
    <div class="category-grid">
      ${categoryCards}
      ${serviceCard}
    </div>
  `;

  // Attach click listeners to cards (delegation or direct)
  // script.js previously used observeElements, but click handling?
  // It seems click handling for cards was missing in previous code or implicit?
  // Wait, looking at currentCategory logic... 
  // We need to add listeners to these cards to navigate!

  mainContent.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      showCategory(card.dataset.category);
    });
  });

  observeElements('[data-category]');
}



function renderCategoryPage(category) {
  const catObj = categories.find(c => c.slug === category);
  const categoryName = catObj ? catObj.name : category.charAt(0).toUpperCase() + category.slice(1);

  updateBreadcrumb([{ label: categoryName, action: () => showCategory(category) }]);

  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <h1 class="page-title">${categoryName}</h1>
    <p class="page-subtitle">Quality selection for your vehicle</p>
    <div id="products-grid"></div>
  `;

  renderProductSkeletons();

  // Small delay to ensure smooth transition from skeleton
  setTimeout(() => {
    renderProducts(category);
  }, 300);
}

function getUniqueBrands(category) {
  const brands = [...new Set(products[category].map(p => p.brand))];
  return brands.sort();
}

function updateSort(sortBy) {
  currentSortBy = sortBy;
  renderProducts(currentCategory);
}

function updateBrandFilter(brand) {
  currentFilterBrand = brand;
  renderProducts(currentCategory);
}

function renderProducts(category) {
  if (!products[category]) {
    products[category] = [];
  }
  let productList = [...products[category]];

  if (currentSearchTerm) {
    productList = productList.filter(p =>
      p.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
      p.brand.toLowerCase().includes(currentSearchTerm.toLowerCase())
    );
  }

  if (currentFilterBrand !== 'all') {
    productList = productList.filter(p => p.brand === currentFilterBrand);
  }

  switch (currentSortBy) {
    case 'price-low':
      productList.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      productList.sort((a, b) => b.price - a.price);
      break;
    case 'brand':
      productList.sort((a, b) => a.brand.localeCompare(b.brand));
      break;
    default:
      productList.sort((a, b) => a.name.localeCompare(b.name));
  }


  const grid = document.getElementById('products-grid');
  if (!grid) {
    console.warn('Products grid element not found. Navigation might have changed.');
    return;
  }
  if (productList.length === 0) {
    grid.innerHTML = `
      <div class="empty-state fade-in-up" style="grid-column: 1 / -1;">
        <div class="empty-state-icon">🔍</div>
        <h3>No products found</h3>
        <p>Try adjusting your search or filters to find what you're looking for.</p>
        <button class="back-btn" onclick="showCategory('${category}')">Clear All Filters</button>
      </div>
    `;
    return;
  }


  grid.innerHTML = productList.map((product, index) => {
    const isOutOfStock = product.stock <= 0;
    return `
    <div class="product-card fade-in-up ${isOutOfStock ? 'out-of-stock' : ''}" 
         data-product-id="${product.id}" 
         style="animation-delay: ${index * 0.05}s;">
      <div class="product-image">
        <img src="${product.icon}" alt="${product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';">
        ${isOutOfStock ? '<span class="stock-badge" style="position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Out of Stock</span>' : ''}
      </div>
      <div class="product-brand">${product.brand}</div>
      <h3 class="product-name">${product.name}</h3>
      <div class="product-price">${product.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
      <div class="product-actions" style="display: flex; gap: 8px;">
        <button class="view-details-btn" data-product-id="${product.id}" style="flex: 1;">View Details</button>
        <button class="favorite-btn ${window.FavoritesService.isFavorite(product.id) ? 'active' : ''}" 
                data-product-id="${product.id}" 
                style="width: 44px; border-radius: 6px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
            <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
          </svg>
        </button>
      </div>
      <button class="add-to-cart-btn" data-product-id="${product.id}" ${isOutOfStock ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  `}).join('');

  observeElements('.product-card');
}

function performSearch() {
  const searchInput = document.getElementById('search-input');
  currentSearchTerm = searchInput.value.trim();

  if (!currentSearchTerm) {
    return;
  }

  if (!searchHistory.includes(currentSearchTerm)) {
    searchHistory.unshift(currentSearchTerm);
    if (searchHistory.length > 5) {
      searchHistory.pop();
    }
    localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
    renderSearchHistory();
  }

  const allProducts = Object.values(products).flat();
  const results = allProducts.filter(p =>
    p.name.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
    p.brand.toLowerCase().includes(currentSearchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(currentSearchTerm.toLowerCase())
  );

  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <h1 class="page-title">Search Results</h1>
    <p class="page-subtitle">Found ${results.length} products for "${currentSearchTerm}"</p>
    <div class="products-grid">
      ${results.length === 0 ? `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
          <div style="width: 80px; height: 80px; margin: 0 auto 20px auto; border-radius: 8px; overflow: hidden; opacity: 0.5;">
            <img src="no-results.jpg" alt="No products found" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src=''; this.alt='No products found'; this.style.display='none';">
          </div>
          <h3 style="font-size: 24px; color: #2c3e50; margin: 0 0 10px 0;">No products found</h3>
          <p style="font-size: 16px; color: #7f8c8d;">Try a different search term</p>
        </div>

      ` : results.map(product => {
    const isOutOfStock = product.stock <= 0;
    return `
        <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}" style="background-image: ${product['background-image'] || 'none'}">
          <div class="product-image">
             <img src="${product.icon}" alt="${product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';">
             ${isOutOfStock ? '<span class="stock-badge" style="position: absolute; top: 10px; right: 10px; background: #e74c3c; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">Out of Stock</span>' : ''}
          </div>
          <div class="product-brand">${product.brand}</div>
          <h3 class="product-name">${product.name}</h3>
          <div class="product-price">${product.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
          <button class="add-to-cart-btn" data-product-id="${product.id}" ${isOutOfStock ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : ''}>
             ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      `}).join('')}

    </div>
  `;
  observeElements('.product-card');
}


async function addToCart(productId) {
  if (!productId || productId === 'null' || productId === 'undefined') {
    return;
  }

  // 1. Get product object (CartService.addToCart expects object)
  const allProducts = Object.values(products).flat();
  const product = allProducts.find(p => p.id === productId);

  if (!product) {
    console.error('Product not found in local state:', productId);
    return;
  }

  const result = await window.CartService.addToCart(product, 1);

  // 2. Sync Local State
  if (result.success) {
    cart = window.CartService.getCart();
    updateCartCount();

    // 3. UI Feedback (Bounce Animation)
    const cartBtn = document.getElementById('cart-btn');
    if (cartBtn) {
      cartBtn.animate([
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)' },
        { transform: 'scale(1)' }
      ], {
        duration: 300,
        easing: 'ease-out'
      });
    }
  }
}
const existingToast = document.querySelector('.toast');
if (existingToast) {
  existingToast.remove();
}

function showToast(message, bgColor = '#27ae60') {
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.background = bgColor;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Add bounce animation to cart icon
function bounceCartIcon() {
  const cartBtn = document.getElementById('cart-btn');
  if (cartBtn) {
    cartBtn.classList.add('bounce');
    setTimeout(() => {
      cartBtn.classList.remove('bounce');
    }, 500);
  }
}

// Add Intersection Observer for fade-in effect
function observeElements(selector) {
  const elements = document.querySelectorAll(selector);
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('fade-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  elements.forEach(element => {
    observer.observe(element);
  });
}

function showCart() {
  currentCategory = 'cart';
  document.querySelectorAll('.nav-links button').forEach(btn => {
    btn.classList.remove('active');
  });
  renderCartPage();
}

function renderCartPage() {
  const mainContent = document.getElementById('main-content');


  if (cart.length === 0) {
    mainContent.innerHTML = `
      <div class="cart-page">
        <div class="empty-state fade-in-up">
           <div class="empty-state-icon">🛒</div>
          <h3>Your cart is empty</h3>
          <p>Explore our premium parts and add some products to get started</p>
          <button class="back-btn" onclick="showCategory('home')">Continue Shopping</button>
        </div>
      </div>
    `;
    return;
  }

  const allProducts = Object.values(products).flat();
  const cartItems = cart.map(item => {
    // CartService uses productId (camelCase)
    const pid = item.productId || item.product_id;
    const product = allProducts.find(p => p.id === pid);
    // Fallback to data stored in cart item if full product not found
    return {
      ...item,
      product: product || {
        id: pid,
        name: item.name,
        brand: item.brand,
        price: item.price,
        icon: item.image || item.icon
      }
    };
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  mainContent.innerHTML = `
    <div class="cart-page">
      <h1 class="page-title">Shopping Cart</h1>
      <p class="page-subtitle">${cart.length} item(s) in your cart</p>
      <div>

        ${cartItems.map(item => `
          <div class="cart-item">
            <div class="cart-item-image"><img src="${item.product.icon}" alt="${item.product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';"></div>
            <div class="cart-item-details">
              <h3 class="cart-item-name">${item.product.name}</h3>
              <p class="cart-item-brand">${item.product.brand}</p>
              <div class="cart-item-price">${item.product.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
            </div>
            <div class="cart-item-actions">
              <button class="qty-btn" data-item-id="${item.id}" data-quantity="${item.quantity - 1}">-</button>
              <span class="qty-display">${item.quantity}</span>
              <button class="qty-btn" data-item-id="${item.id}" data-quantity="${item.quantity + 1}">+</button>
              <button class="remove-btn" data-item-id="${item.id}">Remove</button>
            </div>
          </div>
        `).join('')}

      </div>
      <div class="cart-summary">
        <div class="summary-row">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)} <span class="currency-symbol">EGP</span></span>
        </div>
        <div class="summary-row">
          <span>Tax (14%):</span>
          <span>${tax.toFixed(2)} <span class="currency-symbol">EGP</span></span>
        </div>
        <div class="summary-row total">
          <span>Total:</span>
          <span>${total.toFixed(2)} <span class="currency-symbol">EGP</span></span>
        </div>
        <button class="continue-shopping-btn" data-category="home">Continue Shopping</button>
        <button class="checkout-btn" data-category="checkout">Proceed to Checkout</button>
      </div>
    </div>
  `;
}


async function updateQuantity(cartItemId, newQuantity) {
  if (newQuantity < 1) return;

  console.log('Updating quantity for item:', cartItemId, 'to', newQuantity);
  const result = await window.CartService.updateQuantity(cartItemId, newQuantity);

  if (result.success) {
    cart = window.CartService.getCart();
    updateCartCount();
    renderCartPage();
  } else {
    showToast(result.error || "Failed to update cart", '#e74c3c');
  }
}

async function removeFromCart(cartItemId) {
  console.log('Removing item from cart:', cartItemId);
  const result = await window.CartService.removeFromCart(cartItemId);

  if (result.success) {
    cart = window.CartService.getCart();
    updateCartCount();
    renderCartPage();
    showToast("Removed from cart");
  } else {
    showToast(result.error || "Failed to remove item", '#e74c3c');
  }
}


function renderCheckoutPage() {
  const allProducts = Object.values(products).flat();
  const cartItems = cart.map(item => {
    const pid = item.productId || item.product_id;
    const product = allProducts.find(p => p.id === pid);
    return {
      ...item,
      product: product || {
        id: pid,
        name: item.name,
        price: item.price
      }
    };
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="checkout-page">
      <h1 class="page-title">Checkout</h1>
      <p class="page-subtitle">Complete your order</p>
      <div id="checkout-message"></div>
      <form id="checkout-form">
        <div class="form-group">
          <label for="customer-name">Full Name *</label>
          <input type="text" id="customer-name" name="customer-name" required>
        </div>
        <div class="form-group">
          <label for="customer-email">Email Address *</label>
          <input type="email" id="customer-email" name="customer-email" required>
        </div>
        <div class="form-group">
          <label for="customer-phone">Phone Number *</label>
          <input type="tel" id="customer-phone" name="customer-phone" required>
        </div>
        <div class="form-group">
          <label for="customer-address">Shipping Address *</label>
          <textarea id="customer-address" name="customer-address" required></textarea>
        </div>
        <div class="cart-summary">
          <h3 style="margin: 0 0 15px 0;">Order Summary</h3>
          ${cartItems.map(item => `
            <div class="summary-row">
              <span>${item.product.name} x ${item.quantity}</span>
              <span>${(item.product.price * item.quantity).toFixed(2)} EGP</span>
            </div>
          `).join('')}
          <div class="summary-row">
            <span>Subtotal:</span>
            <span>${subtotal.toFixed(2)} EGP</span>
          </div>
          <div class="summary-row">
            <span>Tax (14%):</span>
            <span>${tax.toFixed(2)} EGP</span>
          </div>
          <div class="summary-row total">
            <span>Total:</span>
            <span>${total.toFixed(2)} EGP</span>
          </div>
          <button type="button" class="continue-shopping-btn" data-category="cart">Back to Cart</button>
          <button type="submit" class="checkout-btn">Proceed to Payment</button>
        </div>
      </form>
    </div>
  `;

  document.getElementById('checkout-form').onsubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const shippingDetails = {
      fullName: formData.get('customer-name'),
      email: formData.get('customer-email'),
      phone: formData.get('customer-phone'),
      address: formData.get('customer-address')
    };
    renderPaymentPage(shippingDetails, total);
  };
}


function renderPaymentPage(shippingDetails, total) {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="checkout-page fade-in-up">
      <h1 class="page-title">Payment Method</h1>
      <p class="page-subtitle">Choose how you'd like to pay</p>
      
      <div class="payment-methods">
        <label class="payment-method-card active" id="method-cash">
          <input type="radio" name="payment-method" value="cash" checked>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M1 3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1H1zm7 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/><path d="M0 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H1a1 1 0 0 1-1-1V5zm3 0a2 2 0 0 1-2 2v4a2 2 0 0 1 2 2h10a2 2 0 0 1 2-2V7a2 2 0 0 1-2-2H3z"/></svg>
          <strong>Cash on Delivery</strong>
          <span style="font-size: 12px; opacity: 0.7;">Pay when you receive yours items</span>
        </label>
        
        <label class="payment-method-card" id="method-card">
          <input type="radio" name="payment-method" value="card">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="currentColor" viewBox="0 0 16 16"><path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/><path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1z"/></svg>
          <strong>Credit / Debit Card</strong>
          <span style="font-size: 12px; opacity: 0.7;">Secure online payment</span>
        </label>
      </div>

      <div id="card-details-container" class="hidden">
        <div class="card-mockup-container">
           <div class="credit-card">
              <div class="card-chip"></div>
              <div class="card-number-display" id="card-number-preview">**** **** **** ****</div>
              <div class="card-details-display">
                 <div>
                    <div style="opacity: 0.6; font-size: 10px;">Card Holder</div>
                    <div id="card-holder-preview">YOUR NAME</div>
                 </div>
                 <div>
                    <div style="opacity: 0.6; font-size: 10px;">Expires</div>
                    <div id="card-expiry-preview">MM/YY</div>
                 </div>
              </div>
           </div>
           
           <div class="card-form-grid">
              <div class="form-group" style="grid-column: span 3;">
                 <label>Card Holder Name</label>
                 <input type="text" id="card-name" placeholder="FULL NAME" maxlength="30">
              </div>
              <div class="form-group">
                 <label>Card Number</label>
                 <input type="text" id="card-number" placeholder="1234 5678 9101 1121" maxlength="19">
              </div>
              <div class="form-group">
                 <label>Expiry</label>
                 <input type="text" id="card-expiry" placeholder="MM/YY" maxlength="5">
              </div>
              <div class="form-group">
                 <label>CVV</label>
                 <input type="password" id="card-cvv" placeholder="***" maxlength="3">
              </div>
           </div>
        </div>
      </div>

      <div class="cart-summary" style="margin-top: 30px;">
        <div class="summary-row total">
          <span>Amount to Pay:</span>
          <span>${total.toFixed(2)} EGP</span>
        </div>
        <div style="display: flex; gap: 15px; margin-top: 20px;">
           <button class="continue-shopping-btn" style="flex: 1;" onclick="renderCheckoutPage()">Back to Shipping</button>
           <button id="final-place-order" class="checkout-btn" style="flex: 2;">Place Order & Pay</button>
        </div>
      </div>
    </div>
  `;

  // Payment method switching logic
  const cashBtn = document.getElementById('method-cash');
  const cardBtn = document.getElementById('method-card');
  const cardDetails = document.getElementById('card-details-container');

  cashBtn.onclick = () => {
    cashBtn.classList.add('active');
    cardBtn.classList.remove('active');
    cardDetails.classList.add('hidden');
    cashBtn.querySelector('input').checked = true;
  };

  cardBtn.onclick = () => {
    cardBtn.classList.add('active');
    cashBtn.classList.remove('active');
    cardDetails.classList.remove('hidden');
    cardBtn.querySelector('input').checked = true;
  };

  // Fake card live preview
  document.getElementById('card-name').oninput = (e) => {
    document.getElementById('card-holder-preview').textContent = e.target.value.toUpperCase() || 'YOUR NAME';
  };

  document.getElementById('card-number').oninput = (e) => {
    let val = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim();
    e.target.value = val;
    document.getElementById('card-number-preview').textContent = val || '**** **** **** ****';
  };

  document.getElementById('card-expiry').oninput = (e) => {
    let val = e.target.value.replace(/\D/g, '');
    if (val.length >= 2) val = val.slice(0, 2) + '/' + val.slice(2, 4);
    e.target.value = val;
    document.getElementById('card-expiry-preview').textContent = val || 'MM/YY';
  };

  document.getElementById('final-place-order').onclick = async () => {
    const method = document.querySelector('input[name="payment-method"]:checked').value;
    const orderData = {
      shippingAddress: shippingDetails,
      paymentMethod: method,
      paymentDetails: method === 'card' ? {
        cardHolder: shippingDetails.fullName,
        cardNumber: '***' + document.getElementById('card-number').value.slice(-4)
      } : null
    };

    submitFinalOrder(orderData);
  };
}

async function submitFinalOrder(orderData) {
  const submitBtn = document.getElementById('final-place-order');
  submitBtn.disabled = true;
  submitBtn.textContent = "Processing Payment...";

  try {
    const result = await window.OrdersService.createOrder(orderData);

    if (result.success) {
      cart = [];
      updateCartCount();

      const mainContent = document.getElementById('main-content');
      mainContent.innerHTML = `
        <div class="checkout-page fade-in-up" style="text-align: center; padding: 60px 20px;">
          <div style="font-size: 80px; margin-bottom: 20px;">✅</div>
          <h1 class="page-title">Order Successful!</h1>
          <p class="page-subtitle">Thank you for your purchase.</p>
          <div class="success-message" style="max-width: 500px; margin: 30px auto;">
            <strong>Order #${result.order.id.slice(0, 8)} confirmed.</strong><br>
            A confirmation email has been sent to ${orderData.shippingAddress.email}.
          </div>
          <button class="checkout-btn" onclick="showCategory('home')">Back to Home</button>
        </div>
      `;
    } else {
      showToast(result.error || "Order failed", '#e74c3c');
      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order & Pay";
    }
  } catch (e) {
    console.error(e);
    showToast("An unexpected error occurred", '#e74c3c');
    submitBtn.disabled = false;
    submitBtn.textContent = "Place Order & Pay";
  }
}


function renderServicePage() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="service-page">
      <h1 class="page-title">Service Booking</h1>
      <p class="page-subtitle">Schedule your maintenance service based on mileage</p>
      <div class="service-grid">
        ${servicePackages.map((pkg, index) => `
          <div class="service-card ${selectedService === index ? 'selected' : ''}" data-service-index="${index}">
            <div class="service-title">${pkg.title}</div>
            <div class="service-price">${pkg.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
            <p style="margin: 10px 0 0 0; color: #7f8c8d; font-size: 14px;">${pkg.items.length} service items</p>
          </div>
        `).join('')}
      </div>
      <div id="service-details-container"></div>
    </div>
  `;
}

function showProductDetails(productId) {
  window.location.href = `product.html?id=${productId}`;
}

function renderProductDetailsPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');
  const allProducts = Object.values(products).flat();
  const product = allProducts.find(p => p.id === productId);

  if (!product) {
    document.getElementById('product-details-container').innerHTML = '<h2>Product not found</h2>';
    return;
  }

  document.getElementById('product-details-container').innerHTML = `
    <button onclick="history.back()" class="back-btn-modern">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
      Back
    </button>
    <div class="product-details-content fade-in-up" style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; background: rgba(255,255,255,0.03); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); backdrop-filter: blur(10px);">
      <div class="product-details-image" style="background: white; border-radius: 15px; padding: 20px; display: flex; align-items: center; justify-content: center; height: 450px;">
        <img src="${product.icon}" alt="${product.name}" onerror="this.src=''; this.alt='Image not found'; this.style.display='none';" style="max-width: 100%; max-height: 100%; object-fit: contain;">
      </div>
      <div class="product-details-info">
        <div class="product-brand" style="font-size: 16px; color: var(--accent-color); font-weight: 700; text-transform: uppercase; margin-bottom: 10px;">${product.brand}</div>
        <h2 style="margin: 0 0 15px 0; color: white; font-size: 32px; font-weight: 800;">${product.name}</h2>
        <div class="product-price" style="font-size: 36px; color: var(--secondary-color); font-weight: 700; margin-bottom: 25px;">${product.price.toFixed(2)} <span class="currency-symbol" style="font-size: 18px;">EGP</span></div>
        
        <div style="background: rgba(0,0,0,0.2); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
           <p style="color: #ccc; font-size: 16px; line-height: 1.8; margin: 0;">${product.description}</p>
        </div>

        <div class="product-specs" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px;">
          <div class="spec-item">
            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">SKU / PART NO</span>
            <span style="font-weight: 600;">${product.sku || 'N/A'}</span>
          </div>
          <div class="spec-item">
            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">VEHICLE MODEL</span>
            <span style="font-weight: 600;">${product.car_model || 'Universal'}</span>
          </div>
          <div class="spec-item">
            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">YEAR COMPATIBILITY</span>
            <span style="font-weight: 600;">${product.year_compatibility || 'All Years'}</span>
          </div>
          <div class="spec-item">
            <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">Category</span>
            <span style="font-weight: 600;">${product.category || 'Standard'}</span>
          </div>
          <div class="spec-item">
             <span style="display: block; font-size: 12px; color: #666; text-transform: uppercase;">Stock Status</span>
             <span style="color: ${product.stock > 0 ? '#27ae60' : '#e74c3c'}; font-weight: bold;">
                 ${product.stock > 0 ? 'In Stock' : 'Out of Stock'}
             </span>
          </div>
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 40px;">
          <button class="add-to-cart-btn" data-product-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''} style="flex: 2; height: 55px; font-size: 18px; font-weight: 700;">
              ${product.stock <= 0 ? 'NOT AVAILABLE' : 'ADD TO CART'}
          </button>
          <button class="favorite-btn ${window.FavoritesService.isFavorite(product.id) ? 'active' : ''}" 
                  data-product-id="${product.id}"
                  style="flex: 1; border-radius: 8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16" style="margin: 0 auto;">
              <path d="m8 2.748-.717-.737C5.6.281 2.514.878 1.4 3.053c-.523 1.023-.641 2.5.314 4.385.92 1.815 2.834 3.989 6.286 6.357 3.452-2.368 5.365-4.542 6.286-6.357.955-1.886.838-3.362.314-4.385C13.486.878 10.4.28 8.717 2.01L8 2.748zM8 15C-7.333 4.868 3.279-3.04 7.824 1.143c.06.055.119.112.176.171a3.12 3.12 0 0 1 .176-.17C12.72-3.042 23.333 4.867 8 15z"/>
            </svg>
          </button>
        </div>

        <div class="reviews-section" style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 30px;">
           <h3 style="color: white; margin-bottom: 20px;">Customer Reviews</h3>
           <div id="reviews-container">
              <p style="color: #666; font-style: italic;">No reviews yet. Be the first to review this product!</p>
           </div>
        </div>
      </div>
    </div>
  `;

  // Fetch real reviews
  window.ProductsService.getProductReviews(productId).then(res => {
    if (res.success && res.reviews.length > 0) {
      const container = document.getElementById('reviews-container');
      container.innerHTML = res.reviews.map(r => `
           <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                 <span style="font-weight: 700; color: white;">${r.profile?.full_name || 'Verified Buyer'}</span>
                 <span style="color: var(--secondary-color);">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
              </div>
              <p style="color: #999; margin: 0; font-size: 14px;">${r.comment}</p>
           </div>
        `).join('');
    }
  });
}

function selectService(index) {
  currentCategory = 'service-details';
  selectedService = index;
  includeParts = true; // Always include parts
  selectedParts = [];

  // Auto-select all available products for this package
  const pkg = servicePackages[selectedService];
  if (pkg.products && pkg.products.length > 0) {
    selectedParts = pkg.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price
    }));
  }

  renderServiceDetailsPage();
}

function renderServiceDetailsPage() {
  if (selectedService === null) return;

  const pkg = servicePackages[selectedService];

  // Calculate totals with included parts
  const partsTotal = pkg.products ? pkg.products.reduce((sum, p) => sum + p.price, 0) : 0;
  const subtotal = pkg.price + partsTotal;
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <div class="service-details-page">
      <button class="back-btn-modern" data-category="service" style="margin-bottom: 20px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path fill-rule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
        Back to Services
      </button>
      <h1 class="page-title">${pkg.title}</h1>
      <p class="page-subtitle">Premium maintenance package for your vehicle</p>
      
      <div style="background: rgba(40,40,40,0.5); padding: 30px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 30px;">
        <div style="grid-template-columns: 1fr; gap: 20px; display: grid;">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div>
              <p style="margin: 5px 0 0 0; color: #888;">Complete Package Details</p>
            </div>
            <div style="background: var(--accent-color); color: black; padding: 10px 20px; border-radius: 10px; font-weight: 800; font-size: 20px;">
              ${pkg.price.toFixed(2)} EGP
            </div>
          </div>
          
          <div style="border-top: 1px solid rgba(255,255,255,0.05); padding-top: 20px;">
             <h4 style="margin: 0 0 15px 0; color: #ccc; text-transform: uppercase; font-size: 12px; letter-spacing: 1px;">Service Tasks</h4>
             <ul style="padding: 0; margin: 0; list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
               ${pkg.items.map(item => `
                 <li style="display: flex; align-items: center; gap: 8px; color: #eee; font-size: 14px;">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#27ae60" viewBox="0 0 16 16"><path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/></svg>
                   ${item.name}
                 </li>
               `).join('')}
             </ul>
          </div>
        </div>
      </div>

      ${pkg.products && pkg.products.length > 0 ? `
      <div class="included-parts" style="margin-top: 30px;">
        <h3 style="margin-bottom: 20px; color: var(--accent-color);">Parts Included</h3>
        <div class="parts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
          ${pkg.products.map(p => `
            <div class="part-card" style="background: white; padding: 15px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); text-align: center; color: #333;">
              <div style="height: 120px; background: white; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center; padding: 10px;">
                <img src="${p.icon || ''}" alt="${p.name}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
              </div>
              <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px; color: #222; min-height: 40px; display: flex; align-items: center; justify-content: center;">${p.name}</div>
              <div style="background: #f8f9fa; color: #27ae60; font-weight: 800; border-radius: 6px; padding: 5px;">${p.price.toFixed(2)} EGP</div>
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      <div class="booking-form" style="margin-top: 40px; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 16px;">
        <h3 style="color: white; margin-bottom: 25px;">Schedule Your Appointment</h3>
        <form id="service-booking-form">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Full Name *</label>
              <input type="text" id="service-customer-name" required placeholder="John Doe" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Phone Number *</label>
              <input type="tel" id="service-customer-phone" required placeholder="+20 1XX XXX XXXX" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Email Address *</label>
              <input type="email" id="service-customer-email" required placeholder="john@example.com" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Vehicle Make *</label>
              <input type="text" id="service-vehicle-make" required placeholder="e.g. Toyota" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Vehicle Model *</label>
              <input type="text" id="service-vehicle-model" required placeholder="e.g. Corolla" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Model Year *</label>
              <input type="number" id="service-vehicle-year" required placeholder="2024" min="1900" max="${new Date().getFullYear() + 1}" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Preferred Date *</label>
              <input type="date" id="service-appointment-date" required min="${new Date().toISOString().split('T')[0]}" style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
            <div class="form-group">
              <label style="display: block; margin-bottom: 8px; color: #888;">Preferred Time *</label>
              <input type="time" id="service-appointment-time" required style="width: 100%; padding: 12px; background: #111; border: 1px solid #333; border-radius: 8px; color: white;">
            </div>
          </div>

          <div class="payment-summary" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 30px;">
            <div style="max-width: 400px; margin-left: auto;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; color: #888;">
                <span>Workshop Service Fee</span>
                <span>${pkg.price.toFixed(2)} EGP</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; color: #888;">
                <span>Total Parts Cost</span>
                <span>${partsTotal.toFixed(2)} EGP</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-weight: 600;">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)} EGP</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 15px; color: #888;">
                <span>VAT (14%)</span>
                <span>${tax.toFixed(2)} EGP</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 20px; padding-top: 20px; border-top: 2px solid var(--accent-color);">
                <span style="font-size: 20px; font-weight: 800; color: white;">Total Payable</span>
                <span style="font-size: 24px; font-weight: 800; color: var(--accent-color);">${total.toFixed(2)} EGP</span>
              </div>
              <button type="submit" class="checkout-btn" id="book-service-btn" style="width: 100%; margin-top: 30px; padding: 18px; font-size: 18px;">Confirm Appointment</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  `;
}

function getServiceDescription(serviceName) {
  const descriptions = {
    'Engine Oil Change': 'Replace old engine oil with fresh, high-quality oil',
    'Oil Filter Replacement': 'Install new oil filter to ensure clean oil circulation',
    'Air Filter Replacement': 'Replace air filter for optimal engine breathing',
    'Air Filter Inspection': 'Check air filter condition and clean if necessary',
    'Spark Plugs Replacement': 'Install new spark plugs for better ignition',
    'Spark Plugs Check': 'Inspect spark plugs condition and gap',
    'Timing Belt Replacement': 'Replace timing belt to prevent engine damage',
    'Timing Belt Inspection': 'Check timing belt for wear and proper tension',
    'Water Pump Replacement': 'Install new water pump for cooling system',
    'Water Pump Check': 'Inspect water pump for leaks and proper operation',
    'Water Pump Inspection': 'Check water pump condition and coolant flow',
    'Thermostat Replacement': 'Replace thermostat for proper temperature control',
    'Thermostat Check': 'Test thermostat operation and temperature range',
    'Transmission Fluid Change': 'Replace transmission fluid for smooth shifting',
    'Transmission Fluid Check': 'Check transmission fluid level and condition',
    'Coolant Flush': 'Complete cooling system flush and refill',
    'Coolant Replacement': 'Replace old coolant with fresh antifreeze',
    'Coolant Check': 'Check coolant level and concentration',
    'Brake Pads Inspection': 'Inspect brake pads for wear and thickness',
    'Brake Pads Front': 'Replace front brake pads for safe stopping',
    'Brake Pads Rear': 'Replace rear brake pads for optimal braking',
    'Brake Pads All Around': 'Replace all brake pads front and rear',
    'Brake Pads & Rotors Front': 'Replace front brake pads and rotors',
    'Brake Pads & Rotors Rear': 'Replace rear brake pads and rotors',
    'Brake Fluid Check': 'Check brake fluid level and color',
    'Brake Fluid Replacement': 'Replace brake fluid for safe braking',
    'Brake Fluid Flush': 'Complete brake system fluid flush',
    'Brake System Overhaul': 'Complete brake system inspection and service',
    'Brake Inspection': 'Comprehensive brake system inspection',
    'Tire Rotation': 'Rotate tires for even wear pattern',
    'Tire Rotation & Balance': 'Rotate and balance tires for smooth ride',
    'Battery Test': 'Test battery condition and charging system',
    'Cabin Air Filter': 'Replace cabin air filter for clean interior air',
    'Power Steering Fluid': 'Check and top up power steering fluid',
    'Differential Oil Change': 'Replace differential oil for smooth operation',
    'Fuel System Cleaning': 'Clean fuel injectors and system components',
    'Fuel System Clean': 'Professional fuel system cleaning service',
    'Engine Degreasing': 'Clean engine bay and remove oil buildup',
    'Suspension Check': 'Inspect suspension components for wear',
    'Complete Inspection': 'Comprehensive vehicle safety inspection',
    'Complete Vehicle Inspection': 'Full multi-point vehicle inspection',
    'Comprehensive Inspection': 'Detailed inspection of all vehicle systems'
  };

  return descriptions[serviceName] || 'Professional automotive service';
}

function togglePartsSelection(checked) {
  includeParts = checked;

  if (checked) {
    renderPartsSelection();
  } else {
    document.getElementById('parts-selection-container').innerHTML = '';
    selectedParts = [];
    updateServiceTotal();
  }
}

function renderPartsSelection() {
  const pkg = servicePackages[selectedService];
  const allProducts = Object.values(products).flat();

  const availableParts = pkg.items
    .filter(item => item.part)
    .map(item => {
      const product = allProducts.find(p => p.id === item.part);
      return { ...item, product };
    })
    .filter(item => item.product);

  const container = document.getElementById('parts-selection-container');
  container.innerHTML = `
    <div class="parts-selection">
      <h4 style="margin: 0 0 15px 0; color: #2c3e50;">Select Parts to Include:</h4>
      ${availableParts.map(item => `
        <div class="part-item">
          <label>
            <input type="checkbox" value="${item.product.id}" data-price="${item.product.price}">
            <span>${item.product.name} (${item.product.brand})</span>
          </label>
          <span class="part-price">${item.product.price.toFixed(2)} <span class="currency-symbol">EGP</span></span>
        </div>
      `).join('')}
    </div>
  `;
}

function togglePart(productId, price, checked) {
  if (checked) {
    selectedParts.push({ productId, price });
  } else {
    selectedParts = selectedParts.filter(p => p.productId !== productId);
  }
  updateServiceTotal();
}

function updateServiceTotal() {
  const pkg = servicePackages[selectedService];
  const partsCost = selectedParts.reduce((sum, part) => sum + part.price, 0);
  const subtotal = pkg.price + partsCost;
  const tax = subtotal * 0.14;
  const total = subtotal + tax;

  const partsCostRow = document.getElementById('parts-cost-row');
  const partsCostSpan = document.getElementById('parts-cost');
  const subtotalCostSpan = document.getElementById('subtotal-cost');
  const taxCostSpan = document.getElementById('tax-cost');
  const totalCostSpan = document.getElementById('total-cost');

  if (partsCost > 0) {
    partsCostRow.style.display = 'flex';
    partsCostSpan.innerHTML = `${partsCost.toFixed(2)} <span class="currency-symbol">EGP</span>`;
  } else {
    partsCostRow.style.display = 'none';
  }

  subtotalCostSpan.innerHTML = `${subtotal.toFixed(2)} <span class="currency-symbol">EGP</span>`;
  taxCostSpan.innerHTML = `${tax.toFixed(2)} <span class="currency-symbol">EGP</span>`;
  totalCostSpan.innerHTML = `${total.toFixed(2)} <span class="currency-symbol">EGP</span>`;
}


async function submitServiceBooking(event) {
  event.preventDefault();

  const pkg = servicePackages[selectedService];
  if (!pkg || !pkg.id || pkg.id === 'null' || pkg.id === 'undefined') {
    showToast("Service configuration error. Please try again later.", '#e74c3c');
    return;
  }

  const submitBtn = document.getElementById('book-service-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = "Booking...";

  const name = document.getElementById('service-customer-name').value;
  const phone = document.getElementById('service-customer-phone').value;
  const email = document.getElementById('service-customer-email').value;
  const date = document.getElementById('service-appointment-date').value;
  const time = document.getElementById('service-appointment-time')?.value || "09:00";

  const vMake = document.getElementById('service-vehicle-make').value;
  const vModel = document.getElementById('service-vehicle-model').value;
  const vYear = document.getElementById('service-vehicle-year').value;

  const bookingData = {
    serviceTypeId: pkg.id,
    scheduledDate: date,
    scheduledTime: time,
    vehicleInfo: {
      make: vMake,
      model: vModel,
      year: vYear,
      mileage: pkg.km
    },
    customerInfo: { name, phone, email }, // Optional, mostly for guest (Supabase service expects auth)
    notes: includeParts ? `Include parts: ${selectedParts.map(p => p.id).join(', ')}` : ''
  };

  try {
    const result = await window.BookingsService.createBooking(bookingData);

    if (result.success) {
      const form = document.getElementById('service-booking-form');
      form.innerHTML = `
          <div class="success-message">
            <strong>Service appointment booked successfully!</strong><br>
            Your ${pkg.km} KM service has been scheduled for ${date}. We'll send a confirmation to ${email}.
          </div>
        `;

      setTimeout(() => {
        showCategory('home');
      }, 3000);
    } else {
      if (result.requiresAuth) {
        showToast("Please login to book a service", '#e74c3c');
        setTimeout(() => window.location.href = 'login.html', 1500);
      } else {
        showToast(result.error || "Failed to book service", '#e74c3c');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Book Service Appointment';
      }
    }
  } catch (e) {
    console.error(e);
    showToast("Booking failed due to an error", '#e74c3c');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Book Service Appointment';
  }
}


document.addEventListener('DOMContentLoaded', initApp);

// ==========================================
// SERVICE SYNC & GLOBAL EVENTS
// ==========================================
window.addEventListener('cartUpdated', (e) => {
  cart = e.detail.cart;
  updateCartCount();
  if (currentCategory === 'cart') renderCartPage();
});

window.addEventListener('favoritesUpdated', (e) => {
  if (currentCategory === 'favorites') {
    renderFavoritesPage();
  }
});

function flyToCart(element) {
  const img = element.querySelector('img');
  if (!img) return;

  const flyingImage = img.cloneNode();
  const rect = img.getBoundingClientRect();

  flyingImage.style.position = 'fixed';
  flyingImage.style.left = `${rect.left}px`;
  flyingImage.style.top = `${rect.top}px`;
  flyingImage.style.width = `${rect.width}px`;
  flyingImage.style.height = `${rect.height}px`;
  flyingImage.style.transition = 'all 1s ease-in-out';
  flyingImage.style.zIndex = '10000';

  document.body.appendChild(flyingImage);

  const cartIcon = document.getElementById('cart-btn');
  const cartRect = cartIcon.getBoundingClientRect();

  requestAnimationFrame(() => {
    flyingImage.style.left = `${cartRect.left + cartRect.width / 2}px`;
    flyingImage.style.top = `${cartRect.top + cartRect.height / 2}px`;
    flyingImage.style.width = '0px';
    flyingImage.style.height = '0px';
    flyingImage.style.opacity = '0';
  });

  setTimeout(() => {
    flyingImage.remove();
  }, 1000);
}

document.addEventListener('click', (e) => {
  const categoryButton = e.target.closest('[data-category]');
  if (categoryButton) {
    showCategory(categoryButton.dataset.category);
  }

  if (e.target.matches('.add-to-cart-btn')) {
    const productCard = e.target.closest('.product-card');
    if (productCard) {
      flyToCart(productCard);
    }
    // Handled by AppIntegration to avoid double-add
    // addToCart(e.target.dataset.productId); 
  }

  if (e.target.matches('.view-details-btn')) {
    showProductDetails(e.target.dataset.productId);
  }
  if (e.target.matches('.close-modal')) {
    closeProductModal();
  }
  if (e.target.matches('.product-details-modal')) {
    closeProductModal();
  }

  if (e.target.matches('.qty-btn')) {
    updateQuantity(e.target.dataset.itemId, parseInt(e.target.dataset.quantity));
  }
  if (e.target.matches('.remove-btn')) {
    removeFromCart(e.target.dataset.itemId);
  }

  const serviceCard = e.target.closest('[data-service-index]');
  if (serviceCard) {
    selectService(parseInt(serviceCard.dataset.serviceIndex));
  }
  if (e.target.matches('#include-parts-checkbox')) {
    togglePartsSelection(e.target.checked);
  }
  if (e.target.matches('.part-item input[type="checkbox"]')) {
    togglePart(e.target.value, parseFloat(e.target.dataset.price), e.target.checked);
  }
  // Click listener for favorite toggle handled by AppIntegration.js
});

async function renderFavoritesPage() {
  const mainContent = document.getElementById('main-content');
  mainContent.innerHTML = `
    <h1 class="page-title">My Favorites</h1>
    <p class="page-subtitle">Your personally curated collection of parts</p>
    <div id="products-grid" class="products-grid"></div>
  `;

  const { favorites } = await window.FavoritesService.getFavoritesWithDetails();
  const grid = document.getElementById('products-grid');

  if (!favorites || favorites.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px;">
        <div style="font-size: 64px; margin-bottom: 20px;">❤️</div>
        <h3>Your wishlist is empty</h3>
        <p>Save products you love to keep track of them here.</p>
        <button class="back-btn" onclick="showCategory('home')" style="margin-top: 20px;">Browse Shop</button>
      </div>
    `;
    return;
  }

  // Map favorites back to UI products format if needed, 
  // but FavoritesService.getFavoritesWithDetails already gives full products
  const uiProducts = favorites.filter(f => f.product).map(f => mapProductToUI(f.product));

  // We need to temporarily mock the 'favorites' category in the global products object
  products['favorites'] = uiProducts;
  renderProducts('favorites');
}

document.addEventListener('submit', (e) => {
  if (e.target.matches('#service-booking-form')) {
    submitServiceBooking(e);
  }
});


document.getElementById('search-btn').addEventListener('click', performSearch);
document.getElementById('cart-btn').addEventListener('click', showCart);
