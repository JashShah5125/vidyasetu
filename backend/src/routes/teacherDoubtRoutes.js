const express = require('express');
const router = express.Router();
const teacherDoubtController = require('../controllers/teacherDoubtController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadDoubtAttachments } = require('../middleware/uploadMiddleware');

const handleUpload = (req, res, next) => {
    uploadDoubtAttachments(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ status: 'error', message: 'Attachment exceeds the 10MB limit per file.' });
            }
            if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
                return res.status(400).json({ status: 'error', message: 'You can upload up to 5 attachments at a time.' });
            }
            return res.status(400).json({ status: 'error', message: err.message || 'File upload error.' });
        }
        next();
    });
};

// All teacher doubt routes require authentication
router.use(requireAuth);

// 1. List doubts assigned to this teacher
router.get('/', (req, res) => teacherDoubtController.getDoubts(req, res));

// 2. Get single doubt thread with full replies
router.get('/:id', (req, res) => teacherDoubtController.getDoubtById(req, res));

// 3. Add teacher reply
router.post('/:id/replies', handleUpload, (req, res) => teacherDoubtController.addReply(req, res));

// 4. Update doubt status (resolve/reopen)
router.patch('/:id/status', (req, res) => teacherDoubtController.updateStatus(req, res));

module.exports = router;
