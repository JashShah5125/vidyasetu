-- Migration 109: Create support_tickets and support_replies tables
-- DB-backed support ticketing (replaces in-memory mock).
-- Priority intentionally NOT included per requirement.

-- 1. Tickets table (one row per support ticket)
CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Ticket identification
    ticket_number VARCHAR(20) NOT NULL UNIQUE,

    -- Who raised it (NULL = platform-level ticket)
    tenant_id INT NULL,
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    -- Lifecycle
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed') NOT NULL DEFAULT 'Open',

    -- Metadata
    created_by INT NULL COMMENT 'users.id of the person who raised the ticket',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_support_tickets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE SET NULL,
    CONSTRAINT fk_support_tickets_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Replies table (conversation thread per ticket)
CREATE TABLE IF NOT EXISTS support_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender VARCHAR(100) NOT NULL,
    sender_role ENUM('tenant', 'staff') NOT NULL DEFAULT 'tenant',
    is_from_staff TINYINT(1) NOT NULL DEFAULT 0,
    message TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_support_replies_ticket FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX idx_support_tickets_tenant ON support_tickets(tenant_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at);
CREATE INDEX idx_support_replies_ticket ON support_replies(ticket_id);