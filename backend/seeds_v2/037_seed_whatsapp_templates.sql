-- 037_seed_whatsapp_templates.sql
-- Seed initial Vidya Setu coaching institute WhatsApp templates

INSERT INTO whatsapp_templates (tenant_id, template_name, template_key, category, dlt_template_id, header_type, header_content, message_body, footer_text, buttons, status)
VALUES 
(
    1, 
    'New Batch Admission Offer', 
    'WA_NEW_BATCH_ADMISSION', 
    'MARKETING', 
    'WA_ADMISSION_2026_01', 
    'image', 
    'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80', 
    'Greetings {{parent_name}}!\n\nAdmissions are now open for the new *{{course_name}}* batch starting *{{start_date}}* at *{{institute_name}}*.\n\nEarly bird discount of *Rs. {{amount}}* applicable if enrolled before {{due_date}}!', 
    'Vidya Setu Education Services', 
    '[{"type": "URL", "text": "Enroll Now", "url": "https://vidyasetu.com/enroll"}]', 
    'active'
),
(
    1, 
    'Fee Installment Reminder', 
    'WA_FEE_INSTALLMENT_REMINDER', 
    'UTILITY', 
    'WA_FEE_REMINDER_02', 
    'text', 
    'Fee Installment Notice', 
    'Dear {{parent_name}},\n\nFee installment of *Rs. {{amount}}* for *{{student_name}}* is due on *{{due_date}}*.\n\nKindly pay online to avoid late fee charges. Thank you!', 
    'Accounts Dept - Vidya Setu', 
    '[{"type": "URL", "text": "Pay Online", "url": "https://vidyasetu.com/pay"}]', 
    'active'
),
(
    1, 
    'WhatsApp OTP Code', 
    'WA_OTP_SECURITY_CODE', 
    'AUTHENTICATION', 
    'WA_OTP_AUTH_03', 
    'none', 
    NULL, 
    'Your Vidya Setu security verification OTP code is *{{otp_code}}*.\n\nValid for 10 minutes. Do not share this code with anyone.', 
    'Vidya Setu Security', 
    NULL, 
    'active'
),
(
    1, 
    'Exam Marks & Performance Report', 
    'WA_EXAM_MARKS_REPORT', 
    'UTILITY', 
    'WA_EXAM_MARKS_04', 
    'document', 
    'https://vidyasetu.com/docs/sample_report.pdf', 
    'Dear {{parent_name}},\n\n*{{student_name}}* scored *{{marks}}/{{max_marks}}* in {{subject_name}} (Test: {{exam_name}}).\n\nOverall Rank: *{{rank}}*. Attached report card details.', 
    'Vidya Setu Academic Desk', 
    '[{"type": "URL", "text": "View Result Portal", "url": "https://vidyasetu.com/results"}]', 
    'active'
),
(
    1, 
    'Lecture Attendance Notice', 
    'WA_LECTURE_ABSENTEE_NOTICE', 
    'UTILITY', 
    'WA_ATTENDANCE_05', 
    'text', 
    'Lecture Absentee Alert', 
    'Dear {{parent_name}},\n\n*{{student_name}}* was marked *ABSENT* for the {{subject_name}} lecture on *{{lecture_date}}* at {{branch_name}}.\n\nPlease contact administration if unintended.', 
    'Vidya Setu Attendance Cell', 
    '[{"type": "PHONE", "text": "Call Branch Admin", "phone": "+919876543210"}]', 
    'inactive'
)
ON DUPLICATE KEY UPDATE
    template_name = VALUES(template_name),
    category = VALUES(category),
    dlt_template_id = VALUES(dlt_template_id),
    header_type = VALUES(header_type),
    header_content = VALUES(header_content),
    message_body = VALUES(message_body),
    footer_text = VALUES(footer_text),
    buttons = VALUES(buttons),
    status = VALUES(status);
