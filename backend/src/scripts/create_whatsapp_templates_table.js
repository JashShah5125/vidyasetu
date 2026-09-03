const db = require('../config/db');

async function setupWhatsAppTemplatesTable() {
  try {
    console.log('Creating whatsapp_templates table if not exists...');
    
    await db.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_templates (
          id INT AUTO_INCREMENT PRIMARY KEY,
          tenant_id INT NOT NULL DEFAULT 1 COMMENT 'Default 1 for Vidya Setu master tenant or specific institute tenant_id',
          template_name VARCHAR(150) NOT NULL COMMENT 'Display name of WhatsApp template',
          template_key VARCHAR(100) NOT NULL UNIQUE COMMENT 'Unique identifier key e.g., FEE_REMINDER_WA',
          category VARCHAR(100) NOT NULL DEFAULT 'MARKETING' COMMENT 'Category: MARKETING, UTILITY, AUTHENTICATION, Fee & Billing, Admissions, General',
          dlt_template_id VARCHAR(100) NOT NULL COMMENT 'DLT / Meta WhatsApp Template ID for compliance',
          header_type ENUM('none', 'text', 'image', 'video', 'document') NOT NULL DEFAULT 'none',
          header_content TEXT NULL COMMENT 'Header text or rich media asset URL',
          message_body TEXT NOT NULL COMMENT 'Raw WhatsApp message text with *bold*, _italic_, and {{placeholders}}',
          footer_text VARCHAR(255) NULL COMMENT 'Optional WhatsApp footer text',
          buttons JSON NULL COMMENT 'Array of quick action / call-to-action buttons',
          status ENUM('active', 'inactive', 'deleted') NOT NULL DEFAULT 'active',
          created_by INT NULL,
          updated_by INT NULL,
          deleted_at DATETIME NULL COMMENT 'Soft deletion timestamp',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_tenant (tenant_id),
          INDEX idx_category (category),
          INDEX idx_status (status),
          INDEX idx_dlt_id (dlt_template_id),
          INDEX idx_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    console.log('Table created successfully. Seeding initial Vidya Setu WhatsApp templates...');

    const seeds = [
      {
        tenant_id: 1,
        template_name: 'New Batch Admission Offer',
        template_key: 'WA_NEW_BATCH_ADMISSION',
        category: 'MARKETING',
        dlt_template_id: 'WA_ADMISSION_2026_01',
        header_type: 'image',
        header_content: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
        message_body: 'Greetings {{parent_name}}!\n\nAdmissions are now open for the new *{{course_name}}* batch starting *{{start_date}}* at *{{institute_name}}*.\n\nEarly bird discount of *Rs. {{amount}}* applicable if enrolled before {{due_date}}!',
        footer_text: 'Vidya Setu Education Services',
        buttons: JSON.stringify([{ type: 'URL', text: 'Enroll Now', url: 'https://vidyasetu.com/enroll' }]),
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'Fee Installment Reminder',
        template_key: 'WA_FEE_INSTALLMENT_REMINDER',
        category: 'UTILITY',
        dlt_template_id: 'WA_FEE_REMINDER_02',
        header_type: 'text',
        header_content: 'Fee Installment Notice',
        message_body: 'Dear {{parent_name}},\n\nFee installment of *Rs. {{amount}}* for *{{student_name}}* is due on *{{due_date}}*.\n\nKindly pay online to avoid late fee charges. Thank you!',
        footer_text: 'Accounts Dept - Vidya Setu',
        buttons: JSON.stringify([{ type: 'URL', text: 'Pay Online', url: 'https://vidyasetu.com/pay' }]),
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'WhatsApp OTP Code',
        template_key: 'WA_OTP_SECURITY_CODE',
        category: 'AUTHENTICATION',
        dlt_template_id: 'WA_OTP_AUTH_03',
        header_type: 'none',
        header_content: null,
        message_body: 'Your Vidya Setu security verification OTP code is *{{otp_code}}*.\n\nValid for 10 minutes. Do not share this code with anyone.',
        footer_text: 'Vidya Setu Security',
        buttons: null,
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'Exam Marks & Performance Report',
        template_key: 'WA_EXAM_MARKS_REPORT',
        category: 'UTILITY',
        dlt_template_id: 'WA_EXAM_MARKS_04',
        header_type: 'document',
        header_content: 'https://vidyasetu.com/docs/sample_report.pdf',
        message_body: 'Dear {{parent_name}},\n\n*{{student_name}}* scored *{{marks}}/{{max_marks}}* in {{subject_name}} (Test: {{exam_name}}).\n\nOverall Rank: *{{rank}}*. Attached report card details.',
        footer_text: 'Vidya Setu Academic Desk',
        buttons: JSON.stringify([{ type: 'URL', text: 'View Result Portal', url: 'https://vidyasetu.com/results' }]),
        status: 'active'
      },
      {
        tenant_id: 1,
        template_name: 'Lecture Attendance Notice',
        template_key: 'WA_LECTURE_ABSENTEE_NOTICE',
        category: 'UTILITY',
        dlt_template_id: 'WA_ATTENDANCE_05',
        header_type: 'text',
        header_content: 'Lecture Absentee Alert',
        message_body: 'Dear {{parent_name}},\n\n*{{student_name}}* was marked *ABSENT* for the {{subject_name}} lecture on *{{lecture_date}}* at {{branch_name}}.\n\nPlease contact administration if unintended.',
        footer_text: 'Vidya Setu Attendance Cell',
        buttons: JSON.stringify([{ type: 'PHONE', text: 'Call Branch Admin', phone: '+919876543210' }]),
        status: 'inactive'
      }
    ];

    for (const seed of seeds) {
      await db.query(`
        INSERT INTO whatsapp_templates (tenant_id, template_name, template_key, category, dlt_template_id, header_type, header_content, message_body, footer_text, buttons, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            template_name = VALUES(template_name),
            category = VALUES(category),
            dlt_template_id = VALUES(dlt_template_id),
            header_type = VALUES(header_type),
            header_content = VALUES(header_content),
            message_body = VALUES(message_body),
            footer_text = VALUES(footer_text),
            buttons = VALUES(buttons),
            status = VALUES(status)
      `, [seed.tenant_id, seed.template_name, seed.template_key, seed.category, seed.dlt_template_id, seed.header_type, seed.header_content, seed.message_body, seed.footer_text, seed.buttons, seed.status]);
    }

    console.log('WhatsApp templates seeded successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up whatsapp_templates table:', error);
    process.exit(1);
  }
}

setupWhatsAppTemplatesTable();
