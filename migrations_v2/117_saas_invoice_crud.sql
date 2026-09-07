-- Migration 117: Soft-delete support for saas_invoices
-- Adds a deleted_at column so invoices can be logically removed
-- without destroying audit history (matches app-wide convention).

ALTER TABLE saas_invoices
    ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL AFTER updated_at;

CREATE INDEX idx_saas_invoices_deleted ON saas_invoices(deleted_at);