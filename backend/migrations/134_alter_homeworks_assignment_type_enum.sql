-- Migration 134: Update homeworks assignment_type to ENUM('assignment', 'homework', 'exam') and seed sample records

-- 1. Normalize existing assignment types to 'assignment'
UPDATE `homeworks` 
SET `assignment_type` = 'assignment' 
WHERE `assignment_type` IS NOT NULL;

-- 2. Alter column to ENUM
ALTER TABLE `homeworks` 
MODIFY COLUMN `assignment_type` ENUM('assignment', 'homework', 'exam') NOT NULL DEFAULT 'assignment';

-- 3. Seed sample 'homework' records
INSERT INTO `homeworks` (
    `tenant_id`, `branch_id`, `academic_year_id`, `subject_id`, 
    `title`, `description`, `assignment_type`, `batch_ids`, `files`, 
    `due_date`, `max_marks`, `status`, `published_at`, `created_by`, `updated_by`
) VALUES 
(
    1, 1, 2, 1,
    'Physics – Newton''s Laws of Motion Daily Homework',
    'Solve problems 1 through 15 from Chapter 4 textbook exercises. Show all free-body diagrams and calculation steps.',
    'homework',
    '[1, 8]',
    '[]',
    '2026-10-15 23:59:59',
    20.00,
    'published',
    NOW(),
    1,
    1
),
(
    1, 1, 2, 3,
    'Chemistry – Chemical Bonding & Molecular Structure Homework',
    'Complete the hybridization worksheets and Lewis structure diagrams for assigned molecules.',
    'homework',
    '[2]',
    '[]',
    '2026-10-18 23:59:59',
    25.00,
    'published',
    NOW(),
    1,
    1
),
(
    1, 2, 5, 4,
    'Biology – Cell Division & Mitosis Homework',
    'Draw neat labeled diagrams of all stages of Mitosis and answer the short conceptual questions.',
    'homework',
    '[3]',
    '[]',
    '2026-10-20 23:59:59',
    15.00,
    'draft',
    NULL,
    1,
    1
);

-- 4. Seed sample 'exam' records
INSERT INTO `homeworks` (
    `tenant_id`, `branch_id`, `academic_year_id`, `subject_id`, 
    `title`, `description`, `assignment_type`, `batch_ids`, `files`, 
    `due_date`, `max_marks`, `status`, `published_at`, `created_by`, `updated_by`
) VALUES 
(
    1, 1, 2, 2,
    'Mathematics – Integral Calculus Unit Test Exam',
    'End of unit evaluation covering definite integrals, fundamental theorem of calculus, and areas under curves.',
    'exam',
    '[2, 8]',
    '[]',
    '2026-10-25 23:59:59',
    50.00,
    'published',
    NOW(),
    1,
    1
),
(
    1, 1, 2, 1,
    'Physics – Mid-Term Comprehensive Assessment Exam',
    'Comprehensive 2-hour examination covering Kinematics, Dynamics, Work-Energy-Power, and Rotational Motion.',
    'exam',
    '[1]',
    '[]',
    '2026-10-28 23:59:59',
    100.00,
    'published',
    NOW(),
    1,
    1
),
(
    1, 2, 5, 4,
    'Biology – Genetics & Molecular Basis of Inheritance Exam',
    'Section A: 20 Objective Questions, Section B: 10 Descriptive Analytical Questions.',
    'exam',
    '[3, 11]',
    '[]',
    '2026-11-02 23:59:59',
    75.00,
    'draft',
    NULL,
    1,
    1
),
(
    2, 1, 2, 1,
    'Physics – Electrostatics Daily Practice Homework',
    'Complete numerical problems 1 to 12 on Coulomb''s law and electric field intensity from DPP sheet 4.',
    'homework',
    '[1, 8]',
    '[]',
    '2026-10-15 23:59:59',
    20.00,
    'published',
    NOW(),
    1,
    1
),
(
    2, 1, 2, 3,
    'Chemistry – Thermodynamics & Thermochemistry Homework',
    'Solve enthalpy calculation worksheets and standard state reaction problem set.',
    'homework',
    '[2]',
    '[]',
    '2026-10-18 23:59:59',
    25.00,
    'published',
    NOW(),
    1,
    1
),
(
    2, 2, 5, 4,
    'Biology – Plant Anatomy & Tissue Systems Homework',
    'Illustrate monocot and dicot stem transverse sections with detailed tissue labeling.',
    'homework',
    '[3]',
    '[]',
    '2026-10-20 23:59:59',
    15.00,
    'draft',
    NULL,
    1,
    1
),
(
    2, 1, 2, 2,
    'Mathematics – Differential Equations Mid-Term Exam',
    'Formal 90-minute examination assessing first-order and second-order differential equations and applications.',
    'exam',
    '[2, 8]',
    '[]',
    '2026-10-25 23:59:59',
    50.00,
    'published',
    NOW(),
    1,
    1
),
(
    2, 1, 2, 1,
    'Physics – Optics & Wave Motion Term Assessment Exam',
    'Comprehensive assessment on Ray Optics, Wave Optics, Diffraction, and Interference.',
    'exam',
    '[1]',
    '[]',
    '2026-10-28 23:59:59',
    100.00,
    'published',
    NOW(),
    1,
    1
),
(
    2, 2, 5, 4,
    'NEET Mock Test – Full Biology Mock Exam #1',
    'Complete 90-question timed NEET practice test covering Botany and Zoology syllabus.',
    'exam',
    '[3, 11]',
    '[]',
    '2026-11-02 23:59:59',
    360.00,
    'published',
    NOW(),
    1,
    1
);
