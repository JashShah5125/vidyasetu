-- Final schema: saas_invoices
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 106_create_saas_invoices.sql
-- Note: removed subscription_id since tenant_subscriptions is gone
CREATE TABLE IF NOT EXISTS saas_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    tenant_id INT NOT NULL,
    base_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('draft', 'unpaid', 'paid', 'overdue', 'refunded', 'void') NOT NULL DEFAULT 'draft',
    billing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at DATETIME,
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_saas_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX idx_saas_invoices_status ON saas_invoices(status);
CREATE INDEX idx_saas_invoices_due_date ON saas_invoices(due_date);
