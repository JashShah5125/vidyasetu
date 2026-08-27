# VidyaSetu — Version 0.1.0

## Executive Summary
VidyaSetu is a high-fidelity, multi-tenant **Software as a Service (SaaS)** Education ERP and CRM platform designed to serve multiple coaching institutes and academies. The platform enables centralized platform administration, subscription management, tenant billing, feature gating, and custom-branded tenant portals.

This release represents the **Initial SaaS Frontend Release (Version 0)**. It is a fully client-side Single Page Application (SPA) built with React and Vite, showcasing SaaS multi-tenancy flows, subscription cycles, and role-based tenant portals.

---

## 📋 Version 0 at a Glance
This version introduces the entire foundational frontend architecture, including:
* **SaaS Tenant Console**: Centralized workspace for platform owners to register tenants (`TenantsManager.tsx`), monitor branches, and toggle account statuses.
* **Subscription & Billing Desk**: Configure pricing tiers (`SubscriptionPlans.tsx`), assign plans to tenant instances (`TenantSubscriptions.tsx`), and manage billing cycles.
* **Role-Based Portals**: Distinct experiences tailored for different users via scoped components:
  * `saas-admin`: Platform owners.
  * `inst-admin`: Institute owners managing their tenant branches.
  * `branch-admin`: Branch managers scoped to specific locations.
  * `counsellor`: Focus on CRM pipelines, admissions, and lead generation.
  * `teacher`: Faculty portal with assignments, attendance, and exam grading.
  * `finance`: Accountants handling expense ledgers and fee configurations.
* **CRM Lead Pipeline**: Interactive multi-stage admissions funnel (`LeadsAdmissions.tsx`) and student registration (`StudentRegistration.tsx`).
* **Institute Setup Modules**: Full masters management for Courses (`CourseSetup.tsx`), Branches (`BranchSetup.tsx`), Subjects (`SubjectSetup.tsx`), Classrooms (`ClassroomSetup.tsx`), and Batches (`BatchSetup.tsx`).
* **Academic Scheduler & Tracking**: Attendance rosters (`Attendance.tsx`), exam marks (`ExamMarks.tsx`), and assignment grading (`Assignments.tsx`).
* **Finance Management**: Dedicated expense ledger (`ExpenseLedger.tsx`), expense vouchers (`ExpenseVoucher.tsx`), and fee collections (`Fees.tsx`, `FeesMaster.tsx`, `FeeConfigurator.tsx`).

---

## 🎯 SaaS Release Highlights
1. **Multi-Tenant Scoping**: Role routing and data displays are dynamically scoped based on the user's logged-in tenant. Platform owners can manage all tenants, while tenant owners and staff can only access their own tenant environment.
2. **Subscription & Plan Gating**: Simulated feature and capacity limits (max branch count, max student intake, allowed modules) determined by the tenant’s subscription plan.
3. **Comprehensive Component Architecture**: Granularly separated component structure organized by user role (e.g., `src/components/finance`, `src/components/teacher`, `src/components/branch-admin`) ensuring maintainability and strict access boundaries.
4. **Local API Simulation**: A functional mock JSON backend environment (`server/db.json`) allowing immediate development without a live database.

---

## 🛠️ Frontend Features & Modules

### 🏢 SaaS Platform Administration
* **Tenants Manager**: Interactive registry to manage, register, and suspend tenant academy accounts (`TenantsManager.tsx`).
* **Plan Master**: Define subscription packages, edit pricing details, and set limits.
* **Tenant Subscriptions Manager**: Assign packages to active tenants, update billing cycles, track renewal indicators, and manage upgrades (`TenantSubscriptions.tsx`).

### 📊 Role-Based Dashboards & Workspaces
* **Unified Dashboard (`Dashboard.tsx`)**: Renders statistics widgets with chart indicators based on user role.
* **Counsellor Panel**: Focuses on CRM pipelines, lead metrics, follow-up schedules, and pending registrations.
* **Finance Panel**: Focuses on cash inflow/outflow counters, expense vouchers, and fee collections.
* **Teacher Panel**: Highlights assignments, attendance taking, exam marks, and active courses.

### 📈 CRM & Student Management
* **Admissions & Leads**: Dedicated pipeline (`LeadsAdmissions.tsx`) to log enquiries, follow up, and allocate batches.
* **Student Directory**: Complete student registry (`Students.tsx`) with registration stepper (`StudentRegistration.tsx`).

### 🏫 Academic & Institute Setup
* **Structure Management**: Define Branches, Classrooms, Courses, and Subjects.
* **Batch Configuration**: Setup academic batches and assign students and teachers.
* **Staff Directory**: Register and manage faculty and admin staff (`StaffCreate.tsx`, `Users.tsx`).

### 💵 Finance & Ledger Registry
* **Fees Master**: Configure default course plans, fee structures, and tax parameters (`FeesMaster.tsx`).
* **Dynamic Fee Configuration**: Specialized component for building custom fee plans (`FeeConfigurator.tsx`).
* **Expense Tracking**: Track branch cash flows with debit/credit categorization and detailed voucher logs (`ExpenseLedger.tsx`, `ExpenseVoucher.tsx`).

---

## 💻 Technical Implementation

### Core Technologies
* **Framework**: React 19.2.7 (Client-Side Rendering)
* **Build Tool**: Vite 8.1.1
* **Routing**: React Router DOM 7.18.1
* **Icons**: Lucide React 1.25.0
* **Styles**: Tailwind CSS 3.4.19 & PostCSS 8.5.20

### Development Environment
* **Local Data API**: Runs `json-server` on port `3002` watching `server/db.json` to handle mock database actions.
* **Scripts**: `npm run dev:all` starts both the Vite dev server and the JSON mock API concurrently.
