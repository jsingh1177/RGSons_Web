-- Generated Schema Dump for RGSons Project
-- Database: MS SQL Server
-- Generated based on JPA Entity definitions

CREATE TABLE brand (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE category (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE DSR_Detail (
    id VARCHAR(255) NOT NULL,
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
    Created_at DATETIME2,
    Updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE DSR_Head (
    id VARCHAR(255) NOT NULL,
    Store_Code VARCHAR(255),
    DSR_Date VARCHAR(255),
    User_NAME VARCHAR(255),
    DSR_Status VARCHAR(255),
    Created_at DATETIME2,
    Updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE Inventory_Master (
    id VARCHAR(255) NOT NULL,
    Store_code VARCHAR(255),
    Item_code VARCHAR(255),
    Item_Name VARCHAR(255),
    Size_code VARCHAR(255),
    Size_name VARCHAR(255),
    Opening INT,
    Inward INT,
    Outward INT,
    Closing INT,
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE items (
    id VARCHAR(255) NOT NULL,
    item_code VARCHAR(255),
    item_name VARCHAR(255),
    sale_price FLOAT,
    brand_code VARCHAR(255),
    category_code VARCHAR(255),
    pur_price FLOAT,
    size VARCHAR(255),
    status BIT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE ledgers (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    type VARCHAR(255),
    screen VARCHAR(255),
    status BIT,
    PRIMARY KEY (id)
);

CREATE TABLE party (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    address VARCHAR(255),
    city VARCHAR(255),
    district VARCHAR(255),
    state VARCHAR(255),
    pin VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    pan VARCHAR(255),
    gst_number VARCHAR(255),
    vat_no VARCHAR(255),
    type VARCHAR(255),
    status BIT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE Price_Master (
    id VARCHAR(255) NOT NULL,
    Item_Code VARCHAR(255),
    Item_Name VARCHAR(255),
    Size_Code VARCHAR(255),
    Size_Name VARCHAR(255),
    Purchase_Price FLOAT,
    MRP FLOAT,
    PRIMARY KEY (id)
);

CREATE TABLE pur_head (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    party_code VARCHAR(255),
    purchase_amount FLOAT,
    total_amount FLOAT,
    other_charges FLOAT,
    total_expenses FLOAT,
    narration VARCHAR(255),
    User_NAME VARCHAR(255),
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE pur_item (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    item_code VARCHAR(255),
    size_code VARCHAR(255),
    mrp FLOAT,
    rate FLOAT,
    quantity INT,
    amount FLOAT,
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE database_sequences (
    id VARCHAR(255) NOT NULL,
    seq BIGINT,
    PRIMARY KEY (id)
);

CREATE TABLE size (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    status BIT,
    short_order INT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE state_master (
    id VARCHAR(255) NOT NULL,
    code VARCHAR(255),
    name VARCHAR(255),
    PRIMARY KEY (id),
    CONSTRAINT UK_state_master_code UNIQUE (code)
);

CREATE TABLE store (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    store_name VARCHAR(255),
    store_type VARCHAR(255),
    address VARCHAR(255),
    area VARCHAR(255),
    zone VARCHAR(255),
    district VARCHAR(255),
    city VARCHAR(255),
    state VARCHAR(255),
    pin VARCHAR(255),
    phone VARCHAR(255),
    email VARCHAR(255),
    gst_number VARCHAR(255),
    vat_no VARCHAR(255),
    pan_no VARCHAR(255),
    status BIT,
    Open_Status BIT,
    business_date VARCHAR(255),
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

--CREATE TABLE tender (
--    id VARCHAR(255) NOT NULL,
--    tender_name VARCHAR(255),
--    tender_code VARCHAR(255),
--    active BIT,
--    PRIMARY KEY (id),
--	CONSTRAINT UK_tender_tender_code UNIQUE (tender_code),
--	CONSTRAINT UK_tender_tender_NAME UNIQUE (tender_name)
--	
--
--);
--
--CREATE TABLE tender_type (
--    id VARCHAR(255) NOT NULL,
--    code VARCHAR(255),
--    name VARCHAR(255),
--    status BIT,
--    PRIMARY KEY (id)
--	CONSTRAINT UK_tender_type_code UNIQUE (code)
--
--);

CREATE TABLE tran_head (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    party_code VARCHAR(255),
    sale_amount FLOAT,
    total_amount FLOAT,
    other_sale FLOAT,
    total_expenses FLOAT,
    total_tender FLOAT,
    tender_type VARCHAR(255),
    User_name VARCHAR(255),
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE tran_item (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    item_code VARCHAR(255),
    size_code VARCHAR(255),
    mrp FLOAT,
    quantity INT,
    amount FLOAT,
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE tran_ledgers (
    id VARCHAR(255) NOT NULL,
    store_code VARCHAR(255),
    tran_id VARCHAR(255),
    invoice_no VARCHAR(255),
    invoice_date VARCHAR(255),
    ledger_code VARCHAR(255),
    amount FLOAT,
    type VARCHAR(255),
    created_at DATETIME2,
    updated_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE user_store_map (
    id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    store_code VARCHAR(255),
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);

CREATE TABLE users (
    id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    password VARCHAR(255),
    salt VARCHAR(255),
    role VARCHAR(255),
    status BIT,
    created_at DATETIME2,
    update_at DATETIME2,
    PRIMARY KEY (id)
);
