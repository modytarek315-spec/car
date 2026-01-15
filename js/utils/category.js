/**
 * ==========================================
 * CATEGORY UTILITIES
 * ==========================================
 * Helper functions for category matching and resolution
 */

const CategoryUtils = {
    /**
     * Find a category using multiple matching strategies
     * @param {string} categoryInput - The category slug or name to find
     * @param {Array} categories - Array of category objects
     * @returns {Object|null} - The matched category object or null
     */
    findCategory(categoryInput, categories = []) {
        if (!categoryInput || !categories.length) return null;

        const categorySlug = categoryInput.toString().trim();
        const normalizedSlug = categorySlug.toLowerCase().replace(/\s+/g, '-');

        // Strategy 1: Exact slug match
        let match = categories.find(c => c.slug === normalizedSlug);
        if (match) return match;

        // Strategy 2: Exact match on original string (handles slugs with spaces)
        match = categories.find(c => c.slug?.toLowerCase() === categorySlug.toLowerCase());
        if (match) return match;

        // Strategy 3: Match by name (case-insensitive)
        match = categories.find(c => c.name?.toLowerCase() === categorySlug.toLowerCase());
        if (match) return match;

        // Strategy 4: Match by normalized name
        match = categories.find(c => 
            c.name?.toLowerCase().replace(/\s+/g, '-') === normalizedSlug
        );
        if (match) return match;

        // Strategy 5: Match by normalized slug
        match = categories.find(c => 
            c.slug?.toLowerCase().replace(/\s+/g, '-') === normalizedSlug
        );
        if (match) return match;

        // Strategy 6: Partial slug match
        match = categories.find(c => 
            c.slug?.toLowerCase().includes(normalizedSlug) || 
            normalizedSlug.includes(c.slug?.toLowerCase())
        );
        if (match) return match;

        // Strategy 7: Partial name match
        match = categories.find(c => 
            c.name?.toLowerCase().includes(categorySlug.toLowerCase()) || 
            categorySlug.toLowerCase().includes(c.name?.toLowerCase())
        );
        if (match) return match;

        // Strategy 8: First keyword match
        const firstKeyword = normalizedSlug.split('-')[0];
        if (firstKeyword && firstKeyword.length > 2) {
            match = categories.find(c => 
                c.slug?.toLowerCase().startsWith(firstKeyword) || 
                c.name?.toLowerCase().startsWith(firstKeyword)
            );
            if (match) return match;
        }

        return null;
    },

    /**
     * Normalize a category slug
     * @param {string} category - Raw category string
     * @returns {string} - Normalized slug
     */
    normalizeSlug(category) {
        return (category || '').toString().trim().toLowerCase().replace(/\s+/g, '-');
    },

    /**
     * Check if a category is a core (non-dynamic) category
     * @param {string} category - Category to check
     * @returns {boolean}
     */
    isCoreCategory(category) {
        const core = window.AppConstants?.CORE_CATEGORIES || 
            ['home', 'cart', 'checkout', 'service', 'favorites', 'about', 'search'];
        return core.includes(category?.toLowerCase());
    },

    /**
     * Get category display name
     * @param {Object|null} categoryObj - Category object
     * @param {string} fallbackSlug - Fallback slug if no category found
     * @returns {string} - Display name
     */
    getDisplayName(categoryObj, fallbackSlug = '') {
        if (categoryObj?.name) return categoryObj.name;
        if (!fallbackSlug) return 'Products';
        return fallbackSlug.charAt(0).toUpperCase() + fallbackSlug.slice(1).replace(/-/g, ' ');
    }
};

window.CategoryUtils = CategoryUtils;
