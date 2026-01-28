/**
 * ==========================================
 * UI UTILITIES
 * ==========================================
 * Common UI helper functions
 */

const UI = {
    /**
     * Enhanced Toast Notification System
     * @param {string} message - Message to display
     * @param {string} bgColor - Background color (legacy support)
     * @param {Object} options - Additional options
     * @param {string} options.type - Toast type: 'success', 'error', 'warning', 'info'
     * @param {number} options.duration - Duration in ms (default: 4000)
     * @param {boolean} options.closable - Show close button (default: true)
     * @param {boolean} options.showProgress - Show progress bar (default: true)
     */
    showToast(message, bgColor = '#27ae60', options = {}) {
        // Determine type from bgColor if not specified
        let type = options.type;
        if (!type) {
            if (bgColor === '#27ae60' || bgColor.includes('27ae60')) type = 'success';
            else if (bgColor === '#e74c3c' || bgColor.includes('e74c3c')) type = 'error';
            else if (bgColor === '#f39c12' || bgColor.includes('f39c12')) type = 'warning';
            else type = 'info';
        }

        const duration = options.duration || 4000;
        const closable = options.closable !== false;
        const showProgress = options.showProgress !== false;

        // Create or get toast container
        let container = document.querySelector('.enhanced-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'enhanced-toast-container';
            document.body.appendChild(container);
        }

        // Limit max visible toasts
        const existingToasts = container.querySelectorAll('.enhanced-toast');
        if (existingToasts.length >= 5) {
            existingToasts[0].remove();
        }

        // Toast icons
        const icons = {
            success: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>`,
            error: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="15" y1="9" x2="9" y2="15"/>
                <line x1="9" y1="9" x2="15" y2="15"/>
            </svg>`,
            warning: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
            info: `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>`
        };

        // Toast titles
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `enhanced-toast enhanced-toast-${type}`;
        toast.innerHTML = `
            <div class="toast-icon-wrapper">
                ${icons[type]}
            </div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            ${closable ? `<button class="toast-close" aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>` : ''}
            ${showProgress ? `<div class="toast-progress"><div class="toast-progress-bar"></div></div>` : ''}
        `;

        container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('toast-show');
        });

        // Setup progress bar animation
        if (showProgress) {
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                progressBar.style.transition = `width ${duration}ms linear`;
                requestAnimationFrame(() => {
                    progressBar.style.width = '0%';
                });
            }
        }

        // Close function
        const closeToast = () => {
            toast.classList.remove('toast-show');
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        };

        // Close button event
        if (closable) {
            const closeBtn = toast.querySelector('.toast-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', closeToast);
            }
        }

        // Auto remove
        const autoRemoveTimeout = setTimeout(closeToast, duration);

        // Pause on hover
        toast.addEventListener('mouseenter', () => {
            clearTimeout(autoRemoveTimeout);
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                progressBar.style.transition = 'none';
            }
        });

        toast.addEventListener('mouseleave', () => {
            const progressBar = toast.querySelector('.toast-progress-bar');
            if (progressBar) {
                const remaining = duration * 0.3; // Give 30% more time
                progressBar.style.transition = `width ${remaining}ms linear`;
                progressBar.style.width = '0%';
            }
            setTimeout(closeToast, duration * 0.3);
        });

        return toast;
    },

    updateBreadcrumb(items = []) {
        const container = document.getElementById('breadcrumb');
        if (!container) return;

        const homeItem = { label: 'Home', action: () => window.location.href = window.getPagePath('index') };
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
            const duration = window.AppConstants?.ANIMATIONS?.BOUNCE_DURATION || 500;
            setTimeout(() => cartBtn.classList.remove('bounce'), duration);
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
