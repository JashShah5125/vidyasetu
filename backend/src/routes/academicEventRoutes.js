const express = require('express');
const router = express.Router();
const academicEventController = require('../controllers/academicEventController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/', academicEventController.listEvents);
router.get('/:id', academicEventController.getEvent);
router.post('/', academicEventController.createEvent);
router.put('/:id', academicEventController.updateEvent);
router.delete('/:id', academicEventController.deleteEvent);

module.exports = router;
