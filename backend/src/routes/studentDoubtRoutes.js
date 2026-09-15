const express = require('express');
const router = express.Router();
const studentDoubtController = require('../controllers/studentDoubtController');
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

// All student doubt routes require authentication
router.use(requireAuth);

// 1. Eligible teachers dropdown for active enrolled batches
router.get('/teachers', (req, res) => studentDoubtController.getEligibleTeachers(req, res));

// 2. List all doubts asked by student
router.get('/', (req, res) => studentDoubtController.getDoubts(req, res));

// 3. Create a doubt thread
router.post('/', handleUpload, (req, res) => studentDoubtController.createDoubt(req, res));

// 4. Get single doubt thread with replies
router.get('/:id', (req, res) => studentDoubtController.getDoubtById(req, res));

// 5. Add student reply
router.post('/:id/replies', handleUpload, (req, res) => studentDoubtController.addReply(req, res));

// 6. Update doubt status (e.g. resolve or reopen)
router.patch('/:id/status', (req, res) => studentDoubtController.updateStatus(req, res));

module.exports = router;
