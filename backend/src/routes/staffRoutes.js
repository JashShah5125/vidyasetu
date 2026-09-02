const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
// Temporarily bypassed until Auth Integration is complete
// router.use(requireAuth);

router.post('/', staffController.createStaff);
router.get('/', staffController.getStaffList);
router.put('/:id', staffController.updateStaff);

module.exports = router;
