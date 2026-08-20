CREATE TABLE tenant_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
    owner_name VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    owner_mobile VARCHAR(20) NOT NULL,
    address_line1 VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    pincode VARCHAR(10),
    country VARCHAR(100) DEFAULT 'India',
    gst_number VARCHAR(20),
    pan_number VARCHAR(15),
    logo_url TEXT,
    primary_color VARCHAR(7),
    timezone VARCHAR(50) NOT NULL DEFAULT 'Asia/Kolkata',
    website VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);

