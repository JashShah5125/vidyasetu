-- Final schema: payment_transactions
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 079_create_payment_transactions.sql
CREATE TABLE payment_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    receipt_id INT NOT NULL,
    payment_mode VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reference_number VARCHAR(100),
    payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'success',
    gateway_response JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
