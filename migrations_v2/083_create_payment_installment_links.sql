-- Final schema: payment_installment_links
-- All IDs: INT AUTO_INCREMENT
-- Sourced from: 080_create_payment_installment_links.sql
CREATE TABLE payment_installment_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tenant_id INT NOT NULL,
    payment_id INT NOT NULL,
    installment_id INT NOT NULL,
    amount_allocated DECIMAL(10,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (payment_id) REFERENCES payment_transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (installment_id) REFERENCES student_installments(id) ON DELETE RESTRICT
);
