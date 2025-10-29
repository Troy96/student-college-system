# Quick Start Guide

## Prerequisites

- Node.js (v14+) installed
- MySQL (v8.0+) running
- Git (optional)

## Step-by-Step Setup

### 1. Install Dependencies (1 minute)

```bash
npm install
```

This installs: express, mysql2, dotenv, cors

### 2. Configure Database (1 minute)

Create `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=enrollment_system
DB_PORT=3306
PORT=3000
```

### 3. Setup Database (1 minute)

```bash
npm run setup
```

This automatically:
- Creates the database
- Creates all tables
- Adds foreign keys and constraints
- Creates triggers
- Inserts sample data

### 4. Start Server (1 second)

```bash
npm start
```

You should see:
```
Server is running on port 3000
Health check: http://localhost:3000/health
API docs: http://localhost:3000/
```

### 5. Test It Works (1 minute)

**Health Check:**
```bash
curl http://localhost:3000/health
```

**Get Available Courses:**
```bash
curl http://localhost:3000/api/enrollment/available/1
```

**Enroll in Courses:**
```bash
curl -X POST http://localhost:3000/api/enrollment/enroll \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1, "courseIds": [1, 2]}'
```

**Test Conflict Detection:**
```bash
curl -X POST http://localhost:3000/api/enrollment/enroll \
  -H "Content-Type: application/json" \
  -d '{"studentId": 4, "courseIds": [1, 3]}'
```

Should return error about Tuesday timetable clash!

---

## What's Included?

### Sample Data Ready to Test

**3 Colleges:**
- MIT (ID: 1)
- Stanford (ID: 2)  
- Harvard (ID: 3)

**4 Students:**
1. John Doe (MIT) - john.doe@mit.edu
2. Jane Smith (MIT) - jane.smith@mit.edu
3. Bob Johnson (Stanford) - bob.johnson@stanford.edu
4. Alice Williams (MIT) - alice.williams@mit.edu

**5 Courses:**
1. CS101 - Intro to CS (MIT) - Mon 9-10, Tue 10-11
2. MA204 - Linear Algebra (MIT) - Mon 10-11, Wed 9-10
3. AP105 - Physics I (MIT) - Tue 10-11, Thu 3-6
4. CS201 - Data Structures (MIT) - Wed 10-12, Fri 2-4
5. CS102 - Programming (Stanford) - Mon 9-11

---

## Quick Test Scenarios

### ✅ Scenario 1: Successful Enrollment
```bash
curl -X POST http://localhost:3000/api/enrollment/enroll \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1, "courseIds": [1, 4]}'
```
✅ Should succeed - no conflicts

### ❌ Scenario 2: Timetable Clash
```bash
curl -X POST http://localhost:3000/api/enrollment/enroll \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1, "courseIds": [1, 3]}'
```
❌ Should fail - CS101 and AP105 clash on Tuesday

### ❌ Scenario 3: Cross-College Enrollment
```bash
curl -X POST http://localhost:3000/api/enrollment/enroll \
  -H "Content-Type: application/json" \
  -d '{"studentId": 1, "courseIds": [5]}'
```
❌ Should fail - MIT student can't take Stanford course

---

## All API Endpoints

### Student Operations
```bash
# Get available courses
GET /api/enrollment/available/:studentId

# Get enrolled courses
GET /api/enrollment/enrolled/:studentId

# Enroll in courses
POST /api/enrollment/enroll
Body: {"studentId": 1, "courseIds": [1, 2]}

# Drop a course
DELETE /api/enrollment/drop
Body: {"studentId": 1, "courseId": 1}
```

### Admin Operations
```bash
# Add timetable slot
POST /api/admin/timetable
Body: {"courseId": 1, "dayOfWeek": "Monday", "startTime": "09:00:00", "endTime": "10:00:00"}

# Update timetable
PUT /api/admin/timetable/:timetableId
Body: {"startTime": "10:00:00"}

# Delete timetable
DELETE /api/admin/timetable/:timetableId

# Get course timetables
GET /api/admin/timetable/:courseId

# Add new course
POST /api/admin/course
Body: {"courseCode": "CS301", "courseName": "Algorithms", "collegeId": 1, "credits": 4}

# Get enrolled students
GET /api/admin/course/:courseId/students
```

---

## Troubleshooting

### "Cannot connect to database"
- Check MySQL is running: `mysql --version`
- Verify credentials in `.env`
- Test connection: `mysql -u root -p`

### "Database already exists"
```bash
mysql -u root -p
DROP DATABASE enrollment_system;
exit
npm run setup
```

### "Port 3000 already in use"
Change in `.env`:
```env
PORT=3001
```

### "Module not found"
```bash
rm -rf node_modules
npm install
```

---

## Using Postman

1. Import `postman_collection.json`
2. Set variable `base_url` to `http://localhost:3000`
3. Start testing!

---

## Project Structure

```
├── config/
│   └── database.js       # DB connection
├── services/
│   ├── enrollmentService.js   # Core logic
│   └── adminService.js        # Admin ops
├── routes/
│   ├── enrollment.js     # Student APIs
│   └── admin.js          # Admin APIs
├── dbSchema.sql            # Database setup
├── app.js             # Express app
├── package.json          # Dependencies
└── .env                  # Configuration
```

---

## Development Mode

For auto-restart on code changes:
```bash
npm run dev
```

Requires nodemon (included in devDependencies).
