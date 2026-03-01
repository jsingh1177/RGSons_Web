-- Database: RGSons

-- 1. Master Tables
CREATE TABLE brand (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    status BIT,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_brand_code UNIQUE (code),
    CONSTRAINT UK_brand_name UNIQUE (name)
);

CREATE TABLE category (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    status BIT,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_category_code UNIQUE (code),
    CONSTRAINT UK_category_name UNIQUE (name)
);

CREATE TABLE size (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    status BIT,
    short_order INT DEFAULT 0,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_size_code UNIQUE (code),
    CONSTRAINT UK_size_name UNIQUE (name)
);

CREATE TABLE state_master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    CONSTRAINT UK_state_code UNIQUE (code),
    CONSTRAINT UK_state_name UNIQUE (name)
);

--;CREATE TABLE tender (
--;    id INT IDENTITY(1,1) PRIMARY KEY,
--;    tender_name VARCHAR(255),
--;    tender_code VARCHAR(255),
--;    active BIT DEFAULT 1,
--;    CONSTRAINT UK_tender_code UNIQUE (tender_code),
--;    CONSTRAINT UK_tender_name UNIQUE (tender_name)
--;);

--REATE TABLE tender_type (
--    id INT IDENTITY(1,1) PRIMARY KEY,
--    tender_code VARCHAR(255),
--    name VARCHAR(255),
--    status BIT,
--    CONSTRAINT UK_tender_type_code UNIQUE (tender_code),
--    CONSTRAINT UK_tender_type_name UNIQUE (name)
--);

CREATE TABLE items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_code VARCHAR(255)NOT NULL,
    item_name VARCHAR(255)NOT NULL,
    sale_price FLOAT,
    brand_code VARCHAR(255),
    category_code VARCHAR(255),
    pur_price FLOAT,
    size VARCHAR(255),
    status BIT,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_item_code UNIQUE (item_code),
	CONSTRAINT UK_item_name UNIQUE (item_name)
);

CREATE TABLE store (
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_code VARCHAR(255)NOT NULL,
    store_name VARCHAR(255)NOT NULL,
    address VARCHAR(255),
    area VARCHAR(255),
    zone VARCHAR(255),
    district VARCHAR(255),
    city VARCHAR(255),
    pin VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    gst_number VARCHAR(255),
    vat_no VARCHAR(255),
    pan_no VARCHAR(255),
    state VARCHAR(255),
	info1 VARCHAR(255),
	info2 VARCHAR(255),
	info3 VARCHAR(255),
	Sale_Led VARCHAR(255),
	Party_Led VARCHAR(255),
	status BIT,
    Open_Status BIT,
    store_type VARCHAR(255),
    business_date VARCHAR(255),
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_store_code UNIQUE (store_code),
    CONSTRAINT UK_store_name UNIQUE (store_name)
);

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    Mobile VARCHAR(255) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    role VARCHAR(255) NOT NULL,
    status BIT NOT NULL,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_user_name UNIQUE (Name)
);

CREATE TABLE user_store_map (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_name VARCHAR(255)NOT NULL,
    store_code VARCHAR(255)
    created_at DATETIME,
    update_at DATETIME
   
);

CREATE TABLE party (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    address VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    district VARCHAR(255),
    pin VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    pan VARCHAR(255),
    gst_number VARCHAR(255),
    vat_no VARCHAR(255),
    type VARCHAR(255),
    status BIT,
    created_at DATETIME,
    update_at DATETIME,
    CONSTRAINT UK_party_code UNIQUE (code),
	CONSTRAINT UK_party_name UNIQUE (name)
   
);

CREATE TABLE ledgers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255)NOT NULL,
    name VARCHAR(255)NOT NULL,
    type VARCHAR(255),
    screen VARCHAR(255),
    status INT,
    CONSTRAINT UK_ledger_code UNIQUE (code),
	CONSTRAINT UK_ledger_name UNIQUE (name)
);

-- 2. Transactional & Operations Tables

CREATE TABLE Inventory_Master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store_code VARCHAR(255)NOT NULL,
    Item_code VARCHAR(255)NOT NULL,
    Item_Name VARCHAR(255),
    Size_code VARCHAR(255)NOT NULL,
    Size_name VARCHAR(255),
    business_date VARCHAR(255),
    Opening INT,
	Purchase Int,
	Debit Int, 
    Inward INT,
    Outward INT,
    Closing INT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_inventory UNIQUE (Store_code, Item_code, Size_code)
);

CREATE TABLE Price_Master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Item_Code VARCHAR(255)NOT NULL,
    Item_Name VARCHAR(255),
    Size_Code VARCHAR(255)NOT NULL,
    Size_Name VARCHAR(255),
    Purchase_Price FLOAT,
    MRP FLOAT,
    CONSTRAINT UK_price UNIQUE (Item_Code, Size_Code)
);

CREATE TABLE DSR_Head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store_Code VARCHAR(255)NOT NULL,
    DSR_Date VARCHAR(255)NOT NULL,
    User_NAME VARCHAR(255),
    DSR_Status VARCHAR(255),
    Created_at DATETIME,
    Updated_at DATETIME,
    CONSTRAINT UK_dsr_head UNIQUE (Store_Code, DSR_Date)
);

CREATE TABLE DSR_Detail (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store VARCHAR(255)NOT NULL,
    Business_date VARCHAR(255)NOT NULL,
    Item_code VARCHAR(255)NOT NULL,
    Item_name VARCHAR(255),
    Size_Code VARCHAR(255)NOT NULL,
    Size_Name VARCHAR(255),
    Purchase_Price FLOAT,
    MRP FLOAT,
    Opening INT,
    Inward INT,
    Outward INT,
    Sale INT,
    Closing INT,
    Created_at DATETIME,
    Updated_at DATETIME,
    CONSTRAINT UK_dsr_detail UNIQUE (Store, Business_date, Item_code, Size_Code)
);


CREATE TABLE pur_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_code VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
    invoice_no VARCHAR(255)NOT NULL,
    party_code VARCHAR(255)NOT NULL,
    pur_led VARCHAR(255)NOT NULL,
    purchase_amount FLOAT,
    total_amount FLOAT,
    narration VARCHAR(MAX),
    User_NAME VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_pur_invoice UNIQUE (party_code,invoice_date,invoice_no)
);

CREATE TABLE pur_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_code VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
    invoice_no VARCHAR(255)NOT NULL,
    item_code VARCHAR(255)NOT NULL,
    size_code VARCHAR(255)NOT NULL,
    price FLOAT,
    quantity INT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_pur_item UNIQUE (invoice_no, invoice_date,item_code, size_code)
);
CREATE TABLE pur_ledgers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    pur_id INT NOT NULL,
    store_code VARCHAR(255)NOT NULL,
    invoice_no VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
    ledger_code VARCHAR(255)NOT NULL,
    amount FLOAT,
    type VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_pur_ledger UNIQUE (store_code,pur_id,ledger_code)
);


CREATE TABLE sti_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    from_store VARCHAR(255)NOT NULL,
    to_store VARCHAR(255)NOT NULL,
    date VARCHAR(255)NOT NULL,
    sti_number VARCHAR(255)NOT NULL,
    sto_number VARCHAR(255)NOT NULL,
    sto_date VARCHAR(255)NOT NULL,
    user_name VARCHAR(255),
    narration VARCHAR(MAX),
    received_status VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_sti_number UNIQUE (to_store,date,sti_number)
);

CREATE TABLE sti_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    from_store VARCHAR(255)NOT NULL,
    to_store VARCHAR(255)NOT NULL,
    sti_number VARCHAR(255)NOT NULL,
    sti_date VARCHAR(255)NOT NULL,
    item_code VARCHAR(255)NOT NULL,
    item_name VARCHAR(255),
    size_code VARCHAR(255)NOT NULL,
    size_name VARCHAR(255),
    quantity INT,
    price FLOAT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_sti_item UNIQUE (sti_date,sti_number, item_code, size_code)
);

CREATE TABLE sto_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    from_store VARCHAR(255)NOT NULL,
    to_store VARCHAR(255)NOT NULL,
    date VARCHAR(255)NOT NULL,
    sto_number VARCHAR(255)NOT NULL,
    narration VARCHAR(MAX),
    received_status VARCHAR(255),
    received_by VARCHAR(255),
    user_name VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_sto_number UNIQUE (from_store,date,sto_number)
);

CREATE TABLE sto_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    from_store VARCHAR(255)NOT NULL,
    to_store VARCHAR(255)NOT NULL,
    sto_number VARCHAR(255)NOT NULL,
    sto_date VARCHAR(255)NOT NULL,
    item_code VARCHAR(255)NOT NULL,
    item_name VARCHAR(255),
    size_code VARCHAR(255)NOT NULL,
    size_name VARCHAR(255),
    quantity INT,
    price FLOAT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_sto_item UNIQUE (sto_date,sto_number, item_code, size_code)
);

CREATE TABLE tran_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
	store_code VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
	invoice_no VARCHAR(255) NOT NULL,
	party_code VARCHAR(255)NOT NULL,
    sale_amount FLOAT,
    total_amount FLOAT,
    other_sale FLOAT,
    total_expenses FLOAT,
    total_tender FLOAT,
    tender_type VARCHAR(255),
    User_name VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_tran_invoice UNIQUE (store_code,invoice_date,invoice_no)
);

CREATE TABLE tran_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_code VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
    invoice_no VARCHAR(255)NOT NULL,
    item_code VARCHAR(255)NOT NULL,
    size_code VARCHAR(255)NOT NULL,
    mrp FLOAT,
    quantity INT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_tran_item UNIQUE (store_code,invoice_date,invoice_no, item_code, size_code)
);

CREATE TABLE tran_ledgers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tran_id INT,
    store_code VARCHAR(255)NOT NULL,
    invoice_no VARCHAR(255)NOT NULL,
    invoice_date VARCHAR(255)NOT NULL,
    ledger_code VARCHAR(255)NOT NULL,
    amount FLOAT,
    type VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_tran_ledger UNIQUE (store_code,invoice_date,invoice_no, ledger_code)
);

-- 3. System & Configuration Tables

CREATE TABLE database_sequences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sequence_name VARCHAR(255),
    seq BIGINT,
    CONSTRAINT UK_sequence_name UNIQUE (sequence_name)
);

CREATE TABLE voucher_config (
    config_id INT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL,
    prefix VARCHAR(255),
    include_store_code BIT DEFAULT 1,
    store_code_position INT,
    include_year BIT DEFAULT 1,
    year_format VARCHAR(255),
    include_month BIT DEFAULT 0,
    month_format VARCHAR(255),
    include_day BIT DEFAULT 0,
    day_format VARCHAR(255),
    separator VARCHAR(255) DEFAULT '-',
    number_padding INT DEFAULT 4,
    suffix VARCHAR(255),
    reset_frequency VARCHAR(255),
    numbering_scope VARCHAR(255),
    transfer_at_price VARCHAR(255),
    is_active BIT DEFAULT 1,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_voucher_type UNIQUE (voucher_type)
);

CREATE TABLE voucher_number_log (
    log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL,
    store_id INT NOT NULL,
    voucher_number VARCHAR(255) NOT NULL,
    generated_at DATETIME NOT NULL,
    CONSTRAINT UK_voucher_number UNIQUE (voucher_number)
);

CREATE TABLE voucher_sequence (
    sequence_id INT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL,
    store_id INT,
    reset_key VARCHAR(255),
    current_number INT DEFAULT 0,
    last_generated_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT UK_voucher_seq UNIQUE (voucher_type, store_id, reset_key)
);

-- 4. Native Database Sequences
CREATE SEQUENCE Master_SEQ
    AS INT
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    MAXVALUE 999999
    NO CYCLE;
	
---------

-- 2. Seed Users
-- Admin: admin / admin123
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'admin')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('admin', 'ucoCEvud7JjlESpFdCR9aufA2PXZ3+o1PVzrkNBHUHI=', 'oBkkmj4UWJv4bwSZU/G4Bw==', 'ADMIN', 1, GETDATE(), GETDATE());
END

-- 2. Seed Users
-- Admin: admin / admin123
IF NOT EXISTS (SELECT * FROM users WHERE Name = 'supperuser')
BEGIN
    INSERT INTO users (Name, password, salt, role, status, created_at, update_at)
    VALUES ('supperuser', 'ucoCEvud7JjlESpFdCR9aufA2PXZ3+o1PVzrkNBHUHI=', 'oBkkmj4UWJv4bwSZU/G4Bw==', 'SUPPER', 1, GETDATE(), GETDATE());
END
