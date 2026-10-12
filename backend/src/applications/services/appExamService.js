const appExamModel = require('../models/appExamModel');

const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
};

const formatDateStr = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

const formatDisplayDate = (d) => {
    if (!d) return null;
    const dateObj = new Date(d);
    return dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calculateGrade = (percentage) => {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};

class AppExamService {
    /**
     * Get upcoming scheduled exams for student's batch
     */
    async getUpcomingExams(tenantId, userId) {
        const studentContext = await appExamModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const rows = await appExamModel.getUpcomingExams(
            tenantId, 
            studentContext.student_id, 
            studentContext.batch_id
        );

        const exams = rows.map(r => {
            const files = parseJsonArray(r.attachments).map(f => {
                const filename = typeof f === 'string' ? f : (f.filename || f.fileName || f.name);
                return {
                    name: typeof f === 'object' ? (f.originalName || f.name || filename) : filename,
                    url: `/uploads/exams/${filename}`
                };
            });

            return {
                examId: r.exam_id,
                examTitle: r.exam_title,
                examType: r.exam_type || 'Unit Test',
                subject: {
                    subjectId: r.subject_id,
                    subjectName: r.subject_name,
                    subjectCode: r.subject_code,
                    subjectType: r.subject_type || 'Core'
                },
                examDate: formatDateStr(r.exam_date),
                examDateFormatted: formatDisplayDate(r.exam_date),
                timings: r.start_time && r.end_time ? `${r.start_time.slice(0, 5)} - ${r.end_time.slice(0, 5)}` : null,
                maxMarks: Number(r.max_marks) || 0,
                passingMarks: Number(r.passing_marks) || 0,
                syllabus: r.syllabus_and_instructions || '',
                attachments: files,
                status: r.exam_status
            };
        });

        return {
            studentId: studentContext.student_id,
            batchId: studentContext.batch_id,
            batchName: studentContext.batch_name,
            totalUpcomingExams: exams.length,
            exams
        };
    }

    /**
     * Get completed exam results
     */
    async getExamResults(tenantId, userId, query = {}) {
        const studentContext = await appExamModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const page = Math.max(1, Number(query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

        const { rows, total } = await appExamModel.getExamResults(
            tenantId, 
            studentContext.student_id, 
            {
                ...query,
                page,
                limit
            }
        );

        let totalMarksSum = 0;
        let obtainedMarksSum = 0;
        let passedCount = 0;
        let failedCount = 0;

        const results = rows.map(r => {
            const isAbsent = Boolean(r.is_absent);
            const marksObtained = isAbsent ? 0 : (r.marks_obtained !== null ? Number(r.marks_obtained) : 0);
            const maxMarks = Number(r.max_marks) || 0;
            const passingMarks = Number(r.passing_marks) || 0;

            let percentage = 0;
            let resultStatus = 'Pending';
            let grade = r.grade || 'A';

            if (isAbsent) {
                resultStatus = 'Absent';
                grade = 'AB';
                failedCount += 1;
            } else if (maxMarks > 0) {
                percentage = Number(((marksObtained / maxMarks) * 100).toFixed(1));
                if (passingMarks > 0) {
                    resultStatus = marksObtained >= passingMarks ? 'Passed' : 'Failed';
                } else {
                    resultStatus = percentage >= 40 ? 'Passed' : 'Failed';
                }

                if (resultStatus === 'Passed') passedCount += 1;
                else failedCount += 1;

                if (!r.grade) {
                    grade = calculateGrade(percentage);
                }

                totalMarksSum += maxMarks;
                obtainedMarksSum += marksObtained;
            }

            return {
                resultId: r.marks_id,
                examId: r.exam_id,
                examTitle: r.exam_title,
                examType: r.exam_type || 'Unit Test',
                examDate: formatDateStr(r.exam_date),
                examDateFormatted: formatDisplayDate(r.exam_date),
                subject: {
                    subjectId: r.subject_id,
                    subjectName: r.subject_name,
                    subjectCode: r.subject_code,
                    subjectType: r.subject_type || 'Core'
                },
                marksObtained: isAbsent ? 0 : marksObtained,
                maxMarks,
                passingMarks,
                percentage,
                grade,
                resultStatus,
                isAbsent,
                teacherRemarks: r.teacher_remarks || null
            };
        });

        const overallPercentage = totalMarksSum > 0 ? Number(((obtainedMarksSum / totalMarksSum) * 100).toFixed(1)) : 0.0;
        const totalPages = Math.ceil(total / limit) || 1;

        return {
            studentId: studentContext.student_id,
            summary: {
                totalExams: total,
                passedCount,
                failedCount,
                overallPercentage,
                overallGrade: calculateGrade(overallPercentage)
            },
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            results
        };
    }

    /**
     * Get detailed result breakdown for a specific exam
     */
    async getExamResultDetails(tenantId, userId, examId) {
        const studentContext = await appExamModel.getStudentContext(tenantId, userId);
        if (!studentContext) {
            const err = new Error('No active student enrollment found for this account.');
            err.statusCode = 404;
            throw err;
        }

        const r = await appExamModel.getExamResultDetails(
            tenantId, 
            studentContext.student_id, 
            examId
        );

        if (!r) {
            const err = new Error('Exam result not found or has not been published yet.');
            err.statusCode = 404;
            throw err;
        }

        const isAbsent = Boolean(r.is_absent);
        const marksObtained = isAbsent ? 0 : (r.marks_obtained !== null ? Number(r.marks_obtained) : 0);
        const maxMarks = Number(r.max_marks) || 0;
        const passingMarks = Number(r.passing_marks) || 0;

        let percentage = 0;
        let resultStatus = 'Pending';
        let grade = r.grade || 'A';

        if (isAbsent) {
            resultStatus = 'Absent';
            grade = 'AB';
        } else if (maxMarks > 0) {
            percentage = Number(((marksObtained / maxMarks) * 100).toFixed(1));
            if (passingMarks > 0) {
                resultStatus = marksObtained >= passingMarks ? 'Passed' : 'Failed';
            } else {
                resultStatus = percentage >= 40 ? 'Passed' : 'Failed';
            }

            if (!r.grade) {
                grade = calculateGrade(percentage);
            }
        }

        const files = parseJsonArray(r.exam_files).map(f => {
            const filename = typeof f === 'string' ? f : (f.filename || f.fileName || f.name);
            return {
                name: typeof f === 'object' ? (f.originalName || f.name || filename) : filename,
                url: `/uploads/exams/${filename}`
            };
        });

        const teacherName = [r.teacher_first_name, r.teacher_last_name].filter(Boolean).join(' ') || r.evaluated_by_name || 'Faculty';

        return {
            resultId: r.marks_id,
            examId: r.exam_id,
            examTitle: r.exam_title,
            examType: r.exam_type || 'Unit Test',
            examDate: formatDateStr(r.exam_date),
            examDateFormatted: formatDisplayDate(r.exam_date),
            timings: r.start_time && r.end_time ? `${r.start_time.slice(0, 5)} - ${r.end_time.slice(0, 5)}` : null,
            subject: {
                subjectId: r.subject_id,
                subjectName: r.subject_name,
                subjectCode: r.subject_code,
                subjectType: r.subject_type || 'Core'
            },
            scoreCard: {
                marksObtained: isAbsent ? 0 : marksObtained,
                maxMarks,
                passingMarks,
                percentage,
                grade,
                resultStatus,
                isAbsent
            },
            evaluation: {
                teacherRemarks: r.teacher_remarks || 'Satisfactory performance.',
                evaluatedBy: teacherName,
                evaluatedAt: r.evaluated_at
            },
            syllabus: r.exam_description || '',
            attachments: files
        };
    }
}

module.exports = new AppExamService();
