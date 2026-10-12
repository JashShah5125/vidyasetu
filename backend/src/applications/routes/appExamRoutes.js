const express = require('express');
const router = express.Router();
const appExamController = require('../controllers/appExamController');
const { requireAuth, requirePermission } = require('../../middleware/authMiddleware');

// All exam routes require Student Authentication
router.use(requireAuth);

/**
 * @route   GET /api/app/exams/upcoming
 * @desc    List upcoming scheduled exams with dates, timings, and syllabus topics
 * @access  Private (Student)
 */
router.get('/upcoming', requirePermission('student.exam.view'), (req, res) => appExamController.getUpcoming(req, res));

/**
 * @route   GET /api/app/exams/results
 * @route   GET /api/app/exams/completed
 * @desc    List completed exam results (marks obtained, max marks, grade, pass/fail)
 * @access  Private (Student)
 */
router.get('/results', requirePermission('student.exam.results'), (req, res) => appExamController.getResults(req, res));
router.get('/completed', requirePermission('student.exam.results'), (req, res) => appExamController.getResults(req, res));

/**
 * @route   GET /api/app/exams/results/:examId
 * @desc    Detailed exam score breakdown with teacher remarks
 * @access  Private (Student)
 */
router.get('/results/:examId', requirePermission('student.exam.results'), (req, res) => appExamController.getResultDetails(req, res));

module.exports = router;
