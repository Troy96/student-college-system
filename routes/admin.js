const express = require('express');
const router = express.Router();
const adminService = require('../services/adminService');

/**
 * POST /api/admin/timetable
 * Add a new timetable slot for a course
 * Body: { courseId, dayOfWeek, startTime, endTime }
 */
router.post('/timetable', async (req, res) => {
  try {
    const { courseId, dayOfWeek, startTime, endTime } = req.body;

    if (!courseId || !dayOfWeek || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        error: 'courseId, dayOfWeek, startTime, and endTime are required'
      });
    }

    const result = await adminService.addTimetable(courseId, dayOfWeek, startTime, endTime);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /timetable route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * PUT /api/admin/timetable/:timetableId
 * Update an existing timetable slot
 * Body: { dayOfWeek?, startTime?, endTime? }
 */
router.put('/timetable/:timetableId', async (req, res) => {
  try {
    const timetableId = parseInt(req.params.timetableId);
    const { dayOfWeek, startTime, endTime } = req.body;

    if (isNaN(timetableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timetable ID'
      });
    }

    if (!dayOfWeek && !startTime && !endTime) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (dayOfWeek, startTime, or endTime) must be provided'
      });
    }

    const result = await adminService.updateTimetable(timetableId, { dayOfWeek, startTime, endTime });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in PUT /timetable route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * DELETE /api/admin/timetable/:timetableId
 * Delete a timetable slot
 */
router.delete('/timetable/:timetableId', async (req, res) => {
  try {
    const timetableId = parseInt(req.params.timetableId);

    if (isNaN(timetableId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid timetable ID'
      });
    }

    const result = await adminService.deleteTimetable(timetableId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in DELETE /timetable route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/timetable/:courseId
 * Get all timetables for a course
 */
router.get('/timetable/:courseId', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const result = await adminService.getCourseTimetables(courseId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in GET /timetable route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * POST /api/admin/course
 * Add a new course
 * Body: { courseCode, courseName, collegeId, credits? }
 */
router.post('/course', async (req, res) => {
  try {
    const { courseCode, courseName, collegeId, credits } = req.body;

    if (!courseCode || !courseName || !collegeId) {
      return res.status(400).json({
        success: false,
        error: 'courseCode, courseName, and collegeId are required'
      });
    }

    const result = await adminService.addCourse(courseCode, courseName, collegeId, credits);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error in POST /course route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

/**
 * GET /api/admin/course/:courseId/students
 * Get students enrolled in a course
 */
router.get('/course/:courseId/students', async (req, res) => {
  try {
    const courseId = parseInt(req.params.courseId);

    if (isNaN(courseId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid course ID'
      });
    }

    const result = await adminService.getEnrolledStudents(courseId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in GET /course/:courseId/students route:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

module.exports = router;