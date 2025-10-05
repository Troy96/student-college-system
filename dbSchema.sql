-- Student Course Enrollment System Database Schema for MySQL

USE enrollment_system;

-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS student_courses;
DROP TABLE IF EXISTS timetables;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS colleges;

-- Colleges Table
CREATE TABLE colleges (
    college_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students Table
CREATE TABLE students (
    student_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    college_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE,
    INDEX idx_student_college (college_id)
);

-- Courses Table
CREATE TABLE courses (
    course_id INT AUTO_INCREMENT PRIMARY KEY,
    course_code VARCHAR(50) NOT NULL,
    course_name VARCHAR(255) NOT NULL,
    college_id INT NOT NULL,
    credits INT DEFAULT 3,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (college_id) REFERENCES colleges(college_id) ON DELETE CASCADE,
    UNIQUE KEY unique_course_college (course_code, college_id),
    INDEX idx_course_college (college_id)
);

-- Timetables Table
CREATE TABLE timetables (
    timetable_id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    day_of_week ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    CHECK (end_time > start_time),
    INDEX idx_timetable_course (course_id)
);

-- Student Course Selections Table
CREATE TABLE student_courses (
    enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE KEY unique_student_course (student_id, course_id),
    INDEX idx_student_courses (student_id),
    INDEX idx_course_students (course_id)
);

-- Trigger to prevent students from enrolling in courses from different colleges
DELIMITER //

CREATE TRIGGER check_student_course_college_before_insert
BEFORE INSERT ON student_courses
FOR EACH ROW
BEGIN
    DECLARE student_college INT;
    DECLARE course_college INT;
    
    SELECT college_id INTO student_college FROM students WHERE student_id = NEW.student_id;
    SELECT college_id INTO course_college FROM courses WHERE course_id = NEW.course_id;
    
    IF student_college != course_college THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Student and course must belong to the same college';
    END IF;
END//

-- Trigger to prevent timetable clashes when enrolling
CREATE TRIGGER check_timetable_clash_before_insert
BEFORE INSERT ON student_courses
FOR EACH ROW
BEGIN
    DECLARE clash_count INT;
    
    SELECT COUNT(*) INTO clash_count
    FROM student_courses sc
    JOIN timetables t1 ON sc.course_id = t1.course_id
    JOIN timetables t2 ON NEW.course_id = t2.course_id
    WHERE sc.student_id = NEW.student_id
    AND t1.day_of_week = t2.day_of_week
    AND (
        (t1.start_time < t2.end_time AND t1.end_time > t2.start_time)
    );
    
    IF clash_count > 0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Timetable clash detected with existing course enrollment';
    END IF;
END//

DELIMITER ;

-- Insert sample data
INSERT INTO colleges (name) VALUES 
('Massachusetts Institute of Technology'),
('Stanford University'),
('Harvard University');

INSERT INTO students (name, email, college_id) VALUES
('John Doe', 'john.doe@mit.edu', 1),
('Jane Smith', 'jane.smith@mit.edu', 1),
('Bob Johnson', 'bob.johnson@stanford.edu', 2),
('Alice Williams', 'alice.williams@mit.edu', 1);

INSERT INTO courses (course_code, course_name, college_id, credits) VALUES
('CS101', 'Introduction to Computer Science', 1, 4),
('MA204', 'Linear Algebra', 1, 3),
('AP105', 'Physics I', 1, 4),
('CS201', 'Data Structures', 1, 4),
('CS102', 'Programming Fundamentals', 2, 3);

INSERT INTO timetables (course_id, day_of_week, start_time, end_time) VALUES
-- CS101: Mon 9-10, Tue 10-11
(1, 'Monday', '09:00:00', '10:00:00'),
(1, 'Tuesday', '10:00:00', '11:00:00'),
-- MA204: Mon 10-11, Wed 9-10
(2, 'Monday', '10:00:00', '11:00:00'),
(2, 'Wednesday', '09:00:00', '10:00:00'),
-- AP105: Tue 10-11, Thu 15-18 (clash with CS101 on Tuesday)
(3, 'Tuesday', '10:00:00', '11:00:00'),
(3, 'Thursday', '15:00:00', '18:00:00'),
-- CS201: Wed 10-12, Fri 14-16
(4, 'Wednesday', '10:00:00', '12:00:00'),
(4, 'Friday', '14:00:00', '16:00:00'),
-- CS102 (Stanford): Mon 9-11
(5, 'Monday', '09:00:00', '11:00:00');