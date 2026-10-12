const appProfileModel = require('../models/appProfileModel');

class AppProfileService {
    /**
     * Get Complete Student Profile
     */
    async getProfile(tenantId, userId) {
        const student = await appProfileModel.getStudentProfileByUserId(tenantId, userId);
        if (!student) {
            const error = new Error('Student profile not found for this account.');
            error.statusCode = 404;
            throw error;
        }

        return {
            studentId: student.student_id,
            studentCode: student.student_code,
            fullName: student.full_name,
            dob: student.dob,
            gender: student.gender,
            bloodGroup: student.blood_group,
            category: student.category,
            profilePhotoUrl: student.profile_photo_url,
            status: student.student_status,
            accountType: student.account_type,
            contact: {
                mobile: student.mobile,
                email: student.email,
                address: {
                    street: student.street,
                    city: student.city,
                    state: student.state,
                    pincode: student.pincode
                }
            },
            academic: {
                schoolName: student.school_name,
                currentClass: student.current_class,
                boardName: student.board_name,
                targetExam: student.target_exam,
                yearOfAttempt: student.year_of_attempt,
                enrollmentId: student.enrollment_id,
                batchId: student.batch_id,
                batchName: student.batch_name,
                batchCode: student.batch_code,
                enrolledDate: student.enrolled_date
            },
            branch: {
                branchId: student.branch_id,
                branchName: student.branch_name,
                branchCode: student.branch_code,
                branchCity: student.branch_city
            },
            joinedAt: student.joined_at,
            lastLoginAt: student.last_login_at
        };
    }

    /**
     * Update Student Allowed Contact Info
     */
    async updateProfile(tenantId, userId, payload) {
        const student = await appProfileModel.getStudentProfileByUserId(tenantId, userId);
        if (!student) {
            const error = new Error('Student profile not found.');
            error.statusCode = 404;
            throw error;
        }

        const updateData = {};

        if (payload.street !== undefined) updateData.street = payload.street ? payload.street.trim() : null;
        if (payload.city !== undefined) updateData.city = payload.city ? payload.city.trim() : null;
        if (payload.state !== undefined) updateData.state = payload.state ? payload.state.trim() : null;
        if (payload.pincode !== undefined) updateData.pincode = payload.pincode ? String(payload.pincode).trim() : null;
        if (payload.bloodGroup !== undefined) updateData.bloodGroup = payload.bloodGroup ? String(payload.bloodGroup).toUpperCase().trim() : null;

        if (payload.email !== undefined) {
            const normalizedEmail = payload.email.trim().toLowerCase();
            const emailInUse = await appProfileModel.isEmailInUseByOther(normalizedEmail, userId);
            if (emailInUse) {
                const error = new Error('This email address is already in use by another account.');
                error.statusCode = 409;
                throw error;
            }
            updateData.email = normalizedEmail;
        }

        if (payload.mobile !== undefined) {
            updateData.mobile = String(payload.mobile).replace(/\D/g, '');
        }

        await appProfileModel.updateStudentContactInfo(tenantId, student.student_id, userId, updateData);

        // Fetch and return the updated profile
        return await this.getProfile(tenantId, userId);
    }

    /**
     * Upload / Update Profile Avatar
     */
    async updateProfilePhoto(tenantId, userId, file) {
        if (!file) {
            const error = new Error('No image file provided for profile photo.');
            error.statusCode = 400;
            throw error;
        }

        const student = await appProfileModel.getStudentProfileByUserId(tenantId, userId);
        if (!student) {
            const error = new Error('Student profile not found.');
            error.statusCode = 404;
            throw error;
        }

        const photoUrl = `/uploads/avatars/${file.filename}`;
        await appProfileModel.updateProfilePhoto(tenantId, student.student_id, photoUrl);

        return {
            profilePhotoUrl: photoUrl,
            message: 'Profile photo updated successfully.'
        };
    }

    /**
     * Get Guardians List
     */
    async getGuardians(tenantId, userId) {
        const student = await appProfileModel.getStudentProfileByUserId(tenantId, userId);
        if (!student) {
            const error = new Error('Student profile not found.');
            error.statusCode = 404;
            throw error;
        }

        const guardians = await appProfileModel.getGuardiansByStudentId(tenantId, student.student_id);
        return guardians.map(g => ({
            guardianId: g.guardian_id,
            fullName: g.full_name,
            relation: g.relation,
            mobile: g.mobile,
            email: g.email,
            occupation: g.occupation,
            isPrimary: Boolean(g.is_primary),
            linkedAt: g.linked_at
        }));
    }

    /**
     * Get Student Uploaded Documents List
     */
    async getDocuments(tenantId, userId) {
        const student = await appProfileModel.getStudentProfileByUserId(tenantId, userId);
        if (!student) {
            const error = new Error('Student profile not found.');
            error.statusCode = 404;
            throw error;
        }

        const documents = await appProfileModel.getDocumentsByStudentId(tenantId, student.student_id);
        return documents.map(doc => ({
            documentId: doc.document_id,
            documentTypeId: doc.document_type_id,
            documentTypeName: doc.document_type_name,
            documentTypeCode: doc.document_type_code,
            fileName: doc.file_name,
            fileUrl: doc.file_url,
            mimeType: doc.mime_type,
            verificationStatus: doc.verification_status,
            rejectionReason: doc.rejection_reason,
            verifiedAt: doc.verified_at,
            uploadedAt: doc.uploaded_at
        }));
    }
}

module.exports = new AppProfileService();
