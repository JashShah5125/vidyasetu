const db = require('../config/db');

async function setupSmsTemplatesTable() {
  try {
    console.log('Creating sms_templates table if not exists...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS sms_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL DEFAULT 1 COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
          template_name VARCHAR(150) NOT NULL COMMENT 'Display name of template e.g., Fee Due Reminder, Exam Schedule Alert',
          template_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier key e.g., FEE_DUE_REMINDER',
          category VARCHAR(100) NOT NULL DEFAULT 'General' COMMENT 'Category: Fee & Billing, Admissions, Exams & Results, Attendance, System Alerts, General',
          dlt_template_id VARCHAR(100) NOT NULL COMMENT 'Distributed Ledger Technology ID for TRAI regulatory compliance',
          message_body TEXT NOT NULL COMMENT 'Raw SMS text body containing {{placeholders}}',
          status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
          created_by INT NULL,
          updated_by INT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_tenant (tenant_id),
          INDEX idx_category (category),
          INDEX idx_status (status),
          INDEX idx_dlt_id (dlt_template_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Table created successfully. Seeding initial Vidya Setu SMS templates...');

    const seeds = [
      {
        tenant_id: 1,
        template_name: 'Fee Installment Reminder',
        template_key: 'FEE_DUE_REMINDER',
        category: 'Fee & Billing',
        dlt_template_id: '14071628192038102',
        message_body: 'Dear {{parent_name}}, fee installment of Rs. {{amount}} for {{student_name}} is due on {{due_date}}. Please pay online at {{payment_link}} - {{institute_name}}.',
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'Admission Confirmation Alert',
        template_key: 'ADMISSION_CONFIRMATION',
        category: 'Admissions',
        dlt_template_id: '14071628192038104',
        message_body: 'Welcome {{student_name}}! Your admission to {{course_name}} (Batch: {{batch_name}}) at {{institute_name}} is confirmed. Student ID: {{student_id}}.',
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'Exam Marks Announcement',
        template_key: 'EXAM_MARKS_ANNOUNCEMENT',
        category: 'Exams & Results',
        dlt_template_id: '14071628192038105',
        message_body: 'Dear {{parent_name}}, {{student_name}} scored {{marks}}/{{max_marks}} in {{subject_name}} (Test: {{exam_name}}). Rank: {{rank}} - {{institute_name}}.',
        status: 'active'
      },
      {
        tenant_id: 1,
        tenant_id: 1,
        template_name: 'Lecture Absentee Alert',
        template_key: 'LECTURE_ABSENTEE_ALERT',
        category: 'Attendance',
        dlt_template_id: '14071628192038106',
        message_body: 'Dear {{parent_name}}, {{student_name}} was absent for the {{subject_name}} lecture on {{lecture_date}} at {{branch_name}}. Please contact management - {{institute_name}}.',
        status: 'inactive'
      },
      {
        tenant_id: 1,
        template_name: 'OTP Verification Code',
        template_key: 'OTP_VERIFICATION_CODE',
        category: 'System Alerts',
        dlt_template_id: '14071628192038101',
        message_body: 'Your Vidya Setu verification OTP code is {{otp_code}}. Valid for 10 minutes. Do not share it with anyone.',
        status: 'active'
      }
    ];

    for (const seed of seeds) {
      await db.query(`
        INSERT INTO sms_templates (tenant_id, template_name, template_key, category, dlt_template_id, message_body, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            template_name = VALUES(template_name),
            category = VALUES(category),
            dlt_template_id = VALUES(dlt_template_id),
            message_body = VALUES(message_body),
            status = VALUES(status)
      `, [seed.tenant_id, seed.template_name, seed.template_key, seed.category, seed.dlt_template_id, seed.message_body, seed.status]);
    }

    console.log('SMS templates seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up sms_templates table:', error);
    process.exit(1);
  }
}

setupSmsTemplatesTable();
