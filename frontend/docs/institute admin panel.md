# Institute Admin Panel - Pages and Components

Based on the Vidya Setu product blueprints and the Institute Admin operations workflow (`08_institute_admin_workflow.puml`), here is a detailed breakdown of all the pages and their respective components required for the Institute Admin Panel.

## 1. Dashboard
The landing page providing a bird's-eye view of the entire institute's operations across all branches.
*   **Components:**
    *   **Executive KPI Summaries:** High-level metrics for admissions, revenue, and active students.
    *   **Branch Performance Widget:** Comparison of branches (admissions, revenue, attendance).
    *   **Admissions Overview:** Total admissions across all branches.
    *   **Financial Overview:** Total revenue, collections, and outstanding dues.
    *   **Academic/Attendance Summary:** Overall student and staff attendance.
    *   **Pending Approvals Alert:** Quick links to critical requests (discounts, payroll, etc.).
    *   **Staff Summary Widget:** Active staff count by branch/role.

## 2. Institute Profile & Settings
A page to manage the global configuration of the institute.
*   **Components:**
    *   **Basic Details Form:** Institute name, logo, contact information, and address.
    *   **Operational Settings:** Operating hours and timezones.
    *   **Bank Details Management:** Centralized bank account information for fee collections.
    *   **Academic Calendar Setup:** Global academic years, semesters, terms, and holidays.
    *   **Communication Settings:** SMS, Email, and Push Notification API keys/templates.

## 3. Branch Management
A module to oversee and manage the various branches (centers) of the institute.
*   **Components:**
    *   **Branch Listing Table:** List of all branches with status (Active/Suspended/Archived).
    *   **Create/Edit Branch Form:** Add new branches or update details.
    *   **Clone Branch Feature:** Ability to duplicate academic masters and fee structures from an existing branch to a new one.
    *   **Branch Admin Assignment:** Assign branch administrators to specific locations.
    *   **Branch Limits Configuration:** Set intake capacities or specific limits per branch.

## 4. Academic Masters
The central repository for defining the educational structure of the institute.
*   **Components:**
    *   **Course Management:** Create and edit course catalogs.
    *   **Subject Management:** Create and edit subject catalogs.
    *   **Course-Subject Mapping:** Map specific subjects to courses.
    *   **Classroom Management:** Define physical or virtual classrooms.
    *   **Batch Templates:** Create standard batch structures to be adopted by branches.
    *   **Evaluation Policies:** Configure grading systems, exam structures, and assessment rules.

## 5. Staff & Teacher Directory
Centralized management of all employees across the institute.
*   **Components:**
    *   **Staff Roster:** Searchable directory of all staff and teachers.
    *   **Designation & Department Setup:** Define organizational structure.
    *   **Branch Assignment:** Assign or transfer staff/teachers between branches.
    *   **Teacher Allocation:** Map teachers to specific subjects and batches.

## 6. Users, Roles & Permissions (RBAC)
Robust access control management for the SaaS platform.
*   **Components:**
    *   **User Account Creation:** Invite/create staff accounts (Admins, Counsellors, Teachers, Finance).
    *   **Role Management:** Define custom roles.
    *   **Permission Matrix:** Configure module-level and action-level access (view, create, edit, delete, approve).
    *   **Branch Access Controls:** Restrict users to specific branches.
    *   **Account Security:** Reset passwords, unlock accounts, and activate/deactivate users.

## 7. Fees & Finance Configuration
Global financial rules and policies engine.
*   **Components:**
    *   **Fee Structure Setup:** Define fees per course.
    *   **Fee Heads Configuration:** Break down fees (Tuition, Library, Transport, etc.).
    *   **Installment Plan Templates:** Standardized payment plans.
    *   **Scholarship & Concession Rules:** Define eligibility and percentage limits.
    *   **Discount Approval Thresholds:** Set logic for who can approve what discount amount.
    *   **Payment Modes & Gateways:** Configure accepted payment methods.
    *   **Income & Expense Heads:** Standardize accounting categories.
    *   **Payroll Policies:** Salary structures and rules (if enabled).

## 8. Admissions Monitoring
A centralized view of the admission pipeline.
*   **Components:**
    *   **Enquiry Funnel Chart:** Consolidated view of leads to admissions across branches.
    *   **Conversion Analytics:** Rates of conversion from enquiry to enrollment.
    *   **Source Performance Tracking:** Effectiveness of different marketing channels.
    *   **Counsellor Performance Leaderboard:** Branch-wise counsellor effectiveness.
    *   **Pending Registrations & Verifications:** List of students awaiting final approval or document verification.

## 9. Academic Monitoring
Monitoring educational delivery and outcomes.
*   **Components:**
    *   **Timetable Coverage:** View syllabus completion rates.
    *   **Attendance Reports:** Branch-wise student and staff attendance.
    *   **Pending Academic Tasks:** View pending assignments, unresolved student doubts, and exam schedules.
    *   **Result Publication Status:** Track which branches have published results.
    *   **Teacher Workload Overview:** Analytics on teacher hours and class distribution.

## 10. Finance & Payroll Monitoring
Real-time tracking of money flow.
*   **Components:**
    *   **Collection vs. Target Dashboard:** Overall and branch-wise revenue tracking.
    *   **Outstanding Dues Aging Report:** Categorized list of pending fees.
    *   **Defaulter List:** Students with overdue payments.
    *   **Daily Receipts Summary:** Cash flow monitoring.
    *   **Income vs. Expense Overview:** Profitability tracking.
    *   **Payroll Summary:** Overview of salary dispersals.

## 11. Approvals Center
A dedicated inbox for requests requiring Institute Admin authorization.
*   **Components:**
    *   **Discount/Concession Requests Table:** Approve or reject custom fee adjustments.
    *   **High-Value Expense Approvals:** Authorize branch-level expenses above a set threshold.
    *   **Scholarship Approvals:** Final sign-off on scholarships.
    *   **Branch Creation & Policy Changes:** Approve requests from sub-admins.
    *   **Result & Payroll Approvals:** Authorize the publication of exams and processing of salaries.

## 12. Announcements & Communications
Centralized broadcasting system.
*   **Components:**
    *   **Compose Message Form:** Rich text editor for announcements.
    *   **Targeting Rules:** Select audiences (All branches, specific branch, students, parents, staff, specific batch).
    *   **Delivery Methods:** Toggle between Push Notifications, In-App alerts, SMS, or Email.

## 13. Reports and Audit Logs
Comprehensive data extraction and security tracking.
*   **Components:**
    *   **Report Generator:** Generate standardized reports (Admissions, Enrollment, Branch Performance, Academics, Attendance, Fees, Dues, Expenses).
    *   **Audit Trail Viewer:** Read-only log of all critical actions performed by any user in the system (creation, deletion, modifications).
    *   **Export Controls:** Export data to CSV/PDF.
