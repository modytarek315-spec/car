
-- 1. Insert Categories
INSERT INTO categories (name, slug, description, icon) VALUES
('Engine Parts', 'engine', 'High-performance engine components', '⚙️'),
('Brakes', 'brakes', 'Brake pads, rotors, and systems', '🛑'),
('Suspension', 'suspension', 'Shocks, struts, and control arms', '🚜'),
('Maintenance', 'maintenance', 'Filters, belts, and spark plugs', '🔧'),
('Fluids', 'fluids', 'Oil, brake fluid, and coolant', '💧')
ON CONFLICT (slug) DO NOTHING;

-- 2. Insert Products (WITHOUT images column)
-- Engine
INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'V6 Engine Block', 'Performance V6 Engine Block', 'Durable aluminum alloy block for high performance.', 25000.00, 5, id, 'Toyota', 'ENG-001', true
FROM categories WHERE slug = 'engine'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Turbocharger Kit', 'Universal Turbocharger Kit', 'Boost your engine power with this complete kit.', 15000.00, 8, id, 'Garrett', 'ENG-002', true
FROM categories WHERE slug = 'engine'
ON CONFLICT (sku) DO NOTHING;

-- Brakes
INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Ceramic Brake Pads', 'Front Ceramic Brake Pads', 'Low dust, high stopping power friction pads.', 1200.00, 50, id, 'Brembo', 'BRK-001', true
FROM categories WHERE slug = 'brakes'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Drilled Rotors', 'Performance Drilled Rotors (Pair)', 'Better heat dissipation for track days.', 3500.00, 20, id, 'EBC', 'BRK-002', true
FROM categories WHERE slug = 'brakes'
ON CONFLICT (sku) DO NOTHING;

-- Suspension
INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Coilover Kit', 'Adjustable Coilover Suspension', 'Height and damping adjustable for street and track.', 18000.00, 4, id, 'KW', 'SUS-001', true
FROM categories WHERE slug = 'suspension'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Control Arms', 'Lower Control Arms', 'Heavy duty steel control arms.', 4500.00, 15, id, 'Moog', 'SUS-002', true
FROM categories WHERE slug = 'suspension'
ON CONFLICT (sku) DO NOTHING;

-- Maintenance
INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Oil Filter', 'Premium Oil Filter', 'Removes 99% of contaminants.', 250.00, 100, id, 'Fram', 'MNT-001', true
FROM categories WHERE slug = 'maintenance'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Air Filter', 'High Flow Air Filter', 'Washable and reusable air filter.', 800.00, 40, id, 'K&N', 'MNT-002', true
FROM categories WHERE slug = 'maintenance'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Spark Plugs (4)', 'Iridium Spark Plugs Set', 'Long life and better ignition.', 1200.00, 30, id, 'NGK', 'MNT-003', true
FROM categories WHERE slug = 'maintenance'
ON CONFLICT (sku) DO NOTHING;

-- Fluids
INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Synthetic Oil 5W-30', 'Full Synthetic Motor Oil (4L)', 'Advanced protection for modern engines.', 950.00, 60, id, 'Mobil1', 'FLD-001', true
FROM categories WHERE slug = 'fluids'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO products (name, title, description, price, stock, category_id, brand, sku, is_active)
SELECT 'Brake Fluid DOT4', 'High Performance Brake Fluid', 'High boiling point for racing applications.', 300.00, 40, id, 'Motul', 'FLD-002', true
FROM categories WHERE slug = 'fluids'
ON CONFLICT (sku) DO NOTHING;


-- 3. Insert Product Images (linking via SKU sub-selects)
INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Engine+Block', 'Engine Block', true
FROM products WHERE sku = 'ENG-001';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Turbo+Kit', 'Turbo Kit', true
FROM products WHERE sku = 'ENG-002';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Brake+Pads', 'Brake Pads', true
FROM products WHERE sku = 'BRK-001';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Rotors', 'Rotors', true
FROM products WHERE sku = 'BRK-002';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Coilovers', 'Coilovers', true
FROM products WHERE sku = 'SUS-001';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Control+Arms', 'Control Arms', true
FROM products WHERE sku = 'SUS-002';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Oil+Filter', 'Oil Filter', true
FROM products WHERE sku = 'MNT-001';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Air+Filter', 'Air Filter', true
FROM products WHERE sku = 'MNT-002';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Spark+Plugs', 'Spark Plugs', true
FROM products WHERE sku = 'MNT-003';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Motor+Oil', 'Motor Oil', true
FROM products WHERE sku = 'FLD-001';

INSERT INTO product_images (product_id, url, alt, is_primary)
SELECT id, 'https://placehold.co/600x400?text=Brake+Fluid', 'Brake Fluid', true
FROM products WHERE sku = 'FLD-002';
