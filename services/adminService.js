const db = require('../config/database');

class AdminService {
  /**
   * Add a new timetable slot for a course
   * @param {number} courseId - The ID of the course
   * @param {string} dayOfWeek - Day of the week
   * @param {string} startTime - Start time (HH:MM:SS)
   * @param {string} endTime - End time (HH:MM:SS)
   * @returns {Object} Result object
   */
  async addTimetable(courseId, dayOfWeek, startTime, endTime) {
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (!validDays.includes(dayOfWeek)) {
      return {
        success: false,
        error: 'Invalid day of week. Must be one of: ' + validDays.join(', ')
      };
    }

    if (startTime >= endTime) {
      return {
        success: false,
        error: 'Start time must be before end time'
      };
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Verify course exists
      const [courseRows] = await connection.query(
        'SELECT course_id, course_code FROM courses WHERE course_id = ?',
        [courseId]
      );

      if (courseRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          error: 'Course not found'
        };
      }

      // Check if this would create conflicts with existing enrollments
      const [enrolledStudents] = await connection.query(
        `SELECT DISTINCT sc.student_id, s.name
         FROM student_courses sc
         JOIN students s ON sc.student_id = s.student_id
         WHERE sc.course_id = ?`,
        [courseId]
      );

      if (enrolledStudents.length > 0) {
        // Check if any of these students have conflicts
        const [conflicts] = await connection.query(
          `SELECT DISTINCT s.student_id, s.name, c.course_code, t.day_of_week, t.start_time, t.end_time
           FROM student_courses sc1
           JOIN students s ON sc1.student_id = s.student_id
           JOIN student_courses sc2 ON s.student_id = sc2.student_id
           JOIN timetables t ON sc2.course_id = t.course_id
           JOIN courses c ON t.course_id = c.course_id
           WHERE sc1.course_id = ?
           AND t.day_of_week = ?
           AND t.start_time < ?
           AND t.end_time > ?
           AND sc2.course_id != ?`,
          [courseId, dayOfWeek, endTime, startTime, courseId]
        );

        if (conflicts.length > 0) {
          await connection.rollback();
          return {
            success: false,
            error: `Cannot add timetable: Would create conflicts for ${conflicts.length} enrolled student(s)`,
            conflicts: conflicts
          };
        }
      }

      // Insert the new timetable
      const [result] = await connection.query(
        'INSERT INTO timetables (course_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
        [courseId, dayOfWeek, startTime, endTime]
      );

      await connection.commit();

      return {
        success: true,
        message: 'Timetable added successfully',
        data: {
          timetableId: result.insertId,
          courseId,
          dayOfWeek,
          startTime,
          endTime
        }
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error in addTimetable:', error);
      return {
        success: false,
        error: 'Failed to add timetable'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Update an existing timetable slot
   * @param {number} timetableId - The ID of the timetable to update
   * @param {Object} updates - Object containing dayOfWeek, startTime, endTime
   * @returns {Object} Result object
   */
  async updateTimetable(timetableId, updates) {
    const { dayOfWeek, startTime, endTime } = updates;
    const validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    if (dayOfWeek && !validDays.includes(dayOfWeek)) {
      return {
        success: false,
        error: 'Invalid day of week'
      };
    }

    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // Get existing timetable
      const [timetableRows] = await connection.query(
        'SELECT * FROM timetables WHERE timetable_id = ?',
        [timetableId]
      );

      if (timetableRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          error: 'Timetable not found'
        };
      }

      const existingTimetable = timetableRows[0];
      const newDayOfWeek = dayOfWeek || existingTimetable.day_of_week;
      const newStartTime = startTime || existingTimetable.start_time;
      const newEndTime = endTime || existingTimetable.end_time;

      if (newStartTime >= newEndTime) {
        await connection.rollback();
        return {
          success: false,
          error: 'Start time must be before end time'
        };
      }

      // Check for conflicts with enrolled students
      const [conflicts] = await connection.query(
        `SELECT DISTINCT s.student_id, s.name, c.course_code, t.day_of_week, t.start_time, t.end_time
         FROM student_courses sc1
         JOIN students s ON sc1.student_id = s.student_id
         JOIN student_courses sc2 ON s.student_id = sc2.student_id
         JOIN timetables t ON sc2.course_id = t.course_id
         JOIN courses c ON t.course_id = c.course_id
         WHERE sc1.course_id = ?
         AND t.day_of_week = ?
         AND t.start_time < ?
         AND t.end_time > ?
         AND t.timetable_id != ?`,
        [existingTimetable.course_id, newDayOfWeek, newEndTime, newStartTime, timetableId]
      );

      if (conflicts.length > 0) {
        await connection.rollback();
        return {
          success: false,
          error: `Cannot update timetable: Would create conflicts for ${conflicts.length} enrolled student(s)`,
          conflicts: conflicts
        };
      }

      // Update the timetable
      await connection.query(
        'UPDATE timetables SET day_of_week = ?, start_time = ?, end_time = ? WHERE timetable_id = ?',
        [newDayOfWeek, newStartTime, newEndTime, timetableId]
      );

      await connection.commit();

      return {
        success: true,
        message: 'Timetable updated successfully',
        data: {
          timetableId,
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime
        }
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error in updateTimetable:', error);
      return {
        success: false,
        error: 'Failed to update timetable'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Delete a timetable slot
   * @param {number} timetableId - The ID of the timetable to delete
   * @returns {Object} Result object
   */
  async deleteTimetable(timetableId) {
    try {
      const [result] = await db.query(
        'DELETE FROM timetables WHERE timetable_id = ?',
        [timetableId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          error: 'Timetable not found'
        };
      }

      return {
        success: true,
        message: 'Timetable deleted successfully'
      };
    } catch (error) {
      console.error('Error in deleteTimetable:', error);
      return {
        success: false,
        error: 'Failed to delete timetable'
      };
    }
  }

  /**
   * Get all timetables for a course
   * @param {number} courseId - The ID of the course
   * @returns {Object} Result object with timetables
   */
  async getCourseTimetables(courseId) {
    try {
      const [rows] = await db.query(
        `SELECT t.*, c.course_code, c.course_name
         FROM timetables t
         JOIN courses c ON t.course_id = c.course_id
         WHERE t.course_id = ?
         ORDER BY FIELD(t.day_of_week, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'), 
                  t.start_time`,
        [courseId]
      );

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Error in getCourseTimetables:', error);
      return {
        success: false,
        error: 'Failed to fetch timetables'
      };
    }
  }

  /**
   * Add a new course
   * @param {string} courseCode - Course code (e.g., CS101)
   * @param {string} courseName - Course name
   * @param {number} collegeId - College ID
   * @param {number} credits - Number of credits
   * @returns {Object} Result object
   */
  async addCourse(courseCode, courseName, collegeId, credits = 3) {
    try {
      const [result] = await db.query(
        'INSERT INTO courses (course_code, course_name, college_id, credits) VALUES (?, ?, ?, ?)',
        [courseCode, courseName, collegeId, credits]
      );

      return {
        success: true,
        message: 'Course added successfully',
        data: {
          courseId: result.insertId,
          courseCode,
          courseName,
          collegeId,
          credits
        }
      };
    } catch (error) {
      console.error('Error in addCourse:', error);
      if (error.code === 'ER_DUP_ENTRY') {
        return {
          success: false,
          error: 'Course code already exists for this college'
        };
      }
      return {
        success: false,
        error: 'Failed to add course'
      };
    }
  }

  /**
   * Get students enrolled in a specific course
   * @param {number} courseId - The ID of the course
   * @returns {Object} Result object with enrolled students
   */
  async getEnrolledStudents(courseId) {
    try {
      const [rows] = await db.query(
        `SELECT s.student_id, s.name, s.email, sc.enrolled_at
         FROM student_courses sc
         JOIN students s ON sc.student_id = s.student_id
         WHERE sc.course_id = ?
         ORDER BY s.name`,
        [courseId]
      );

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Error in getEnrolledStudents:', error);
      return {
        success: false,
        error: 'Failed to fetch enrolled students'
      };
    }
  }
}

module.exports = new AdminService();