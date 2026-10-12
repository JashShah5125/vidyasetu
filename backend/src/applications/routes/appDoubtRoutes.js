const express = require('express');
const router = express.Router();
const appDoubtController = require('../controllers/appDoubtController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');
const { uploadDoubtAttachments } = require('../middleware/appUploadMiddleware');

// All doubt routes require Student Authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/doubts
 * @desc    List student doubts with status filter (?status=open|in_progress|resolved|reopened)
 * @access  Private (Student)
 */
router.get('/', requirePermission('student.doubt.view'), (req, res) => appDoubtController.list(req, res));

/**
 * @route   POST /api/app/doubts
 * @desc    Create a new doubt (select subject, topic, message, attachments)
 * @access  Private (Student)
 */
router.post(
    '/', 
    requirePermission('student.doubt.create'), 
    uploadDoubtAttachments.array('files', 5), 
    (req, res) => appDoubtController.create(req, res)
);

/**
 * @route   GET /api/app/doubts/:id
 * @desc    Get doubt thread with all back-and-forth messages and attachments
 * @access  Private (Student)
 */
router.get('/:id', requirePermission('student.doubt.view'), (req, res) => appDoubtController.getThread(req, res));

/**
 * @route   POST /api/app/doubts/:id/messages
 * @desc    Reply in a doubt thread
 * @access  Private (Student)
 */
router.post(
    '/:id/messages', 
    requirePermission('student.doubt.reply'), 
    uploadDoubtAttachments.array('files', 5), 
    (req, res) => appDoubtController.reply(req, res)
);

module.exports = router;
