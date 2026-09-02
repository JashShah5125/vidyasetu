-- Final schema: saas_payments
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 109_create_saas_payments.sql
CREATE TABLE IF NOT EXISTS saas_payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    tenant_id INT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    payment_method VARCHAR(50),
    provider_transaction_id VARCHAR(100),
    status ENUM('success', 'failed', 'refunded') NOT NULL DEFAULT 'success',
    paid_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES saas_invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_saas_payments_invoice ON saas_payments(invoice_id);
CREATE INDEX idx_saas_payments_tenant ON saas_payments(tenant_id);
