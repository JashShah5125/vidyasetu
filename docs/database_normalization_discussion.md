# Database System Design: Multi-Tenancy and Normalization

## Question 1
*In a multi-tenant SaaS application, when designing a table like `subjects` (where subjects belong to levels, levels to programs, programs to courses), should the `subjects` table keep `tenant_id` and all other details like `course_id` and `program_id`? Or is just `level_id` enough since we can perform a JOIN to get the rest? Why do we want to know the `tenant_id`, `course_id`, and `program_id` for a specific subject?*

## Answer 1
The short answer is: **Always keep `tenant_id` on every table**, but you **should avoid** keeping `course_id` and `program_id` if they can be derived, unless you are intentionally denormalizing. 

Here is the breakdown of why and how you should design this:

### 1. Why keep `tenant_id` everywhere? (Highly Recommended)
In a multi-tenant SaaS application, keeping `tenant_id` on almost every table is a standard best practice for three critical reasons:
* **Security & Data Isolation:** When fetching data, you will always append `WHERE tenant_id = X` to your queries. If `tenant_id` is only available via a 4-table `JOIN`, it is very easy for a developer to write a bad query, forget a join, and accidentally leak Tenant A's subjects to Tenant B.
* **Constraints:** If you want to ensure that a subject code (like "PHY101") is unique per tenant, you *must* have `tenant_id` on the table to define a constraint like `UNIQUE(tenant_id, code)`.
* **Performance:** If an admin wants to see a master list of all subjects they teach across their entire institute, an index on `tenant_id` makes this instant, instead of forcing the database to execute complex joins across Levels -> Programs -> Courses -> Tenants.

### 2. What about Course, Program, and Level?
This depends entirely on your business logic for how subjects work in the real world. There are generally two approaches:

**Option A: Strict Hierarchy (1 Subject belongs to 1 Level)**
If a subject is strictly tied to a single level, you only add `level_id` as a foreign key. You **do not** add `course_id` or `program_id`. 
* *Why?* Because adding them causes a data redundancy risk (denormalization). What if a subject row says it belongs to Level 1, but the `course_id` column accidentally points to Course B? The database becomes inconsistent. If you strictly follow the chain (`Subject -> Level -> Program -> Course`), you just perform a `JOIN` when you need to know the course.

**Option B: Master Pool of Subjects (Many-to-Many) — *Usually the best for education***
In many institutes, a subject like "Basic Mathematics" or "Physics" is taught across *multiple* courses and levels. 
If this is the case, the `subjects` table simply stores the master list of subjects for that `tenant_id` (so it only needs `id`, `tenant_id`, `name`, `code`, etc.). Then, you create a separate pivot table (like `level_subjects`) that links a `level_id` to a `subject_id`.

---

## Question 2
*In Vidya Setu, there can be multiple courses, programs, then levels. For cases like schooling, the subjects for each level might be completely different. But for cases like JEE or NEET, the subjects might be exactly the same across levels. How do we make a generic database design that covers all these cases beautifully?*

## Answer 2
The perfect way to handle this generic requirement (where subjects can be completely unique per level OR shared across many levels) is to use the **"Master Pool + Pivot Table" (Option B)** approach. 

This requires two tables:

1. **`subjects` (The Master Pool)**
   - Stores the raw definition of a subject for the institute.
   - *Columns:* `id`, `tenant_id`, `name`, `code`.
   - *Example rows:* "Physics", "Math", "Science Class 5", "Science Class 6".

2. **`level_subjects` (The Pivot Table)**
   - Maps a specific subject from the Master Pool to a specific Level.
   - *Columns:* `id`, `level_id`, `subject_id`.

### How this covers both scenarios perfectly:

#### Scenario A: JEE / NEET (Shared Subjects)
An institute has a JEE program with "Class 11" and "Class 12" levels. Both teach "Physics".
- They create **1 row** in the `subjects` table: "Physics".
- They create **2 rows** in the `level_subjects` table:
  1. maps "Physics" to "Class 11"
  2. maps "Physics" to "Class 12"

#### Scenario B: Schooling (Unique Subjects per Level)
A school has "Class 5" and "Class 6" levels. They teach science, but the syllabus/subject is entirely unique for each class.
- They create **2 rows** in the `subjects` table: "Science (Class 5)" and "Science (Class 6)".
- They create **2 rows** in the `level_subjects` table:
  1. maps "Science (Class 5)" to "Class 5"
  2. maps "Science (Class 6)" to "Class 6"

**Why this is the best design:**
* It prevents duplicate data for institutes that share subjects (they don't have to create 5 different "Physics" rows).
* It allows absolute flexibility for schools that have highly specific subjects for a single level.
* It scales beautifully if you ever need to attach a teacher directly to a specific subject in a specific level (you would just add a `teacher_id` to the `level_subjects` pivot table!).

---

## Question 3
*In the future, if we add topics to each subject? Even if the subject is the same across years (like Physics in Class 11 and Class 12), the topics covered in it will definitely be different in all cases!*

## Answer 3
This is exactly why the Pivot Table design is so powerful! 

Because the topics for "Physics" in Class 11 are completely different from the topics for "Physics" in Class 12, a topic does not belong to just a `Subject`. A topic actually belongs to a **Subject-within-a-specific-Level**.

To design this, you link the `topics` table directly to the pivot table (`level_subjects`), rather than the master `subjects` table.

### Schema Design for Topics:
**`topics` table**
- `id` (Primary Key)
- `tenant_id` (For security)
- `level_subject_id` (Foreign Key pointing to `level_subjects.id`)
- `name` (e.g., "Kinematics", "Electromagnetism")

### How it works in practice:
1. **Master Subject:** You have one subject row: `id: 1, name: "Physics"`.
2. **Pivot Mappings:** 
   - `id: 101, level_id: [Class 11], subject_id: 1 (Physics)`
   - `id: 102, level_id: [Class 12], subject_id: 1 (Physics)`
3. **Topics:**
   - You create a topic "Kinematics" and set its `level_subject_id = 101` (Physics in Class 11).
   - You create a topic "Electromagnetism" and set its `level_subject_id = 102` (Physics in Class 12).

This ensures that when a student clicks on "Physics" while viewing their "Class 11" dashboard, they only see the Kinematics topic. When a Class 12 student clicks on "Physics", they only see the Electromagnetism topic. The data remains perfectly separated based on the level, even though both share the same master subject name!
