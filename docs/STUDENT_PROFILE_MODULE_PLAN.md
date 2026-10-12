# Student Application - Module 2: Profile & Demographics Implementation Plan

This document details the permission matrix, field-level security policies, and implementation architecture for **Module 2: Profile & Demographics** in Vidyasetu.

---

## 1. Permission Matrix & Seeded Permissions

The following permissions have been added to the `permissions` table and mapped to `role_id = 8` (`Student`) via migration [`138_seed_student_app_permissions.sql`](file:///c:/Users/vnt/Desktop/vidyasetu_full/vidyasetu/migrations/138_seed_student_app_permissions.sql):

| Module | Permission Code | Action | Description | Seeded for Role ID = 8 |
| :--- | :--- | :--- | :--- | :---: |
| `app_profile` | `student.profile.view` | `view` | View own student profile & enrollment info | ✅ Yes |
| `app_profile` | `student.profile.update` | `update` | Update allowed personal contact details | ✅ Yes |
| `app_profile` | `student.profile.photo` | `upload` | Upload / update profile avatar image | ✅ Yes |
| `app_profile` | `student.guardian.view` | `view` | View guardian & emergency contact info | ✅ Yes |
| `app_profile` | `student.document.view` | `view` | View uploaded documents & verification status | ✅ Yes |

---

## 2. Field-Level Security & Whitelist Policy

To preserve institutional records and prevent identity disputes:

### 🔴 Strictly Read-Only (Forbidden in `PUT /api/app/profile`)
Any payload attempting to send these fields is rejected with `400 Bad Request`:
- `student_code` (Unique roll/registration ID)
- `full_name` (Legal Name registered with board/institute)
- `dob` (Date of birth)
- `gender`
- `category` (General / OBC / SC / ST quota)
- `primary_branch_id` (Branch assignment)
- `target_exam`, `current_class`, `board_id` (Curriculum mapping)
- `status`, `account_type` (Admin-controlled status)

### 🟢 Allowed for Self-Service Update
- **Address:** `street`, `city`, `state`, `pincode` (6-digit numeric check)
- **Medical:** `blood_group` (Enum check: `A+`, `A-`, `B+`, `B-`, `AB+`, `AB-`, `O+`, `O-`)
- **Contact:** `mobile` (10-digit check), `email` (global format & uniqueness verification)
- **Avatar:** `profile_photo_url` via `POST /api/app/profile/photo` (Max 2MB, JPG/PNG/WebP)

---

## 3. Endpoints Implemented

| Method | Endpoint | Permission | Handler |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/app/profile` | `student.profile.view` | Retrieves personal info, address, academic batch info, and branch |
| `PUT` | `/api/app/profile` | `student.profile.update` | Validates whitelist, updates `students` and `users` tables |
| `POST` | `/api/app/profile/photo` | `student.profile.photo` | Multer upload to `/uploads/avatars/`, updates profile photo |
| `GET` | `/api/app/profile/guardians` | `student.guardian.view` | Returns linked parent/guardian details & emergency contacts |
| `GET` | `/api/app/profile/documents` | `student.document.view` | Returns student documents with verification statuses |

---

## 4. Test Verification
All automated test scenarios executed with **100% Pass Rate (`200 OK`)**:
1. `GET /api/app/profile` -> Verified with active batch & branch.
2. `PUT /api/app/profile` -> Updated address and blood group successfully.
3. `PUT /api/app/profile` with `student_code` -> Blocked with `400 Bad Request`.
4. `GET /api/app/profile/guardians` -> Returned guardian record.
5. `GET /api/app/profile/documents` -> Returned document records.
