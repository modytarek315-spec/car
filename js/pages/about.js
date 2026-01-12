const AboutPage = {
    render() {
        const mainContent = document.getElementById('main-content');
        window.UI.updateBreadcrumb([{ label: 'About Us', action: () => window.Router.navigate('about') }]);

        mainContent.innerHTML = `
            <h1 class="page-title">About Us</h1>
            <p class="page-subtitle">Your trusted source for quality auto parts</p>
            <div style="background: black; padding: 80px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
                <p>Welcome to Car House, your one-stop shop for high-quality auto parts. We are passionate about cars and dedicated to providing our customers with the best parts and service in the industry.</p>
                <p>Our mission is to make it easy and affordable for you to keep your vehicle in top condition. We offer a wide selection of parts for all makes and models, backed by our expert team and commitment to customer satisfaction.</p>
                <p>Thank you for choosing Car House. We look forward to serving you!</p>
            </div>
        `;
    }
};

window.AboutPage = AboutPage;
