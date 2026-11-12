-- Migration 108: Recreate saas_invoices as a unified payment/invoice table
-- Drops old saas_payments (FK dependency) and old saas_invoices, creates new unified schema

-- 1. Drop saas_payments first (FK references saas_invoices)
DROP TABLE IF EXISTS saas_payments;

-- 2. Drop old saas_invoices
DROP TABLE IF EXISTS saas_invoices;

-- 3. Create unified saas_invoices table
-- Every row = one payment/invoice record with full details
CREATE TABLE IF NOT EXISTS saas_invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Invoice identification
    invoice_number VARCHAR(50) NOT NULL UNIQUE,

    -- Who is paying & for what
    tenant_id INT NOT NULL,
    plan_id INT NOT NULL,

    -- Billing details
    billing_cycle ENUM('monthly', 'quarterly', 'half_yearly', 'yearly', 'lifetime') NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,

    -- Amounts
    plan_amount DECIMAL(10,2) NOT NULL COMMENT 'Original plan price for this billing cycle',
    setup_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_percent DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    subtotal DECIMAL(10,2) NOT NULL COMMENT 'plan_amount + setup_fee - discount_amount',
    tax_rate DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL COMMENT 'subtotal + tax_amount',
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',

    -- Payment details
    payment_date DATE,
    payment_method VARCHAR(50) COMMENT 'Razorpay, UPI, Bank Transfer, Cash, Cheque',
    provider_transaction_id VARCHAR(100) COMMENT 'Gateway txn ID if online payment',
    payment_reference VARCHAR(100) COMMENT 'Cheque number, UPI ref, bank ref, etc.',

    -- Status
    status ENUM('draft', 'unpaid', 'paid', 'overdue', 'refunded', 'cancelled') NOT NULL DEFAULT 'draft',

    -- Metadata
    notes TEXT,
    created_by INT COMMENT 'User who created/entered this invoice',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_saas_invoices_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_saas_invoices_plan FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
);

-- Indexes for common queries
CREATE INDEX idx_saas_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX idx_saas_invoices_plan ON saas_invoices(plan_id);
CREATE INDEX idx_saas_invoices_status ON saas_invoices(status);
CREATE INDEX idx_saas_invoices_payment_date ON saas_invoices(payment_date);
CREATE INDEX idx_saas_invoices_billing_period ON saas_invoices(billing_period_start, billing_period_end);
