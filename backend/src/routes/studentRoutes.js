const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/options/academic', studentController.getAcademicOptions);
router.get('/academic-options', studentController.getAcademicOptions);
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.patch('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
