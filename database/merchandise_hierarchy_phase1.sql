IF OBJECT_ID('dbo.merchandise_hierarchy', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.merchandise_hierarchy (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        parent_id INT NULL,
        node_code VARCHAR(50) NOT NULL,
        node_name NVARCHAR(200) NOT NULL,
        node_level INT NOT NULL,
        hierarchy_path VARCHAR(1000) NOT NULL,
        sort_order INT NOT NULL CONSTRAINT DF_merchandise_hierarchy_sort_order DEFAULT (0),
        status BIT NOT NULL CONSTRAINT DF_merchandise_hierarchy_status DEFAULT (1),
        created_by VARCHAR(100) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_merchandise_hierarchy_created_at DEFAULT (SYSDATETIME()),
        update_by VARCHAR(100) NULL,
        update_at DATETIME2 NOT NULL CONSTRAINT DF_merchandise_hierarchy_update_at DEFAULT (SYSDATETIME())
    );
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_merchandise_hierarchy_parent'
)
BEGIN
    ALTER TABLE dbo.merchandise_hierarchy
    ADD CONSTRAINT FK_merchandise_hierarchy_parent
        FOREIGN KEY (parent_id) REFERENCES dbo.merchandise_hierarchy(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_merchandise_hierarchy_node_code'
      AND object_id = OBJECT_ID('dbo.merchandise_hierarchy')
)
BEGIN
    CREATE UNIQUE INDEX UQ_merchandise_hierarchy_node_code
        ON dbo.merchandise_hierarchy(node_code);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_merchandise_hierarchy_parent_name'
      AND object_id = OBJECT_ID('dbo.merchandise_hierarchy')
)
BEGIN
    CREATE UNIQUE INDEX UQ_merchandise_hierarchy_parent_name
        ON dbo.merchandise_hierarchy(parent_id, node_name)
        WHERE parent_id IS NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_merchandise_hierarchy_root_name'
      AND object_id = OBJECT_ID('dbo.merchandise_hierarchy')
)
BEGIN
    CREATE UNIQUE INDEX UQ_merchandise_hierarchy_root_name
        ON dbo.merchandise_hierarchy(node_name)
        WHERE parent_id IS NULL;
END;
GO

IF OBJECT_ID('dbo.merchandise_item_mapping', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.merchandise_item_mapping (
        id INT IDENTITY(1,1) NOT NULL PRIMARY KEY,
        node_id INT NOT NULL,
        root_id INT NOT NULL,
        item_code VARCHAR(50) NOT NULL,
        created_by VARCHAR(100) NULL,
        created_at DATETIME2 NOT NULL CONSTRAINT DF_merchandise_item_mapping_created_at DEFAULT (SYSDATETIME())
    );
END;
GO

IF COL_LENGTH('dbo.merchandise_item_mapping', 'root_id') IS NULL
BEGIN
    ALTER TABLE dbo.merchandise_item_mapping
    ADD root_id INT NULL;
END;
GO

UPDATE mim
SET mim.root_id = TRY_CONVERT(
        INT,
        CASE
            WHEN CHARINDEX('/', mh.hierarchy_path) > 0 THEN LEFT(mh.hierarchy_path, CHARINDEX('/', mh.hierarchy_path) - 1)
            ELSE mh.hierarchy_path
        END
    )
FROM dbo.merchandise_item_mapping mim
JOIN dbo.merchandise_hierarchy mh
    ON mh.id = mim.node_id
WHERE mim.root_id IS NULL;
GO

IF EXISTS (
    SELECT 1
    FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.merchandise_item_mapping')
      AND name = 'root_id'
      AND is_nullable = 1
)
AND NOT EXISTS (
    SELECT 1
    FROM dbo.merchandise_item_mapping
    WHERE root_id IS NULL
)
BEGIN
    ALTER TABLE dbo.merchandise_item_mapping
    ALTER COLUMN root_id INT NOT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_merchandise_item_mapping_node'
)
BEGIN
    ALTER TABLE dbo.merchandise_item_mapping
    ADD CONSTRAINT FK_merchandise_item_mapping_node
        FOREIGN KEY (node_id) REFERENCES dbo.merchandise_hierarchy(id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = 'FK_merchandise_item_mapping_root'
)
BEGIN
    ALTER TABLE dbo.merchandise_item_mapping
    ADD CONSTRAINT FK_merchandise_item_mapping_root
        FOREIGN KEY (root_id) REFERENCES dbo.merchandise_hierarchy(id);
END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_merchandise_item_mapping_item_code'
      AND object_id = OBJECT_ID('dbo.merchandise_item_mapping')
)
BEGIN
    DROP INDEX UQ_merchandise_item_mapping_item_code
        ON dbo.merchandise_item_mapping;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UQ_merchandise_item_mapping_root_item'
      AND object_id = OBJECT_ID('dbo.merchandise_item_mapping')
)
BEGIN
    CREATE UNIQUE INDEX UQ_merchandise_item_mapping_root_item
        ON dbo.merchandise_item_mapping(root_id, item_code);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_merchandise_hierarchy_parent_sort'
      AND object_id = OBJECT_ID('dbo.merchandise_hierarchy')
)
BEGIN
    CREATE INDEX IX_merchandise_hierarchy_parent_sort
        ON dbo.merchandise_hierarchy(parent_id, sort_order, node_name);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_merchandise_hierarchy_hierarchy_path'
      AND object_id = OBJECT_ID('dbo.merchandise_hierarchy')
)
BEGIN
    CREATE INDEX IX_merchandise_hierarchy_hierarchy_path
        ON dbo.merchandise_hierarchy(hierarchy_path);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_merchandise_item_mapping_node_id'
      AND object_id = OBJECT_ID('dbo.merchandise_item_mapping')
)
BEGIN
    CREATE INDEX IX_merchandise_item_mapping_node_id
        ON dbo.merchandise_item_mapping(node_id);
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_merchandise_item_mapping_root_id'
      AND object_id = OBJECT_ID('dbo.merchandise_item_mapping')
)
BEGIN
    CREATE INDEX IX_merchandise_item_mapping_root_id
        ON dbo.merchandise_item_mapping(root_id);
END;
GO
