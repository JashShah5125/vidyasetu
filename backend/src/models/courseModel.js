const pool = require('../config/db');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COURSE_WHERE = `c.deleted_at IS NULL AND c.tenant_id = ?`;

// Fetch the branch ids a course is offered in (from course_branches).
const getCourseBranchIds = async (courseId) => {
    const [rows] = await pool.query(
        `SELECT branch_id FROM course_branches WHERE course_id = ?`,
        [courseId]
    );
    return rows.map(row => row.branch_id);
};

// Fetch branches offered for many courses and group by course_id.
const getCoursesBranchMap = async (courseIds) => {
    if (courseIds.length === 0) return {};
    const placeholders = courseIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT cb.course_id, b.id, b.name
         FROM course_branches cb
         JOIN branches b ON cb.branch_id = b.id
         WHERE cb.course_id IN (${placeholders}) AND b.deleted_at IS NULL`,
        courseIds
    );
    const map = {};
    for (const row of rows) {
        if (!map[row.course_id]) map[row.course_id] = [];
        map[row.course_id].push({ id: row.id, name: row.name });
    }
    return map;
};

// Fetch programs offered for many courses and group by course_id.
const getCoursesProgramMap = async (courseIds) => {
    if (courseIds.length === 0) return {};
    const placeholders = courseIds.map(() => '?').join(',');
    const [rows] = await pool.query(
        `SELECT p.course_id, p.id, p.name
         FROM programs p
         WHERE p.course_id IN (${placeholders}) AND p.deleted_at IS NULL`,
        courseIds
    );
    const map = {};
    for (const row of rows) {
        if (!map[row.course_id]) map[row.course_id] = [];
        map[row.course_id].push({ id: row.id, name: row.name });
    }
    return map;
};

// ─── Read ─────────────────────────────────────────────────────────────────────

// Flat list of courses with total count for pagination.
const getCourses = async (tenantId, { search = '', branchId = null, status = 'all', limit = 10, offset = 0 } = {}) => {
    let where = COURSE_WHERE;
    const params = [tenantId];

    if (search) {
        where += ` AND (c.name LIKE ? OR c.code LIKE ?)`;
        const pattern = `%${search}%`;
        params.push(pattern, pattern);
    }
    if (status === 'active') {
        where += ` AND c.is_active = 1`;
    } else if (status === 'inactive') {
        where += ` AND c.is_active = 0`;
    }
    if (branchId) {
        where += ` AND EXISTS (
            SELECT 1 FROM course_branches cb2 WHERE cb2.course_id = c.id AND cb2.branch_id = ?
        )`;
        params.push(branchId);
    }

    const [rows] = await pool.query(
        `SELECT c.id, c.name, c.code, c.description, c.total_fee, c.fees, c.is_active,
                c.created_at, c.updated_at
         FROM courses c
         WHERE ${where}
         ORDER BY c.name ASC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), Number(offset)]
    );

    const [countRows] = await pool.query(
        `SELECT COUNT(*) AS total FROM courses c WHERE ${where}`,
        params
    );

    const courseIds = rows.map(r => r.id);
    const branchMap = await getCoursesBranchMap(courseIds);
    const programMap = await getCoursesProgramMap(courseIds);

    const data = rows.map(row => {
        const feeVal = row.fees !== null && row.fees !== undefined 
            ? Number(row.fees) 
            : (row.total_fee !== null && row.total_fee !== undefined ? Number(row.total_fee) : 0);
        return {
            ...row,
            id: String(row.id),
            is_active: !!row.is_active,
            total_fee: feeVal,
            fees: feeVal,
            branches: branchMap[row.id] || [],
            programs: programMap[row.id] || []
        };
    });

    return { data, total: countRows[0].total };
};

// Full nested course: course -> programs -> (levels -> subjects).
const getCourseByCode = async (tenantId, code) => {
    const [courseRows] = await pool.query(
        `SELECT c.* FROM courses c WHERE c.code = ? AND c.tenant_id = ? AND c.deleted_at IS NULL`,
        [code, tenantId]
    );
    const course = courseRows[0];
    if (!course) return null;

    const feeVal = course.fees !== null && course.fees !== undefined 
        ? Number(course.fees) 
        : (course.total_fee !== null && course.total_fee !== undefined ? Number(course.total_fee) : 0);

    course.id = String(course.id);
    course.is_active = !!course.is_active;
    course.total_fee = feeVal;
    course.fees = feeVal;
    course.branches = await getCourseBranchIds(course.id);
    course.programs = await getProgramsForCourse(course.id);

    return course;
};

const getProgramsForCourse = async (courseId) => {
    const [rows] = await pool.query(
        `SELECT id, name, code, duration, total_fee, down_payment, installment_months, is_active FROM programs
         WHERE course_id = ? AND deleted_at IS NULL
         ORDER BY id ASC`,
        [courseId]
    );

    const programs = rows.map(row => {
        const totalFee = row.total_fee !== null && row.total_fee !== undefined ? Number(row.total_fee) : 0;
        const downPayment = row.down_payment !== null && row.down_payment !== undefined ? Number(row.down_payment) : 0;
        const installmentMonths = row.installment_months !== null && row.installment_months !== undefined ? Number(row.installment_months) : 0;
        return {
            id: String(row.id),
            name: row.name,
            code: row.code,
            duration: row.duration,
            total_fee: totalFee,
            totalFees: totalFee,
            down_payment: downPayment,
            downPayment: downPayment,
            installment_months: installmentMonths,
            months: installmentMonths,
            is_active: !!row.is_active,
            levels: []
        };
    });

    if (programs.length === 0) return programs;

    const placeholders = programs.map(() => '?').join(',');
    const programIds = programs.map(p => Number(p.id));
    const [levelRows] = await pool.query(
        `SELECT id, program_id, name, code, duration FROM levels
         WHERE program_id IN (${placeholders}) AND deleted_at IS NULL
         ORDER BY id ASC`,
        programIds
    );

    const levelsById = new Map();
    for (const row of levelRows) {
        levelsById.set(row.id, {
            id: String(row.id),
            name: row.name,
            code: row.code,
            duration: row.duration
        });
    }

    // Batch load subject ids per level.
    let subjectMap = {};
    if (levelRows.length > 0) {
        const levelPlaceholders = levelRows.map(() => '?').join(',');
        const levelIds = levelRows.map(l => l.id);
        const [subjectRows] = await pool.query(
            `SELECT ls.level_id, s.id, s.name AS subject_name, s.code AS subject_code
             FROM level_subjects ls
             JOIN subjects s ON ls.subject_id = s.id
             WHERE ls.level_id IN (${levelPlaceholders}) AND s.deleted_at IS NULL`,
            levelIds
        );
        subjectMap = {};
        for (const row of subjectRows) {
            if (!subjectMap[row.level_id]) subjectMap[row.level_id] = [];
            subjectMap[row.level_id].push({
                id: String(row.id),
                name: row.subject_name,
                code: row.subject_code
            });
        }
    }

    const programMap = new Map(programs.map(p => [Number(p.id), p]));
    for (const row of levelRows) {
        const program = programMap.get(row.program_id);
        if (program) {
            program.levels.push({
                ...levelsById.get(row.id),
                subjects: subjectMap[row.id] || []
            });
        }
    }

    return programs;
};

// ─── Mutations ────────────────────────────────────────────────────────────────

// Replace the offered branches of a course (only the ones that exist).
const syncCourseBranches = async (conn, courseId, branchIds = []) => {
    await conn.query('DELETE FROM course_branches WHERE course_id = ?', [courseId]);
    const unique = [...new Set((branchIds || []).map(Number).filter(Boolean))];
    if (unique.length === 0) return;
    for (const branchId of unique) {
        await conn.query(
            'INSERT IGNORE INTO course_branches (course_id, branch_id) VALUES (?, ?)',
            [courseId, branchId]
        );
    }
};

const createCourse = async (tenantId, data, userId) => {
    const { name, code, description, is_active = true, branches = [], programs = [] } = data;
    const courseFee = data.fees !== undefined && data.fees !== null && data.fees !== ''
        ? Number(data.fees)
        : (data.total_fee !== undefined && data.total_fee !== null && data.total_fee !== '' ? Number(data.total_fee) : null);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [existing] = await conn.query(
            `SELECT id, name, code FROM courses WHERE tenant_id = ? AND (LOWER(code) = LOWER(?) OR LOWER(name) = LOWER(?)) AND deleted_at IS NULL`,
            [tenantId, (code || '').trim(), (name || '').trim()]
        );
        if (existing.length > 0) {
            const isCodeDup = existing.some(e => e.code.toLowerCase() === (code || '').trim().toLowerCase());
            const err = new Error(isCodeDup ? `Course code "${code}" is already in use.` : `Course name "${name}" already exists.`);
            err.statusCode = 409;
            throw err;
        }

        const [insert] = await conn.query(
            `INSERT INTO courses (tenant_id, name, code, description, total_fee, fees, is_active, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, name, code, description, courseFee, courseFee, is_active ? 1 : 0, userId, userId]
        );
        const courseId = insert.insertId;

        await syncCourseBranches(conn, courseId, branches);
        await insertPrograms(conn, courseId, tenantId, programs, userId, courseFee);

        await conn.commit();
        return { id: String(courseId) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const updateCourse = async (tenantId, code, data, userId) => {
    const { name, description, is_active = true, branches, programs } = data;
    const courseFee = data.fees !== undefined
        ? (data.fees !== null && data.fees !== '' ? Number(data.fees) : null)
        : (data.total_fee !== undefined ? (data.total_fee !== null && data.total_fee !== '' ? Number(data.total_fee) : null) : undefined);

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT id FROM courses WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL FOR UPDATE`,
            [code, tenantId]
        );
        const courseId = rows[0]?.id;
        if (!courseId) {
            await conn.rollback();
            return null;
        }

        if (name) {
            const [existing] = await conn.query(
                `SELECT id FROM courses WHERE tenant_id = ? AND id != ? AND LOWER(name) = LOWER(?) AND deleted_at IS NULL`,
                [tenantId, courseId, name.trim()]
            );
            if (existing.length > 0) {
                const err = new Error(`Course name "${name}" already exists for another course.`);
                err.statusCode = 409;
                throw err;
            }
        }

        if (courseFee !== undefined) {
            await conn.query(
                `UPDATE courses SET name = ?, description = ?, total_fee = ?, fees = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [name, description, courseFee, courseFee, is_active ? 1 : 0, userId, courseId]
            );
        } else {
            await conn.query(
                `UPDATE courses SET name = ?, description = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ?`,
                [name, description, is_active ? 1 : 0, userId, courseId]
            );
        }

        if (branches !== undefined) {
            await syncCourseBranches(conn, courseId, branches);
        }

        if (programs !== undefined) {
            // Replace all programs (and their levels) with the submitted set.
            // Removed programs/levels are soft-deleted.
            const [existingPrograms] = await conn.query(
                `SELECT id FROM programs WHERE course_id = ? AND deleted_at IS NULL`,
                [courseId]
            );
            const existingIds = existingPrograms.map(r => r.id);
            const submittedIds = programs.map(p => p.id).filter(Boolean).map(Number);

            // Soft-delete programs not in the payload, plus their levels.
            const removedIds = existingIds.filter(id => !submittedIds.includes(id));
            for (const removedId of removedIds) {
                await conn.query(
                    `UPDATE levels SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?
                     WHERE program_id = ? AND deleted_at IS NULL`,
                    [userId, removedId]
                );
                await conn.query(
                    `UPDATE programs SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                     WHERE id = ? AND deleted_at IS NULL`,
                    [userId, removedId]
                );
            }

            // Upsert the submitted programs.
            for (const program of programs) {
                let programId = Number(program.id);
                const pTotalFee = program.total_fee !== undefined && program.total_fee !== null && program.total_fee !== ''
                    ? Number(program.total_fee)
                    : (program.totalFees !== undefined && program.totalFees !== null && program.totalFees !== ''
                        ? Number(program.totalFees)
                        : (courseFee !== undefined && courseFee !== null ? Number(courseFee) : null));

                const pDownPayment = program.down_payment !== undefined && program.down_payment !== null && program.down_payment !== ''
                    ? Number(program.down_payment)
                    : (program.downPayment !== undefined && program.downPayment !== null && program.downPayment !== ''
                        ? Number(program.downPayment)
                        : null);

                const pInstallmentMonths = program.installment_months !== undefined && program.installment_months !== null && program.installment_months !== ''
                    ? Number(program.installment_months)
                    : (program.months !== undefined && program.months !== null && program.months !== ''
                        ? Number(program.months)
                        : null);

                if (programId && existingIds.includes(programId)) {
                    await conn.query(
                        `UPDATE programs SET name = ?, code = ?, duration = ?, total_fee = ?, down_payment = ?, installment_months = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                         WHERE id = ? AND deleted_at IS NULL`,
                        [program.name, program.code, program.duration, pTotalFee, pDownPayment, pInstallmentMonths, program.is_active ? 1 : 0, userId, programId]
                    );
                } else {
                    const [pInsert] = await conn.query(
                        `INSERT INTO programs (tenant_id, course_id, name, code, duration, total_fee, down_payment, installment_months, is_active, created_by, updated_by)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [tenantId, courseId, program.name, program.code, program.duration, pTotalFee, pDownPayment, pInstallmentMonths, program.is_active ? 1 : 0, userId, userId]
                    );
                    programId = pInsert.insertId;
                }
                await upsertProgramLevels(conn, programId, tenantId, program.levels || [], userId);
            }
        }

        await conn.commit();
        return { id: String(courseId) };
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

const syncLevelSubjects = async (conn, tenantId, levelId, subjects = []) => {
    await conn.query('DELETE FROM level_subjects WHERE level_id = ?', [levelId]);
    if (!subjects || subjects.length === 0) return;
    for (const sub of subjects) {
        const subjectId = Number(typeof sub === 'object' ? sub.id : sub);
        if (subjectId) {
            await conn.query(
                'INSERT IGNORE INTO level_subjects (tenant_id, level_id, subject_id) VALUES (?, ?, ?)',
                [tenantId, levelId, subjectId]
            );
        }
    }
};

const insertPrograms = async (conn, courseId, tenantId, programs, userId, defaultFee = null) => {
    for (const program of programs) {
        const pTotalFee = program.total_fee !== undefined && program.total_fee !== null && program.total_fee !== ''
            ? Number(program.total_fee)
            : (program.totalFees !== undefined && program.totalFees !== null && program.totalFees !== ''
                ? Number(program.totalFees)
                : (defaultFee !== null ? Number(defaultFee) : null));

        const pDownPayment = program.down_payment !== undefined && program.down_payment !== null && program.down_payment !== ''
            ? Number(program.down_payment)
            : (program.downPayment !== undefined && program.downPayment !== null && program.downPayment !== ''
                ? Number(program.downPayment)
                : null);

        const pInstallmentMonths = program.installment_months !== undefined && program.installment_months !== null && program.installment_months !== ''
            ? Number(program.installment_months)
            : (program.months !== undefined && program.months !== null && program.months !== ''
                ? Number(program.months)
                : null);

        const [pInsert] = await conn.query(
            `INSERT INTO programs (tenant_id, course_id, name, code, duration, total_fee, down_payment, installment_months, is_active, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [tenantId, courseId, program.name, program.code, program.duration, pTotalFee, pDownPayment, pInstallmentMonths, program.is_active ? 1 : 0, userId, userId]
        );
        const programId = pInsert.insertId;
        if (program.levels && program.levels.length > 0) {
            for (const level of program.levels) {
                const levelActive = level.is_active === undefined ? 1 : (level.is_active ? 1 : 0);
                const [lInsert] = await conn.query(
                    `INSERT INTO levels (tenant_id, course_id, program_id, name, code, duration, is_active, created_by, updated_by)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [tenantId, courseId, programId, level.name, level.code, level.duration, levelActive, userId, userId]
                );
                await syncLevelSubjects(conn, tenantId, lInsert.insertId, level.subjects);
            }
        }
    }
};

const upsertProgramLevels = async (conn, programId, tenantId, levels, userId) => {
    const [existingLevels] = await conn.query(
        `SELECT id FROM levels WHERE program_id = ? AND deleted_at IS NULL`,
        [programId]
    );
    const existingIds = existingLevels.map(r => r.id);
    const submittedIds = levels.map(l => l.id).filter(Boolean).map(Number);

    const removedIds = existingIds.filter(id => !submittedIds.includes(id));
    for (const removedId of removedIds) {
        await conn.query(
            `UPDATE levels SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [userId, removedId]
        );
    }

    for (const level of levels) {
        const levelId = Number(level.id);
        const courseId = await (async () => {
            const [rows] = await conn.query('SELECT course_id FROM programs WHERE id = ?', [programId]);
            return rows[0]?.course_id;
        })();
        const levelActive = level.is_active === undefined ? 1 : (level.is_active ? 1 : 0);
        let targetLevelId = levelId;
        if (levelId && existingIds.includes(levelId)) {
            await conn.query(
                `UPDATE levels SET name = ?, code = ?, duration = ?, is_active = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
                 WHERE id = ? AND deleted_at IS NULL`,
                [level.name, level.code, level.duration, levelActive, userId, levelId]
            );
        } else {
            const [lInsert] = await conn.query(
                `INSERT INTO levels (tenant_id, course_id, program_id, name, code, duration, is_active, created_by, updated_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [tenantId, courseId, programId, level.name, level.code, level.duration, levelActive, userId, userId]
            );
            targetLevelId = lInsert.insertId;
        }

        if (targetLevelId) {
            await syncLevelSubjects(conn, tenantId, targetLevelId, level.subjects);
        }
    }
};

// Soft-delete a course and, in cascade, all its non-deleted programs and their
// levels.
const deleteCourse = async (tenantId, code, userId) => {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const [rows] = await conn.query(
            `SELECT id FROM courses WHERE code = ? AND tenant_id = ? AND deleted_at IS NULL FOR UPDATE`,
            [code, tenantId]
        );
        const courseId = rows[0]?.id;
        if (!courseId) {
            await conn.rollback();
            return false;
        }

        // Soft-delete levels under this course's programs.
        await conn.query(
            `UPDATE levels l
             JOIN programs p ON l.program_id = p.id
             SET l.deleted_at = CURRENT_TIMESTAMP, l.updated_by = ?, l.updated_at = CURRENT_TIMESTAMP
             WHERE p.course_id = ? AND l.deleted_at IS NULL`,
            [userId, courseId]
        );

        // Soft-delete the programs.
        await conn.query(
            `UPDATE programs SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE course_id = ? AND deleted_at IS NULL`,
            [userId, courseId]
        );

        // Soft-delete the course itself.
        await conn.query(
            `UPDATE courses SET deleted_at = CURRENT_TIMESTAMP, updated_by = ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ? AND deleted_at IS NULL`,
            [userId, courseId]
        );

        await conn.commit();
        return true;
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

module.exports = {
    getCourses,
    getCourseByCode,
    createCourse,
    updateCourse,
    deleteCourse
};
