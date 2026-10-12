# VidyaSetu Parent Application - API Specification & Screen Mapping

## 1. Overview & Architecture
The **VidyaSetu Parent Application** allows parents/guardians to monitor their children's academic performance, daily schedule, attendance, fees, and communicate directly with teachers and school administration.

### Core Architectural Principles
1. **Multi-Child Guardian Relationship:**
   - A single parent/guardian account can be linked to multiple wards (e.g. *Raj Sharma - Class 10*, *Rohit Sharma - Class 7*).
   - Parent APIs support querying an aggregated family summary or scoping requests to a specific child using `:studentId`.
2. **Guardian Authorization Middleware:**
   - Whenever an endpoint includes `:studentId` or queries child-specific data, the middleware validates that the authenticated guardian has an active link to the requested student in `student_guardians`.
3. **Service Layer Reusability:**
   - Core computational logic (attendance percentages, lecture schedules, invoice breakdowns, exam results) is shared between Student and Parent modules, ensuring consistency across the platform.

---

## 2. Screen-by-Screen UI Analysis & Mapping

| Screen Name | UI Components / Required Data | Mapped Backend API |
| :--- | :--- | :--- |
| **Login & Role Selection** | • Email/Phone & Password<br>• Role toggle (`Student` / `Parent`)<br>• Sign in & Forgot password CTA | `POST /api/app/auth/login`<br>`POST /api/app/auth/forgot-password`<br>`POST /api/app/auth/reset-password` |
| **Parent Home** | • Greeting & linked children count<br>• Family overview summary card<br>• Children list cards (Name, Class, Attendance %)<br>• Quick Action tiles (Attendance, Fees, Timetable, Messages)<br>• Recent updates banner (e.g. PTM alert) | `GET /api/app/parent/home` |
| **Child Overview** | • Selected child header & active batch/division<br>• Weekly attendance standing card (Overall %, 5 days attended this week)<br>• Academic snapshot (Subject-wise letter grades)<br>• Upcoming events list (Maths test, Science project submission, PTM meeting) | `GET /api/app/parent/children/:studentId/overview` |
| **Parent Fees & Payments** | • Outstanding fee balance card & next due date<br>• Head-wise fee breakdown (Tuition, Activity, Library)<br>• `Pay fees` CTA button<br>• Payment history receipt log (Date, Amount, Paid status) | `GET /api/app/parent/children/:studentId/fees/summary`<br>`GET /api/app/parent/children/:studentId/fees/invoices`<br>`POST /api/app/parent/fees/pay` |
| **Parent Messages** | • Active chat threads list (Teachers & School Office)<br>• Recent message snippet & relative time<br>• `+ New message` CTA button<br>• Quick contacts list (Assigned Class Teacher & Subject Teachers) | `GET /api/app/parent/messages`<br>`POST /api/app/parent/messages`<br>`GET /api/app/parent/messages/:threadId`<br>`POST /api/app/parent/messages/:threadId/reply`<br>`GET /api/app/parent/contacts` |
| **Parent Profile** | • Parent avatar, Name, Role badge<br>• Email, Phone, Linked Children names, School name<br>• Edit profile & notification settings | `GET /api/app/parent/profile`<br>`PUT /api/app/parent/profile`<br>`POST /api/app/parent/profile/photo` |
| **Child Timetable (Shared)** | • Day toggle (`Today`, `Tomorrow`, Date picker)<br>• Lecture cards (Time slot, Subject, Teacher name, Room/Lab) | `GET /api/app/parent/children/:studentId/timetable/today`<br>`GET /api/app/parent/children/:studentId/timetable/calendar` |
| **Child Attendance (Shared)** | • Overall attendance %, minimum required % gauge<br>• Monthly calendar strip with day status dots<br>• Subject-wise attendance progress bars<br>• Day drilldown with lecture-wise attendance | `GET /api/app/parent/children/:studentId/attendance/summary`<br>`GET /api/app/parent/children/:studentId/attendance/history` |
| **Child Results (Shared)** | • Exam title, Overall score %, Class average %<br>• Subject-wise marks and letter grades (`A+`, `A`, `B+`) | `GET /api/app/parent/children/:studentId/exams/results`<br>`GET /api/app/parent/children/:studentId/exams/results/:examId` |
| **Child Homework (Shared)** | • List assignments by status (`pending`, `submitted`, `graded`)<br>• Homework detail, instructions, and submitted attachment (.pdf) | `GET /api/app/parent/children/:studentId/homeworks`<br>`GET /api/app/parent/children/:studentId/homeworks/:id` |

---

## 3. Detailed API Endpoint Specification (`/api/app/parent/*`)

### Module 0: Parent Auth & Session Management

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/app/auth/login` | No (Public) | Parent login with email/mobile and password. Returns tokens & linked children summary. |
| `POST` | `/api/app/auth/refresh-token` | No (Public) | Refresh parent access token using refresh token. |
| `POST` | `/api/app/auth/change-password` | **Yes** (Parent) | Change password for logged-in parent (`currentPassword`, `newPassword`). |
| `POST` | `/api/app/auth/forgot-password` | No (Public) | Request 6-digit password reset OTP to registered mobile number (`identifier`). |
| `POST` | `/api/app/auth/reset-password` | No (Public) | Verify OTP and set new password (`mobile`, `otp`, `newPassword`). |
| `POST` | `/api/app/auth/register-device` | **Yes** (Parent) | Register device metadata and Firebase Cloud Messaging (FCM) push token. |
| `POST` | `/api/app/auth/logout` | **Yes** (Parent) | Revoke active refresh token session and deactivate FCM push notifications. |

---

### Module P1: Parent Authentication & Profile

#### 1. Get Parent Profile
* **Endpoint:** `GET /api/app/parent/profile`
* **Auth:** Required (`Parent`)
* **Description:** Returns profile metadata of the logged-in parent and a summary list of linked wards.
* **Response Sample:**
```json
{
  "success": true,
  "data": {
    "guardianId": "uuid",
    "name": "Priya Sharma",
    "email": "priya@example.com",
    "phone": "+91 9876543210",
    "avatarUrl": "https://...",
    "relation": "Mother",
    "schoolName": "Apex IIT Academy",
    "children": [
      {
        "studentId": "uuid-1",
        "name": "Raj Sharma",
        "className": "Class 10 - Division A",
        "rollNo": 24
      },
      {
        "studentId": "uuid-2",
        "name": "Rohit Sharma",
        "className": "Class 7 - Division B",
        "rollNo": 12
      }
    ]
  }
}
```

#### 2. Update Parent Profile
* **Endpoint:** `PUT /api/app/parent/profile`
* **Auth:** Required (`Parent`)
* **Body:**
```json
{
  "phone": "+91 9876543210",
  "address": "402, Green Valley Apartments, Mumbai",
  "emergencyContact": "+91 9876543211"
}
```

#### 3. Upload Parent Photo
* **Endpoint:** `POST /api/app/parent/profile/photo`
* **Auth:** Required (`Parent`)
* **Content-Type:** `multipart/form-data` (Field: `photo`)

---

### Module P2: Family Dashboard & Multi-Child Overview

#### 1. Get Parent Home Aggregated Dashboard
* **Endpoint:** `GET /api/app/parent/home`
* **Auth:** Required (`Parent`)
* **Description:** Powers `Parent - Home.png`. Returns family overview, live status of all children, action badge indicators, and high-priority school broadcasts.
* **Response Sample:**
```json
{
  "success": true,
  "data": {
    "greeting": "Good evening, Parent",
    "totalChildren": 2,
    "children": [
      {
        "studentId": "uuid-1",
        "name": "Raj Sharma",
        "avatarUrl": null,
        "className": "Class 10",
        "attendancePercentage": 92.0,
        "pendingFees": 18000
      },
      {
        "studentId": "uuid-2",
        "name": "Rohit Sharma",
        "avatarUrl": null,
        "className": "Class 7",
        "attendancePercentage": 88.0,
        "pendingFees": 0
      }
    ],
    "recentUpdates": [
      {
        "id": "uuid-update",
        "title": "PTM scheduled for 24 Aug at 4 PM",
        "subtitle": "Tap to view details",
        "date": "2026-08-24T16:00:00Z",
        "type": "ptm"
      }
    ]
  }
}
```

#### 2. Get Child Overview Deep-Dive
* **Endpoint:** `GET /api/app/parent/children/:studentId/overview`
* **Auth:** Required (`Parent`)
* **Description:** Powers `Parent - Child Overview.png`. Returns weekly attendance count, subject letter grades snapshot, and upcoming deadlines/events.
* **Response Sample:**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "uuid-2",
      "name": "Rohit Sharma",
      "className": "Class 10",
      "division": "Division A"
    },
    "attendance": {
      "overallPercentage": 92.0,
      "standingStatus": "Good standing",
      "daysAttendedThisWeek": 5,
      "totalWorkingDaysThisWeek": 5
    },
    "academicSnapshot": [
      { "subject": "Mathematics", "grade": "A" },
      { "subject": "Science", "grade": "A-" },
      { "subject": "English", "grade": "B+" }
    ],
    "upcoming": [
      {
        "id": "item-1",
        "date": "18 Aug",
        "title": "Maths test",
        "subtitle": "Unit 3",
        "type": "exam"
      },
      {
        "id": "item-2",
        "date": "21 Aug",
        "title": "Science project",
        "subtitle": "Submission",
        "type": "homework"
      },
      {
        "id": "item-3",
        "date": "24 Aug",
        "title": "Parent-teacher meeting",
        "subtitle": "4:00 PM",
        "type": "ptm"
      }
    ]
  }
}
```

---

### Module P3: Child Academic & Schedule Monitoring (Child-Scoped)

#### 1. Timetable & Schedule
* `GET /api/app/parent/children/:studentId/timetable/today` — Today's lecture schedule with teacher & classroom info for child.
* `GET /api/app/parent/children/:studentId/timetable/calendar?from=YYYY-MM-DD&to=YYYY-MM-DD` — Weekly/Calendar range schedule for child.

#### 2. Attendance Tracker
* `GET /api/app/parent/children/:studentId/attendance/summary` — Overall attendance percentage & standing status for child.
* `GET /api/app/parent/children/:studentId/attendance/history?month=...&year=...` — Monthly attendance calendar log for child.
* `GET /api/app/parent/children/:studentId/attendance/history?date=YYYY-MM-DD` — Per-lecture day drilldown for child.
* `GET /api/app/parent/children/:studentId/attendance/subject-wise` — Subject-wise attendance breakdown (classes attended vs total).

#### 3. Exams & Assessments
* `GET /api/app/parent/children/:studentId/exams/upcoming` — List upcoming scheduled exams with dates, timings, and syllabus instructions.
* `GET /api/app/parent/children/:studentId/exams/completed` (or `/results`) `?page=1&limit=10` — Completed past exams list for child with total marks, marks obtained, percentage, and grade `[Paginated]`.
* `GET /api/app/parent/children/:studentId/exams/results/:examId` — Detailed exam scorecard breakdown with marks obtained, max marks, passing marks, teacher remarks, evaluator name, and question paper/solution PDF attachments.

#### 4. Homework & Assignments
* `GET /api/app/parent/children/:studentId/homeworks?status=...&page=1&limit=10` — Assigned homework list with status (`pending`, `submitted`, `graded`, `overdue`) `[Paginated]`.
* `GET /api/app/parent/children/:studentId/homeworks/:id` — Homework assignment details, instructions, teacher attachments, child's submission, and grading feedback.

---

### Module P4: Fees & Online Payments

#### 1. Get Fee Summary for Child
* **Endpoint:** `GET /api/app/parent/children/:studentId/fees/summary`
* **Access:** Private (Parent) — `parent.fee.view`
* **Description:** Outstanding balance, next due date, gross fee, total concession, net amount, paid percentage, next due installment, and invoice stats for the selected child.

#### 2. Get Invoices & Fee Breakdown
* **Endpoint:** `GET /api/app/parent/children/:studentId/fees/invoices?page=1&limit=10`
* **Access:** Private (Parent) — `parent.fee.view`
* **Description:** Powers `Parent Fees.png`. Returns installment breakdown heads (Tuition fee, Activity fee, Library & Tech fee), payment status (`paid`, `pending`, `partial`, `overdue`), transaction reference, and historical payment details.
* **Pagination:** Server-side paginated.

---

### Module P5: Parent-Teacher Communication & Messages

#### 1. List Message Threads
* **Endpoint:** `GET /api/app/parent/messages?page=1&limit=20`
* **Description:** Powers `Parent Messages.png`. Returns conversation threads with teachers and school administration with unread count and latest message snippet.
* **Pagination:** Server-side paginated.

#### 2. Start New Message Thread
* **Endpoint:** `POST /api/app/parent/messages`
* **Body:**
```json
{
  "studentId": "uuid-child",
  "recipientType": "teacher",
  "recipientId": "uuid-teacher",
  "subject": "Regarding Maths Test Performance",
  "message": "Hello Mr. Patel, I wanted to discuss Rohit's preparation for the upcoming test."
}
```

#### 3. Get Thread Conversation History
* **Endpoint:** `GET /api/app/parent/messages/:threadId?page=1&limit=30`
* **Pagination:** Server-side paginated.

#### 4. Send Reply to Thread
* **Endpoint:** `POST /api/app/parent/messages/:threadId/reply`
* **Body:**
```json
{
  "message": "Thank you for the clarification!"
}
```

#### 5. Get Quick Contacts List
* **Endpoint:** `GET /api/app/parent/contacts`
* **Description:** Returns assigned Class Teachers, Subject Teachers, and School Office contact cards for all linked children.

---

### Module P6: Announcements & Notifications

#### 1. Get Parent Notifications Feed
* **Endpoint:** `GET /api/app/parent/notifications?page=1&limit=20`
* **Description:** Filtered notification feed for parents (PTM notices, fee payment reminders, attendance alerts, timetable revisions).
* **Pagination:** Server-side paginated.

#### 2. Mark Notification as Read
* **Endpoint:** `PATCH /api/app/parent/notifications/:id/read`

#### 3. Mark All Notifications as Read
* **Endpoint:** `PATCH /api/app/parent/notifications/read-all`

---

## 4. Standard Response Envelope & Pagination Format

All paginated Parent APIs follow the unified VidyaSetu standard:
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```
