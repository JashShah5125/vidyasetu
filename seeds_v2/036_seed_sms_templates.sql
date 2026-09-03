-- 036_seed_sms_templates.sql
-- Seed initial Vidya Setu coaching institute SMS templates with dynamic variables JSON map

INSERT INTO sms_templates (tenant_id, template_name, template_key, category, dlt_template_id, message_body, variables, status)
VALUES 
(
    1, 
    'Fee Installment Reminder', 
    'FEE_INSTALLMENT_REMINDER', 
    'Fee & Billing', 
    '14071628192038102', 
    'Dear Parent, fee installment of Rs. {{amount}} for {{student_name}} is due on {{due_date}}. Pay online at {{payment_link}} - Vidya Setu', 
    '{"amount": "15,000", "student_name": "Rahul Sharma", "due_date": "15/09/2026", "payment_link": "https://vidyasetu.com/pay"}', 
    'active'
),
(
    1, 
    'Admission Confirmation Alert', 
    'ADMISSION_CONFIRMATION', 
    'Admissions', 
    '14071628192038104', 
    'Welcome {{student_name}}! Your admission for {{course_name}} at Vidya Setu ({{branch_name}}) is confirmed. Roll No: {{student_id}}.', 
    '{"student_name": "Priya Patel", "course_name": "IIT-JEE Advanced", "branch_name": "Main Campus", "student_id": "STU-2026-045"}', 
    'active'
),
(
    1, 
    'Exam Marks Announcement', 
    'EXAM_MARKS_ANNOUNCEMENT', 
    'Exams & Results', 
    '14071628192038105', 
    'Dear {{parent_name}}, {{student_name}} scored {{marks}}/{{max_marks}} in {{subject_name}} (Test: {{exam_name}}). Rank: {{rank}}. - Vidya Setu', 
    '{"parent_name": "Anita Sharma", "student_name": "Rahul Sharma", "marks": "94", "max_marks": "100", "subject_name": "Physics", "exam_name": "Weekly Mock Test", "rank": "1st"}', 
    'active'
),
(
    1, 
    'Lecture Absentee Alert', 
    'LECTURE_ABSENTEE_ALERT', 
    'Attendance', 
    '14071628192038106', 
    'Alert: {{student_name}} was marked ABSENT for the {{subject_name}} lecture on {{lecture_date}} at {{branch_name}}. - Vidya Setu Administration', 
    '{"student_name": "Amit Kumar", "subject_name": "Mathematics", "lecture_date": "03/09/2026", "branch_name": "Kothrud Branch"}', 
    'inactive'
),
(
    1, 
    'OTP Verification Code', 
    'OTP_VERIFICATION_CODE', 
    'System Alerts', 
    '14071628192038108', 
    'Your Vidya Setu portal verification OTP code is {{otp_code}}. Valid for 10 minutes. Do not share this code.', 
    '{"otp_code": "849201"}', 
    'active'
)
ON DUPLICATE KEY UPDATE
    template_name = VALUES(template_name),
    category = VALUES(category),
    dlt_template_id = VALUES(dlt_template_id),
    message_body = VALUES(message_body),
    variables = VALUES(variables),
    status = VALUES(status);
