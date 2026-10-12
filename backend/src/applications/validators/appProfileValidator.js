/**
 * Validators for Student Profile endpoints
 */

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const MOBILE_REGEX = /^[6-9]\d{9}$/;
const ALLOWED_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Strictly immutable fields that cannot be altered by student self-service
const FORBIDDEN_FIELDS = [
    'student_code', 'studentCode',
    'full_name', 'fullName', 'first_name', 'last_name',
    'dob', 'gender', 'category',
    'primary_branch_id', 'primaryBranchId', 'branch_id',
    'target_exam', 'targetExam', 'current_class', 'currentClass',
    'board_id', 'status', 'account_type'
];

const validateProfileUpdatePayload = (body) => {
    // Check if body contains forbidden fields
    for (const field of FORBIDDEN_FIELDS) {
        if (body[field] !== undefined) {
            return `Field '${field}' is read-only and cannot be modified by student self-service. Please contact your branch administrator for institutional corrections.`;
        }
    }

    const { email, mobile, bloodGroup, pincode } = body;

    if (email !== undefined) {
        if (typeof email !== 'string' || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
            return 'Invalid email address format.';
        }
    }

    if (mobile !== undefined) {
        const cleanMobile = String(mobile).replace(/\D/g, '');
        if (!MOBILE_REGEX.test(cleanMobile)) {
            return 'Mobile number must be a valid 10-digit Indian phone number.';
        }
    }

    if (bloodGroup !== undefined && bloodGroup !== null && bloodGroup !== '') {
        const normalizedBg = String(bloodGroup).toUpperCase().trim();
        if (!ALLOWED_BLOOD_GROUPS.includes(normalizedBg)) {
            return `Invalid blood group. Allowed values: ${ALLOWED_BLOOD_GROUPS.join(', ')}`;
        }
    }

    if (pincode !== undefined && pincode !== null && pincode !== '') {
        const cleanPincode = String(pincode).trim();
        if (!/^\d{6}$/.test(cleanPincode)) {
            return 'Pincode must be a 6-digit number.';
        }
    }

    return null;
};

module.exports = {
    validateProfileUpdatePayload
};
