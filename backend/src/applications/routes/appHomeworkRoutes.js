const express = require('express');
const router = express.Router();
const appHomeworkController = require('../controllers/appHomeworkController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');
const { uploadHomeworkSubmission } = require('../middleware/appUploadMiddleware');

// All endpoints require authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/homeworks
 * @desc    List homeworks with status filter (?status=pending|submitted|graded|overdue)
 * @access  Private (Student)
 */
router.get('/', requirePermission('assignment.view'), (req, res) => appHomeworkController.list(req, res));

/**
 * @route   GET /api/app/homeworks/:id
 * @desc    Get homework details, instructions, teacher attachments, and due date
 * @access  Private (Student)
 */
router.get('/:id', requirePermission('assignment.view'), (req, res) => appHomeworkController.getDetails(req, res));

/**
 * @route   POST /api/app/homeworks/:id/submit
 * @desc    Submit homework solution (text remarks + file attachments)
 * @access  Private (Student)
 */
router.post(
    '/:id/submit', 
    requirePermission('assignment.submit'), 
    uploadHomeworkSubmission.array('files', 5), 
    (req, res) => appHomeworkController.submit(req, res)
);

/**
 * @route   GET /api/app/homeworks/:id/my-submission
 * @desc    View submitted work, evaluation status, marks obtained, and teacher remarks
 * @access  Private (Student)
 */
router.get('/:id/my-submission', requirePermission('assignment.view'), (req, res) => appHomeworkController.getMySubmission(req, res));

module.exports = router;
