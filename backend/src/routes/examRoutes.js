const express = require('express');
const router = express.Router();
const examController = require('../controllers/examController');
const { requireAuth } = require('../middleware/authMiddleware');

// All examination routes require valid user authentication
router.use(requireAuth);

// Examination Catalog & Scheduling
router.get('/', examController.listExams);
router.post('/', examController.createExam);

// Specific Exam Details & Mutations
router.get('/:id', examController.getExam);
router.put('/:id', examController.updateExam);
router.delete('/:id', examController.deleteExam);

// Student Grading & Roster
router.get('/:id/roster', examController.getExamRoster);
router.post('/:id/marks', examController.saveMarks);
router.post('/:id/publish', examController.publishResults);

// Student Academic Performance / Report Card
router.get('/student/:studentId/report-card', examController.getStudentReportCard);

module.exports = router;

