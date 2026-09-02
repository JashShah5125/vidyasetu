-- Seed for email_templates table
-- Sourced from 09_seed_email_templates.sql

INSERT IGNORE INTO email_templates
(
    tenant_id,
    template_key,
    name,
    description,
    category,
    subject,
    html_body,
    text_body,
    variables,
    status,
    is_system,
    created_by,
    updated_by
)
VALUES
(
    1,
    'ACCOUNT_CREATED',
    'Account Created',
    'Sent when a new user account is created and first-time access details are available.',
    'AUTHENTICATION',
    'Your {{platform_name}} account has been created',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Your account has been created</h2>
<p>Hello {{user_name}},</p>
<p>Your account has been successfully created on <strong>{{platform_name}}</strong>.</p>
<p><strong>Username:</strong> {{username}}</p>
<p><strong>Temporary Password:</strong> {{temporary_password}}</p>
<p><a href="{{login_url}}">Login to your account</a></p>
<p>Please change your temporary password after your first login.</p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{user_name}},

Your account has been successfully created on {{platform_name}}.

Username: {{username}}
Temporary Password: {{temporary_password}}

Login:
{{login_url}}

Please change your temporary password after your first login.

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'user_name','Name of the account holder',
        'platform_name','Name of the SaaS platform',
        'username','Username or login identifier',
        'temporary_password','Temporary first-login password',
        'login_url','Login URL',
        'support_email','Support email address'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'EMAIL_VERIFICATION',
    'Email Verification',
    'Sent when a user needs to verify their email address.',
    'AUTHENTICATION',
    'Verify your email address',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Verify your email address</h2>
<p>Hello {{user_name}},</p>
<p>Please verify your email address to complete your account setup.</p>
<p><a href="{{verification_link}}">Verify Email Address</a></p>
<p>This verification link will expire at {{expiry_time}}.</p>
<p>If you did not request this verification, you can safely ignore this email.</p>
<p>{{platform_name}}</p>
</body>
</html>',
    'Hello {{user_name}},

Please verify your email address to complete your account setup.

Verify your email:
{{verification_link}}

This verification link will expire at {{expiry_time}}.

If you did not request this verification, you can safely ignore this email.

{{platform_name}}',
    JSON_OBJECT(
        'user_name','Name of the recipient',
        'verification_link','Email verification URL',
        'expiry_time','Verification link expiry time',
        'platform_name','Name of the SaaS platform'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'PASSWORD_RESET',
    'Password Reset',
    'Sent when a user requests a password reset.',
    'AUTHENTICATION',
    'Reset your {{platform_name}} password',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Reset your password</h2>
<p>Hello {{user_name}},</p>
<p>We received a request to reset your password.</p>
<p><a href="{{reset_link}}">Reset Password</a></p>
<p>This link will expire at {{expiry_time}}.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
<p>{{platform_name}} Support</p>
</body>
</html>',
    'Hello {{user_name}},

We received a request to reset your password.

Reset your password:
{{reset_link}}

This link will expire at {{expiry_time}}.

If you did not request a password reset, you can safely ignore this email.

{{platform_name}} Support.',
    JSON_OBJECT(
        'user_name','Name of the recipient',
        'reset_link','Password reset URL',
        'expiry_time','Password reset link expiry time',
        'platform_name','Name of the SaaS platform'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'PASSWORD_CHANGED',
    'Password Changed',
    'Sent after a user successfully changes their password.',
    'AUTHENTICATION',
    'Your password has been changed',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Password changed successfully</h2>
<p>Hello {{user_name}},</p>
<p>Your password for {{platform_name}} has been changed successfully.</p>
<p><strong>Changed at:</strong> {{changed_at}}</p>
<p>If you did not make this change, please contact {{support_email}} immediately.</p>
</body>
</html>',
    'Hello {{user_name}},

Your password for {{platform_name}} has been changed successfully.

Changed at: {{changed_at}}

If you did not make this change, contact {{support_email}} immediately.',
    JSON_OBJECT(
        'user_name','Name of the recipient',
        'platform_name','Name of the SaaS platform',
        'changed_at','Date and time of password change',
        'support_email','Support email address'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'ACCOUNT_ACTIVATED',
    'Account Activated',
    'Sent when a previously inactive user account is activated.',
    'AUTHENTICATION',
    'Your {{platform_name}} account is now active',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Your account is active</h2>
<p>Hello {{user_name}},</p>
<p>Your account on {{platform_name}} has been activated successfully.</p>
<p><a href="{{login_url}}">Login to your account</a></p>
<p>If you need assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{user_name}},

Your account on {{platform_name}} has been activated successfully.

Login:
{{login_url}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'user_name','Name of the recipient',
        'platform_name','Name of the SaaS platform',
        'login_url','Login URL',
        'support_email','Support email address'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'STUDENT_REGISTRATION_SUCCESS',
    'Student Registration Successful',
    'Sent after a student registration and enrollment have been successfully completed.',
    'ONBOARDING',
    'Your registration at {{institute_name}} is successful',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Registration successful</h2>
<p>Hello {{student_name}},</p>
<p>Your registration at <strong>{{institute_name}}</strong> has been completed successfully.</p>
<p><strong>Student ID:</strong> {{student_id}}</p>
<p><strong>Course:</strong> {{course_name}}</p>
<p><strong>Program:</strong> {{program_name}}</p>
<p><strong>Batch:</strong> {{batch_name}}</p>
<p><a href="{{login_url}}">Login to Student Portal</a></p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{student_name}},

Your registration at {{institute_name}} has been completed successfully.

Student ID: {{student_id}}
Course: {{course_name}}
Program: {{program_name}}
Batch: {{batch_name}}

Login:
{{login_url}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'student_name','Student name',
        'institute_name','Institute name',
        'student_id','Student identifier',
        'course_name','Course name',
        'program_name','Program name',
        'batch_name','Batch name',
        'login_url','Student portal login URL',
        'support_email','Support email address'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'PARENT_ACCOUNT_CREATED',
    'Parent Account Created',
    'Sent when a parent or guardian account is created and linked to a student.',
    'ONBOARDING',
    'Your parent account has been created',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Parent account created</h2>
<p>Hello {{parent_name}},</p>
<p>Your parent account for <strong>{{institute_name}}</strong> has been created successfully.</p>
<p><strong>Student:</strong> {{student_name}}</p>
<p><strong>Username:</strong> {{username}}</p>
<p><strong>Temporary Password:</strong> {{temporary_password}}</p>
<p><a href="{{login_url}}">Login to Parent Portal</a></p>
<p>Please change your temporary password after your first login.</p>
</body>
</html>',
    'Hello {{parent_name}},

Your parent account for {{institute_name}} has been created successfully.

Student: {{student_name}}

Username: {{username}}
Temporary Password: {{temporary_password}}

Login:
{{login_url}}

Please change your temporary password after your first login.',
    JSON_OBJECT(
        'parent_name','Parent or guardian name',
        'institute_name','Institute name',
        'student_name','Linked student name',
        'username','Parent login identifier',
        'temporary_password','Temporary first-login password',
        'login_url','Parent portal login URL'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'STAFF_ACCOUNT_CREATED',
    'Staff Account Created',
    'Sent when a staff member is created and provided with platform access.',
    'ONBOARDING',
    'Your {{institute_name}} staff account has been created',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Staff account created</h2>
<p>Hello {{staff_name}},</p>
<p>Your staff account for <strong>{{institute_name}}</strong> has been created successfully.</p>
<p><strong>Username:</strong> {{username}}</p>
<p><strong>Temporary Password:</strong> {{temporary_password}}</p>
<p><a href="{{login_url}}">Login to Staff Portal</a></p>
<p>Please change your temporary password after your first login.</p>
</body>
</html>',
    'Hello {{staff_name}},

Your staff account for {{institute_name}} has been created successfully.

Username: {{username}}
Temporary Password: {{temporary_password}}

Login:
{{login_url}}

Please change your temporary password after your first login.',
    JSON_OBJECT(
        'staff_name','Staff member name',
        'institute_name','Institute name',
        'username','Staff login identifier',
        'temporary_password','Temporary first-login password',
        'login_url','Staff portal login URL'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'TEACHER_ACCOUNT_CREATED',
    'Teacher Account Created',
    'Sent when a teacher account is created and platform access is provided.',
    'ONBOARDING',
    'Your teacher account for {{institute_name}} has been created',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Teacher account created</h2>
<p>Hello {{teacher_name}},</p>
<p>Your teacher account for <strong>{{institute_name}}</strong> has been created successfully.</p>
<p><strong>Username:</strong> {{username}}</p>
<p><strong>Temporary Password:</strong> {{temporary_password}}</p>
<p><a href="{{login_url}}">Login to Teacher Portal</a></p>
<p>Please change your temporary password after your first login.</p>
</body>
</html>',
    'Hello {{teacher_name}},

Your teacher account for {{institute_name}} has been created successfully.

Username: {{username}}
Temporary Password: {{temporary_password}}

Login:
{{login_url}}

Please change your temporary password after your first login.',
    JSON_OBJECT(
        'teacher_name','Teacher name',
        'institute_name','Institute name',
        'username','Teacher login identifier',
        'temporary_password','Temporary first-login password',
        'login_url','Teacher portal login URL'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'TENANT_CREATED',
    'Institute Account Created',
    'Sent when a new institute tenant is created on the SaaS platform.',
    'TENANT',
    'Your {{platform_name}} institute account has been created',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Institute account created</h2>
<p>Hello {{admin_name}},</p>
<p>Your institute account for <strong>{{institute_name}}</strong> has been created on {{platform_name}}.</p>
<p><strong>Tenant ID:</strong> {{tenant_id}}</p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{admin_name}},

Your institute account for {{institute_name}} has been created on {{platform_name}}.

Tenant ID: {{tenant_id}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'platform_name','SaaS platform name',
        'tenant_id','Tenant identifier',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'TENANT_ACTIVATED',
    'Institute Account Activated',
    'Sent when an institute tenant is activated and can begin using the platform.',
    'TENANT',
    'Your {{institute_name}} account is now active',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Your institute account is active</h2>
<p>Hello {{admin_name}},</p>
<p>Your institute account for <strong>{{institute_name}}</strong> has been activated successfully.</p>
<p><a href="{{login_url}}">Open Institute Admin Panel</a></p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{admin_name}},

Your institute account for {{institute_name}} has been activated successfully.

Login:
{{login_url}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'login_url','Institute admin login URL',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'TENANT_SUSPENDED',
    'Institute Account Suspended',
    'Sent when an institute tenant is suspended and access is restricted.',
    'TENANT',
    'Your {{institute_name}} account has been suspended',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Institute account suspended</h2>
<p>Hello {{admin_name}},</p>
<p>The account for <strong>{{institute_name}}</strong> has been suspended.</p>
<p><strong>Reason:</strong> {{suspension_reason}}</p>
<p>If you need assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{admin_name}},

The account for {{institute_name}} has been suspended.

Reason:
{{suspension_reason}}

If you need assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'suspension_reason','Reason for suspension',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'TENANT_REACTIVATED',
    'Institute Account Reactivated',
    'Sent when a previously suspended institute tenant is reactivated.',
    'TENANT',
    'Your {{institute_name}} account has been reactivated',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Institute account reactivated</h2>
<p>Hello {{admin_name}},</p>
<p>Your institute account for <strong>{{institute_name}}</strong> has been reactivated successfully.</p>
<p><a href="{{login_url}}">Open Institute Admin Panel</a></p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{admin_name}},

Your institute account for {{institute_name}} has been reactivated successfully.

Login:
{{login_url}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'login_url','Institute admin login URL',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'SUBSCRIPTION_ACTIVATED',
    'Subscription Activated',
    'Sent when an institute subscription is successfully activated.',
    'SUBSCRIPTION',
    'Your {{platform_name}} subscription is active',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Subscription activated</h2>
<p>Hello {{admin_name}},</p>
<p>The subscription for <strong>{{institute_name}}</strong> has been activated successfully.</p>
<p><strong>Plan:</strong> {{plan_name}}</p>
<p><strong>Start Date:</strong> {{start_date}}</p>
<p><strong>End Date:</strong> {{end_date}}</p>
<p>For assistance, contact {{support_email}}.</p>
</body>
</html>',
    'Hello {{admin_name}},

The subscription for {{institute_name}} has been activated successfully.

Plan: {{plan_name}}
Start Date: {{start_date}}
End Date: {{end_date}}

For assistance, contact {{support_email}}.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'plan_name','Subscription plan name',
        'start_date','Subscription start date',
        'end_date','Subscription end date',
        'platform_name','SaaS platform name',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
),

(
    1,
    'SUBSCRIPTION_EXPIRING',
    'Subscription Expiring',
    'Sent when an institute subscription is approaching its expiry date.',
    'SUBSCRIPTION',
    'Your {{platform_name}} subscription expires on {{expiry_date}}',
    '<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body>
<h2>Your subscription is expiring soon</h2>
<p>Hello {{admin_name}},</p>
<p>The subscription for <strong>{{institute_name}}</strong> is scheduled to expire on <strong>{{expiry_date}}</strong>.</p>
<p><strong>Current Plan:</strong> {{plan_name}}</p>
<p>Please contact {{support_email}} for renewal assistance.</p>
</body>
</html>',
    'Hello {{admin_name}},

The subscription for {{institute_name}} is scheduled to expire on {{expiry_date}}.

Current Plan: {{plan_name}}

Please contact {{support_email}} for renewal assistance.',
    JSON_OBJECT(
        'admin_name','Institute administrator name',
        'institute_name','Institute name',
        'expiry_date','Subscription expiry date',
        'plan_name','Current subscription plan',
        'platform_name','SaaS platform name',
        'support_email','Platform support email'
    ),
    'ACTIVE',
    1,
    NULL,
    NULL
);
