const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/leave-requests', staffController.getAdminLeaveRequests);
router.put('/leave-requests/:id/status', staffController.updateAdminLeaveStatus);
router.post('/', staffController.createStaff);
router.get('/', staffController.getStaffList);
router.get('/:id', staffController.getStaffById);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
