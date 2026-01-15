const CartPage = {
    render() {
        const mainContent = document.getElementById('main-content');
        const cart = window.AppState.cart;
        const products = window.AppState.products;

        window.UI.updateBreadcrumb([{ label: 'Shopping Cart', action: () => window.location.href = 'cart.html' }]);

        if (cart.length === 0) {
            mainContent.innerHTML = `
                <div class="cart-page">
                    <div class="empty-state fade-in-up">
                        <div class="empty-state-icon">🛒</div>
                        <h3>Your cart is empty</h3>
                        <p>Explore our premium parts and add some products to get started</p>
                        <button class="back-btn" onclick="window.location.href='index.html'">Continue Shopping</button>
                    </div>
                </div>
            `;
            return;
        }

        const allProducts = Object.values(products).flat();
        const cartItems = cart.map(item => {
            const pid = item.productId || item.product_id;
            const product = allProducts.find(p => p.id === pid);
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
                                <div class="cart-item-brand">${item.product.brand}</div>
                                <h3 class="cart-item-name">${item.product.name}</h3>
                                <div class="cart-item-price">${item.product.price.toFixed(2)} EGP</div>
                            </div>
                            <div class="cart-item-actions">
                                <button class="qty-btn" data-item-id="${item.id}" data-quantity="${item.quantity - 1}">-</button>
                                <span class="qty-display">${item.quantity}</span>
                                <button class="qty-btn" data-item-id="${item.id}" data-quantity="${item.quantity + 1}">+</button>
                                <button class="remove-btn" data-item-id="${item.id}" style="margin-left: 10px;">Remove</button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="cart-summary">
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
                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                        <button class="continue-shopping-btn" onclick="window.location.href='index.html'">Continue Shopping</button>
                        <button class="checkout-btn" onclick="window.location.href='checkout.html'">Proceed to Checkout</button>
                    </div>
                </div>
            </div>
        `;
    }
};

window.CartPage = CartPage;
