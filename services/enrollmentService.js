const db = require('../config/database');

class EnrollmentService {
  /**
   * Save student course selections with validation
   * @param {number} studentId - The ID of the student
   * @param {number[]} courseIds - Array of course IDs to enroll in
   * @returns {Object} Result object with success status and message
   */
  async saveStudentCourses(studentId, courseIds) {
    // Input validation
    if (!studentId || typeof studentId !== 'number') {
      return {
        success: false,
        error: 'Invalid student ID provided'
      };
    }

    if (!Array.isArray(courseIds)) {
      return {
        success: false,
        error: 'Course IDs must be provided as an array'
      };
    }

    if (courseIds.length === 0) {
      return {
        success: false,
        error: 'Course list cannot be empty'
      };
    }

    // Remove duplicates
    const uniqueCourseIds = [...new Set(courseIds)];

    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // 1. Verify student exists and get their college
      const [studentRows] = await connection.query(
        'SELECT student_id, name, college_id FROM students WHERE student_id = ?',
        [studentId]
      );

      if (studentRows.length === 0) {
        await connection.rollback();
        return {
          success: false,
          error: 'Student not found'
        };
      }

      const student = studentRows[0];
      const studentCollegeId = student.college_id;

      // 2. Verify all courses exist and belong to the same college
      const [courseRows] = await connection.query(
        'SELECT course_id, course_code, course_name, college_id FROM courses WHERE course_id IN (?)',
        [uniqueCourseIds]
      );

      if (courseRows.length !== uniqueCourseIds.length) {
        await connection.rollback();
        const foundIds = courseRows.map(c => c.course_id);
        const missingIds = uniqueCourseIds.filter(id => !foundIds.includes(id));
        return {
          success: false,
          error: `Courses not found: ${missingIds.join(', ')}`
        };
      }

      // Check if all courses belong to student's college
      const invalidCourses = courseRows.filter(
        course => course.college_id !== studentCollegeId
      );

      if (invalidCourses.length > 0) {
        await connection.rollback();
        return {
          success: false,
          error: `Courses ${invalidCourses.map(c => c.course_code).join(', ')} do not belong to student's college`
        };
      }

      // 3. Get timetables for all courses to check for clashes
      const [timetableRows] = await connection.query(
        `SELECT t.*, c.course_code 
         FROM timetables t
         JOIN courses c ON t.course_id = c.course_id
         WHERE t.course_id IN (?)
         ORDER BY t.day_of_week, t.start_time`,
        [uniqueCourseIds]
      );

      // Check for timetable clashes among the selected courses
      const clashResult = this.checkTimetableClashes(timetableRows);
      if (!clashResult.success) {
        await connection.rollback();
        return clashResult;
      }

      // 4. Check for clashes with already enrolled courses
      const [existingEnrollments] = await connection.query(
        `SELECT t.*, c.course_code 
         FROM student_courses sc
         JOIN timetables t ON sc.course_id = t.course_id
         JOIN courses c ON t.course_id = c.course_id
         WHERE sc.student_id = ?`,
        [studentId]
      );

      if (existingEnrollments.length > 0) {
        const combinedTimetables = [...existingEnrollments, ...timetableRows];
        const existingClashResult = this.checkTimetableClashes(combinedTimetables);
        if (!existingClashResult.success) {
          await connection.rollback();
          return existingClashResult;
        }
      }

      // 5. Check if student is already enrolled in any of these courses
      const [alreadyEnrolled] = await connection.query(
        `SELECT c.course_code 
         FROM student_courses sc
         JOIN courses c ON sc.course_id = c.course_id
         WHERE sc.student_id = ? AND sc.course_id IN (?)`,
        [studentId, uniqueCourseIds]
      );

      if (alreadyEnrolled.length > 0) {
        await connection.rollback();
        return {
          success: false,
          error: `Student is already enrolled in: ${alreadyEnrolled.map(c => c.course_code).join(', ')}`
        };
      }

      // 6. Insert all course enrollments
      const insertPromises = uniqueCourseIds.map(courseId => 
        connection.query(
          'INSERT INTO student_courses (student_id, course_id) VALUES (?, ?)',
          [studentId, courseId]
        )
      );

      await Promise.all(insertPromises);
      await connection.commit();

      return {
        success: true,
        message: `Successfully enrolled in ${uniqueCourseIds.length} course(s)`,
        data: {
          studentId,
          enrolledCourses: courseRows.map(c => ({
            courseId: c.course_id,
            courseCode: c.course_code,
            courseName: c.course_name
          }))
        }
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error in saveStudentCourses:', error);
      
      // Handle specific MySQL errors
      if (error.code === 'ER_SIGNAL_EXCEPTION') {
        return {
          success: false,
          error: error.sqlMessage || 'Database constraint violation'
        };
      }

      return {
        success: false,
        error: 'An error occurred while processing enrollment'
      };
    } finally {
      connection.release();
    }
  }

  /**
   * Check for timetable clashes in a set of timetables
   * @param {Array} timetables - Array of timetable objects
   * @returns {Object} Result with success status and clash details if any
   */
  checkTimetableClashes(timetables) {
    const timeSlotsByDay = {};

    for (const slot of timetables) {
      const day = slot.day_of_week;
      
      if (!timeSlotsByDay[day]) {
        timeSlotsByDay[day] = [];
      }

      // Check against existing slots for this day
      for (const existing of timeSlotsByDay[day]) {
        if (this.timeSlotsOverlap(
          slot.start_time,
          slot.end_time,
          existing.start_time,
          existing.end_time
        )) {
          return {
            success: false,
            error: `Timetable clash detected on ${day}: ${slot.course_code || 'Course'} (${slot.start_time}-${slot.end_time}) overlaps with ${existing.course_code || 'Course'} (${existing.start_time}-${existing.end_time})`
          };
        }
      }

      timeSlotsByDay[day].push(slot);
    }

    return { success: true };
  }

  /**
   * Check if two time slots overlap
   * @param {string} start1 - Start time of first slot (HH:MM:SS)
   * @param {string} end1 - End time of first slot (HH:MM:SS)
   * @param {string} start2 - Start time of second slot (HH:MM:SS)
   * @param {string} end2 - End time of second slot (HH:MM:SS)
   * @returns {boolean} True if slots overlap
   */
  timeSlotsOverlap(start1, end1, start2, end2) {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Get all courses for a student's college
   * @param {number} studentId - The ID of the student
   * @returns {Object} Result with available courses
   */
  async getAvailableCoursesForStudent(studentId) {
    try {
      const [rows] = await db.query(
        `SELECT c.course_id, c.course_code, c.course_name, c.credits,
                GROUP_CONCAT(CONCAT(t.day_of_week, ' ', t.start_time, '-', t.end_time) 
                  ORDER BY t.day_of_week, t.start_time SEPARATOR '; ') as timetable
         FROM students s
         JOIN courses c ON s.college_id = c.college_id
         LEFT JOIN timetables t ON c.course_id = t.course_id
         WHERE s.student_id = ?
         GROUP BY c.course_id, c.course_code, c.course_name, c.credits`,
        [studentId]
      );

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Error in getAvailableCoursesForStudent:', error);
      return {
        success: false,
        error: 'Failed to fetch available courses'
      };
    }
  }

  /**
   * Get enrolled courses for a student
   * @param {number} studentId - The ID of the student
   * @returns {Object} Result with enrolled courses
   */
  async getEnrolledCourses(studentId) {
    try {
      const [rows] = await db.query(
        `SELECT c.course_id, c.course_code, c.course_name, c.credits,
                sc.enrolled_at,
                GROUP_CONCAT(CONCAT(t.day_of_week, ' ', t.start_time, '-', t.end_time) 
                  ORDER BY t.day_of_week, t.start_time SEPARATOR '; ') as timetable
         FROM student_courses sc
         JOIN courses c ON sc.course_id = c.course_id
         LEFT JOIN timetables t ON c.course_id = t.course_id
         WHERE sc.student_id = ?
         GROUP BY c.course_id, c.course_code, c.course_name, c.credits, sc.enrolled_at`,
        [studentId]
      );

      return {
        success: true,
        data: rows
      };
    } catch (error) {
      console.error('Error in getEnrolledCourses:', error);
      return {
        success: false,
        error: 'Failed to fetch enrolled courses'
      };
    }
  }

  /**
   * Remove a course enrollment
   * @param {number} studentId - The ID of the student
   * @param {number} courseId - The ID of the course to drop
   * @returns {Object} Result object
   */
  async dropCourse(studentId, courseId) {
    try {
      const [result] = await db.query(
        'DELETE FROM student_courses WHERE student_id = ? AND course_id = ?',
        [studentId, courseId]
      );

      if (result.affectedRows === 0) {
        return {
          success: false,
          error: 'Enrollment not found'
        };
      }

      return {
        success: true,
        message: 'Course dropped successfully'
      };
    } catch (error) {
      console.error('Error in dropCourse:', error);
      return {
        success: false,
        error: 'Failed to drop course'
      };
    }
  }
}

module.exports = new EnrollmentService();