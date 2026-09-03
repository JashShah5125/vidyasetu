const express = require('express');
const router = express.Router();

const supportController = require('../controllers/supportController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const { uploadSupportAttachment } = require('../middleware/uploadMiddleware');

const handleAttachment = (req, res, next) => {
    const upload = uploadSupportAttachment.single('attachment');
    upload(req, res, (err) => {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ status: 'error', message: 'Attachment exceeds the 10MB limit.' });
            }
            return res.status(400).json({ status: 'error', message: err.message });
        }
        next();
    });
};

router.use(requireAuth);

router.get('/', requirePermission('support.view'), supportController.listTickets);
router.get('/:ticketNumber', requirePermission('support.view'), supportController.getTicket);
router.post('/', requirePermission('support.create'), handleAttachment, supportController.createTicket);
router.post('/:ticketNumber/replies', requirePermission('support.reply'), handleAttachment, supportController.addReply);
router.patch('/:ticketNumber', requirePermission('support.edit'), supportController.updateTicket);
router.delete('/:ticketNumber', requirePermission('support.delete'), supportController.deleteTicket);
router.patch('/:ticketNumber/resolve', requirePermission('support.resolve'), supportController.resolveTicket);
router.patch('/:ticketNumber/status', requirePermission('support.resolve'), supportController.updateTicketStatus);

module.exports = router;