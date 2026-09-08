const express = require('express');
const homeworkController = require('../controllers/homeworkController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { uploadHomeworkFiles, uploadSubmissionFiles } = require('../middleware/uploadMiddleware');

// ─── Teacher / Admin homework routes ────────────────────────────────────────
const teacherRouter = express.Router();

teacherRouter.use(requireAuth);

teacherRouter.get('/scoping', requirePermission('assignment.view'), homeworkController.getScoping);
teacherRouter.get('/', requirePermission('assignment.view'), homeworkController.getHomeworks);

teacherRouter.get('/:id/submissions', requirePermission('assignment.view'), homeworkController.getSubmissions);
teacherRouter.put('/:id/submissions/:submissionId/grade', requirePermission('assignment.grade'), homeworkController.gradeSubmission);

teacherRouter.post('/', requirePermission('assignment.create'), uploadHomeworkFiles, homeworkController.createHomework);
teacherRouter.put('/:id', requirePermission('assignment.update'), uploadHomeworkFiles, homeworkController.updateHomework);
teacherRouter.delete('/:id', requirePermission('assignment.delete'), homeworkController.deleteHomework);
teacherRouter.post('/:id/publish', requirePermission('assignment.update'), homeworkController.publishHomework);
teacherRouter.post('/:id/close', requirePermission('assignment.update'), homeworkController.closeHomework);
teacherRouter.get('/:id/roster', requirePermission('assignment.view'), homeworkController.getEvaluationRoster);
teacherRouter.post('/:id/bulk-grade', requirePermission('assignment.grade'), homeworkController.bulkGradeHomework);
teacherRouter.get('/:id', requirePermission('assignment.view'), homeworkController.getHomework);


// ─── Student homework routes ────────────────────────────────────────────────
const studentRouter = express.Router();

studentRouter.use(requireAuth);

studentRouter.get('/', homeworkController.getStudentHomeworks);
studentRouter.get('/:id', homeworkController.getStudentHomework);
studentRouter.post('/:id/submit', uploadSubmissionFiles, homeworkController.submitHomework);

module.exports = { teacherRouter, studentRouter };