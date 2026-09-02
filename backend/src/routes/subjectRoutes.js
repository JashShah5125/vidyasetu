const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', requirePermission('course.view'), subjectController.getSubjects);
router.post('/', requirePermission('course.create'), subjectController.createSubject);
router.get('/:code', requirePermission('course.view'), subjectController.getSubjectByCode);
router.put('/:code', requirePermission('course.update'), subjectController.updateSubject);
router.delete('/:code', requirePermission('course.delete'), subjectController.deleteSubject);

module.exports = router;
