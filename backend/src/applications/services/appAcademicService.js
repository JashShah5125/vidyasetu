const appAcademicModel = require('../models/appAcademicModel');

class AppAcademicService {
    /**
     * Get Student Active Enrollment Details
     */
    async getEnrollment(tenantId, userId) {
        const enrollment = await appAcademicModel.getActiveEnrollmentByUserId(tenantId, userId);
        if (!enrollment) {
            const err = new Error('No active academic enrollment found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        return {
            enrollmentId: enrollment.enrollment_id,
            enrolledDate: enrollment.enrolled_date,
            status: enrollment.enrollment_status,
            appAccessEnabled: Boolean(enrollment.app_access_enabled),
            student: {
                studentId: enrollment.student_id,
                studentCode: enrollment.student_code,
                studentName: enrollment.student_name,
                currentClass: enrollment.current_class,
                targetExam: enrollment.target_exam
            },
            batch: {
                batchId: enrollment.batch_id,
                batchName: enrollment.batch_name,
                batchCode: enrollment.batch_code,
                timings: enrollment.batch_start_time && enrollment.batch_end_time 
                    ? `${enrollment.batch_start_time.slice(0, 5)} - ${enrollment.batch_end_time.slice(0, 5)}`
                    : null,
                classroom: enrollment.classroom_name 
                    ? {
                        name: enrollment.classroom_name,
                        roomNumber: enrollment.classroom_room_number,
                        type: enrollment.classroom_type
                    } 
                    : null
            },
            academicYear: {
                academicYearId: enrollment.academic_year_id,
                name: enrollment.academic_year_name,
                startDate: enrollment.academic_year_start_date,
                endDate: enrollment.academic_year_end_date
            },
            level: {
                levelId: enrollment.level_id,
                name: enrollment.level_name,
                code: enrollment.level_code,
                duration: enrollment.level_duration
            },
            program: {
                programId: enrollment.program_id,
                name: enrollment.program_name,
                code: enrollment.program_code,
                duration: enrollment.program_duration
            },
            course: {
                courseId: enrollment.course_id,
                name: enrollment.course_name,
                code: enrollment.course_code,
                description: enrollment.course_description
            },
            branch: {
                branchId: enrollment.branch_id,
                name: enrollment.branch_name,
                code: enrollment.branch_code,
                city: enrollment.branch_city,
                address: enrollment.branch_address,
                phone: enrollment.branch_phone,
                email: enrollment.branch_email
            }
        };
    }

    /**
     * Get Student Enrolled Subjects
     */
    async getSubjects(tenantId, userId) {
        const enrollment = await appAcademicModel.getActiveEnrollmentByUserId(tenantId, userId);
        if (!enrollment) {
            const err = new Error('No active enrollment found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        let customIds = null;
        if (enrollment.custom_subject_ids) {
            try {
                customIds = typeof enrollment.custom_subject_ids === 'string' 
                    ? JSON.parse(enrollment.custom_subject_ids) 
                    : enrollment.custom_subject_ids;
            } catch (e) {
                customIds = null;
            }
        }

        const subjects = await appAcademicModel.getEnrolledSubjects(
            tenantId, 
            enrollment.level_id, 
            enrollment.bundle_id, 
            customIds
        );

        return {
            batchId: enrollment.batch_id,
            batchName: enrollment.batch_name,
            totalSubjects: subjects.length,
            subjects: subjects.map(s => ({
                subjectId: s.subject_id,
                subjectName: s.subject_name,
                subjectCode: s.subject_code,
                subjectType: s.subject_type || 'Core',
                description: s.description || null
            }))
        };
    }

    /**
     * Get Assigned Faculty for the Student's Batch
     */
    async getFaculty(tenantId, userId) {
        const enrollment = await appAcademicModel.getActiveEnrollmentByUserId(tenantId, userId);
        if (!enrollment) {
            const err = new Error('No active enrollment found for this student account.');
            err.statusCode = 404;
            throw err;
        }

        const facultyList = await appAcademicModel.getAssignedFacultyForBatch(tenantId, enrollment.batch_id);

        return {
            batchId: enrollment.batch_id,
            batchName: enrollment.batch_name,
            totalFaculty: facultyList.length,
            faculty: facultyList
        };
    }
}

module.exports = new AppAcademicService();
