-- Seed for subjects table
-- Target tenant: Allen Career Institute (tenant_id = 2)

INSERT IGNORE INTO subjects (id, tenant_id, name, code, type, description, status, created_by, updated_by) VALUES
(1, 2, 'Physics', 'PHY-101', 'core', 'Basic principles of Physics.', 'active', 2, 2),
(2, 2, 'Mathematics', 'MATH-101', 'core', 'Calculus and Algebra.', 'active', 2, 2),
(3, 2, 'Chemistry', 'CHEM-101', 'core', 'Organic and Inorganic Chemistry.', 'active', 2, 2),
(4, 2, 'Biology', 'BIO-101', 'core', 'Botany and Zoology.', 'active', 2, 2),
(5, 2, 'Zoology', 'ZOO-101', 'core', 'Study of animals.', 'active', 2, 2),
(6, 2, 'Botany', 'BOT-101', 'core', 'Study of plants.', 'active', 2, 2),
(7, 2, 'Science', 'SCI-010', 'core', 'General science foundation.', 'active', 2, 2),
(8, 2, 'Social Studies', 'SST-010', 'core', 'History, Geography, and Civics.', 'active', 2, 2),
(9, 2, 'English', 'ENG-101', 'language', 'English literature and grammar.', 'active', 2, 2),
(10, 2, 'Hindi', 'HIN-101', 'language', 'Hindi literature and grammar.', 'active', 2, 2),
(11, 2, 'Computer Science', 'CS-101', 'elective', 'Programming basics.', 'active', 2, 2),
(12, 2, 'Environmental Science', 'EVS-101', 'core', 'Study of the environment.', 'active', 2, 2),
(13, 2, 'Physical Education', 'PE-101', 'vocational', 'Physical fitness and sports.', 'active', 2, 2),
(14, 2, 'Aptitude & Reasoning', 'APT-101', 'core', 'Logical reasoning and mental ability.', 'active', 2, 2),
(15, 2, 'Advanced Mathematics', 'MATH-ADV', 'core', 'Advanced calculus for JEE.', 'active', 2, 2);
