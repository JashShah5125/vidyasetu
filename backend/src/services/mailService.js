const nodemailer = require('nodemailer');

const requiredMailConfig = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'FRONTEND_URL'];

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const createTransporter = () => {
    const missing = requiredMailConfig.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`SMTP configuration is incomplete: ${missing.join(', ')}`);
    }

    return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        }
    });
};

const sendTenantWelcomeEmail = async ({ recipientEmail, ownerName, instituteName, temporaryPassword }) => {
    const transporter = createTransporter();
    const loginUrl = `${process.env.FRONTEND_URL.replace(/\/$/, '')}/login`;
    const safeOwnerName = escapeHtml(ownerName || 'Institute Admin');
    const safeInstituteName = escapeHtml(instituteName);
    const safeEmail = escapeHtml(recipientEmail);
    const safePassword = escapeHtml(temporaryPassword);

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: recipientEmail,
        subject: `Welcome to VidyaSetu - ${instituteName} account created`,
        text: `Hello ${ownerName || 'Institute Admin'},\n\nYour ${instituteName} VidyaSetu account has been created successfully.\n\nLogin URL: ${loginUrl}\nEmail: ${recipientEmail}\nTemporary password: ${temporaryPassword}\n\nPlease sign in and change your password immediately.`,
        html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;max-width:600px"><h2>Welcome to VidyaSetu</h2><p>Hello ${safeOwnerName},</p><p>Your <strong>${safeInstituteName}</strong> account has been created successfully.</p><p><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a><br><strong>Email:</strong> ${safeEmail}<br><strong>Temporary password:</strong> ${safePassword}</p><p>Please sign in and change your password immediately.</p></div>`
    });
};

module.exports = { sendTenantWelcomeEmail };
