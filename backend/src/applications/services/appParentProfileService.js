const appParentProfileModel = require('../models/appParentProfileModel');

class AppParentProfileService {
    /**
     * Get Parent Profile with linked wards
     */
    async getProfile(user) {
        const tenantId = user.tenantId;
        const userId = user.userId;

        const profile = await appParentProfileModel.getParentProfileByUserId(tenantId, userId);
        if (!profile) {
            const err = new Error('Parent/Guardian profile not found.');
            err.statusCode = 404;
            throw err;
        }

        return {
            guardianId: profile.guardian_id,
            fullName: profile.full_name,
            relation: profile.relation,
            email: profile.email,
            mobile: profile.mobile,
            occupation: profile.occupation,
            profilePhotoUrl: profile.profile_photo_url,
            address: profile.address,
            schoolName: profile.school_name,
            accountStatus: profile.account_status,
            lastLoginAt: profile.last_login_at,
            joinedAt: profile.joined_at,
            childrenCount: (profile.children || []).length,
            children: (profile.children || []).map(child => ({
                studentId: child.student_id,
                studentCode: child.student_code,
                fullName: child.full_name,
                dob: child.dob,
                gender: child.gender,
                mobile: child.mobile,
                email: child.email,
                currentClass: child.current_class,
                targetExam: child.target_exam,
                bloodGroup: child.blood_group,
                profilePhotoUrl: child.profile_photo_url,
                isPrimaryGuardian: Boolean(child.is_primary),
                branch: child.branch_id ? {
                    id: child.branch_id,
                    name: child.branch_name
                } : null,
                enrollment: child.enrollment_id ? {
                    id: child.enrollment_id,
                    batchId: child.batch_id,
                    batchName: child.batch_name,
                    batchCode: child.batch_code,
                    enrolledDate: child.enrolled_date
                } : null
            }))
        };
    }

    /**
     * Update Parent contact and demographic info
     */
    async updateProfile(user, data) {
        const tenantId = user.tenantId;
        const userId = user.userId;

        const profile = await appParentProfileModel.getParentProfileByUserId(tenantId, userId);
        if (!profile) {
            const err = new Error('Parent/Guardian profile not found.');
            err.statusCode = 404;
            throw err;
        }

        // Email uniqueness validation
        if (data.email && data.email.toLowerCase() !== (profile.email || '').toLowerCase()) {
            const isTaken = await appParentProfileModel.isEmailInUseByOther(data.email, userId);
            if (isTaken) {
                const err = new Error('The email address provided is already associated with another account.');
                err.statusCode = 409;
                throw err;
            }
        }

        // Mobile format validation if provided
        if (data.mobile && !/^\+?[0-9]{10,14}$/.test(data.mobile.replace(/[\s-]/g, ''))) {
            const err = new Error('Please provide a valid mobile phone number.');
            err.statusCode = 400;
            throw err;
        }

        await appParentProfileModel.updateParentContactInfo(tenantId, profile.guardian_id, userId, data);

        // Fetch refreshed profile
        return await this.getProfile(user);
    }

    /**
     * Upload/Update Profile Photo Avatar
     */
    async updateProfilePhoto(user, file) {
        if (!file) {
            const err = new Error('No image file provided. Please upload an image (JPEG, PNG, WEBP).');
            err.statusCode = 400;
            throw err;
        }

        const tenantId = user.tenantId;
        const userId = user.userId;

        const profile = await appParentProfileModel.getParentProfileByUserId(tenantId, userId);
        if (!profile) {
            const err = new Error('Parent/Guardian profile not found.');
            err.statusCode = 404;
            throw err;
        }

        // Storage path relative to uploads directory
        const photoUrl = `/uploads/avatars/${file.filename}`;

        await appParentProfileModel.updateProfilePhoto(tenantId, profile.guardian_id, photoUrl);

        return {
            profilePhotoUrl: photoUrl
        };
    }
}

module.exports = new AppParentProfileService();
