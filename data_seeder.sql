-- Initial Data Seeder for RGSons
-- Generated based on DataSeeder.java, MasterDataSeeder.java, StateMasterSeeder.java

-- 1. Seed State Master
IF NOT EXISTS (SELECT * FROM state_master WHERE code = '01')
BEGIN
    INSERT INTO state_master (code, name) VALUES
    ('01', 'Jammu & Kashmir'),
    ('02', 'Himachal Pradesh'),
    ('03', 'Punjab'),
    ('04', 'Chandigarh'),
    ('05', 'Uttarakhand'),
    ('06', 'Haryana'),
    ('07', 'Delhi'),
    ('08', 'Rajasthan'),
    ('09', 'Uttar Pradesh'),
    ('10', 'Bihar'),
    ('11', 'Sikkim'),
    ('12', 'Arunachal Pradesh'),
    ('13', 'Nagaland'),
    ('14', 'Manipur'),
    ('15', 'Mizoram'),
    ('16', 'Tripura'),
    ('17', 'Meghalaya'),
    ('18', 'Assam'),
    ('19', 'West Bengal'),
    ('20', 'Jharkhand'),
    ('21', 'Odisha'),
    ('22', 'Chhattisgarh'),
    ('23', 'Madhya Pradesh'),
    ('24', 'Gujarat'),
    ('25', 'Daman & Diu'),
    ('26', 'Dadra & Nagar Haveli'),
    ('27', 'Maharashtra'),
    ('28', 'Andhra Pradesh'),
    ('29', 'Karnataka'),
    ('30', 'Goa'),
    ('31', 'Lakshadweep'),
    ('32', 'Kerala'),
    ('33', 'Tamil Nadu'),
    ('34', 'Puducherry'),
    ('35', 'Andaman & Nicobar Islands'),
    ('36', 'Telangana'),
    ('37', 'Ladakh');
END

-- 2. Seed Users
-- Admin: admin / admin123
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'admin')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('admin', 'ucoCEvud7JjlESpFdCR9aufA2PXZ3+o1PVzrkNBHUHI=', 'oBkkmj4UWJv4bwSZU/G4Bw==', 'ADMIN', 1, GETDATE(), GETDATE());
END

-- Test User: testuser / password123
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'testuser')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('testuser', 'i/6TXRbdv3Ztz6cIlVaL2nhuvwFFOYKuLeS199XUrkc=', 'RHVDdP4Xsp7YWzLecdH1/Q==', 'USER', 1, GETDATE(), GETDATE());
END

-- Simple Test: test / test
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'test')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('test', '5n/d0T3O6RoqwfZ6yUOHVPACQAWUN8yg/PSIFrDA8jY=', 'zvBYJv626Kp75k54waxhyw==', 'USER', 1, GETDATE(), GETDATE());
END

-- HO User: houser / houser123
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'houser')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('houser', 'sobWPxtgRkSAyDSnMMoQ1zjB76z3YRUfu4tRJ5Mi5tI=', 'X8tNggnmxwMprGUTdx0z9Q==', 'HO_USER', 1, GETDATE(), GETDATE());
END

-- 3. Seed Stores
-- Store 10000
IF NOT EXISTS (SELECT * FROM store WHERE store_code = '10000')
BEGIN
    INSERT INTO store (store_code, store_name, address, city, zone, business_date, status, created_at, update_at)
    VALUES ('10000', 'Test Store 1', '123 Test Street', 'Test City', 'North', '04-01-2026', 1, GETDATE(), GETDATE());
END

-- HO Store HO001
IF NOT EXISTS (SELECT * FROM store WHERE store_code = 'HO001')
BEGIN
    INSERT INTO store (store_code, store_name, store_type, address, city, zone, business_date, status, created_at, update_at)
    VALUES ('HO001', 'Head Office', 'HO', 'HO Address', 'HO City', 'HO Zone', '04-01-2026', 1, GETDATE(), GETDATE());
END

-- 4. Seed User Store Maps
IF NOT EXISTS (SELECT * FROM user_store_map WHERE user_name = 'testuser')
BEGIN
    INSERT INTO user_store_map (user_name, store_code, created_at, update_at)
    VALUES ('testuser', '10000', GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT * FROM user_store_map WHERE user_name = 'houser')
BEGIN
    INSERT INTO user_store_map (user_name, store_code, created_at, update_at)
    VALUES ('houser', 'HO001', GETDATE(), GETDATE());
END

-- 5. Seed Parties
IF NOT EXISTS (SELECT * FROM party WHERE name = 'Alpha Traders')
BEGIN
    INSERT INTO party (name, type, status, created_at, update_at)
    VALUES ('Alpha Traders', 'Vendor', 1, GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT * FROM party WHERE name = 'Beta Retail')
BEGIN
    INSERT INTO party (name, type, status, created_at, update_at)
    VALUES ('Beta Retail', 'Customer', 1, GETDATE(), GETDATE());
END

-- 6. Seed Categories
IF NOT EXISTS (SELECT * FROM category WHERE code = 'CAT001')
BEGIN
    INSERT INTO category (code, name, status, created_at, update_at)
    VALUES ('CAT001', 'Whisky', 1, GETDATE(), GETDATE()),
           ('CAT002', 'Beer', 1, GETDATE(), GETDATE()),
           ('CAT003', 'Wine', 1, GETDATE(), GETDATE()),
           ('CAT004', 'Rum', 1, GETDATE(), GETDATE());
END

-- 7. Seed Items
IF NOT EXISTS (SELECT * FROM items WHERE item_code = 'ITEM001')
BEGIN
    INSERT INTO items (item_code, item_name, sale_price, category_code, brand_code, status, created_at, update_at)
    VALUES ('ITEM001', 'Test Item 1', 150.0, 'CAT001', 'BR001', 1, GETDATE(), GETDATE());
END

IF NOT EXISTS (SELECT * FROM items WHERE item_code = 'ITEM002')
BEGIN
    INSERT INTO items (item_code, item_name, sale_price, category_code, brand_code, status, created_at, update_at)
    VALUES ('ITEM002', 'Test Item 2', 80.0, 'CAT002', 'BR002', 1, GETDATE(), GETDATE());
END

-- 8. Initialize Sequences
IF NOT EXISTS (SELECT * FROM sys.sequences WHERE name = 'Master_SEQ')
BEGIN
    CREATE SEQUENCE dbo.Master_SEQ
    AS INT
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    MAXVALUE 999999
    NO CYCLE;
END
