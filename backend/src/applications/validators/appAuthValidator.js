/**
 * Validators for Student Application Auth APIs
 */

const validateLoginPayload = (body) => {
    const { identifier, password } = body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        return 'Login identifier (Student Code, Email, or Mobile) is required.';
    }
    if (!password || typeof password !== 'string') {
        return 'Password is required.';
    }
    return null;
};

const validateRefreshTokenPayload = (body) => {
    const { refreshToken } = body;
    if (!refreshToken || typeof refreshToken !== 'string') {
        return 'Refresh token is required.';
    }
    return null;
};

const validateChangePasswordPayload = (body) => {
    const { currentPassword, newPassword } = body;
    if (!currentPassword || typeof currentPassword !== 'string') {
        return 'Current password is required.';
    }
    if (!newPassword || typeof newPassword !== 'string') {
        return 'New password is required.';
    }
    if (newPassword.length < 6) {
        return 'New password must be at least 6 characters long.';
    }
    if (currentPassword === newPassword) {
        return 'New password cannot be identical to the current password.';
    }
    return null;
};

const validateForgotPasswordPayload = (body) => {
    const { identifier } = body;
    if (!identifier || typeof identifier !== 'string' || !identifier.trim()) {
        return 'Mobile number, Email, or Student Code is required to reset password.';
    }
    return null;
};

const validateResetPasswordPayload = (body) => {
    const { mobile, otp, newPassword } = body;
    if (!mobile || typeof mobile !== 'string' || !mobile.trim()) {
        return 'Mobile number is required.';
    }
    if (!otp || typeof otp !== 'string' || !otp.trim()) {
        return 'OTP code is required.';
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
        return 'New password must be at least 6 characters long.';
    }
    return null;
};

const validateRegisterDevicePayload = (body) => {
    const { deviceIdentifier, fcmToken } = body;
    if (!deviceIdentifier || typeof deviceIdentifier !== 'string') {
        return 'deviceIdentifier is required.';
    }
    if (!fcmToken || typeof fcmToken !== 'string') {
        return 'fcmToken is required.';
    }
    return null;
};

module.exports = {
    validateLoginPayload,
    validateRefreshTokenPayload,
    validateChangePasswordPayload,
    validateForgotPasswordPayload,
    validateResetPasswordPayload,
    validateRegisterDevicePayload
};
