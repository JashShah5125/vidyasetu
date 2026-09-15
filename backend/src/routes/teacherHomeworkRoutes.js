const express = require('express');
const router = express.Router();
const teacherHomeworkController = require('../controllers/teacherHomeworkController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { uploadHomeworkFiles } = require('../middleware/uploadMiddleware');

// All teacher homework routes require authentication
router.use(requireAuth);

// 1. Scoping options (batches, subjects, academic years)
router.get('/scoping', requirePermission('assignment.view'), (req, res) => teacherHomeworkController.getScoping(req, res));

// 2. Teacher-scoped list of homeworks/assignments/exams
router.get('/', requirePermission('assignment.view'), (req, res) => teacherHomeworkController.getHomeworks(req, res));

// 3. Create assessment
router.post('/', requirePermission('assignment.create'), uploadHomeworkFiles, (req, res) => teacherHomeworkController.createHomework(req, res));

// 4. Student evaluation roster for homework
router.get('/:id/roster', requirePermission('assignment.view'), (req, res) => teacherHomeworkController.getEvaluationRoster(req, res));

// 5. Submitted responses list
router.get('/:id/submissions', requirePermission('assignment.view'), (req, res) => teacherHomeworkController.getSubmissions(req, res));

// 6. Bulk grading
router.post('/:id/bulk-grade', requirePermission('assignment.grade'), (req, res) => teacherHomeworkController.bulkGrade(req, res));

// 7. Single submission grade
router.put('/:id/submissions/:submissionId/grade', requirePermission('assignment.grade'), (req, res) => teacherHomeworkController.gradeSubmission(req, res));

// 8. Publish assessment
router.post('/:id/publish', requirePermission('assignment.update'), (req, res) => teacherHomeworkController.publishHomework(req, res));

// 9. Close assessment
router.post('/:id/close', requirePermission('assignment.update'), (req, res) => teacherHomeworkController.closeHomework(req, res));

// 10. Single assessment details
router.get('/:id', requirePermission('assignment.view'), (req, res) => teacherHomeworkController.getHomeworkById(req, res));

// 11. Update assessment
router.put('/:id', requirePermission('assignment.update'), uploadHomeworkFiles, (req, res) => teacherHomeworkController.updateHomework(req, res));

// 12. Delete assessment
router.delete('/:id', requirePermission('assignment.delete'), (req, res) => teacherHomeworkController.deleteHomework(req, res));

module.exports = router;
