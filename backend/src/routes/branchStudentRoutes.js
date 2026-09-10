const express = require('express');
const router = express.Router();
const branchStudentController = require('../controllers/branchStudentController');
const { requireAuth } = require('../middleware/authMiddleware');

router.use(requireAuth);

router.get('/options/academic', branchStudentController.getAcademicOptions);
router.get('/academic-options', branchStudentController.getAcademicOptions);
router.get('/', branchStudentController.getStudents);
router.get('/:id', branchStudentController.getStudentById);
router.post('/', branchStudentController.createStudent);
router.put('/:id', branchStudentController.updateStudent);
router.patch('/:id', branchStudentController.updateStudent);
router.delete('/:id', branchStudentController.deleteStudent);

module.exports = router;
