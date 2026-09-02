-- Final schema: refunds
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 081_create_refunds.sql
CREATE TABLE refunds (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    receipt_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    reason TEXT NOT NULL,
    refund_mode VARCHAR(50) NOT NULL,
    reference_number VARCHAR(100),
    approved_by INT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE RESTRICT,
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
