const ServicePage = {
    render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([{ label: 'Service Booking', action: () => window.Router.navigate('service') }]);

        const servicePackages = window.AppState.servicePackages;

        mainContent.innerHTML = `
            <div class="service-page">
                <h1 class="page-title">Service Booking</h1>
                <p class="page-subtitle">Schedule your maintenance service based on mileage</p>
                <div class="service-grid">
                    ${servicePackages.map((pkg, index) => `
                        <div class="service-card ${window.AppState.selectedService === index ? 'selected' : ''}" data-service-index="${index}">
                            <div class="service-title">${pkg.title}</div>
                            <div class="service-price">${pkg.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
                            <p style="margin: 10px 0 0 0; color: #7f8c8d; font-size: 14px;">${pkg.items.length} service items</p>
                        </div>
                    `).join('')}
                </div>
                <div id="service-details-container"></div>
            </div>
        `;
    },

    selectService(index) {
        window.AppState.currentCategory = 'service-details';
        window.AppState.selectedService = index;
        window.AppState.includeParts = true;
        window.AppState.selectedParts = [];

        const pkg = window.AppState.servicePackages[index];
        if (pkg.products && pkg.products.length > 0) {
            window.AppState.selectedParts = pkg.products.map(p => ({
                id: p.id,
                name: p.name,
                price: p.price
            }));
        }

        this.renderServiceDetails(index);
    },

    renderServiceDetails(index) {
        const pkg = window.AppState.servicePackages[index];
        const partsTotal = pkg.products ? pkg.products.reduce((sum, p) => sum + p.price, 0) : 0;
        const subtotal = pkg.price + partsTotal;
        const tax = subtotal * 0.14;
        const total = subtotal + tax;

        const mainContent = document.getElementById('main-content');
        mainContent.innerHTML = `
            <div class="service-details-page">
                <button class="back-btn-modern" onclick="window.Router.navigate('service')" style="margin-bottom: 20px;">
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
                        ${pkg.products.map(p => window.Cards.createPartCard(p)).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="booking-form" style="margin-top: 40px; background: rgba(0,0,0,0.2); padding: 30px; border-radius: 16px;">
                    <h3 style="color: white; margin-bottom: 25px;">Schedule Your Appointment</h3>
                    <form id="service-booking-form">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px;">
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

                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-top: 20px;">
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

        document.getElementById('service-booking-form').onsubmit = (e) => this.submitBooking(e);
    },

    async submitBooking(event) {
        event.preventDefault();
        const pkg = window.AppState.servicePackages[window.AppState.selectedService];

        const submitBtn = document.getElementById('book-service-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Booking...";

        const bookingData = {
            serviceTypeId: pkg.id,
            scheduledDate: document.getElementById('service-appointment-date').value,
            scheduledTime: document.getElementById('service-appointment-time').value,
            vehicleInfo: {
                make: document.getElementById('service-vehicle-make').value,
                model: document.getElementById('service-vehicle-model').value,
                year: document.getElementById('service-vehicle-year').value,
                mileage: pkg.km
            },
            customerInfo: {
                name: document.getElementById('service-customer-name').value,
                phone: document.getElementById('service-customer-phone').value,
                email: document.getElementById('service-customer-email').value
            },
            notes: `Include parts: ${window.AppState.selectedParts.map(p => p.id).join(', ')}`
        };

        try {
            const result = await window.BookingsService.createBooking(bookingData);
            if (result.success) {
                document.getElementById('service-booking-form').innerHTML = `
                    <div class="success-message">
                        <strong>Service appointment booked successfully!</strong><br>
                        Your ${pkg.km} KM service has been scheduled.
                    </div>
                `;
                setTimeout(() => window.Router.navigate('home'), 3000);
            } else {
                window.UI.showToast(result.error || "Failed to book service", '#e74c3c');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Appointment';
            }
        } catch (e) {
            console.error(e);
            window.UI.showToast("Booking failed due to an error", '#e74c3c');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Confirm Appointment';
        }
    }
};

window.ServicePage = ServicePage;
