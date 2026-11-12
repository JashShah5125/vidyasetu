-- Seed for system_configurations table
-- Per-tenant channel configuration (SMS, EMAIL, WHATSAPP)
-- Seeded for master tenant (id=1) with mock values
-- Each tenant has exactly one row per channel (UNIQUE tenant_id + channel_type)

INSERT IGNORE INTO system_configurations (tenant_id, channel_type, provider_name, is_enabled, credentials, sender_id) VALUES
(1, 'SMS', 'Twilio', TRUE, '{"account_sid":"ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", "auth_token":"your_twilio_auth_token", "from_number":"+12513095544", "api_endpoint":"https://api.twilio.com/2010-04-01", "test_phone":"+919876543210"}', 'tstsms'),
(1, 'EMAIL', 'SMTP Server', TRUE, '{"encryption":"TLS", "smtp_host":"smtp.gmail.com", "smtp_port":"587", "smtp_username":"noreply@vidyasetu.com", "smtp_password":"your_smtp_password", "from_email":"noreply@vidyasetu.com", "from_name":"Vidya Setu", "reply_to_email":"support@vidyasetu.com", "test_email":"test@example.com"}', NULL),
(1, 'WHATSAPP', 'ISPL Chatbot (Custom V2)', TRUE, '{"auth_token":"your_whatsapp_auth_token", "api_endpoint":"https://ispl10.chatbot.team/wa/v2/messages/send", "webhook_url":"https://your-domain.com/webhook/whatsapp", "webhook_verify_token":"whatsapp_verify_token_xyz123", "test_phone":"+919876543210"}', NULL);
