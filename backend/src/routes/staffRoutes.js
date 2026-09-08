const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
// Temporarily bypassed until Auth Integration is complete
// router.use(requireAuth);

router.post('/', staffController.createStaff);
router.get('/', staffController.getStaffList);
router.get('/:id', staffController.getStaffById);
router.put('/:id', staffController.updateStaff);
router.delete('/:id', staffController.deleteStaff);

module.exports = router;
