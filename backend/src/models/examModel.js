const pool = require('../config/db');

let tablesChecked = false;

/**
 * Ensures required examination tables exist in the database.
 */
const ensureTablesExist = async () => {
    if (tablesChecked) return;
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`exams\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`branch_id\` INT NULL,
                \`academic_year_id\` INT NULL,
                \`course_id\` INT NULL,
                \`subject_id\` INT NULL,
                \`batch_id\` INT NULL,
                \`title\` VARCHAR(255) NOT NULL,
                \`exam_type\` ENUM(
                    'Daily Test',
                    'Weekly Test',
                    'Fortnightly Test',
                    'Monthly Test',
                    'Unit Test',
                    'Chapter Test',
                    'Mock Test',
                    'Term Exam',
                    'Final Exam',
                    'Assignment',
                    'Internal Assessment',
                    'Other'
                ) NOT NULL DEFAULT 'Weekly Test',
                \`exam_date\` DATE NULL,
                \`start_time\` TIME NULL,
                \`end_time\` TIME NULL,
                \`duration\` VARCHAR(50) NULL DEFAULT '60 mins',
                \`total_marks\` DECIMAL(6,2) NOT NULL DEFAULT 100.00,
                \`passing_marks\` DECIMAL(6,2) NOT NULL DEFAULT 40.00,
                \`class_average\` VARCHAR(20) DEFAULT 'TBD',
                \`status\` ENUM(
                    'Draft',
                    'Scheduled',
                    'In Progress',
                    'Completed',
                    'Marks Pending',
                    'Marks Published',
                    'Cancelled'
                ) NOT NULL DEFAULT 'Scheduled',
                \`instructions\` TEXT NULL,
                \`created_by\` INT NULL,
                \`updated_by\` INT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` TIMESTAMP NULL,
                INDEX \`idx_exams_tenant_branch\` (\`tenant_id\`, \`branch_id\`),
                INDEX \`idx_exams_tenant_batch\` (\`tenant_id\`, \`batch_id\`),
                INDEX \`idx_exams_tenant_status\` (\`tenant_id\`, \`status\`),
                INDEX \`idx_exams_date\` (\`exam_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`exam_marks\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`exam_id\` INT NOT NULL,
                \`student_id\` INT NOT NULL,
                \`marks_obtained\` DECIMAL(6,2) NULL,
                \`is_absent\` TINYINT(1) NOT NULL DEFAULT 0,
                \`is_passed\` TINYINT(1) DEFAULT NULL,
                \`percentage\` DECIMAL(5,2) NULL,
                \`grade\` VARCHAR(10) NULL,
                \`remarks\` VARCHAR(255) NULL,
                \`created_by\` INT NULL,
                \`updated_by\` INT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE KEY \`uk_exam_student\` (\`exam_id\`, \`student_id\`),
                INDEX \`idx_marks_tenant_student\` (\`tenant_id\`, \`student_id\`),
                INDEX \`idx_marks_exam_passed\` (\`exam_id\`, \`is_passed\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`exam_marks_audit\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`exam_id\` INT NOT NULL,
                \`student_id\` INT NOT NULL,
                \`old_marks\` DECIMAL(6,2) NULL,
                \`new_marks\` DECIMAL(6,2) NULL,
                \`changed_by\` INT NULL,
                \`change_reason\` VARCHAR(255) NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_audit_exam_student\` (\`exam_id\`, \`student_id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
        tablesChecked = true;
    } catch (err) {
        console.warn('Exam tables check warning (will retry on next request):', err.message);
    }
};

const calculateGrade = (percentage) => {
    if (percentage === null || percentage === undefined || isNaN(percentage)) return 'N/A';
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    return 'F';
};

const examModel = {
    ensureTablesExist,

    /**
     * List examinations with filtering and role scoping.
     */
    async getExams(tenantId, filters = {}, accessContext = null) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const {
            branchId,
            batchId,
            courseId,
            subjectId,
            status,
            examType,
            search = '',
            page = 1,
            limit = 50
        } = filters;

        let whereClause = `WHERE e.tenant_id = ? AND e.deleted_at IS NULL`;
        const params = [tid];

        // Scoping
        if (accessContext && accessContext.scope === 'BRANCH') {
            whereClause += ` AND (e.branch_id = ? OR e.branch_id IS NULL)`;
            params.push(accessContext.authorizedBranchId);
        } else if (accessContext && accessContext.scope === 'TEACHER') {
            if (accessContext.assignedBatchIds && accessContext.assignedBatchIds.length > 0) {
                whereClause += ` AND e.batch_id IN (?)`;
                params.push(accessContext.assignedBatchIds);
            } else {
                whereClause += ` AND 1 = 0`;
            }
        } else if (branchId && branchId !== 'All') {
            whereClause += ` AND e.branch_id = ?`;
            params.push(Number(branchId));
        }

        if (batchId && batchId !== 'All') {
            if (typeof batchId === 'number' || !isNaN(Number(batchId))) {
                whereClause += ` AND e.batch_id = ?`;
                params.push(Number(batchId));
            } else {
                whereClause += ` AND b.name = ?`;
                params.push(batchId);
            }
        }

        if (subjectId && subjectId !== 'All') {
            if (typeof subjectId === 'number' || !isNaN(Number(subjectId))) {
                whereClause += ` AND e.subject_id = ?`;
                params.push(Number(subjectId));
            } else {
                whereClause += ` AND s.name = ?`;
                params.push(subjectId);
            }
        }

        if (courseId && courseId !== 'All') {
            whereClause += ` AND e.course_id = ?`;
            params.push(Number(courseId));
        }

        if (status && status !== 'All') {
            whereClause += ` AND e.status = ?`;
            params.push(status);
        }

        if (examType && examType !== 'All') {
            whereClause += ` AND e.exam_type = ?`;
            params.push(examType);
        }

        if (search && search.trim()) {
            const term = `%${search.trim()}%`;
            whereClause += ` AND (e.title LIKE ? OR b.name LIKE ? OR s.name LIKE ?)`;
            params.push(term, term, term);
        }

        const offset = (Math.max(1, Number(page)) - 1) * Number(limit);

        const sql = `
            SELECT 
                e.id,
                e.tenant_id,
                e.branch_id,
                br.name AS branch_name,
                e.academic_year_id,
                e.course_id,
                c.name AS course_name,
                e.subject_id,
                s.name AS subject_name,
                s.code AS subject_code,
                e.batch_id,
                b.name AS batch_name,
                b.code AS batch_code,
                e.title AS name,
                e.title,
                e.exam_type AS type,
                e.exam_type,
                DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS examDate,
                DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS exam_date,
                TIME_FORMAT(e.start_time, '%H:%i') AS startTime,
                TIME_FORMAT(e.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(e.end_time, '%H:%i') AS end_time,
                COALESCE(e.duration, '60 mins') AS duration,
                CAST(e.total_marks AS DOUBLE) AS totalMarks,
                CAST(e.total_marks AS DOUBLE) AS total_marks,
                CAST(e.passing_marks AS DOUBLE) AS passingMarks,
                CAST(e.passing_marks AS DOUBLE) AS passing_marks,
                COALESCE(e.class_average, 'TBD') AS average,
                e.class_average,
                e.status,
                e.instructions,
                e.created_at,
                COALESCE(em_stats.marked_count, 0) AS marks_entered_count,
                COALESCE(se_stats.total_students, 0) AS total_students_count
            FROM exams e
            LEFT JOIN batches b ON e.batch_id = b.id
            LEFT JOIN branches br ON e.branch_id = br.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN courses c ON e.course_id = c.id
            LEFT JOIN (
                SELECT exam_id, COUNT(*) AS marked_count 
                FROM exam_marks 
                WHERE marks_obtained IS NOT NULL 
                GROUP BY exam_id
            ) em_stats ON em_stats.exam_id = e.id
            LEFT JOIN (
                SELECT batch_id, COUNT(DISTINCT student_id) AS total_students 
                FROM student_enrollments 
                WHERE status = 'active' AND deleted_at IS NULL
                GROUP BY batch_id
            ) se_stats ON se_stats.batch_id = e.batch_id
            ${whereClause}
            ORDER BY e.exam_date DESC, e.id DESC
            LIMIT ? OFFSET ?
        `;

        params.push(Number(limit), Number(offset));
        const [rows] = await pool.query(sql, params);

        return rows.map(r => ({
            ...r,
            id: String(r.id),
            rawId: r.id,
            subject: r.subject_name || 'General',
            batch: r.batch_name || 'All Batches',
            branch: r.branch_name || 'All Branches',
            course: r.course_name || 'All Courses',
            name: r.name || r.title
        }));
    },

    /**
     * Get a single exam by ID with attached student marks dictionary.
     */
    async getExamById(tenantId, examId, accessContext = null) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);

        const [rows] = await pool.query(`
            SELECT 
                e.*,
                br.name AS branch_name,
                b.name AS batch_name,
                s.name AS subject_name,
                c.name AS course_name,
                DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS examDate,
                TIME_FORMAT(e.start_time, '%H:%i') AS startTime,
                CAST(e.total_marks AS DOUBLE) AS totalMarks,
                CAST(e.passing_marks AS DOUBLE) AS passingMarks
            FROM exams e
            LEFT JOIN batches b ON e.batch_id = b.id
            LEFT JOIN branches br ON e.branch_id = br.id
            LEFT JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN courses c ON e.course_id = c.id
            WHERE e.id = ? AND e.tenant_id = ? AND e.deleted_at IS NULL
        `, [eid, tid]);

        if (!rows.length) return null;
        const exam = rows[0];

        // Fetch marks mapping
        const [marksRows] = await pool.query(`
            SELECT em.student_id, em.marks_obtained, em.is_absent, em.is_passed, em.percentage, em.grade, em.remarks,
                   st.student_code, st.full_name
            FROM exam_marks em
            JOIN students st ON em.student_id = st.id
            WHERE em.exam_id = ? AND em.tenant_id = ?
        `, [eid, tid]);

        const studentMarks = {};
        marksRows.forEach(m => {
            const key = m.student_code || String(m.student_id);
            studentMarks[key] = m.marks_obtained !== null ? Number(m.marks_obtained) : null;
        });

        return {
            ...exam,
            id: String(exam.id),
            name: exam.title,
            type: exam.exam_type,
            subject: exam.subject_name || 'General',
            batch: exam.batch_name || 'All Batches',
            branch: exam.branch_name || 'All Branches',
            course: exam.course_name || 'All Courses',
            studentMarks,
            marksList: marksRows
        };
    },

    /**
     * Create a new Exam.
     */
    async createExam(tenantId, payload, userId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const uid = Number(userId || 1);

        let {
            title,
            name,
            examType,
            type,
            branchId,
            branchName,
            batchId,
            batchName,
            subjectId,
            subjectName,
            courseId,
            academicYearId,
            examDate,
            startTime,
            endTime,
            duration,
            totalMarks = 100,
            passingMarks = 40,
            status = 'Scheduled',
            instructions = null
        } = payload;

        const examTitle = title || name;
        if (!examTitle || !examTitle.trim()) {
            throw new Error('Exam title or name is required');
        }

        // Auto-resolve batchId if string name passed
        let resolvedBatchId = batchId ? Number(batchId) : null;
        let resolvedBranchId = branchId ? Number(branchId) : null;
        let resolvedSubjectId = subjectId ? Number(subjectId) : null;

        if (!resolvedBatchId && (batchName || payload.batch)) {
            const targetBatchName = batchName || payload.batch;
            const [bRows] = await pool.query(
                `SELECT id, branch_id FROM batches WHERE tenant_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1`,
                [tid, targetBatchName]
            );
            if (bRows.length) {
                resolvedBatchId = bRows[0].id;
                if (!resolvedBranchId) resolvedBranchId = bRows[0].branch_id;
            }
        }

        if (!resolvedSubjectId && (subjectName || payload.subject)) {
            const targetSub = subjectName || payload.subject;
            const [sRows] = await pool.query(
                `SELECT id FROM subjects WHERE tenant_id = ? AND name = ? AND deleted_at IS NULL LIMIT 1`,
                [tid, targetSub]
            );
            if (sRows.length) resolvedSubjectId = sRows[0].id;
        }

        const validTypes = [
            'Daily Test', 'Weekly Test', 'Fortnightly Test', 'Monthly Test',
            'Unit Test', 'Chapter Test', 'Mock Test', 'Term Exam',
            'Final Exam', 'Assignment', 'Internal Assessment', 'Other'
        ];
        const chosenType = examType || type || 'Weekly Test';
        const finalType = validTypes.includes(chosenType) ? chosenType : 'Weekly Test';

        const numTotalMarks = Math.max(1, Number(totalMarks) || 100);
        const numPassingMarks = Math.min(numTotalMarks, Math.max(0, Number(passingMarks) || 40));

        const [result] = await pool.query(`
            INSERT INTO exams (
                tenant_id, branch_id, academic_year_id, course_id, subject_id, batch_id,
                title, exam_type, exam_date, start_time, end_time, duration,
                total_marks, passing_marks, class_average, status, instructions,
                created_by, updated_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tid,
            resolvedBranchId,
            academicYearId ? Number(academicYearId) : null,
            courseId ? Number(courseId) : null,
            resolvedSubjectId,
            resolvedBatchId,
            examTitle.trim(),
            finalType,
            examDate || null,
            startTime || null,
            endTime || null,
            duration || '60 mins',
            numTotalMarks,
            numPassingMarks,
            'TBD',
            status || 'Scheduled',
            instructions,
            uid,
            uid
        ]);

        return this.getExamById(tid, result.insertId);
    },

    /**
     * Update an existing exam.
     */
    async updateExam(tenantId, examId, payload, userId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);
        const uid = Number(userId || 1);

        const current = await this.getExamById(tid, eid);
        if (!current) throw new Error('Exam not found');

        const updates = [];
        const params = [];

        if (payload.title || payload.name) {
            updates.push('title = ?');
            params.push((payload.title || payload.name).trim());
        }
        if (payload.examType || payload.type) {
            updates.push('exam_type = ?');
            params.push(payload.examType || payload.type);
        }
        if (payload.examDate !== undefined) {
            updates.push('exam_date = ?');
            params.push(payload.examDate || null);
        }
        if (payload.startTime !== undefined) {
            updates.push('start_time = ?');
            params.push(payload.startTime || null);
        }
        if (payload.duration !== undefined) {
            updates.push('duration = ?');
            params.push(payload.duration || null);
        }
        if (payload.totalMarks !== undefined) {
            updates.push('total_marks = ?');
            params.push(Number(payload.totalMarks));
        }
        if (payload.passingMarks !== undefined) {
            updates.push('passing_marks = ?');
            params.push(Number(payload.passingMarks));
        }
        if (payload.status) {
            updates.push('status = ?');
            params.push(payload.status);
        }
        if (payload.instructions !== undefined) {
            updates.push('instructions = ?');
            params.push(payload.instructions);
        }

        if (updates.length > 0) {
            updates.push('updated_by = ?');
            params.push(uid);
            params.push(eid, tid);
            await pool.query(
                `UPDATE exams SET ${updates.join(', ')} WHERE id = ? AND tenant_id = ?`,
                params
            );
        }

        return this.getExamById(tid, eid);
    },

    /**
     * Soft delete an exam.
     */
    async deleteExam(tenantId, examId, userId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);
        const uid = Number(userId || 1);

        const [res] = await pool.query(
            `UPDATE exams SET deleted_at = NOW(), updated_by = ? WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL`,
            [uid, eid, tid]
        );
        return res.affectedRows > 0;
    },

    /**
     * Fetch student roster for an exam's batch, including any entered marks.
     */
    async getExamRoster(tenantId, examId, accessContext = null) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);

        const exam = await this.getExamById(tid, eid);
        if (!exam) throw new Error('Exam not found');

        let batchFilter = '';
        const params = [tid];

        if (exam.batch_id) {
            batchFilter = ' AND se.batch_id = ?';
            params.push(exam.batch_id);
        } else if (exam.batch && exam.batch !== 'All Batches') {
            batchFilter = ' AND bat.name = ?';
            params.push(exam.batch);
        }

        // Query active students enrolled in this batch
        const [students] = await pool.query(`
            SELECT 
                st.id AS studentId,
                st.student_code AS studentCode,
                st.full_name AS studentName,
                st.full_name AS name,
                st.mobile,
                st.parent_phone AS parentMobile,
                DATE_FORMAT(st.admission_date, '%Y-%m-%d') AS admissionDate,
                br.name AS branchName,
                c.name AS courseName,
                bat.name AS batchName,
                em.marks_obtained AS marksObtained,
                em.is_absent AS isAbsent,
                em.is_passed AS isPassed,
                em.percentage,
                em.grade,
                em.remarks
            FROM student_enrollments se
            JOIN students st ON se.student_id = st.id AND st.tenant_id = se.tenant_id AND st.deleted_at IS NULL
            LEFT JOIN branches br ON se.branch_id = br.id
            LEFT JOIN batches bat ON se.batch_id = bat.id
            LEFT JOIN courses c ON se.course_id = c.id
            LEFT JOIN exam_marks em ON em.exam_id = ? AND em.student_id = st.id AND em.tenant_id = ?
            WHERE se.tenant_id = ? AND se.status = 'active' AND se.deleted_at IS NULL
            ${batchFilter}
            ORDER BY st.full_name ASC
        `, [eid, tid, ...params]);

        return {
            exam,
            roster: students.map(s => {
                const marksVal = s.marksObtained !== null && s.marksObtained !== undefined ? Number(s.marksObtained) : null;
                const isPassed = marksVal !== null ? (marksVal >= exam.passing_marks) : null;
                const pct = marksVal !== null ? Number(((marksVal / exam.total_marks) * 100).toFixed(1)) : null;

                return {
                    studentId: String(s.studentId),
                    rawStudentId: s.studentId,
                    studentCode: s.studentCode || `STU-${s.studentId}`,
                    name: s.studentName,
                    mobile: s.mobile || '',
                    parentMobile: s.parentMobile || '',
                    admissionDate: s.admissionDate || '',
                    branch: s.branchName || exam.branch_name || '',
                    course: s.courseName || exam.course_name || '',
                    batch: s.batchName || exam.batch_name || '',
                    marksObtained: marksVal,
                    isAbsent: Boolean(s.isAbsent),
                    isPassed,
                    percentage: pct,
                    grade: s.grade || calculateGrade(pct),
                    status: marksVal !== null ? (isPassed ? 'Passed' : 'Failed') : (s.isAbsent ? 'Absent' : 'TBD'),
                    remarks: s.remarks || ''
                };
            })
        };
    },

    /**
     * Save/Grade marks for students in an exam.
     */
    async saveExamMarks(tenantId, examId, marksPayload, options = {}, userId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);
        const uid = Number(userId || 1);
        const { publish = false, changeReason = 'Grade submission' } = options;

        const exam = await this.getExamById(tid, eid);
        if (!exam) throw new Error('Exam not found');

        const connection = await pool.getConnection();
        try {
            await connection.beginTransaction();

            // Normalize payload to array of { studentId, marksObtained, isAbsent, remarks }
            let entries = [];
            if (Array.isArray(marksPayload)) {
                entries = marksPayload;
            } else if (typeof marksPayload === 'object' && marksPayload !== null) {
                // Key-value map: { [studentIdOrCode]: score }
                for (const [key, val] of Object.entries(marksPayload)) {
                    entries.push({
                        studentIdentifier: key,
                        marksObtained: val !== '' && val !== null && val !== undefined ? Number(val) : null,
                        isAbsent: false
                    });
                }
            }

            let validMarksCount = 0;
            let sumMarks = 0;

            for (const item of entries) {
                let resolvedStudentId = item.studentId ? Number(item.studentId) : null;

                if (!resolvedStudentId && item.studentIdentifier) {
                    // Try numeric or student_code lookup
                    if (!isNaN(Number(item.studentIdentifier))) {
                        resolvedStudentId = Number(item.studentIdentifier);
                    } else {
                        const [st] = await connection.query(
                            `SELECT id FROM students WHERE tenant_id = ? AND student_code = ? LIMIT 1`,
                            [tid, item.studentIdentifier]
                        );
                        if (st.length) resolvedStudentId = st[0].id;
                    }
                }

                if (!resolvedStudentId) continue;

                let score = item.marksObtained !== null && item.marksObtained !== undefined && !isNaN(Number(item.marksObtained))
                    ? Number(item.marksObtained)
                    : null;

                const isAbsent = Boolean(item.isAbsent);

                // Validation against max marks
                if (score !== null) {
                    if (score > exam.total_marks) score = exam.total_marks;
                    if (score < 0) score = 0;
                }

                const pct = score !== null ? Number(((score / exam.total_marks) * 100).toFixed(2)) : null;
                const isPassed = score !== null ? (score >= exam.passing_marks ? 1 : 0) : null;
                const grade = calculateGrade(pct);

                // Audit trail check
                const [existing] = await connection.query(
                    `SELECT id, marks_obtained FROM exam_marks WHERE exam_id = ? AND student_id = ?`,
                    [eid, resolvedStudentId]
                );

                if (existing.length > 0) {
                    const oldMarks = existing[0].marks_obtained;
                    if (oldMarks !== score) {
                        await connection.query(`
                            INSERT INTO exam_marks_audit (tenant_id, exam_id, student_id, old_marks, new_marks, changed_by, change_reason)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [tid, eid, resolvedStudentId, oldMarks, score, uid, changeReason]);
                    }

                    await connection.query(`
                        UPDATE exam_marks 
                        SET marks_obtained = ?, is_absent = ?, is_passed = ?, percentage = ?, grade = ?, remarks = ?, updated_by = ?
                        WHERE id = ?
                    `, [score, isAbsent ? 1 : 0, isPassed, pct, grade, item.remarks || null, uid, existing[0].id]);
                } else {
                    await connection.query(`
                        INSERT INTO exam_marks (
                            tenant_id, exam_id, student_id, marks_obtained, is_absent, is_passed, percentage, grade, remarks, created_by, updated_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `, [tid, eid, resolvedStudentId, score, isAbsent ? 1 : 0, isPassed, pct, grade, item.remarks || null, uid, uid]);
                }

                if (score !== null && !isAbsent) {
                    sumMarks += score;
                    validMarksCount++;
                }
            }

            // Recalculate class average
            let classAverageStr = exam.class_average;
            if (validMarksCount > 0) {
                const avgPct = ((sumMarks / (validMarksCount * exam.total_marks)) * 100).toFixed(1);
                classAverageStr = `${avgPct}%`;
            }

            const newStatus = publish ? 'Marks Published' : (validMarksCount > 0 ? 'Marks Pending' : exam.status);

            await connection.query(`
                UPDATE exams 
                SET class_average = ?, status = ?, updated_by = ?
                WHERE id = ? AND tenant_id = ?
            `, [classAverageStr, newStatus, uid, eid, tid]);

            await connection.commit();
            return {
                examId: eid,
                savedCount: entries.length,
                gradedCount: validMarksCount,
                classAverage: classAverageStr,
                status: newStatus
            };
        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    },

    /**
     * Publish results for an exam.
     */
    async publishResults(tenantId, examId, userId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const eid = Number(examId);
        const uid = Number(userId || 1);

        await pool.query(
            `UPDATE exams SET status = 'Marks Published', updated_by = ? WHERE id = ? AND tenant_id = ?`,
            [uid, eid, tid]
        );
        return this.getExamById(tid, eid);
    },

    /**
     * Get Student Report Card across all examinations.
     */
    async getStudentReportCard(tenantId, studentId) {
        await ensureTablesExist();
        const tid = Number(tenantId);
        const sid = Number(studentId);

        const [results] = await pool.query(`
            SELECT 
                em.id AS mark_id,
                em.marks_obtained,
                em.is_absent,
                em.is_passed,
                em.percentage,
                em.grade,
                em.remarks,
                e.id AS exam_id,
                e.title AS exam_name,
                e.exam_type,
                DATE_FORMAT(e.exam_date, '%Y-%m-%d') AS exam_date,
                e.total_marks,
                e.passing_marks,
                e.class_average,
                s.name AS subject_name,
                s.code AS subject_code
            FROM exam_marks em
            JOIN exams e ON em.exam_id = e.id AND e.deleted_at IS NULL
            LEFT JOIN subjects s ON e.subject_id = s.id
            WHERE em.student_id = ? AND em.tenant_id = ? AND e.status = 'Marks Published'
            ORDER BY e.exam_date DESC
        `, [sid, tid]);

        const totalExams = results.length;
        let totalMarksEarned = 0;
        let totalMaxMarks = 0;
        let passedExams = 0;

        results.forEach(r => {
            if (r.marks_obtained !== null && !r.is_absent) {
                totalMarksEarned += Number(r.marks_obtained);
                totalMaxMarks += Number(r.total_marks);
                if (r.is_passed) passedExams++;
            }
        });

        const overallPercentage = totalMaxMarks > 0
            ? Number(((totalMarksEarned / totalMaxMarks) * 100).toFixed(2))
            : 0;

        return {
            studentId: sid,
            totalExams,
            passedExams,
            failedExams: totalExams - passedExams,
            overallPercentage,
            overallGrade: calculateGrade(overallPercentage),
            records: results
        };
    }
};

module.exports = examModel;

