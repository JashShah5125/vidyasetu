-- Final schema: approval_requests
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 105_create_approval_requests.sql
CREATE TABLE IF NOT EXISTS approval_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    request_type ENUM('new_tenant', 'subscription_change', 'custom_domain', 'enterprise_custom') NOT NULL,
    tenant_id INT,
    requester_name VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    decision_note TEXT,
    decided_by INT,
    decided_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_tenant ON approval_requests(tenant_id);
