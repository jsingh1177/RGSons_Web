-- Database: RGSons

-- 1. Master Tables
CREATE TABLE brand (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE category (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE size (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    short_order INT DEFAULT 0,
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE state_master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255) UNIQUE,
    name VARCHAR(255)
);

CREATE TABLE tender (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tender_name VARCHAR(255),
    tender_code VARCHAR(255),
    active BIT DEFAULT 1
);

CREATE TABLE tender_type (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tender_code VARCHAR(255),
    name VARCHAR(255),
    status BIT
);

CREATE TABLE items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    item_code VARCHAR(255),
    item_name VARCHAR(255),
    sale_price FLOAT,
    brand_code VARCHAR(255),
    category_code VARCHAR(255),
    pur_price FLOAT,
    size VARCHAR(255),
    status BIT,
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE store (
    id INT IDENTITY(1,1) PRIMARY KEY,
    store_code VARCHAR(255),
    store_name VARCHAR(255),
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
    status BIT,
    Open_Status BIT,
    store_type VARCHAR(255),
    business_date VARCHAR(255),
    info1 VARCHAR(255),
    info2 VARCHAR(255),
    info3 VARCHAR(255),
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    salt VARCHAR(255),
    role VARCHAR(255) NOT NULL,
    status BIT NOT NULL,
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE user_store_map (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_name VARCHAR(255),
    store_code VARCHAR(255),
    created_at DATETIME,
    update_at DATETIME
);

CREATE TABLE party (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
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
    update_at DATETIME
);

CREATE TABLE ledgers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    code VARCHAR(255),
    name VARCHAR(255),
    type VARCHAR(255),
    screen VARCHAR(255),
    status INT
);

-- 2. Transactional & Operations Tables

CREATE TABLE Inventory_Master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store_code VARCHAR(255),
    Item_code VARCHAR(255),
    Item_Name VARCHAR(255),
    Size_code VARCHAR(255),
    Size_name VARCHAR(255),
    business_date VARCHAR(255),
    Opening INT,
    Inward INT,
    Outward INT,
    Closing INT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE Price_Master (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Item_Code VARCHAR(255),
    Item_Name VARCHAR(255),
    Size_Code VARCHAR(255),
    Size_Name VARCHAR(255),
    Purchase_Price FLOAT,
    MRP FLOAT
);

CREATE TABLE DSR_Detail (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store VARCHAR(255),
    Business_date VARCHAR(255),
    Item_code VARCHAR(255),
    Item_name VARCHAR(255),
    Size_Code VARCHAR(255),
    Size_Name VARCHAR(255),
    Purchase_Price FLOAT,
    MRP FLOAT,
    Opening INT,
    Inward INT,
    Outward INT,
    Sale INT,
    Closing INT,
    Created_at DATETIME,
    Updated_at DATETIME
);

CREATE TABLE DSR_Head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    Store_Code VARCHAR(255),
    DSR_Date VARCHAR(255),
    User_NAME VARCHAR(255),
    DSR_Status VARCHAR(255),
    Created_at DATETIME,
    Updated_at DATETIME
);

CREATE TABLE pur_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    party_code VARCHAR(255),
    purchase_amount FLOAT,
    total_amount FLOAT,
    other_charges FLOAT,
    total_expenses FLOAT,
    store_code VARCHAR(255),
    narration VARCHAR(MAX),
    User_NAME VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE pur_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    item_code VARCHAR(255),
    size_code VARCHAR(255),
    mrp FLOAT,
    rate FLOAT,
    quantity INT,
    amount FLOAT,
    store_code VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE sti_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    date VARCHAR(255),
    sti_number VARCHAR(255),
    sto_number VARCHAR(255),
    sto_date VARCHAR(255),
    from_store VARCHAR(255),
    to_store VARCHAR(255),
    user_name VARCHAR(255),
    narration VARCHAR(MAX),
    received_status VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE sti_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sti_number VARCHAR(255),
    sti_date VARCHAR(255),
    from_store VARCHAR(255),
    to_store VARCHAR(255),
    item_code VARCHAR(255),
    item_name VARCHAR(255),
    size_code VARCHAR(255),
    size_name VARCHAR(255),
    quantity INT,
    price FLOAT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE sto_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    date VARCHAR(255),
    sto_number VARCHAR(255),
    from_store VARCHAR(255),
    to_store VARCHAR(255),
    user_name VARCHAR(255),
    narration VARCHAR(MAX),
    received_status VARCHAR(255),
    received_by VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE sto_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sto_number VARCHAR(255),
    sto_date VARCHAR(255),
    from_store VARCHAR(255),
    to_store VARCHAR(255),
    item_code VARCHAR(255),
    item_name VARCHAR(255),
    size_code VARCHAR(255),
    size_name VARCHAR(255),
    quantity INT,
    price FLOAT,
    amount FLOAT,
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE tran_head (
    id INT IDENTITY(1,1) PRIMARY KEY,
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    party_code VARCHAR(255),
    sale_amount FLOAT,
    total_amount FLOAT,
    other_sale FLOAT,
    total_expenses FLOAT,
    total_tender FLOAT,
    tender_type VARCHAR(255),
    store_code VARCHAR(255),
    User_name VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE tran_item (
    id INT IDENTITY(1,1) PRIMARY KEY,
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    item_code VARCHAR(255),
    size_code VARCHAR(255),
    mrp FLOAT,
    quantity INT,
    amount FLOAT,
    store_code VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

CREATE TABLE tran_ledgers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    tran_id INT,
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    store_code VARCHAR(255),
    ledger_code VARCHAR(255),
    amount FLOAT,
    type VARCHAR(255),
    created_at DATETIME,
    updated_at DATETIME
);

-- 3. System & Configuration Tables

CREATE TABLE database_sequences (
    id INT IDENTITY(1,1) PRIMARY KEY,
    sequence_name VARCHAR(255),
    seq BIGINT
);

CREATE TABLE voucher_config (
    config_id INT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL UNIQUE,
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
    updated_at DATETIME
);

CREATE TABLE voucher_number_log (
    log_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL,
    store_id INT NOT NULL,
    voucher_number VARCHAR(255) NOT NULL UNIQUE,
    generated_at DATETIME NOT NULL
);

CREATE TABLE voucher_sequence (
    sequence_id INT IDENTITY(1,1) PRIMARY KEY,
    voucher_type VARCHAR(255) NOT NULL,
    store_id INT,
    reset_key VARCHAR(255),
    current_number INT DEFAULT 0,
    last_generated_at DATETIME,
    created_at DATETIME,
    updated_at DATETIME
);

-- 4. Native Database Sequences
CREATE SEQUENCE Master_SEQ
    AS INT
    START WITH 10000
    INCREMENT BY 1
    MINVALUE 10000
    MAXVALUE 999999
    NO CYCLE;
