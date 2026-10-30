# Backend Scripts Directory

This folder contains database migrations, seed scripts, diagnostic utilities, and automated test scripts for the Vidyasetu backend.

---

## 📁 Categories

### 1. Migrations & Schema Adjustments
- `alter.js` — Table schema alteration runner
- `apply_monthly_default_timetables.js` — Applies default monthly timetable structures
- `build_timetable_plan.js` — Timetable schedule planner builder
- `execute_timetable_sql.js` — SQL executor for timetable migrations
- `fix_tenant.cjs` — Tenant record repair and patch script
- `generate_sql_timetable_queries.js` — Generates timetable batch SQL queries
- `migrate_plan_extensions.js` — Migration for subscription plan extensions
- `migrate_plans.js` — Migration for subscription plans
- `run_migration.js` — General database migration runner
- `run_migration_112.js` — Migration #112: Merge tenant tables
- `run_migration_122.js` — Migration #122 runner
- `run_migration_123.js` — Migration #123 runner
- `run_migration_124.js` — Migration #124 runner
- `run_migration_125.js` — Migration #125 runner
- `run_migration_134.js` — Migration #134 runner
- `run_migration_homework_status.js` — Homework status migration
- `update_dates.js` — Timestamp and date consistency updater

### 2. Seeds & Sample Data
- `seed_8th_default_timetable.js` — 8th standard default timetable seeder
- `seed_allen_enquiries.js` — Demo/seed enquiries
- `seed_classrooms_and_assign_batches.js` — Classroom creation and batch assignment seeder
- `seed_monthly_staff_salary_payments.js` — Staff salary and payment records seeder
- `seed_other_income_data.js` — Non-tuition income ledger seeder
- `seed_settings.js` — Platform default settings seeder
- `seed_staff_joining_and_salaries.js` — Staff onboarding and salary structure seeder

### 3. Tests & Diagnostic Checkers
- `check_all_batches_detailed.js` — Detailed batch verification utility
- `check_tables.js` — Database table inspector
- `debug_exact_pool.js` — MySQL connection pool debugging script
- `debug_programs.js` — Academic programs diagnostics
- `debug_tenants.js` — Tenant table and tenant context inspector
- `diagnose_timetable_mappings.js` — Timetable to batch mapping diagnostics
- `test_api.js` — API endpoint smoke test
- `test_branch_attendance.js` — Branch attendance service test
- `test_branch_homework.js` — Branch homework service test
- `test_branch_timetable.js` — Branch timetable service test
- `test_db.js` — MySQL connection and ping test
- `test_enrollment_records.js` — Student enrollment data verification
- `test_fees_data.js` — Fee collection data verification
- `test_level_subjects.js` — Academic level & subject relationship test
- `test_subjects.js` — Subject hierarchy and assignment test
- `test_teacher_schedule.js` — Faculty timetable schedule test
- `test_timetable_api.js` — Timetable API conflict checker
- `test_update.js` — Tenant update API test
- `test_upload.js` — File upload directory test

---

## 🚀 How to Run

From the `backend/` directory:
```bash
node scripts/<script_name>.js
```
Examples:
```bash
node scripts/test_db.js
node scripts/seed_settings.js
node scripts/check_tables.js
```
All scripts automatically load the database configuration from `../src/config/db` and `.env`.

