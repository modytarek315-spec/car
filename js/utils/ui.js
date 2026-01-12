const UI = {
    showToast(message, bgColor = '#27ae60') {
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
    },

    updateBreadcrumb(items = []) {
        const container = document.getElementById('breadcrumb');
        if (!container) return;

        const homeItem = { label: 'Home', action: () => window.Router.navigate('home') };
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
    },

    renderProductSkeletons() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        const title = mainContent.querySelector('.page-title')?.textContent || 'Loading...';
        mainContent.innerHTML = `
            <h1 class="page-title">${title}</h1>
            <p class="page-subtitle">Finding the best parts for you...</p>
            <div class="products-grid" id="products-grid">
                ${Array(8).fill(0).map(() => `
                    <div class="product-card">
                        <div class="skeleton-img skeleton" style="height: 180px; width: 100%;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; height: 12px; margin-top: 10px;"></div>
                        <div class="skeleton skeleton-text" style="width: 80%; height: 20px;"></div>
                        <div class="skeleton skeleton-text" style="width: 30%; height: 25px;"></div>
                        <div class="skeleton skeleton-text" style="width: 100%; height: 40px; border-radius: 6px; margin-top: 10px;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderCategorySkeletons() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        mainContent.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="skeleton skeleton-text" style="width: 300px; height: 40px; margin-bottom: 15px;"></div>
                <div class="skeleton skeleton-text" style="width: 200px; height: 20px; margin-bottom: 40px;"></div>
            </div>
            <div class="category-grid">
                ${Array(4).fill(0).map(() => `
                    <div class="category-card">
                        <div class="category-card-image-wrapper skeleton" style="background: #333; height: 120px; width: 100%;"></div>
                        <div class="skeleton skeleton-text" style="width: 60%; margin: 15px auto 10px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%; margin: 0 auto;"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    bounceCartIcon() {
        const cartBtn = document.getElementById('cart-btn');
        if (cartBtn) {
            cartBtn.classList.add('bounce');
            setTimeout(() => {
                cartBtn.classList.remove('bounce');
            }, 500);
        }
    },

    flyToCart(element) {
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
    },

    observeElements(selector) {
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
};

window.UI = UI;
