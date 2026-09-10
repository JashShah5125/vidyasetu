const express = require('express');
const router = express.Router();
const lectureRequestController = require('../controllers/lectureRequestController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/counts', lectureRequestController.getStatusCounts);
router.get('/', lectureRequestController.listRequests);
router.get('/:id', lectureRequestController.getRequestById);
router.post('/', lectureRequestController.createRequest);
router.put('/:id/approve', lectureRequestController.approveRequest);
router.put('/:id/reject', lectureRequestController.rejectRequest);
router.post('/:id/apply', lectureRequestController.applyRequest);

module.exports = router;
