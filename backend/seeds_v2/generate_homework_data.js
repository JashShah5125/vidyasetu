const path = require('path');
require('../backend/node_modules/dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = require('../backend/src/config/db');

const TENANT_ID = 2;

// Seeded RNG so re-runs produce identical selections.
const mulberry32 = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const SUBJECT_SAMPLES = {
    2: {
        responses: ['Solved all 10 questions with step-by-step working shown for the limits part.',
                    'Attempted every problem; revised first chapter examples before starting.',
                    'Completed both sections. Q6 required substitution method – included that approach.']
    },
    3: {
        responses: ['Balanced all equations and converted to moles as shown in class.',
                    'Drew Lewis structures for all compounds listed.',
                    'Finished the numericals; noted the exceptions in bond angles.']
    },
    4: {
        responses: ['Did the Punnett square for each cross and wrote the phenotypic ratios.',
                    'Completed all diagram-based questions with neat labels.',
                    'Summarized each topic pointwise before answering the long questions.']
    },
    5: {
        responses: ['Classified all tissues with examples from the chapter.',
                    'Drew and labelled the digestive system diagram.',
                    'Answered the NCERT back questions for the chapter.']
    },
    12: {
        responses: ['Prepared the food web diagram and listed decomposers.',
                    'Made a short report on local water pollution with sources.',
                    'Completed the questions with real examples from our city.']
    }
};

const HOMEWORKS = [
    // ── Branch 1 (Mumbai West), 2026-27 ─────────────────────────────────────
    { teacherUserId: 202, subjectId: 2, branchId: 1, academicYearId: 2, batchIds: [1],
      title: "JEE XI – Sets, Relations & Functions Worksheet",
      description: 'Solve Q1–Q12 from the printed worksheet. Show set operations and verify relations with a small Venn diagram for Q7. Submission will be graded for method as well as the final answer.',
      status: 'published', dueDate: '2026-09-20 23:59:59', maxMarks: 20 },
    { teacherUserId: 202, subjectId: 2, branchId: 1, academicYearId: 2, batchIds: [2],
      title: 'Differential Calculus Practice Set',
      description: 'Attempt the 15 practice problems on limits and derivatives shared in class. Highlight the rule used for each problem. Late submissions will be marked late.',
      status: 'published', dueDate: '2026-09-25 23:59:59', maxMarks: 25 },
    { teacherUserId: 202, subjectId: 2, branchId: 1, academicYearId: 2, batchIds: [1, 10],
      title: 'Trigonometry & Straight Lines Homework',
      description: 'Covers both XI and Dropper batches. Solve the combined worksheet of 10 questions on trigonometric identities and straight line equations.',
      status: 'published', dueDate: '2026-10-05 23:59:59', maxMarks: 30 },
    { teacherUserId: 210, subjectId: 2, branchId: 1, academicYearId: 2, batchIds: [8],
      title: 'Application of Derivatives Worksheet',
      description: 'Complete problems on maxima-minima from the NCERT exercise. Draw the curve for the last two questions.',
      status: 'published', dueDate: '2026-09-22 23:59:59', maxMarks: 20 },
    { teacherUserId: 210, subjectId: 2, branchId: 1, academicYearId: 2, batchIds: [2, 8],
      title: 'Definite Integration Assignment',
      description: 'Solve the 8 assignment problems on definite integrals using properties of integrals. Mention the property used for each.',
      status: 'published', dueDate: '2026-10-10 23:59:59', maxMarks: 25 },
    { teacherUserId: 222, subjectId: 12, branchId: 1, academicYearId: 2, batchIds: [10],
      title: 'EVS – Waste Management Project Draft',
      description: 'Prepare the first draft of your segregation and composting project report. Include one case study.',
      status: 'draft', dueDate: '2026-11-05 23:59:59', maxMarks: 20 },
    { teacherUserId: 225, subjectId: 3, branchId: 1, academicYearId: 2, batchIds: [16],
      title: 'Mole Concept Worksheet',
      description: 'Complete all numerical questions from the Mole Concept worksheet. Carry units through each step.',
      status: 'published', dueDate: '2026-09-18 23:59:59', maxMarks: 20 },
    { teacherUserId: 227, subjectId: 5, branchId: 1, academicYearId: 2, batchIds: [8],
      title: 'Animal Tissues – Chapter Test',
      description: 'Chapter test covering all four animal tissue types. Write short notes plus one diagram question.',
      status: 'closed', dueDate: '2026-08-28 23:59:59', maxMarks: 15 },
    // ── Branch 1 (Mumbai West), 2025-26 (historical) ────────────────────────
    { teacherUserId: 202, subjectId: 2, branchId: 1, academicYearId: 1, batchIds: [7],
      title: 'Matrices & Determinants – End Term Assignment',
      description: 'End-term assignment on matrices and determinants. Submitted work was graded and returned.',
      status: 'closed', dueDate: '2026-03-15 23:59:59', maxMarks: 25 },
    { teacherUserId: 205, subjectId: 12, branchId: 1, academicYearId: 1, batchIds: [17],
      title: 'Ecosystem Project Submission',
      description: 'Group ecosystem project files submitted and evaluated for the previous academic year.',
      status: 'closed', dueDate: '2025-11-30 23:59:59', maxMarks: 30 },
    // ── Branch 2 (Pune Camp), 2026-27 ───────────────────────────────────────
    { teacherUserId: 203, subjectId: 4, branchId: 2, academicYearId: 5, batchIds: [3],
      title: "Genetics – Mendel's Laws Practice",
      description: 'Solve the monohybrid and dihybrid cross problems. Write the genotypic and phenotypic ratios clearly.',
      status: 'published', dueDate: '2026-09-28 23:59:59', maxMarks: 30 },
    { teacherUserId: 203, subjectId: 4, branchId: 2, academicYearId: 5, batchIds: [11],
      title: 'Human Physiology – Circulation Worksheet',
      description: 'Complete the double circulation diagram and short answers on cardiac cycle.',
      status: 'published', dueDate: '2026-10-12 23:59:59', maxMarks: 20 },
    { teacherUserId: 203, subjectId: 4, branchId: 2, academicYearId: 5, batchIds: [14],
      title: 'Cell – The Unit of Life Assignment',
      description: 'Foundation IX assignment on cell organelles. Label diagrams and match functions.',
      status: 'closed', dueDate: '2026-08-25 23:59:59', maxMarks: 20 },
    { teacherUserId: 209, subjectId: 3, branchId: 2, academicYearId: 5, batchIds: [3],
      title: 'NEET DPP – Chemical Bonding (Draft)',
      description: 'Daily practice problems on chemical bonding. Being finalised before publication.',
      status: 'draft', dueDate: '2026-11-20 23:59:59', maxMarks: 25 }
];

const RESPONSE_SAMPLES = [
    'Solved all questions and attached my working notes.',
    'Completed the worksheet; revised examples from the class notes before starting.',
    'Attempted every question. A few answers are marked for doubt discussion.'
];

const MARK_CAP = 0.92;
const rand = mulberry32(20260908);

const pickResponse = (subjectId) => {
    const samples = SUBJECT_SAMPLES[subjectId]?.responses || RESPONSE_SAMPLES;
    return samples[Math.floor(rand() * samples.length)];
};

const pickFeedback = () => {
    const fb = [
        'Good understanding of the core concepts. Check the sign errors in Q4.',
        'Well structured and neat. Keep up the effort.',
        'Accurate method. Revise the last two questions before the unit test.',
        'Conceptually clear; add more examples next time.'
    ];
    return fb[Math.floor(rand() * fb.length)];
};

const toDb = (d) => d.replace('T', ' ').substring(0, 19);

const loadLookups = async () => {
    const [allocs] = await pool.query(
        `SELECT ta.teacher_user_id AS uid, ta.branch_id, ta.academic_year_id, ta.batch_id
           FROM teacher_allocations ta
          WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL`, [TENANT_ID]
    );
    const [subjects] = await pool.query(
        `SELECT teacher_user_id AS uid, subject_id
           FROM teacher_subjects WHERE tenant_id = ?`, [TENANT_ID]
    );
    const [enrolls] = await pool.query(
        `SELECT DISTINCT batch_id, student_id
           FROM student_enrollments
          WHERE tenant_id = ? AND status = 'active' AND deleted_at IS NULL`, [TENANT_ID]
    );
    const [teachers] = await pool.query(
        `SELECT DISTINCT u.id, u.name FROM users u
           JOIN teacher_allocations ta ON ta.teacher_user_id = u.id
          WHERE ta.tenant_id = ? AND ta.deleted_at IS NULL`, [TENANT_ID]
    );

    const allocSet = new Set(allocs.map(a => `${a.uid}|${a.branch_id}|${a.academic_year_id}|${a.batch_id}`));
    const subjectSet = new Set(subjects.map(s => `${s.uid}|${s.subject_id}`));
    const studentsByBatch = new Map();
    enrolls.forEach(e => {
        if (!studentsByBatch.has(e.batch_id)) studentsByBatch.set(e.batch_id, []);
        studentsByBatch.get(e.batch_id).push(e.student_id);
    });
    const teacherName = new Map(teachers.map(t => [t.id, t.name]));
    return { allocSet, subjectSet, studentsByBatch, teacherName };
};

const insertHomework = async (conn, hw, rng) => {
    const publishedAt = hw.status === 'published' || hw.status === 'closed'
        ? new Date(new Date(hw.dueDate.replace(' ', 'T')) - (18 + rng() * 15) * 86400000)
        : null;
    const closedAt = hw.status === 'closed'
        ? new Date(new Date(hw.dueDate.replace(' ', 'T')).getTime() + (2 + rng() * 5) * 86400000)
        : null;

    const [res] = await conn.query(
        `INSERT INTO homeworks
            (tenant_id, branch_id, academic_year_id, subject_id, title, description,
             assignment_type, batch_ids, files, due_date, max_marks, status,
             published_at, closed_at, created_at, updated_at, created_by, updated_by)
         VALUES (?, ?, ?, ?, ?, ?, 'homework', ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?)`,
        [TENANT_ID, hw.branchId, hw.academicYearId, hw.subjectId, hw.title, hw.description,
         JSON.stringify(hw.batchIds), JSON.stringify([]), toDb(hw.dueDate), hw.maxMarks, hw.status,
         publishedAt ? toDb(publishedAt.toISOString()) : null,
         closedAt ? toDb(closedAt.toISOString()) : null,
         hw.teacherUserId, hw.teacherUserId]
    );
    return res.insertId;
};

const insertSubmission = async (conn, config) => {
    const { homeworkId, studentId, status, teacherUserId, submittedAt } = config;
    const marks = status === 'graded' ? Math.round((0.6 + rand() * (MARK_CAP - 0.6)) * config.maxMarks * 100) / 100 : null;
    const gradedAt = status === 'graded'
        ? new Date(new Date(submittedAt).getTime() + (1 + rand() * 3) * 86400000)
        : null;
    await conn.query(
        `INSERT INTO homework_submissions
            (tenant_id, homework_id, student_id, response_text, files, status,
             marks_obtained, teacher_feedback, submitted_at, graded_by, graded_at,
             created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [TENANT_ID, homeworkId, studentId,
         status === 'graded' ? pickResponseAt(config.subjectId) : pickResponse(config.subjectId),
         JSON.stringify([]), status, marks,
         status === 'graded' ? pickFeedback() : '',
         toDb(new Date(submittedAt).toISOString()),
         status === 'graded' ? teacherUserId : null,
         gradedAt ? toDb(gradedAt.toISOString()) : null]
    );
};

const pickResponseAt = (subjectId) => {
    const shuffle = [0, 1, 2];
    for (let i = shuffle.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [shuffle[i], shuffle[j]] = [shuffle[j], shuffle[i]];
    }
    const samples = SUBJECT_SAMPLES[subjectId]?.responses || RESPONSE_SAMPLES;
    return shuffle.map(i => samples[i]).join(' ');
};

const seed = async () => {
    const [existing] = await pool.query('SELECT COUNT(*) AS c FROM homeworks WHERE tenant_id = ?', [TENANT_ID]);
    const force = process.argv.includes('--force');
    if (existing[0].c > 0 && !force) {
        console.log(`homeworks table already has ${existing[0].c} rows for tenant ${TENANT_ID}. Skipping. Use --force to wipe and reseed.`);
        process.exit(0);
    }
    if (force && existing[0].c > 0) {
        await pool.query('DELETE FROM homework_submissions WHERE tenant_id = ?', [TENANT_ID]);
        await pool.query('DELETE FROM homeworks WHERE tenant_id = ?', [TENANT_ID]);
        console.log(`Removed existing ${existing[0].c} homeworks for tenant ${TENANT_ID}.`);
    }

    const { allocSet, subjectSet, studentsByBatch, teacherName } = await loadLookups();
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        let hwCount = 0;
        let subCount = 0;

        for (const hw of HOMEWORKS) {
            const validBatches = hw.batchIds.every(b =>
                allocSet.has(`${hw.teacherUserId}|${hw.branchId}|${hw.academicYearId}|${b}`));
            const validSubject = subjectSet.has(`${hw.teacherUserId}|${hw.subjectId}`);
            if (!validSubject) {
                console.warn(`SKIP [${hw.title}]: teacher ${hw.teacherUserId} does not teach subject ${hw.subjectId}`);
                continue;
            }
            if (!validBatches) {
                console.warn(`SKIP [${hw.title}]: one or more batches not allocated to teacher ${hw.teacherUserId}`);
                continue;
            }
            const enrolledStudents = hw.batchIds.flatMap(b => studentsByBatch.get(b) || []);
            const uniqueStudents = [...new Set(enrolledStudents)];
            if (!uniqueStudents.length) {
                console.warn(`SKIP [${hw.title}]: no enrolled students in target batches`);
                continue;
            }

            const homeworkId = await insertHomework(conn, hw, rand);

            let submittedStudents = [];
            if (hw.status === 'published') {
                const count = Math.max(1, Math.floor(uniqueStudents.length * 0.7));
                submittedStudents = uniqueStudents.slice(0, count);
            } else if (hw.status === 'closed') {
                submittedStudents = uniqueStudents;
            }

            const due = new Date(hw.dueDate.replace(' ', 'T'));
            for (let idx = 0; idx < submittedStudents.length; idx++) {
                const studentId = submittedStudents[idx];
                const late = hw.status === 'published' && idx === submittedStudents.length - 1 && rand() > 0.7;
                const submittedAt = late
                    ? new Date(due.getTime() + (1 + rand() * 2) * 86400000)
                    : new Date(due.getTime() - (2 + rand() * 12) * 86400000);
                await insertSubmission(conn, {
                    homeworkId,
                    studentId,
                    status: hw.status === 'closed'
                        ? 'graded'
                        : (idx % 3 === 0 ? 'graded' : 'submitted'),
                    teacherUserId: hw.teacherUserId,
                    subjectId: hw.subjectId,
                    maxMarks: hw.maxMarks,
                    submittedAt
                });
                subCount++;
            }

            console.log(`OK [${hw.title}] teacher=${teacherName.get(hw.teacherUserId) || hw.teacherUserId} batches=[${hw.batchIds.join(',')}] status=${hw.status} submissions=${submittedStudents.length}/${uniqueStudents.length}`);
            hwCount++;
        }

        await conn.commit();
        console.log(`\nSeeded ${hwCount} homeworks and ${subCount} submissions for tenant ${TENANT_ID}.`);
        process.exit(0);
    } catch (error) {
        await conn.rollback();
        throw error;
    } finally {
        conn.release();
    }
};

seed().catch(err => {
    console.error('Error during homework seeding:', err);
    process.exit(1);
});