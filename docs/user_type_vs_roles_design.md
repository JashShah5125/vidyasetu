# System Design: User Type vs User Roles (RBAC)

## Question
*Since we already have a `user_roles` table for permissions, why do we have a `user_type` column in the `users` table? Isn't it redundant?*

## Answer
While it might seem redundant at first glance, we keep the `user_type` column (which stores values like `'saas_admin'`, `'staff'`, `'student'`, `'parent'`) alongside the `user_roles` table for a few critical architectural reasons:

### 1. Hardcoded Categories vs. Dynamic Permissions
* **`user_roles`** is for dynamic, granular permissions (RBAC). An institute might create 20 custom roles for their employees (e.g., Librarian, Accountant, Head of Dept, Receptionist, Teacher).
* **`user_type`** is a high-level, hardcoded category. All 20 of those custom roles fall under the `user_type = 'staff'`. This allows the application code to easily say *"if user_type is 'staff', let them log into the Admin Portal"* without needing to check exactly which custom role they have.

### 2. Database Relationships
The `user_type` dictates which secondary profile table a user belongs to:
* If `user_type = 'student'`, the system knows to look for their academic details in the `students` table.
* If `user_type = 'parent'`, the system knows to look in the `guardians` table.
* If `user_type = 'staff'`, the system knows to look in the `staff_profiles` table (for salary, HR info, etc.).

### 3. Query Performance
If an Institute Admin wants to see a list of *all employees*, the database can instantly run:
```sql
SELECT * FROM users WHERE tenant_id = 2 AND user_type = 'staff';
```
Without this column, the database would have to run complex `JOIN`s across `users`, `user_roles`, and `roles` just to filter out the students and parents.

### 4. App Routing
In EdTech platforms, Students and Staff often see completely different UIs or even log into completely different mobile apps. `user_type` provides a blazing-fast way to determine which dashboard to load the second the user logs in. 

**Summary:** 
`user_type` tells the system *who* you are (Staff vs Student), while `user_roles` tells the system exactly *what* you are allowed to do (View Invoices vs Delete Students).
