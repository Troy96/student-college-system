const express = require('express');
const router = express.Router();
const enrollmentService = require('../services/enrollmentService');

/**
 * POST /api/enrollment/enroll
 * Enroll a student in courses
 * Body: { studentId: number, courseIds: number[] }
 */
router.post('/enroll', async (req, res) => {
  try {
    const { studentId, courseIds } = req.body;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'studentId is required'
      });
    }

    if (!courseIds) {
      return res.status(400).json({
        success: false,
        error: 'courseIds is required'
      });
    }

    const result = await enrollmentService.saveStudentCourses(studentId, courseIds);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in /enroll route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enrollment/available/:studentId
 * Get available courses for a student
 */
router.get('/available/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }

    const result = await enrollmentService.getAvailableCoursesForStudent(studentId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /available route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/enrollment/enrolled/:studentId
 * Get enrolled courses for a student
 */
router.get('/enrolled/:studentId', async (req, res) => {
  try {
    const studentId = parseInt(req.params.studentId);

    if (isNaN(studentId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid student ID'
      });
    }

    const result = await enrollmentService.getEnrolledCourses(studentId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /enrolled route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/enrollment/drop
 * Drop a course
 * Body: { studentId: number, courseId: number }
 */
router.delete('/drop', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        error: 'studentId and courseId are required'
      });
    }

    const result = await enrollmentService.dropCourse(studentId, courseId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /drop route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;