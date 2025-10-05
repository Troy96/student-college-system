const express = require('express');
const cors = require('cors');
require('dotenv').config();

const enrollmentRoutes = require('./routes/enrollment');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

console.log('Environment variables:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_PORT:', process.env.DB_PORT);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/enrollment', enrollmentRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Student Course Enrollment System is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Student Course Enrollment System API',
    version: '1.0.0',
    endpoints: {
      enrollment: {
        enroll: 'POST /api/enrollment/enroll',
        available: 'GET /api/enrollment/available/:studentId',
        enrolled: 'GET /api/enrollment/enrolled/:studentId',
        drop: 'DELETE /api/enrollment/drop'
      },
      admin: {
        addTimetable: 'POST /api/admin/timetable',
        updateTimetable: 'PUT /api/admin/timetable/:timetableId',
        deleteTimetable: 'DELETE /api/admin/timetable/:timetableId',
        getTimetables: 'GET /api/admin/timetable/:courseId',
        addCourse: 'POST /api/admin/course',
        getEnrolledStudents: 'GET /api/admin/course/:courseId/students'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: http://localhost:${PORT}/`);
});