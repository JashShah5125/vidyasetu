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

const sendPasswordResetOtpEmail = async ({ recipientEmail, userName, otpCode, expiresInMinutes = 5 }) => {
    const transporter = createTransporter();
    const safeUserName = escapeHtml(userName || 'User');
    const safeOtp = escapeHtml(otpCode);
    const digits = safeOtp.split('');

    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to: recipientEmail,
        subject: `${otpCode} is your VidyaSetu verification code`,
        text: `Hello ${userName || 'User'},\n\nWe received a request to reset your VidyaSetu password.\n\nYour 6-digit verification code is: ${otpCode}\n\nThis code will expire in ${expiresInMinutes} minutes.\n\nIf you did not request a password reset, please ignore this email or contact support.`,
        html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f1f5f9; padding: 40px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0;">
          
          <!-- Top Navy Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 32px 32px 28px 32px; text-align: left;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px; line-height: 1.2;">
                      Vidya<span style="color: #38bdf8;">Setu</span>
                    </div>
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">
                      Institution Management Cloud
                    </div>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 20px; padding: 6px 14px; font-size: 11px; font-weight: 600; color: #f8fafc; letter-spacing: 0.3px;">
                      Security Verification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body Content -->
          <tr>
            <td style="padding: 36px 36px 28px 36px;">
              <h1 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                Password Reset Verification
              </h1>
              
              <p style="margin: 0 0 18px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong style="color: #0f172a;">${safeUserName}</strong>,
              </p>
              
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                A password reset request was initiated for your VidyaSetu account. Use the one-time verification code below to authorize this request:
              </p>

              <!-- Business Grade OTP Code Display -->
              <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 28px;">
                <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; margin-bottom: 14px;">
                  Your One-Time Passcode
                </div>
                
                <!-- Individual Pin Digit Blocks -->
                <div style="display: inline-block; text-align: center;">
                  ${digits.map(d => `
                    <span style="display: inline-block; width: 44px; height: 52px; line-height: 52px; margin: 0 4px; font-size: 26px; font-weight: 800; font-family: 'SF Mono', Monaco, Consolas, 'Courier New', monospace; color: #0f172a; background-color: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 8px; text-align: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                      ${d}
                    </span>
                  `).join('')}
                </div>

                <div style="margin-top: 16px; font-size: 12px; font-weight: 600; color: #b91c1c;">
                  This code expires in <strong>${expiresInMinutes} minutes</strong>
                </div>
              </div>

              <!-- Security Notice Banner -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-left: 3px solid #2563eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 28px;">
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #334155;">
                    <strong style="color: #0f172a;">Important:</strong> VidyaSetu administrators and staff will never ask for your verification code or password.
                  </td>
                </tr>
              </table>

              <p style="margin: 0; font-size: 12px; line-height: 1.6; color: #64748b;">
                If you did not request this password reset, you can safely ignore this email. No changes will be made to your account.
              </p>
            </td>
          </tr>

          <!-- Subtle Divider -->
          <tr>
            <td style="padding: 0 36px;">
              <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 0;" />
            </td>
          </tr>

          <!-- Corporate Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 6px 0; font-size: 11px; font-weight: 600; color: #64748b; letter-spacing: 0.2px;">
                VidyaSetu Enterprise Platform
              </p>
              <p style="margin: 0; font-size: 10px; color: #94a3b8; line-height: 1.4;">
                This is an automated system notification. Please do not reply directly to this email.<br>
                &copy; ${new Date().getFullYear()} VidyaSetu. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
        `
    });
};

module.exports = { sendTenantWelcomeEmail, sendPasswordResetOtpEmail };
