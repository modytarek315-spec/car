-- ============================================
-- CAR HOUSE DATABASE SCHEMA (LATEST)
-- Version: 2.1
-- Optimized for: Admin Dashboard and Core Features
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS & AUTH
-- ============================================

-- Profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  address TEXT,
  role TEXT DEFAULT 'customer', -- 'customer', 'admin', 'superadmin'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admins table (explicit admin permissions)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'admin',
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'role', 'customer'));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Secure Helper Function to check Admin status
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admins WHERE user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage on sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- 2. PRODUCTS & CATEGORIES
-- ============================================

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  image_url TEXT,
  icon TEXT,
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE,
  name TEXT NOT NULL, -- Keep for legacy
  title TEXT,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  compare_at_price NUMERIC(10,2),
  cost_price NUMERIC(10,2),
  stock INTEGER DEFAULT 0,
  low_stock_threshold INTEGER DEFAULT 5,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  brand TEXT,
  car_model TEXT,
  year_compatibility TEXT,
  rating NUMERIC(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  images JSONB DEFAULT '[]', -- Legacy array
  specifications JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT,
  position INTEGER DEFAULT 0,
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. ORDERS & INVENTORY
-- ============================================

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  reserved INTEGER DEFAULT 0,
  location TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'shipped'::text, 'delivered'::text, 'cancelled'::text, 'refunded'::text])),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  shipping_address JSONB DEFAULT '{}'::jsonb,
  billing_address JSONB DEFAULT '{}'::jsonb,
  payment_method TEXT,
  payment_meta JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  sku TEXT,
  title TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  quantity INTEGER NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. SERVICES & BOOKINGS
-- ============================================

CREATE TABLE IF NOT EXISTS service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  estimated_duration INT, -- in minutes
  base_price NUMERIC(10,2),
  icon TEXT DEFAULT '🔧',
  is_active BOOLEAN DEFAULT TRUE,
  position INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS service_type_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(service_type_id, product_id)
);

CREATE TABLE IF NOT EXISTS workshop_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  service_type_id UUID REFERENCES service_types(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL, -- Text for fallback
  vehicle_info JSONB DEFAULT '{}',
  scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled', -- scheduled, pending, completed, cancelled
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4b. USER FAVORITES
-- ============================================

CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ============================================
-- 5. REVIEWS, COUPONS & AUDIT
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL, -- 'percentage', 'fixed'
  discount_value NUMERIC(10,2) NOT NULL,
  min_purchase NUMERIC(10,2),
  max_discount NUMERIC(10,2),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  usage_limit INTEGER,
  used_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT TRUE,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT, -- 'product', 'order', etc.
  resource_id TEXT,   -- resource ID as string
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_type_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE workshop_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- ADMINS Policies
DROP POLICY IF EXISTS "admins_read_own" ON admins;
CREATE POLICY "admins_read_own" ON admins FOR SELECT USING (user_id = auth.uid());

-- PROFILES Policies
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_select_admin" ON profiles FOR SELECT USING (is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_update_admin" ON profiles FOR UPDATE USING (is_admin());
CREATE POLICY "profiles_insert_self" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- CATEGORIES Policies
CREATE POLICY "categories_select_all" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_all_admin" ON categories FOR ALL USING (is_admin());

-- PRODUCTS Policies
CREATE POLICY "products_select_all" ON products FOR SELECT USING (true);
CREATE POLICY "products_all_admin" ON products FOR ALL USING (is_admin());

-- PRODUCT IMAGES Policies
CREATE POLICY "product_images_select_all" ON product_images FOR SELECT USING (true);
CREATE POLICY "product_images_all_admin" ON product_images FOR ALL USING (is_admin());

-- SERVICE TYPES Policies
CREATE POLICY "service_types_select_all" ON service_types FOR SELECT USING (true);
CREATE POLICY "service_types_all_admin" ON service_types FOR ALL USING (is_admin());

-- SERVICE PRODUCTS Policies
CREATE POLICY "service_products_select_all" ON service_type_products FOR SELECT USING (true);
CREATE POLICY "service_products_all_admin" ON service_type_products FOR ALL USING (is_admin());

-- WORKSHOP BOOKINGS Policies
CREATE POLICY "bookings_select_own" ON workshop_bookings FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "bookings_select_admin" ON workshop_bookings FOR SELECT USING (is_admin());
CREATE POLICY "bookings_insert_any_auth" ON workshop_bookings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "bookings_all_admin" ON workshop_bookings FOR ALL USING (is_admin());

-- USER FAVORITES Policies
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE USING (user_id = auth.uid());

-- ORDERS Policies
CREATE POLICY "orders_select_own" ON orders FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "orders_select_admin" ON orders FOR SELECT USING (is_admin());
CREATE POLICY "orders_insert_own" ON orders FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "orders_all_admin" ON orders FOR ALL USING (is_admin());

-- ORDER ITEMS Policies
CREATE POLICY "order_items_select_own" ON order_items FOR SELECT USING (order_id IN (SELECT id FROM orders WHERE user_id = auth.uid()));
CREATE POLICY "order_items_select_admin" ON order_items FOR SELECT USING (is_admin());
CREATE POLICY "order_items_all_admin" ON order_items FOR ALL USING (is_admin());

-- REVIEWS Policies
CREATE POLICY "reviews_select_all" ON reviews FOR SELECT USING (true);
CREATE POLICY "reviews_insert_limit" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_all_admin" ON reviews FOR ALL USING (is_admin());

-- COUPONS Policies
CREATE POLICY "coupons_select_all" ON coupons FOR SELECT USING (true);
CREATE POLICY "coupons_all_admin" ON coupons FOR ALL USING (is_admin());

-- AUDIT LOGS Policies
CREATE POLICY "audit_logs_select_admin" ON audit_logs FOR SELECT USING (is_admin());
CREATE POLICY "audit_logs_insert_admin" ON audit_logs FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 7. STORAGE CONFIGURATION
-- ============================================

-- Create buckets (If they don't exist)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('categories', 'categories', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('products', 'products', true, 10485760, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/svg+xml']),
  ('avatars', 'avatars', true, 2097152, ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policies
CREATE POLICY "Public Read Categories" ON storage.objects FOR SELECT USING (bucket_id = 'categories');
CREATE POLICY "Public Read Products" ON storage.objects FOR SELECT USING (bucket_id = 'products');
CREATE POLICY "Public Read Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Authenticated Upload Categories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'categories' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Upload Products" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'products' AND auth.role() = 'authenticated');
CREATE POLICY "Authenticated Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "Admin Delete Categories" ON storage.objects FOR DELETE USING (bucket_id = 'categories' AND is_admin());
CREATE POLICY "Admin Delete Products" ON storage.objects FOR DELETE USING (bucket_id = 'products' AND is_admin());
CREATE POLICY "User Delete Own Avatar" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);


-- ============================================
-- 8. DEFAULT DATA (SEEDING)
-- ============================================

INSERT INTO service_types (name, description, estimated_duration, base_price, icon, position, is_active)
VALUES 
  ('Oil Change', 'Complete oil change with synthetic blend oil and new filter.', 30, 450.00, '🛢️', 1, true),
  ('Brake Inspection', 'Comprehensive brake system check including pads, rotors, and fluid.', 45, 200.00, '🛑', 2, true),
  ('Tire Rotation', 'Rotate tires to ensure even wear and extend tire life.', 20, 150.00, '🔄', 3, true),
  ('Battery Replacement', 'Remove old battery and install new high-performance battery.', 15, 100.00, '🔋', 4, true),
  ('AC Recharge', 'Recharge air conditioning system with refrigerant and check for leaks.', 60, 350.00, '❄️', 5, true),
  ('Engine Diagnostics', 'Computerized engine diagnostics to identify check engine light issues.', 30, 250.00, '💻', 6, true),
  ('Wheel Alignment', 'Precision wheel alignment for better handling and tire longevity.', 60, 400.00, '📏', 7, true),
  ('Full Detailing', 'Interior and external car detailing, washing, and waxing.', 120, 800.00, '✨', 8, true)
ON CONFLICT (name) DO UPDATE SET 
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price;
