const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { requireAuth } = require('../middleware/authMiddleware');
const { uploadStudentDocument } = require('../middleware/uploadMiddleware');

router.use(requireAuth);

router.get('/options/academic', studentController.getAcademicOptions);
router.get('/academic-options', studentController.getAcademicOptions);
router.post('/upload-document', uploadStudentDocument, studentController.uploadDocument);
router.get('/:id/documents', studentController.getStudentDocuments);
router.patch('/:id/documents/:docId/status', studentController.updateStudentDocumentStatus);
router.put('/:id/documents/:docId/status', studentController.updateStudentDocumentStatus);
router.get('/', studentController.getStudents);
router.get('/:id', studentController.getStudentById);
router.post('/', studentController.createStudent);
router.put('/:id', studentController.updateStudent);
router.patch('/:id', studentController.updateStudent);
router.delete('/:id', studentController.deleteStudent);

module.exports = router;
