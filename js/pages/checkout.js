const CheckoutPage = {
    render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([
            { label: 'Cart', action: () => window.location.href = 'cart.html' },
            { label: 'Checkout', action: () => window.location.href = 'checkout.html' }
        ]);

        mainContent.innerHTML = `
            <div class="checkout-page">
                <h1 class="page-title">Checkout</h1>
                <p class="page-subtitle">Complete your order parts</p>
                
                <div class="bg-gray-800 p-8 rounded-2xl border border-gray-700 shadow-xl">
                    <form id="shipping-form" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="form-group">
                                <label>Full Name</label>
                                <input type="text" id="ship-name" required placeholder="John Doe">
                            </div>
                            <div class="form-group">
                                <label>Email Address</label>
                                <input type="email" id="ship-email" required placeholder="john@example.com">
                            </div>
                            <div class="form-group md:col-span-2">
                                <label>Shipping Address</label>
                                <textarea id="ship-address" required placeholder="Street address, City, Apartment..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>Phone Number</label>
                                <input type="tel" id="ship-phone" required placeholder="+20 1XX XXX XXXX">
                            </div>
                            <div class="form-group">
                                <label>City</label>
                                <input type="text" id="ship-city" required placeholder="Cairo">
                            </div>
                        </div>
                        <button type="submit" class="checkout-btn w-full py-4 text-lg">Continue to Payment</button>
                    </form>
                </div>
            </div>
        `;

        document.getElementById('shipping-form').onsubmit = (e) => {
            e.preventDefault();
            const shippingData = {
                fullName: document.getElementById('ship-name').value,
                email: document.getElementById('ship-email').value,
                address: document.getElementById('ship-address').value,
                phone: document.getElementById('ship-phone').value,
                city: document.getElementById('ship-city').value
            };
            this.renderPaymentPage(shippingData);
        };
    },

    renderPaymentPage(shippingDetails) {
        const mainContent = document.getElementById('main-content');
        const cart = window.AppState.cart;
        const products = window.AppState.products;
        const allProducts = Object.values(products).flat();

        const subtotal = cart.reduce((sum, item) => {
            const p = allProducts.find(prod => prod.id === (item.productId || item.product_id));
            return sum + (p ? p.price * item.quantity : 0);
        }, 0);
        const tax = subtotal * 0.14;
        const total = subtotal + tax;

        mainContent.innerHTML = `
            <div class="checkout-page">
                <h1 class="page-title">Secure Payment</h1>
                <p class="page-subtitle">Choose your preferred payment method</p>

                <div class="payment-methods">
                    <div class="payment-method-card active" id="method-cash">
                        <input type="radio" name="payment-method" value="cash" checked>
                        <i class="bi bi-cash-stack"></i>
                        <span>Cash on Delivery</span>
                    </div>
                    <div class="payment-method-card" id="method-card">
                        <input type="radio" name="payment-method" value="card">
                        <i class="bi bi-credit-card"></i>
                        <span>Credit / Debit Card</span>
                    </div>
                </div>

                <div id="card-details-container" class="card-mockup-container hidden">
                    <div class="credit-card" id="card-preview">
                        <div class="card-chip"></div>
                        <div class="card-number-display" id="card-number-preview">**** **** **** ****</div>
                        <div class="card-details-display">
                            <div>
                                <span>Card Holder</span>
                                <div id="card-holder-preview">YOUR NAME</div>
                            </div>
                            <div>
                                <span>Expiry</span>
                                <div id="card-expiry-preview">MM/YY</div>
                            </div>
                        </div>
                    </div>

                    <div class="card-form-grid">
                        <div class="form-group">
                            <label>Card Holder Name</label>
                            <input type="text" id="card-name" placeholder="Full Name on Card">
                        </div>
                        <div class="form-group">
                            <label>Card Number</label>
                            <input type="text" id="card-number" placeholder="0000 0000 0000 0000" maxlength="19">
                        </div>
                        <div class="card-form-grid" style="grid-template-columns: 1fr 1fr; gap: 15px; grid-column: span 3;">
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
                        <button class="continue-shopping-btn" style="flex: 1;" onclick="window.CheckoutPage.render()">Back to Shipping</button>
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

            this.submitFinalOrder(orderData);
        };
    },

    async submitFinalOrder(orderData) {
        const submitBtn = document.getElementById('final-place-order');
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing Payment...";

        try {
            const result = await window.OrdersService.createOrder(orderData);

            if (result.success) {
                window.AppState.cart = [];
                window.CartService.clearCart();
                window.App.updateCartCount();

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
                        <button class="checkout-btn" onclick="window.location.href='index.html'">Back to Home</button>
                    </div>
                `;
            } else {
                window.UI.showToast(result.error || "Order failed", '#e74c3c');
                submitBtn.disabled = false;
                submitBtn.textContent = "Place Order & Pay";
            }
        } catch (e) {
            console.error(e);
            window.UI.showToast("An unexpected error occurred", '#e74c3c');
            submitBtn.disabled = false;
            submitBtn.textContent = "Place Order & Pay";
        }
    }
};

window.CheckoutPage = CheckoutPage;
