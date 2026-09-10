const express = require('express');
const router = express.Router();
const branchHomeworkController = require('../controllers/branchHomeworkController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { uploadHomeworkFiles } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.get('/scoping', requirePermission('assignment.view'), branchHomeworkController.getScoping);
router.get('/', requirePermission('assignment.view'), branchHomeworkController.getHomeworks);

router.post('/', requirePermission('assignment.create'), uploadHomeworkFiles, branchHomeworkController.createHomework);
router.get('/:id/roster', requirePermission('assignment.view'), branchHomeworkController.getEvaluationRoster);
router.post('/:id/bulk-grade', requirePermission('assignment.grade'), branchHomeworkController.bulkGradeHomework);
router.put('/:id/submissions/:submissionId/grade', requirePermission('assignment.grade'), branchHomeworkController.gradeSubmission);

router.post('/:id/publish', requirePermission('assignment.update'), branchHomeworkController.publishHomework);
router.post('/:id/close', requirePermission('assignment.update'), branchHomeworkController.closeHomework);

router.get('/:id', requirePermission('assignment.view'), branchHomeworkController.getHomework);
router.put('/:id', requirePermission('assignment.update'), uploadHomeworkFiles, branchHomeworkController.updateHomework);
router.delete('/:id', requirePermission('assignment.delete'), branchHomeworkController.deleteHomework);

module.exports = router;
