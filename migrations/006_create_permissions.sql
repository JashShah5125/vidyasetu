CREATE TABLE permissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    module VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    code VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at DATETIME,
    created_by INT,
    updated_by INT
);
