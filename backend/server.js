const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;

// Get paths
const backendDir = __dirname;
const frontendDir = path.join(__dirname, '..', 'frontend');
const rootDir = path.join(__dirname, '..');
const assignmentsDir = path.join(backendDir, 'assignments');

// Create assignments directory if it doesn't exist
if (!fs.existsSync(assignmentsDir)) {
  fs.mkdirSync(assignmentsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, assignmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  }
});

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests for debugging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Server is running!',
    timestamp: new Date().toISOString()
  });
});

// API route: Contact form submission
app.post('/api/contact', (req, res) => {
  try {
    console.log('Contact form submission received:', req.body);
  const { name, email, subject, message } = req.body || {};

  // Validate required fields
  if (!name || !email || !subject || !message) {
      console.log('Validation failed - missing fields');
    return res.status(400).json({ 
      success: false, 
      error: 'All fields are required.' 
    });
  }

  // Create submission object
  const submission = {
    name,
    email,
    subject,
    message,
    submittedAt: new Date().toISOString()
  };

  // Save to backend folder
  const filePath = path.join(backendDir, 'contact-submissions.json');

  // Read existing submissions, append new one, and save
  fs.readFile(filePath, 'utf8', (readErr, data) => {
    let submissions = [];
    
    // If file exists and has data, parse it
    if (!readErr && data) {
      try {
        submissions = JSON.parse(data);
        if (!Array.isArray(submissions)) {
          submissions = [];
        }
      } catch (parseErr) {
        console.error('Error parsing submissions file:', parseErr);
        submissions = [];
      }
    }

    // Add new submission
    submissions.push(submission);

    // Write back to file
    fs.writeFile(filePath, JSON.stringify(submissions, null, 2), 'utf8', (writeErr) => {
      if (writeErr) {
        console.error('Error saving contact submission:', writeErr);
        return res.status(500).json({ 
          success: false, 
          error: 'Failed to save your message. Please try again later.' 
        });
      }

      console.log('Contact submission saved successfully');
      return res.json({ 
        success: true, 
        message: 'Thank you for contacting us! We will get back to you soon.' 
      });
    });
  });
  } catch (error) {
    console.error('Error in contact form handler:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again later.' 
    });
  }
});

// API route: Get all contact submissions (for admin use)
app.get('/api/contact/submissions', verifyAdminToken, (req, res) => {
  const filePath = path.join(backendDir, 'contact-submissions.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err || !data) {
      return res.json([]);
    }

    try {
      const submissions = JSON.parse(data);
      return res.json(submissions);
    } catch (parseErr) {
      console.error('Error parsing submissions:', parseErr);
      return res.json([]);
    }
  });
});

// Helper function to generate simple token
function generateToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Helper function to read users file
function readUsers() {
  const usersPath = path.join(backendDir, 'users.json');
  try {
    const data = fs.readFileSync(usersPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { students: [], admins: [] };
  }
}

// Helper function to write users file
function writeUsers(users) {
  const usersPath = path.join(backendDir, 'users.json');
  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2), 'utf8');
}

// Helper function to read assignments file
function readAssignments() {
  const assignmentsPath = path.join(backendDir, 'assignments.json');
  try {
    const data = fs.readFileSync(assignmentsPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Helper function to write assignments file
function writeAssignments(assignments) {
  const assignmentsPath = path.join(backendDir, 'assignments.json');
  fs.writeFileSync(assignmentsPath, JSON.stringify(assignments, null, 2), 'utf8');
}

// Initialize admin user if not exists
const users = readUsers();
if (users.admins.length === 0) {
  users.admins.push({
    username: 'admin',
    password: 'admin123', // Change this in production!
    name: 'Admin User',
    role: 'admin'
  });
  writeUsers(users);
}

// API route: Student login
app.post('/api/auth/login', (req, res) => {
  try {
    console.log('Login attempt:', { username: req.body?.username });
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      error: 'Username and password are required.' 
    });
  }

    const users = readUsers();
    
    // Check admin
    const admin = users.admins.find(a => a.username === username && a.password === password);
    if (admin) {
      const token = generateToken();
      admin.token = token; // Store token temporarily
      writeUsers(users);
      return res.json({ 
        success: true, 
        message: 'Login successful',
        token,
        role: 'admin',
        user: { username: admin.username, name: admin.name, role: 'admin' }
      });
    }

    // Check student
    const student = users.students.find(s => s.username === username && s.password === password);
    if (student) {
      const token = generateToken();
      student.token = token;
      writeUsers(users);
    return res.json({ 
      success: true, 
      message: 'Login successful',
        token,
        role: 'student',
        user: { username: student.username, name: student.name, role: 'student' }
    });
  }

  return res.status(401).json({ 
    success: false, 
    error: 'Invalid username or password.' 
  });
  } catch (error) {
    console.error('Error in login handler:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error. Please try again later.' 
    });
  }
});

// API route: Password recovery request
app.post('/api/auth/recovery', (req, res) => {
  const { 'recovery-id': recoveryId } = req.body || {};

  if (!recoveryId) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email or Roll Number is required.' 
    });
  }

  // Demo - in production, send email/SMS to department
  return res.json({ 
    success: true, 
    message: 'Password reset request received. The department will verify and send new credentials via email/SMS.' 
  });
});

// Serve static files from frontend folder (after API routes)
app.use(express.static(frontendDir));

// Middleware to verify admin token
function verifyAdminToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const users = readUsers();
  const admin = users.admins.find(a => a.token === token);
  if (!admin) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  req.admin = admin;
  next();
}

// Middleware to verify student token
function verifyStudentToken(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  
  const users = readUsers();
  const student = users.students.find(s => s.token === token);
  if (!student) {
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
  
  req.student = student;
  next();
}

// Admin routes
app.get('/api/admin/students', verifyAdminToken, (req, res) => {
  try {
    const users = readUsers();
    res.json({ success: true, students: users.students });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/admin/students', verifyAdminToken, (req, res) => {
  try {
    console.log('Creating student with data:', req.body);
    const { name, email, rollNumber, batch, semester } = req.body;
    
    if (!name || !email || !rollNumber || !batch || !semester) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }

    const users = readUsers();
    
    // Check if roll number or email already exists
    const existingStudent = users.students.find(s => s.rollNumber === rollNumber || s.email === email);
    if (existingStudent) {
      console.log('Student already exists:', existingStudent);
      return res.status(400).json({ success: false, error: 'Student with this roll number or email already exists' });
    }

    // Generate username from name and roll number, starting with @
    // Format: @firstname_lastname_rollnumber (all lowercase, no spaces)
    const nameParts = name.toLowerCase().trim().split(/\s+/).filter(part => part.length > 0);
    const firstName = nameParts[0] || 'student';
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
    const rollClean = rollNumber.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const username = `@${firstName}${lastName ? '_' + lastName : ''}_${rollClean}`;
    const password = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    console.log('Generated username:', username);

    const newStudent = {
      id: Date.now().toString(),
      name,
      email,
      rollNumber,
      batch,
      semester,
      username,
      password,
      cgpa: null,
      coursesEnrolled: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    users.students.push(newStudent);
    writeUsers(users);

    res.json({
      success: true,
      message: 'Student created successfully',
      username,
      password,
      student: newStudent
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.delete('/api/admin/students/:id', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    users.students = users.students.filter(s => s.id !== id && s._id !== id);
    writeUsers(users);
    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.post('/api/admin/students/:id/reset-password', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const users = readUsers();
    const student = users.students.find(s => s.id === id || s._id === id);
    
    if (!student) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }

    const newPassword = Math.random().toString(36).substring(2, 10).toUpperCase();
    student.password = newPassword;
    writeUsers(users);

    res.json({ success: true, password: newPassword });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

app.get('/api/admin/stats', verifyAdminToken, (req, res) => {
  try {
    const users = readUsers();
    const assignments = readAssignments();
    res.json({
      success: true,
      totalStudents: users.students.length,
      activeStudents: users.students.filter(s => s.status === 'active').length,
      pendingRequests: assignments.filter(a => a.status !== 'graded').length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Get all assignments
app.get('/api/admin/assignments', verifyAdminToken, (req, res) => {
  try {
    const assignments = readAssignments();
    const users = readUsers();
    
    // Enrich assignments with student names
    const enrichedAssignments = assignments.map(assignment => {
      const student = users.students.find(s => s.id === assignment.studentId || s._id === assignment.studentId);
      return {
        ...assignment,
        studentName: student ? student.name : 'Unknown',
        studentRoll: student ? student.rollNumber : 'Unknown'
      };
    });
    
    res.json({ success: true, assignments: enrichedAssignments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Download assignment
app.get('/api/admin/assignments/:id/download', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const assignments = readAssignments();
    const assignment = assignments.find(a => a.id === id || a._id === id);
    
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    const filePath = path.join(assignmentsDir, assignment.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'File not found' });
    }
    
    res.download(filePath, assignment.originalFilename || assignment.filename);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Grade assignment
app.post('/api/admin/assignments/:id/grade', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const { grade } = req.body;
    
    if (!grade) {
      return res.status(400).json({ success: false, error: 'Grade is required' });
    }
    
    const assignments = readAssignments();
    const assignmentIndex = assignments.findIndex(a => a.id === id || a._id === id);
    
    if (assignmentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    
    assignments[assignmentIndex].grade = grade;
    assignments[assignmentIndex].status = 'graded';
    assignments[assignmentIndex].gradedAt = new Date().toISOString();
    
    writeAssignments(assignments);
    res.json({ success: true, message: 'Assignment graded successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Add student result
app.post('/api/admin/students/:id/results', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const { course, marks, grade, semester } = req.body;
    
    if (!course || marks === undefined || !grade || !semester) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    const users = readUsers();
    const studentIndex = users.students.findIndex(s => s.id === id || s._id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    if (!users.students[studentIndex].results) {
      users.students[studentIndex].results = [];
    }
    
    users.students[studentIndex].results.push({
      course,
      marks: parseFloat(marks),
      grade,
      semester: parseInt(semester),
      addedAt: new Date().toISOString()
    });
    
    writeUsers(users);
    res.json({ success: true, message: 'Result added successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Admin: Update student CGPA
app.put('/api/admin/students/:id/cgpa', verifyAdminToken, (req, res) => {
  try {
    const { id } = req.params;
    const { cgpa, coursesEnrolled } = req.body;
    
    if (cgpa === undefined || coursesEnrolled === undefined) {
      return res.status(400).json({ success: false, error: 'CGPA and courses enrolled are required' });
    }
    
    const users = readUsers();
    const studentIndex = users.students.findIndex(s => s.id === id || s._id === id);
    
    if (studentIndex === -1) {
      return res.status(404).json({ success: false, error: 'Student not found' });
    }
    
    users.students[studentIndex].cgpa = parseFloat(cgpa);
    users.students[studentIndex].coursesEnrolled = parseInt(coursesEnrolled);
    
    writeUsers(users);
    res.json({ success: true, message: 'CGPA updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Student routes
app.get('/api/student/profile', verifyStudentToken, (req, res) => {
  try {
    const student = req.student;
    // Remove sensitive data
    const { password, token, ...studentData } = student;
    res.json({ success: true, student: studentData });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Student: Upload assignment
app.post('/api/student/assignments/upload', verifyStudentToken, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }
    
    const { title, course } = req.body;
    if (!title || !course) {
      // Delete uploaded file if validation fails
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ success: false, error: 'Title and course are required' });
    }
    
    const assignments = readAssignments();
    const student = req.student;
    
    const newAssignment = {
      id: Date.now().toString(),
      studentId: student.id || student._id,
      title,
      course,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      status: 'pending',
      uploadedAt: new Date().toISOString(),
      grade: null
    };
    
    assignments.push(newAssignment);
    writeAssignments(assignments);
    
    res.json({ success: true, message: 'Assignment uploaded successfully', assignment: newAssignment });
  } catch (error) {
    console.error('Error uploading assignment:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
});

// Student: Get my assignments
app.get('/api/student/assignments', verifyStudentToken, (req, res) => {
  try {
    const student = req.student;
    const assignments = readAssignments();
    const studentAssignments = assignments.filter(a => 
      a.studentId === student.id || a.studentId === student._id
    );
    res.json({ success: true, assignments: studentAssignments });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Student: Get results
app.get('/api/student/results', verifyStudentToken, (req, res) => {
  try {
    const student = req.student;
    const results = student.results || [];
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ان لائنز کو اپنی موجودہ server.js میں روٹس والے حصے میں شامل کریں
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// رجسٹریشن ڈیٹا وصول کرنے کا API Route
app.post('/submit-registration', (req, res) => {
    const studentData = req.body;
    const filePath = path.join(dataDir, 'students.json');

    fs.readFile(filePath, 'utf8', (err, data) => {
        let json = [];
        if (!err && data) {
            json = JSON.parse(data);
        }
          // نیا ریکارڈ شامل کرنا
        json.push({
            id: Date.now(),
            date: new Date().toLocaleString(),
            ...studentData
        });

        fs.writeFile(filePath, JSON.stringify(json, null, 2), (err) => {
            if (err) return res.status(500).json({ error: "Failed to save data" });
            res.status(200).json({ message: "Success" });
        });
    });
});
        // سرور کو بڑی تصاویر قبول کرنے کے قابل بنائیں
        app.use(express.json({ limit: '50mb' })); 
        app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve admin dashboard and student portal routes
app.get('/admin-dashboard.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'admin-dashboard.html'));
});

app.get('/student-portal.html', (req, res) => {
  res.sendFile(path.join(frontendDir, 'student-portal.html'));
});

// Root route - serve index.html from frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Catch-all handler for 404 errors
app.use((req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ 
    success: false, 
    error: 'Route not found' 
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Frontend files served from: ${frontendDir}`);
  console.log(`📁 Backend files in: ${backendDir}`);
  console.log(`\n✅ API Endpoints available:`);
  console.log(`   POST /api/contact`);
  console.log(`   POST /api/auth/login`);
  console.log(`   POST /api/auth/recovery`);
  console.log(`   GET  /api/contact/submissions\n`);
});
