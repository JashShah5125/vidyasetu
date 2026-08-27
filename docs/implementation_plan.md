# SaaS Admin — Complete Architecture & Database Implementation Plan

---

## 1. Executive Summary

After a full audit of the Vidya Setu codebase, the system is **architecturally capable** of supporting SaaS Admin and multi-tenant management, but it is **not production-ready as-is**. The frontend has a comprehensive SaaS Admin UI with 14 sidebar pages. The backend, however, has **only one working API** (`/api/auth`). The entire application's business logic, including tenant management, RBAC, subscriptions, billing, and analytics, exists exclusively in frontend mock state — none of it is persisted to the database.

**The database schema itself is largely well-designed** — 98 migration files create a rich relational model. The primary engineering task is to **build the backend API layer** that connects the existing UI to the existing database, while resolving several critical schema gaps and security issues discovered during this audit.

### Critical Findings

| # | Finding | Severity |
|---|---------|----------|
| 1 | SaaS Admin is identified by `MASTER_TENANT_ID` in the JWT — no role record in DB | Critical |
| 2 | `isSaasAdmin = true` grants `permissions = ['*']` — wildcard bypass, not proper RBAC | Critical |
| 3 | `tenants` table has no `type` or `is_master` flag to distinguish system from customer tenants | High |
| 4 | No `saas_admin` role exists in the `roles` table — the system role seed is placeholder-only | High |
| 5 | `roles` table has a unique index `ON roles(code)` that makes it impossible to have a role code unique *per tenant* (the tenant-scoped index also uses the same code) | High |
| 6 | `user_roles.UNIQUE(user_id, role_id, branch_id)` allows NULL branch_id collisions | Medium |
| 7 | `users.email` column is nullable — but auth depends on it | High |
| 8 | No `platform_settings` or `system_config` table exists despite a full UI for System Configuration | High |
| 9 | `audit_logs` has no `correlation_id` or `metadata` field for structured data | Medium |
| 10 | `tenant_subscriptions` has no `amount_paid` or `invoice_id` field — billing is unlinked | Medium |
| 11 | Frontend-only authorization — logout removes the session but there is no per-route backend authorization beyond `requireAuth` | Critical |
| 12 | CORS is `app.use(cors())` — allows all origins in production | High |

---

## 2. Current Architecture Analysis

### Frontend Architecture
- **Framework**: React 19 + Vite 8 + TypeScript
- **Routing**: React Router DOM v7
- **State**: `AppContext` (global mock data), `AuthContext` (real JWT auth)
- **HTTP**: Axios with request/response interceptors for silent token refresh
- **Structure**: Pages → Components → Context → Services
- **Auth Status**: ✅ Connected to backend (JWT + Redis refresh)
- **Data Status**: ❌ All business data is mock state in `AppContext.tsx`

### Backend Architecture
- **Framework**: Express 5 + Node.js
- **Database**: MySQL 2 (connection pool)
- **Cache/Sessions**: Redis (for refresh tokens)
- **Auth**: JWT (15-min access token + 7-day refresh in Redis)
- **Validation**: Joi schemas via `validateMiddleware`
- **Structure**: Routes → Controller → Model (no service layer yet)
- **Working APIs**: Only `/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`
- **Security**: Helmet + CORS (misconfigured) + JWT verification

### Database Architecture
- **Engine**: MySQL 8 with `utf8mb4` charset
- **Primary Keys**: `VARCHAR(36)` UUIDs throughout — consistent ✅
- **Migrations**: 98 SQL files run sequentially via `npm run migrate`
- **Tenant Isolation**: Shared DB, shared schema (`tenant_id` on all tenant-owned tables) ✅
- **Foreign Keys**: Declared via SQL `REFERENCES` — MySQL enforces these ✅
- **Soft Delete**: `deleted_at DATETIME` on most tables ✅
- **Audit Fields**: `created_by`, `updated_by`, `created_at`, `updated_at` on most tables ✅

---

## 3. Complete SaaS Admin Sidebar Inventory

From `Sidebar.tsx` (`case 'saas-admin'`), the complete sidebar is:

| # | Group | Page Name | Route | Purpose |
|---|-------|-----------|-------|---------|
| 1 | — | Dashboard | `/dashboard` | Platform overview metrics |
| 2 | Tenant Management | Tenants | `/tenants` | Create, view, manage all institutes |
| 3 | Subscription Management | Plans | `/plans` | Define & manage subscription plans |
| 4 | Subscription Management | Tenant Subscriptions | `/tenant-subscriptions` | View/manage per-tenant subscriptions |
| 5 | Platform | Feature Flags | `/feature-flags` | Toggle platform features on/off globally |
| 6 | Platform | Module Management | `/modules` | Control module lifecycle (Enabled/Beta/Deprecated) |
| 7 | Operations | Approval Center | `/approvals` | Review and approve tenant requests |
| 8 | Operations | Support Tickets | `/support` | Handle tenant support tickets (badge: 3 pending) |
| 9 | Operations | Communication | `/communication` | Broadcast messages to tenants |
| 10 | Business | Billing & Revenue | `/billing` | Invoice management, MRR/ARR metrics |
| 11 | Business | Reports | `/saas-reports` | SaaS-level reports |
| 12 | Business | Product Analytics | `/analytics` | Tenant usage metrics, storage, branch counts |
| 13 | System | Integrations | `/providers` | Global infrastructure providers (SMTP, SMS, etc.) |
| 14 | System | Audit Logs | `/audit-logs` | Platform-wide audit trail |
| 15 | System | System Configuration | `/system-config` | SMTP, SMS, payments, branding, security, RBAC config |
| 16 | Support Desk | Settings | `/settings` | SaaS Admin personal settings |

---

## 4. SaaS Admin Business Domains

### Domain A — Tenant / Institute Management
- `/tenants` — List, search, filter, create, view, update tenants
- `/tenants/:id` — Tenant detail: profile, subscription, branches, users, usage
- Operations: Create tenant, set owner, assign plan, activate, suspend, deactivate

### Domain B — Subscription & Plan Management
- `/plans` — CRUD for subscription plan tiers
- `/tenant-subscriptions` — View/change/renew tenant subscriptions, view billing state
- `/billing` — Invoice register, MRR/ARR, outstanding payments, export

### Domain C — Platform Control
- `/feature-flags` — Global feature toggle (maps to `module_registry`)
- `/modules` — Module lifecycle states (Enabled/Beta/Deprecated/Coming Soon/Hidden)

### Domain D — Operations & Approvals
- `/approvals` — Approval queue for tenant requests (new tenant, plan change, domain, enterprise)
- `/support` — Ticket management with reply/resolve
- `/communication` — Broadcast to tenant operators

### Domain E — Analytics & Reporting
- `/analytics` — Product analytics: storage, branches, user counts per tenant
- `/saas-reports` — Revenue/performance reports

### Domain F — System Administration
- `/providers` — Global infrastructure config (SMTP, SMS, WhatsApp, Payments)
- `/system-config` — Full platform config with tabs: General, SMTP, SMS, Payments, Branding, Security, Permissions (RBAC editor)
- `/audit-logs` — Platform-wide audit log viewer

---

## 5. RBAC Architecture Audit

### How RBAC Works Now

```
JWT Token
  └─ isSaasAdmin: true/false
  └─ permissions: ['*'] (SaaS Admin) OR ['enquiry:create', 'fees:collect', ...]

authMiddleware.js
  ├─ requireAuth         → verifies JWT
  ├─ requireSaasAdmin    → checks req.user.isSaasAdmin === true
  └─ requirePermission   → checks req.user.permissions.includes(action)
                           SaaS Admin bypasses this check entirely
```

### Problems Identified

1. **`isSaasAdmin` is derived from `MASTER_TENANT_ID`** — this is not a database role. It is a hardcoded comparison in `authController.js`. If you change `MASTER_TENANT_ID`, SaaS Admin access changes for all existing users.
2. **Wildcard `permissions: ['*']`** — not an RBAC system. This is a bypass flag.
3. **`getUserPermissions`** does not account for `overridden_permissions` (which we just created).
4. **`user_roles` table** is the correct many-to-many structure but is not used in the current permission query to filter by active roles (no check for `revoked_at`).
5. **No `is_system` role** is actually seeded — `013_seed_system_roles_and_permissions.sql` only seeds 4 permissions and zero roles.
6. **Roles are tenant-scoped** (`tenant_id` on `roles` table) but the unique index `idx_roles_system_code ON roles(code)` ignores `tenant_id`. This creates a conflict: the system role `saas_admin` must have a NULL `tenant_id`, but any tenant creating a role with code `saas_admin` would violate the global unique constraint.

### Roles Table Unique Index Problem

```sql
-- Current (WRONG):
CREATE UNIQUE INDEX idx_roles_system_code ON roles(code);
CREATE UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code);

-- The first index makes ALL codes globally unique.
-- Tenant A and Tenant B cannot both have a role called "admin".
-- This must be fixed.
```

### Correct Multi-Tenant RBAC Model

```
System Roles (tenant_id = NULL, is_system = 1):
  └─ saas_admin  → has permissions ['tenant.*', 'subscription.*', ...]

Tenant Roles (tenant_id = 'tenant-uuid', is_system = 0):
  └─ inst_admin, branch_admin, teacher, counsellor, finance
  └─ These are tenant-specific, can share code names safely

Permission scope:
  └─ All permissions are global definitions (no tenant_id on permissions)
  └─ role_permissions maps role → permission
  └─ user_roles maps user → role within a tenant context
```

---

## 6. SaaS Admin Permission Catalog

All permissions follow the convention: `resource.action`

| Permission Code | Description | Module | SaaS Admin |
|-----------------|-------------|--------|------------|
| `tenant.view` | List and view all tenant records | Tenant | YES |
| `tenant.create` | Onboard new tenant | Tenant | YES |
| `tenant.update` | Edit tenant profile/settings | Tenant | YES |
| `tenant.activate` | Activate a draft/suspended tenant | Tenant | YES |
| `tenant.suspend` | Suspend a tenant's access | Tenant | YES |
| `tenant.delete` | Soft-delete a tenant | Tenant | YES |
| `plan.view` | View subscription plans | Plans | YES |
| `plan.create` | Create a new subscription plan | Plans | YES |
| `plan.update` | Modify plan details/pricing | Plans | YES |
| `plan.delete` | Deactivate a plan | Plans | YES |
| `subscription.view` | View all tenant subscriptions | Subscriptions | YES |
| `subscription.assign` | Assign a plan to a tenant | Subscriptions | YES |
| `subscription.update` | Change subscription status/dates | Subscriptions | YES |
| `subscription.cancel` | Cancel a tenant subscription | Subscriptions | YES |
| `module.view` | View module registry | Modules | YES |
| `module.update` | Change module lifecycle state | Modules | YES |
| `feature_flag.view` | View feature flags | Feature Flags | YES |
| `feature_flag.toggle` | Enable/disable feature flags globally | Feature Flags | YES |
| `approval.view` | View approval requests | Approvals | YES |
| `approval.process` | Approve or reject requests | Approvals | YES |
| `support.view` | View all support tickets | Support | YES |
| `support.reply` | Reply to a support ticket | Support | YES |
| `support.resolve` | Mark a ticket as resolved | Support | YES |
| `communication.send` | Broadcast communications to tenants | Communication | YES |
| `billing.view` | View invoices and billing data | Billing | YES |
| `billing.export` | Export billing data as CSV | Billing | YES |
| `analytics.view` | View product analytics | Analytics | YES |
| `report.view` | View SaaS reports | Reports | YES |
| `audit_log.view` | View audit trail | Audit | YES |
| `system_config.view` | View system configuration | System Config | YES |
| `system_config.update` | Modify system configuration | System Config | YES |
| `role.view` | View roles and permissions matrix | RBAC | YES |
| `role.update` | Modify role permissions | RBAC | YES |
| `user.view` | View platform users | Users | YES |
| `user.update` | Update user status/access | Users | YES |

**Permissions explicitly NOT created** (internal implementation details):
- Individual field-level updates (handled by `tenant.update`)
- Password reset (handled by auth flow)
- JWT/token management (internal)
- Database operations (internal)

---

## 7. SaaS Admin Role Design

| Property | Value |
|----------|-------|
| Name | SaaS Admin |
| Code | `saas_admin` |
| Description | Platform-level super administrator with cross-tenant access |
| Scope | **System** (not tenant-scoped, `tenant_id = NULL`) |
| `is_system` | `1` |
| `is_active` | `1` |
| `tenant_id` | `NULL` |
| Protected | Yes — cannot be modified or deleted via UI |

> [!IMPORTANT]
> The SaaS Admin role must have `tenant_id = NULL`. This means the unique index on `roles(code)` cannot coexist with `roles(tenant_id, code)` because both try to enforce uniqueness on `code` globally. **The global `idx_roles_system_code` index must be dropped and replaced** with a partial/conditional uniqueness approach.

**Fix**: The roles table needs an application-level enforcement:
- System roles: `code` unique where `tenant_id IS NULL`  
- Tenant roles: `(tenant_id, code)` unique where `tenant_id IS NOT NULL`

This requires dropping the conflicting global unique index and creating a new compound index.

---

## 8. Existing Database Schema Audit

### `tenants` — REQUIRES MODIFICATION

```
Current columns: id, name, slug, code, status, created_at, updated_at, deleted_at, created_by, updated_by

Problems:
- No `type` field to distinguish system/master tenant from customer tenants
- No `is_master` or `tenant_type` flag
- Status is VARCHAR(20) — values are unconstrained ('draft', 'active', 'suspended', etc.)
- No index on `status` for filtering
- `code` is unique but no application meaning documented
- Missing `phone`, `website`, `logo_url` — these exist in tenant_profiles (correct separation ✅)
```

### `tenant_profiles` — SUFFICIENT

```
Well-designed. Contains owner info, address, branding, timezone.
✅ 1:1 with tenants via UNIQUE(tenant_id)
✅ Soft delete, audit fields
No changes required.
```

### `roles` — REQUIRES MODIFICATION

```
Current columns: id, tenant_id, name, code, description, is_system, is_active, created_at, updated_at, deleted_at, created_by, updated_by

Problems:
- UNIQUE INDEX idx_roles_system_code ON roles(code) — globally unique code, prevents tenant roles from reusing common names like 'admin'
- MySQL doesn't support partial indexes natively — requires dropping the global index and using application-level or composite index enforcement

Fix: 
- DROP INDEX idx_roles_system_code
- Keep: UNIQUE INDEX idx_roles_tenant_code ON roles(tenant_id, code) 
- Add: Application constraint — when tenant_id IS NULL, enforce uniqueness via unique partial technique using a sentinel value or separate composite with IFNULL
```

### `permissions` — REQUIRES DATA SEEDING ONLY

```
Schema is correct. No structural changes needed.
Current seed (013_seed_...): Only 4 permissions seeded.
Need to seed all 36 SaaS Admin permissions defined in Section 6.
```

### `role_permissions` — REQUIRES SEEDING

```
Schema is correct.
Columns: id, role_id, permission_id, created_at
Has UNIQUE(role_id, permission_id) ✅
Has ON DELETE CASCADE ✅
Just needs data: map saas_admin role to all saas_admin permissions.
```

### `users` — REQUIRES MODIFICATION

```
Problems:
- email is nullable (VARCHAR(255) — no NOT NULL constraint)
- Auth system depends entirely on email lookup
- user_type is VARCHAR(20) — values are unconstrained (should be ENUM or reference)
- No index on email alone (only composite tenant_id+email) — auth queries email without tenant
- password_hash is nullable — users could exist without passwords
```

### `user_roles` — REQUIRES MODIFICATION

```
Problems:
- UNIQUE(user_id, role_id, branch_id) — when branch_id IS NULL, MySQL treats multiple NULLs as distinct. 
  A user could be assigned the same role multiple times at the institute level.
- No active/inactive status — uses revoked_at but no is_active flag
- No validation that role's tenant_id matches user_roles.tenant_id
```

### `tenant_subscriptions` — REQUIRES MODIFICATION

```
Problems:
- No amount_paid, invoice_reference, or payment_gateway_id
- No price_at_subscription (snapshot of price when subscribed — needed for billing history)
- status is VARCHAR(20) — unconstrained
- billing_cycle is VARCHAR(10) — unconstrained
```

### `subscription_plans` — REQUIRES MINOR MODIFICATION

```
Problems:
- No description field
- No trial_period_days (trial logic is in tenant_subscriptions as trial_ends_at but plan-level trial not defined)
- is_active uses TINYINT but no soft-delete for plans that have active subscribers
```

### `audit_logs` — REQUIRES MODIFICATION

```
Problems:
- No correlation_id (for tracing related actions)
- No request_method, endpoint fields for HTTP context
- entity_id is VARCHAR(36) but some entities may have non-UUID IDs
- No severity/level field (INFO/WARNING/CRITICAL)
- Missing INDEX on user_id for per-user audit filtering
```

### `module_registry` — REQUIRES MODIFICATION

```
Problems:
- default_state uses VARCHAR(20) — values ('enabled', 'beta', 'deprecated', 'coming_soon', 'hidden') are unconstrained
- No description field
- No version field (the UI shows releaseVersion)
- No category field (the UI shows 'Core ERP', 'Finance', etc.)
```

### NEW TABLES REQUIRED

**`platform_settings`** — System Configuration tab in UI has General/SMTP/SMS/Payments/Branding/Security settings that have no database backing.

**`approval_requests`** — The Approval Center has request types, statuses, notes, and timestamps. Currently mock-only.

**`saas_invoices`** — The Billing & Revenue page shows invoices. `tenant_subscriptions` has no billing table.

**`support_tickets`** and **`ticket_replies`** — Support Tickets page has a full reply/resolve workflow. No database backing.

**`broadcast_messages`** — Communication Center has no backing table beyond the basic `broadcast_messages` migration (migration `094` exists but needs to be verified for completeness).

---

## 9. Required Database Changes

| Table | Status | Required Change | Reason | Priority |
|-------|--------|-----------------|--------|----------|
| `tenants` | Existing | Add `tenant_type` ENUM, add status index | Distinguish master/customer tenants, improve filter queries | P0 |
| `roles` | Existing | Drop global unique index, replace with IFNULL composite | Enable tenant-scoped role codes, allow system roles with NULL tenant_id | P0 |
| `users` | Existing | Make `email` NOT NULL, add global `email` index for auth, constrain `user_type` | Auth security, login query performance | P0 |
| `permissions` | Existing | Seed all SaaS Admin permissions | No structural change, only data | P0 |
| `role_permissions` | Existing | Seed saas_admin role + permission mappings | No structural change, only data | P0 |
| `user_roles` | Existing | Fix NULL branch_id uniqueness issue | Prevent duplicate role assignments | P1 |
| `tenant_subscriptions` | Existing | Add `price_at_subscription`, `activated_by` | Billing history accuracy | P1 |
| `subscription_plans` | Existing | Add `description`, `trial_period_days` | UI requires these fields | P1 |
| `audit_logs` | Existing | Add `correlation_id`, `severity`, `endpoint`, `request_method`, user_id index | Production-grade audit trail | P1 |
| `module_registry` | Existing | Add `description`, `version`, `category`, constrain `default_state` | Match UI fields | P1 |
| `platform_settings` | **NEW** | Create table | System Configuration backing | P0 |
| `approval_requests` | **NEW** | Create table | Approval Center backing | P1 |
| `saas_invoices` | **NEW** | Create table | Billing & Revenue backing | P1 |
| `support_tickets` | **NEW** | Verify existing migration completeness | Support Tickets backing | P1 |
| `ticket_replies` | **NEW** | Create table if not in migration | Ticket reply thread | P1 |

---

## 10. New Tables Required

### `platform_settings`
```sql
CREATE TABLE platform_settings (
    id VARCHAR(36) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,        -- 'general', 'smtp', 'sms', 'payments', 'branding', 'security'
    key_name VARCHAR(100) NOT NULL,
    value TEXT,
    is_secret TINYINT(1) NOT NULL DEFAULT 0,  -- encrypted secrets
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    updated_by VARCHAR(36) REFERENCES users(id),
    UNIQUE(category, key_name)
);
-- Indexes: 
CREATE INDEX idx_platform_settings_category ON platform_settings(category);
```

### `approval_requests`
```sql
CREATE TABLE approval_requests (
    id VARCHAR(36) PRIMARY KEY,
    request_type ENUM('new_tenant','subscription_change','custom_domain','enterprise_custom') NOT NULL,
    tenant_id VARCHAR(36) REFERENCES tenants(id),
    requester_name VARCHAR(255) NOT NULL,
    details TEXT NOT NULL,
    status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    decision_note TEXT,
    decided_by VARCHAR(36) REFERENCES users(id),
    decided_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36)
);
CREATE INDEX idx_approval_requests_status ON approval_requests(status);
CREATE INDEX idx_approval_requests_tenant ON approval_requests(tenant_id);
```

### `saas_invoices`
```sql
CREATE TABLE saas_invoices (
    id VARCHAR(36) PRIMARY KEY,
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    tenant_id VARCHAR(36) NOT NULL REFERENCES tenants(id),
    subscription_id VARCHAR(36) REFERENCES tenant_subscriptions(id),
    base_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    status ENUM('draft','unpaid','paid','overdue','refunded','void') NOT NULL DEFAULT 'draft',
    billing_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_at DATETIME,
    payment_reference VARCHAR(255),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by VARCHAR(36)
);
CREATE INDEX idx_saas_invoices_tenant ON saas_invoices(tenant_id);
CREATE INDEX idx_saas_invoices_status ON saas_invoices(status);
CREATE INDEX idx_saas_invoices_due_date ON saas_invoices(due_date);
```

---

## 11. Multi-Tenancy Architecture Review

**Model Used**: Option A — Shared database, shared schema with `tenant_id` on all tenant-owned tables.

This is the correct model for this application stage. All tenant-owned tables have `tenant_id`. 

**Confirmed correct**: `branches`, `users`, `students`, `batches`, `courses`, `subjects`, `staff_profiles`, `attendance_records`, `fee_records`, `audit_logs`, etc. — all have `tenant_id`.

**Critical issue found**: The `users` table unique index is `UNIQUE(tenant_id, email)` — meaning the same email address can exist across multiple tenants. This is **correct** for multi-tenancy (an instructor at one institute should be able to have the same email if they teach at another). However, the **auth query** in `userModel.js` is:

```js
SELECT * FROM users WHERE email = ?
```

This will return **the first matching user** regardless of which tenant they belong to. **If two users share the same email across different tenants, the first one wins.** This is an IDOR vulnerability.

**Fix required**: Auth should always resolve user by email AND tenant context. For SaaS Admin login, query by `email AND tenant_id = MASTER_TENANT_ID`.

---

## 12. Tenant Data Model

The tenant model correctly separates concerns across tables:

```
tenants (identity: name, slug, code, status)
  └─ tenant_profiles (1:1) — owner details, address, branding, GST
  └─ tenant_subscriptions (1:N) — subscription history
       └─ subscription_plans — plan definition
  └─ branches (1:N) — branch locations
  └─ users (1:N) — all users for this tenant
       └─ user_roles (N:M) — role assignments
  └─ tenant_module_overrides (1:N) — feature toggles per tenant
```

**Missing link**: There is no direct "who is the primary administrator of this tenant?" relationship. The `tenant_profiles` table has `owner_name`, `owner_email` fields, but there is no FK to `users`. **If a SaaS Admin creates a tenant and an admin user simultaneously, there is no FK enforcing that the tenant's admin account actually exists in the `users` table.** This creates orphan risk.

**Recommended addition**: Add `primary_admin_user_id VARCHAR(36) REFERENCES users(id)` to the `tenants` table.

---

## 13. API Architecture Plan

Following the project's existing pattern of `Routes → Middleware → Controller`. I recommend introducing a **Service layer** now to keep controllers thin.

```
Routes
  ↓
Middleware (requireAuth, requirePermission, validate)
  ↓
Controller (request parsing, response formatting)
  ↓
Service (business logic, transactions)
  ↓
Repository/Model (raw SQL queries)
  ↓
Database
```

### SaaS Admin API Endpoints

**Tenants**
```
GET    /api/admin/tenants                        → tenant.view
POST   /api/admin/tenants                        → tenant.create
GET    /api/admin/tenants/:id                    → tenant.view
PUT    /api/admin/tenants/:id                    → tenant.update
PATCH  /api/admin/tenants/:id/status             → tenant.activate | tenant.suspend
DELETE /api/admin/tenants/:id                    → tenant.delete
```

**Subscription Plans**
```
GET    /api/admin/plans                          → plan.view
POST   /api/admin/plans                          → plan.create
PUT    /api/admin/plans/:id                      → plan.update
DELETE /api/admin/plans/:id                      → plan.delete
```

**Tenant Subscriptions**
```
GET    /api/admin/subscriptions                  → subscription.view
POST   /api/admin/subscriptions                  → subscription.assign
PUT    /api/admin/subscriptions/:id              → subscription.update
PATCH  /api/admin/subscriptions/:id/cancel       → subscription.cancel
```

**Modules & Feature Flags**
```
GET    /api/admin/modules                        → module.view
PATCH  /api/admin/modules/:id/state              → module.update
GET    /api/admin/feature-flags                  → feature_flag.view
PATCH  /api/admin/feature-flags/:id/toggle       → feature_flag.toggle
```

**Approvals**
```
GET    /api/admin/approvals                      → approval.view
PATCH  /api/admin/approvals/:id/decision         → approval.process
```

**Support**
```
GET    /api/admin/support/tickets                → support.view
POST   /api/admin/support/tickets/:id/reply      → support.reply
PATCH  /api/admin/support/tickets/:id/resolve    → support.resolve
```

**Billing**
```
GET    /api/admin/billing/invoices               → billing.view
GET    /api/admin/billing/metrics                → billing.view
POST   /api/admin/billing/invoices/export        → billing.export
```

**Analytics**
```
GET    /api/admin/analytics/usage                → analytics.view
GET    /api/admin/analytics/modules              → analytics.view
```

**System Config**
```
GET    /api/admin/system-config                  → system_config.view
PUT    /api/admin/system-config                  → system_config.update
```

**Audit Logs**
```
GET    /api/admin/audit-logs                     → audit_log.view
```

---

## 14. Frontend Implementation Plan

The frontend already has complete UI for all SaaS Admin pages. The implementation work is:

1. **Remove all mock data** from SaaS Admin pages — replace with real API calls via `api.ts` (Axios instance)
2. **Add permission guards** — frontend routes should check `currentUser` role before rendering, but backend must enforce permissions
3. **Consistent error handling** — use the existing Axios interceptors; add toast notifications for API errors
4. **Loading states** — replace static mock arrays with `useState` + `useEffect` + API call pattern
5. **Pagination** — `BillingRevenue.tsx` already implements pagination; replicate for all table pages
6. **Form validation** — use existing regex pattern for now; Zod/React Hook Form for complex forms later

No new pages need to be created. The routing (`App.tsx`) is already configured.

---

## 15. Transaction & Data Integrity Strategy

### Operations requiring database transactions

**Tenant Creation** (atomic):
```
BEGIN TRANSACTION
1. INSERT INTO tenants
2. INSERT INTO tenant_profiles  
3. INSERT INTO users (admin user)
4. INSERT INTO user_roles (assign inst_admin role)
5. INSERT INTO tenant_subscriptions
6. INSERT INTO audit_logs
COMMIT or ROLLBACK ALL
```

**Tenant Suspension** (atomic):
```
BEGIN TRANSACTION
1. UPDATE tenants SET status = 'suspended'
2. Revoke all active user sessions via Redis (set per-tenant session invalidation flag)
3. INSERT INTO audit_logs
COMMIT
```

**Permission Assignment** (atomic):
```
BEGIN TRANSACTION
1. DELETE existing role_permissions for role
2. INSERT new role_permissions
3. INSERT audit_log
COMMIT
```

---

## 16. Audit & Security Strategy

### Operations requiring audit log entries

| Operation | Entity Type | Details Logged |
|-----------|-------------|----------------|
| Tenant created | `tenant` | tenant_id, name, plan, created_by |
| Tenant status changed | `tenant` | tenant_id, old_status, new_status, actor |
| Subscription assigned | `subscription` | tenant_id, plan_id, dates, actor |
| Approval processed | `approval_request` | request_id, decision, note, actor |
| Support ticket resolved | `support_ticket` | ticket_id, actor |
| System config changed | `platform_settings` | key, old_value (masked if secret), new_value |
| Role permissions changed | `role` | role_id, added_permissions, removed_permissions |
| Feature flag toggled | `module_registry` | module_code, old_state, new_state |

### Security Fixes Required

1. **Fix CORS**: Replace `app.use(cors())` with explicit origin whitelist
2. **Fix Auth Query**: Scope `findUserByEmail` by `tenant_id` for non-SaaS Admin
3. **Fix `permissions: ['*']`**: Replace with actual permission codes from DB for SaaS Admin
4. **Backend route guards**: Add `requireAuth + requireSaasAdmin` to ALL `/api/admin/*` routes
5. **Remove `isSaasAdmin` bypass** in `requirePermission` — use proper permission check instead
6. **Rate limiting**: Add `express-rate-limit` to auth endpoints (login brute-force protection)
7. **Secret encryption**: `platform_settings.is_secret = 1` fields should be encrypted at rest

---

## 17. Migration Strategy

Migrations must be run in dependency order. New migrations will be numbered from `099` onwards.

```
099_fix_roles_unique_index.sql
  → Drop idx_roles_system_code, add compound IFNULL-based index

100_fix_users_email_not_null.sql
  → ALTER TABLE users MODIFY email VARCHAR(255) NOT NULL
  → Verify no existing NULL emails before running

101_add_tenant_type.sql
  → ALTER TABLE tenants ADD COLUMN tenant_type ENUM('master','customer') DEFAULT 'customer'
  → UPDATE tenants SET tenant_type = 'master' WHERE id = MASTER_TENANT_ID

102_modify_module_registry.sql
  → ADD COLUMN description TEXT
  → ADD COLUMN version VARCHAR(50) 
  → ADD COLUMN category VARCHAR(100)

103_modify_audit_logs.sql
  → ADD COLUMN correlation_id VARCHAR(36)
  → ADD COLUMN severity ENUM('info','warning','critical') DEFAULT 'info'
  → CREATE INDEX idx_audit_logs_user ON audit_logs(user_id)

104_create_platform_settings.sql
  → CREATE TABLE platform_settings (...)

105_create_approval_requests.sql
  → CREATE TABLE approval_requests (...)

106_create_saas_invoices.sql
  → CREATE TABLE saas_invoices (...)

107_seed_saas_admin_role.sql
  → INSERT system-scoped saas_admin role with tenant_id = NULL

108_seed_saas_admin_permissions.sql
  → INSERT all 36 permissions from Section 6

109_seed_saas_admin_role_permissions.sql
  → INSERT role_permissions mapping for saas_admin role

110_seed_default_modules.sql
  → INSERT module_registry entries for all UI modules
```

All migrations must:
- Use `CREATE TABLE IF NOT EXISTS` where applicable
- Use `ALTER TABLE ... IF NOT EXISTS` for column additions
- Be idempotent (safe to re-run)
- Not destroy existing data

---

## 18. Testing Strategy

### Unit Tests (Jest)
- Permission check logic in `authMiddleware.js`
- Service layer business rules
- Joi validation schemas for all new endpoints
- Tenant status transition logic

### Integration Tests (Supertest)
- Tenant creation transaction: verify all 6 records are created or none
- Tenant suspension: verify session invalidation
- Login with master tenant user: verify `isSaasAdmin` path
- Login with customer tenant user: verify permissions loaded from DB

### API Tests
- `GET /api/admin/tenants` — 401 without token, 403 without `tenant.view` permission, 200 with saas_admin
- `POST /api/admin/tenants` — validate all required fields, duplicate slug/code errors
- `PATCH /api/admin/tenants/:id/status` — test all status transitions
- Pagination: verify `page`, `limit`, `total` in response

### Security Tests
- Customer tenant user CANNOT call `/api/admin/*` — must return 403
- Tenant A admin CANNOT read Tenant B data
- Expired token returns 401, not 500
- SaaS Admin CANNOT escalate tenant users to saas_admin role

### Database Tests
- Foreign key cascade: deleting a tenant cascades to branches, users, subscriptions
- Unique constraint: duplicate `(tenant_id, code)` on roles fails
- Soft delete: `deleted_at` set, record not returned in active queries

---

## 19. Risk Register

| Risk | Severity | Current Problem | Impact | Recommended Solution |
|------|----------|-----------------|--------|----------------------|
| Auth IDOR on shared email | **Critical** | `findUserByEmail` returns first match | Wrong user authenticated | Scope query by tenant_id |
| Wildcard permission bypass | **Critical** | `permissions: ['*']` for SaaS Admin | Cannot do granular permission control | Seed real permissions, use proper RBAC |
| No backend guards on admin routes | **Critical** | Only auth route exists | All admin API would be unprotected | Add `requireSaasAdmin` to all `/api/admin/*` |
| CORS misconfiguration | **High** | `cors()` with no origin | Any domain can call API | Add origin whitelist |
| Global roles unique index | **High** | `UNIQUE(code)` on roles prevents tenant role reuse | Cannot create tenant roles with common names | Drop index, use composite |
| Nullable user email | **High** | Auth depends on email, column is nullable | Possible NULL email accounts break auth | `ALTER TABLE users MODIFY email NOT NULL` |
| NULL branch_id in user_roles unique | **Medium** | MySQL treats multiple NULLs as distinct | Duplicate role assignment possible | Add sentinel or application constraint |
| Missing transaction boundaries | **Medium** | Tenant creation is multi-step | Partial tenant creation on error | Wrap in DB transactions |
| Platform secrets stored in plain text | **Medium** | `platform_settings.value TEXT` | API keys exposed in DB dump | Encrypt `is_secret = 1` values |
| Frontend-only auth check | **Medium** | Role checked in React only | Any API call bypasses role guards | All routes must have backend middleware |
| No rate limiting | **Medium** | Unlimited login attempts | Brute force attack on passwords | Add `express-rate-limit` |
| Missing `primary_admin_user_id` on tenants | **Low** | No FK from tenant to its admin user | Orphan tenant possible | Add FK column to tenants table |

---

## 20. Domain-Based Implementation Breakdown

### Part 1 — RBAC Foundation (DB + Migrations)
- Fix `roles` unique index  
- Seed `saas_admin` system role  
- Seed all 36 permissions  
- Seed `role_permissions` for `saas_admin`  
- Fix `getUserPermissions` to exclude revoked roles  
- Fix SaaS Admin permission loading (replace `['*']` with DB query)  
- **Files**: `099–109` migrations, `userModel.js`

### Part 2 — Security Hardening (Backend)
- Fix CORS origin whitelist  
- Fix `findUserByEmail` to scope by tenant  
- Fix `requirePermission` to not use wildcard bypass  
- Add `express-rate-limit` on auth routes  
- **Files**: `app.js`, `authMiddleware.js`, `userModel.js`, `authController.js`

### Part 3 — Tenant Management API
- Tenant list, create, view, update, status change  
- Tenant creation as atomic transaction  
- **Files**: `tenantRoutes.js`, `tenantController.js`, `tenantService.js`, `tenantModel.js`

### Part 4 — Subscription & Plan API
- Plans CRUD  
- Tenant subscription management  
- **Files**: `planRoutes.js`, `subscriptionRoutes.js`, `planController.js`, etc.

### Part 5 — Platform Control API
- Module registry management  
- Feature flag toggle  
- **Files**: `moduleRoutes.js`, `featureFlagRoutes.js`

### Part 6 — Operations API
- Approval Center CRUD  
- Support Tickets with replies  
- Communication broadcasts  
- **Files**: `approvalRoutes.js`, `supportRoutes.js`, `communicationRoutes.js`

### Part 7 — Billing & Analytics API
- Invoices, metrics  
- Product analytics aggregations  
- **Files**: `billingRoutes.js`, `analyticsRoutes.js`

### Part 8 — System Config API
- Platform settings CRUD  
- Secret masking  
- **Files**: `systemConfigRoutes.js`

### Part 9 — Audit Logging
- Middleware for automatic audit log insertion  
- Audit log query API  
- **Files**: `auditMiddleware.js`, `auditRoutes.js`

### Part 10 — Frontend Integration
- Replace mock data in all 14 SaaS Admin pages  
- Add loading states, error handling  
- **Files**: All files in `frontend/src/pages/saas/`, `TenantsManager.tsx`, `SubscriptionPlans.tsx`, etc.

---

## 21. Dependency-Aware Implementation Order

```
Step 1 — Database Foundation
  ├─ Migrations 099–110 (schema fixes + new tables)
  ├─ System roles and permissions seeded
  └─ Dependencies: None

Step 2 — Security Fixes
  ├─ CORS whitelist
  ├─ Fix email auth query scoping
  ├─ Fix SaaS Admin permission loading from DB
  └─ Dependencies: Step 1 (permissions must exist in DB)

Step 3 — Backend Architecture Setup
  ├─ Introduce Service layer pattern
  ├─ Audit middleware
  ├─ Error response standardization
  └─ Dependencies: Step 2

Step 4 — Tenant Management API (Part 3 above)
  └─ Dependencies: Step 3, tenants/users/roles tables correct

Step 5 — Plan & Subscription API (Part 4)
  └─ Dependencies: Step 4

Step 6 — Platform Control API (Part 5)
  └─ Dependencies: Step 3, module_registry seeded

Step 7 — Operations API (Part 6)
  └─ Dependencies: Step 3, approval_requests table created

Step 8 — Billing API (Part 7)
  └─ Dependencies: Step 5, saas_invoices table

Step 9 — System Config & Audit API (Parts 8, 9)
  └─ Dependencies: Step 3, platform_settings table

Step 10 — Frontend Integration (Part 10)
  └─ Dependencies: Steps 4–9 (all API endpoints live)

Step 11 — Testing
  └─ Dependencies: Step 10

Step 12 — Production Hardening
  ├─ Rate limiting
  ├─ Secret encryption for platform_settings
  ├─ Final CORS config
  └─ Dependencies: Steps 1–11
```

---

## 22. Acceptance Criteria

### RBAC
- [ ] `saas_admin` role exists in `roles` table with `tenant_id = NULL` and `is_system = 1`
- [ ] All 36 permissions exist in `permissions` table
- [ ] All permissions are mapped to `saas_admin` role in `role_permissions`
- [ ] SaaS Admin login returns real permissions from DB, not `['*']`
- [ ] `requirePermission('tenant.view')` succeeds for SaaS Admin, fails for `inst_admin`

### Tenant Management
- [ ] Create tenant creates tenant + profile + admin user + subscription + audit log atomically
- [ ] Partial failure rolls back all records
- [ ] Tenant list returns paginated, filterable results
- [ ] Suspended tenant cannot log in

### Security
- [ ] Customer tenant user gets 403 on all `/api/admin/*` routes
- [ ] Email auth query is tenant-scoped
- [ ] CORS blocks unauthorized origins
- [ ] Rate limit returns 429 after 10 failed login attempts in 15 minutes

### Database
- [ ] Roles unique index fix allows `admin` role code in multiple tenants
- [ ] Tenant creation cascade: deleting tenant soft-deletes related records
- [ ] `user_roles` prevents duplicate role assignment

---

## 23. Recommended First Implementation Step

**Step 1: Run the database foundation migrations (099–110).**

This is the prerequisite for everything else. Before writing any API code, the database must have:
- The corrected `roles` index
- The `saas_admin` role seeded with real permissions
- The `platform_settings`, `approval_requests`, and `saas_invoices` tables
- The module_registry seeded with the 8 modules shown in the UI

These are pure SQL changes. No application code risk. They can be verified by querying the DB directly.

---

## FEASIBILITY

### Is the architecture capable?
**Yes** — The foundational architecture (JWT + Redis auth, SQL migrations, React UI) is sound. The database schema is 90% correct and well-indexed. The frontend UI is complete and only requires API connections.

### What must change?
- RBAC must be properly implemented in the database (not `['*']` bypass)
- The `findUserByEmail` auth vulnerability must be fixed
- CORS must be configured
- 11 new migrations must be run
- The entire backend API layer must be built (Parts 3–9 above)
- Frontend mock data must be replaced with real API calls

### What can remain unchanged?
- The JWT + Redis session architecture
- The Axios service layer and interceptors in the frontend
- The migration runner script
- The overall database schema (minor additions, no destructive drops)
- The React component structure and routing in `App.tsx`
- The Sidebar navigation configuration in `Sidebar.tsx`
- The `AuthContext` and `AppContext` separation (with minor cleanup)

### Highest-risk architectural issues?
1. **Auth IDOR** (email scoping) — Fix immediately before any production use
2. **Wildcard SaaS Admin bypass** — Replace before exposing any admin APIs
3. **Missing transaction boundaries** — Fix during Tenant Creation implementation
