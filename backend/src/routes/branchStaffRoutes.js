const express = require('express');
const router = express.Router();
const branchStaffController = require('../controllers/branchStaffController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.post('/', branchStaffController.createStaff);
router.get('/', branchStaffController.getStaffList);
router.get('/:id', branchStaffController.getStaffById);
router.put('/:id', branchStaffController.updateStaff);
router.delete('/:id', branchStaffController.deleteStaff);

module.exports = router;
