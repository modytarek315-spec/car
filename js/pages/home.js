const HomePage = {
    render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([]);

        const categories = window.AppState.categories;
        const config = window.AppState.config;

        const categoryCards = categories.map((c, index) => window.Cards.createCategoryCard(c, index)).join('');

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
            <h1 class="page-title">Welcome to ${config.store_name}</h1>
            <p class="page-subtitle">Expert parts and maintenance for your automotive needs</p>
            <div class="category-grid">
                ${categoryCards}
                ${serviceCard}
            </div>
        `;

        window.UI.observeElements('[data-category]');
    }
};

window.HomePage = HomePage;
