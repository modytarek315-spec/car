const ServicePage = {
    render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([{ label: 'Service', action: () => window.location.href = 'service.html' }]);

        // Use real data from Supabase, stored in AppState by script.js
        const servicePackages = window.AppState.servicePackages || [];

        if (servicePackages.length === 0) {
            mainContent.innerHTML = '<div style="text-align:center; padding: 50px;">Loading services...</div>';
            return;
        }

        mainContent.innerHTML = `
            <div class="service-page">
                <h1 class="page-title">Vehicle Service Booking</h1>
                <p class="page-subtitle">Schedule your maintenance service based on mileage</p>
                <div class="service-grid">
                    ${servicePackages.map((pkg, index) => `
                        <div class="service-card ${window.AppState.selectedService === index ? 'selected' : ''}" 
                             data-service-index="${index}"
                             onclick="window.ServicePage.selectService(${index})">
                            <div class="service-km">${pkg.km} KM</div>
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
        window.AppState.includeParts = false;
        window.AppState.selectedParts = [];

        this.renderServiceDetails(index);
    },

    renderServiceDetails(index) {
        const pkg = window.AppState.servicePackages[index];
        const mainContent = document.getElementById('main-content');

        // Calculate totals for rendering initial state
        const serviceFee = pkg.price;
        const partsCost = 0; // Reset parts initially
        const subtotal = serviceFee;
        const tax = subtotal * 0.14;
        const total = subtotal + tax;

        mainContent.innerHTML = `
            <div class="service-details-page">
                <button class="back-btn" onclick="window.location.href='service.html'" style="margin-bottom: 20px;">Back to Services</button>
                <h1 class="page-title">${pkg.km} KM Service - ${pkg.title}</h1>
                <p class="page-subtitle">Complete maintenance package for your vehicle</p>
                
                <div style="background: #252525; padding: 25px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <div>
                            <h3 style="margin: 0; color: #fff; font-size: 24px;">${pkg.title}</h3>
                            <p style="margin: 5px 0 0 0; color: #7f8c8d;">Recommended at ${pkg.km} kilometers</p>
                        </div>
                        <div class="service-price" style="margin: 0;">${pkg.price.toFixed(2)} <span class="currency-symbol">EGP</span></div>
                    </div>

                    <table class="service-table">
                        <thead>
                            <tr>
                                <th>Service Item</th>
                                <th>Status</th>
                                <th>Description</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${pkg.items.map(item => `
                                <tr>
                                    <td><strong>${item.name}</strong></td>
                                    <td>${item.required ?
                `<span style="color: #e74c3c; font-weight: 600;">Required</span>` :
                `<span style="color: #7f8c8d;">Optional</span>`}
                                    </td>
                                    <td style="color: #ccc; font-size: 14px;">${this.getDescription(item.name)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="parts-option">
                    <label>
                        <input type="checkbox" id="include-parts-checkbox" onchange="window.ServicePage.togglePartsSelection(this.checked)">
                        <span>Include parts replacement with this service</span>
                    </label>
                </div>
                
                <div id="parts-selection-container"></div>
                
                <div class="booking-form" style="background: #252525; padding: 25px; border-radius: 12px; margin-top: 20px;">
                    <h3 style="color: white; margin-bottom: 20px;">Book Your Appointment</h3>
                    <form id="service-booking-form" onsubmit="window.ServicePage.submitBooking(event)">
                        
                        <!-- Vehicle Information Section -->
                        <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #444;">
                            <h4 style="color: var(--secondary-color); margin-bottom: 15px; font-size: 16px;">
                                <span style="margin-right: 8px;">🚗</span>Vehicle Information
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-make">Make (Brand) *</label>
                                    <select id="vehicle-make" required style="width: 100%; padding: 12px; border-radius: 8px; background: #333; color: white; border: 1px solid #444;">
                                        <option value="">Select Make</option>
                                        <option value="Toyota">Toyota</option>
                                        <option value="Honda">Honda</option>
                                        <option value="Nissan">Nissan</option>
                                        <option value="Hyundai">Hyundai</option>
                                        <option value="Kia">Kia</option>
                                        <option value="Chevrolet">Chevrolet</option>
                                        <option value="Ford">Ford</option>
                                        <option value="BMW">BMW</option>
                                        <option value="Mercedes-Benz">Mercedes-Benz</option>
                                        <option value="Volkswagen">Volkswagen</option>
                                        <option value="Mazda">Mazda</option>
                                        <option value="Mitsubishi">Mitsubishi</option>
                                        <option value="Suzuki">Suzuki</option>
                                        <option value="Peugeot">Peugeot</option>
                                        <option value="Fiat">Fiat</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-model">Model *</label>
                                    <input type="text" id="vehicle-model" placeholder="e.g., Corolla, Civic, Sentra" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-year">Year *</label>
                                    <select id="vehicle-year" required style="width: 100%; padding: 12px; border-radius: 8px; background: #333; color: white; border: 1px solid #444;">
                                        <option value="">Select Year</option>
                                        ${Array.from({length: 30}, (_, i) => new Date().getFullYear() - i).map(year => 
                                            `<option value="${year}">${year}</option>`
                                        ).join('')}
                                    </select>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-mileage">Current Mileage (KM) *</label>
                                    <input type="number" id="vehicle-mileage" placeholder="e.g., 50000" required min="0" max="999999">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-plate">License Plate</label>
                                    <input type="text" id="vehicle-plate" placeholder="e.g., ABC 1234">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="vehicle-color">Color</label>
                                    <input type="text" id="vehicle-color" placeholder="e.g., White, Black, Silver">
                                </div>
                            </div>
                        </div>

                        <!-- Customer Information Section -->
                        <div style="margin-bottom: 25px; padding-bottom: 20px; border-bottom: 1px solid #444;">
                            <h4 style="color: var(--secondary-color); margin-bottom: 15px; font-size: 16px;">
                                <span style="margin-right: 8px;">👤</span>Customer Information
                            </h4>
                            <div class="form-group">
                                <label for="service-customer-name">Full Name *</label>
                                <input type="text" id="service-customer-name" required>
                            </div>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="service-customer-phone">Phone Number *</label>
                                    <input type="tel" id="service-customer-phone" required>
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="service-customer-email">Email Address *</label>
                                    <input type="email" id="service-customer-email" required>
                                </div>
                            </div>
                        </div>

                        <!-- Appointment Section -->
                        <div style="margin-bottom: 20px;">
                            <h4 style="color: var(--secondary-color); margin-bottom: 15px; font-size: 16px;">
                                <span style="margin-right: 8px;">📅</span>Appointment Details
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="service-appointment-date">Preferred Date *</label>
                                    <input type="date" id="service-appointment-date" required min="${new Date().toISOString().split('T')[0]}">
                                </div>
                                <div class="form-group" style="margin-bottom: 0;">
                                    <label for="service-appointment-time">Preferred Time *</label>
                                    <input type="time" id="service-appointment-time" required>
                                </div>
                            </div>
                            <div class="form-group" style="margin-top: 15px;">
                                <label for="service-notes">Additional Notes</label>
                                <textarea id="service-notes" rows="3" placeholder="Any specific concerns or requests..." style="width: 100%; padding: 12px; border-radius: 8px; background: #333; color: white; border: 1px solid #444; resize: vertical;"></textarea>
                            </div>
                        </div>

                        <div class="cart-summary" style="margin-top: 20px;">
                            <div class="summary-row">
                                <span>Service Package:</span>
                                <span>${serviceFee.toFixed(2)} <span class="currency-symbol">EGP</span></span>
                            </div>
                            <div class="summary-row" id="parts-cost-row" style="display: none;">
                                <span>Parts Cost:</span>
                                <span id="parts-cost">0.00 <span class="currency-symbol">EGP</span></span>
                            </div>
                            <div class="summary-row">
                                <span>Subtotal:</span>
                                <span id="subtotal-cost">${subtotal.toFixed(2)} <span class="currency-symbol">EGP</span></span>
                            </div>
                            <div class="summary-row">
                                <span>Tax (14%):</span>
                                <span id="tax-cost">${tax.toFixed(2)} <span class="currency-symbol">EGP</span></span>
                            </div>
                            <div class="summary-row total">
                                <span>Total Cost:</span>
                                <span id="total-cost">${total.toFixed(2)} <span class="currency-symbol">EGP</span></span>
                            </div>
                            <button type="submit" class="checkout-btn" id="book-service-btn" style="width: 100%; margin-top: 20px;">Book Service Appointment</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    togglePartsSelection(checked) {
        window.AppState.includeParts = checked;
        const container = document.getElementById('parts-selection-container');

        if (checked) {
            const pkg = window.AppState.servicePackages[window.AppState.selectedService];
            const parts = pkg.products || [];

            container.innerHTML = `
                <div class="parts-list" style="background: #252525; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 15px 0; color: #fff;">Select Parts</h4>
                    ${parts.map(part => `
                        <div class="part-item" style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #444;">
                            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer; color: white;">
                                <input type="checkbox" 
                                       value="${part.id}" 
                                       data-price="${part.price}" 
                                       onchange="window.ServicePage.togglePart('${part.id}', ${part.price}, this.checked)">
                                <span>${part.name}</span>
                            </label>
                            <span style="color: var(--secondary-color); font-weight: bold;">${part.price.toFixed(2)} EGP</span>
                        </div>
                    `).join('')}
                    ${parts.length === 0 ? '<p style="color: #ccc;">No specific parts available for this service.</p>' : ''}
                </div>
            `;
        } else {
            container.innerHTML = '';
            window.AppState.selectedParts = [];
            this.updateServiceTotal();
        }
    },

    togglePart(partId, price, checked) {
        if (checked) {
            const pkg = window.AppState.servicePackages[window.AppState.selectedService];
            const part = pkg.products.find(p => p.id === partId);
            if (part) {
                window.AppState.selectedParts.push({ id: part.id, name: part.name, price: part.price });
            }
        } else {
            window.AppState.selectedParts = window.AppState.selectedParts.filter(p => p.id !== partId);
        }
        this.updateServiceTotal();
    },

    updateServiceTotal() {
        const pkg = window.AppState.servicePackages[window.AppState.selectedService];
        const partsCost = window.AppState.selectedParts.reduce((sum, part) => sum + part.price, 0);
        const subtotal = pkg.price + partsCost;
        const tax = subtotal * 0.14;
        const total = subtotal + tax;

        const partsRow = document.getElementById('parts-cost-row');
        if (partsRow) {
            partsRow.style.display = partsCost > 0 ? 'flex' : 'none';
            document.getElementById('parts-cost').innerHTML = `${partsCost.toFixed(2)} <span class="currency-symbol">EGP</span>`;
        }

        document.getElementById('subtotal-cost').innerHTML = `${subtotal.toFixed(2)} <span class="currency-symbol">EGP</span>`;
        document.getElementById('tax-cost').innerHTML = `${tax.toFixed(2)} <span class="currency-symbol">EGP</span>`;
        document.getElementById('total-cost').innerHTML = `${total.toFixed(2)} <span class="currency-symbol">EGP</span>`;
    },

    async submitBooking(event) {
        event.preventDefault();
        const pkg = window.AppState.servicePackages[window.AppState.selectedService];
        const submitBtn = document.getElementById('book-service-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = "Processing...";

        const customerName = document.getElementById('service-customer-name').value;
        const date = document.getElementById('service-appointment-date').value;
        const time = document.getElementById('service-appointment-time').value;

        // Collect vehicle information from form
        const vehicleInfo = {
            make: document.getElementById('vehicle-make').value,
            model: document.getElementById('vehicle-model').value,
            year: document.getElementById('vehicle-year').value,
            mileage: parseInt(document.getElementById('vehicle-mileage').value) || 0,
            licensePlate: document.getElementById('vehicle-plate').value || '',
            color: document.getElementById('vehicle-color').value || ''
        };

        // Collect additional notes
        const additionalNotes = document.getElementById('service-notes')?.value || '';
        const partsNotes = window.AppState.selectedParts.length > 0 
            ? `Included Parts: ${window.AppState.selectedParts.map(p => p.name).join(', ')}` 
            : '';
        const combinedNotes = [additionalNotes, partsNotes].filter(n => n).join('\n');

        // Construct booking data for Supabase
        const bookingData = {
            serviceTypeId: pkg.id,
            scheduledDate: date,
            scheduledTime: time,
            vehicleInfo: vehicleInfo,
            customerInfo: {
                name: customerName,
                phone: document.getElementById('service-customer-phone').value,
                email: document.getElementById('service-customer-email').value
            },
            notes: combinedNotes
        };

        const result = await window.BookingsService.createBooking(bookingData);

        if (result.success) {
            document.getElementById('service-booking-form').innerHTML = `
                <div style="background: rgba(46, 204, 113, 0.1); color: #2ecc71; padding: 20px; border-radius: 8px; text-align: center;">
                    <h3>Appointment Confirmed!</h3>
                    <p>Your ${pkg.title} has been scheduled for ${date} at ${time}.</p>
                    <p><strong>Vehicle:</strong> ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}</p>
                    <p>Thank you, ${customerName}.</p>
                    <button onclick="window.location.href='index.html'" class="checkout-btn" style="width: auto; margin-top: 15px;">Return Home</button>
                </div>
            `;
        } else {
            window.UI.showToast(result.error || 'Failed to create booking', '#ef4444');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Book Service Appointment';
        }
    },

    getDescription(itemName) {
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
            'Comprehensive Inspection': 'Detailed inspection of all vehicle systems',
            'Safety Check': 'Expert safety diagnostic'
        };
        return descriptions[itemName] || 'Professional automotive service';
    }
};

window.ServicePage = ServicePage;
