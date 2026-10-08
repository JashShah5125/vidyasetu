const express = require('express');
const router = express.Router();
const branchStaffController = require('../controllers/branchStaffController');
const staffController = require('../controllers/staffController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/leave-requests', (req, res) => {
    const branchId = req.user?.branchId || req.user?.branch_id;
    if (branchId) {
        req.query.branchId = branchId;
    }
    staffController.getAdminLeaveRequests(req, res);
});
router.put('/leave-requests/:id/status', staffController.updateAdminLeaveStatus);

router.post('/', branchStaffController.createStaff);
router.get('/', branchStaffController.getStaffList);
router.get('/:id', branchStaffController.getStaffById);
router.put('/:id', branchStaffController.updateStaff);
router.delete('/:id', branchStaffController.deleteStaff);

module.exports = router;
