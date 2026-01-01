const dotenv = require('dotenv')
dotenv.config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const crypto = require('crypto');   
const app = express();

// --- Configuration ---
console.log("Environment Check - Cloud Name:", process.env.CLOUDINARY_CLOUD_NAME ? "Found" : "NOT FOUND");
console.log("Environment Check - MongoDB URI:", process.env.MONGODB_URI ? "Found" : "NOT FOUND");
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Define Schemas and Models FIRST (before using them) ---
// Student Schema
const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    email: String,
    phone: String,
    dob: String,
    gender: String,
    batch: String,
    fatherName: String,
    isFormFilled: { type: Boolean, default: false },
    formData: mongoose.Schema.Types.Mixed,
    uniqueId: String,
    isOldStudent: { type: Boolean, default: false },
    registrationDate: { type: Date, default: Date.now },
    challanStatus: String,
    challanImage: String,
    profileImage: String,
    status: { type: String, default: 'Pending' }
});

// Old Student Schema
const oldStudentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch: String,
    rollNumber: String,
    dob: String,
    gender: String,
    email: String,
    mobile: String,
    fatherName: String,
    profileImage: String,
    formData: mongoose.Schema.Types.Mixed,
    registrationDate: { type: Date, default: Date.now },
    isOldStudent: { type: Boolean, default: true }
});

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, default: 'admin' },
    password: { type: String, default: 'admin123' }
});

// Assignment Schema
const assignmentSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    studentCnic: String,
    title: String,
    course: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['pending', 'graded'], default: 'pending' },
    grade: String
});

// Result Schema
const resultSchema = new mongoose.Schema({
    studentCnic: { type: String, required: true },
    course: String,
    marks: Number,
    grade: String,
    semester: Number,
    createdAt: { type: Date, default: Date.now }
});

// Slip Schema
const slipSchema = new mongoose.Schema({
    studentCnic: { type: String, required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    rollNumber: String,
    qrCode: String,
    testDate: Date,
    testVenue: { type: String, default: 'Chemistry Lab' },
    availableDate: Date,
    isAvailable: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    title: String,
    message: String,
    createdAt: { type: Date, default: Date.now },
    isActive: { type: Boolean, default: true }
});

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    submittedAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false }
});

// Create Models
const Student = mongoose.model('Student', studentSchema);
const OldStudent = mongoose.model('OldStudent', oldStudentSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Result = mongoose.model('Result', resultSchema);
const Slip = mongoose.model('Slip', slipSchema);
const Notification = mongoose.model('Notification', notificationSchema);
const Admin = mongoose.model('Admin', adminSchema);
const Contact = mongoose.model('Contact', contactSchema);

// NOW connect to MongoDB (models are already defined)
let isDbConnected = false;
async function initMongo() {
    if (process.env.MONGODB_URI) {
        try {
            // Reuse existing connection in serverless environments to avoid multiple connections
            if (global._mongoose && global._mongoose.conn) {
                mongoose.connection = global._mongoose.conn;
                isDbConnected = true;
                console.log('🚀 Reusing existing MongoDB connection');
            } else {
                const conn = await mongoose.connect(process.env.MONGODB_URI, {
                    useNewUrlParser: true,
                    useUnifiedTopology: true,
                    serverSelectionTimeoutMS: 5000
                });
                isDbConnected = true;
                console.log("🚀 MongoDB Connected Successfully");
                global._mongoose = { conn };
            }

            // Initialize admin if not exists
            try {
                const adminCount = await Admin.countDocuments();
                if (adminCount === 0) {
                    const hashedPassword = await bcrypt.hash('admin123', 10);
                    const defaultAdmin = new Admin({
                        username: 'admin',
                        password: hashedPassword
                    });
                    await defaultAdmin.save();
                    console.log("✅ Default admin created (username: admin, password: admin123)");
                }
            } catch (adminErr) {
                console.error("Admin init error:", adminErr);
            }
        } catch (err) {
            isDbConnected = false;
            console.error("❌ DB Connection Error:", err);
        }
    } else {
        isDbConnected = false;
        console.warn("⚠️  MONGODB_URI not configured - database features will not work");
    }
}
initMongo();

// Email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// --- Middleware ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Security headers middleware
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://res.cloudinary.com;");
    next();
});

// Input validation middleware
const validateInput = (req, res, next) => {
    // Check for SQL injection patterns
    const sqlPattern = /('|"|;|--|\/\*|\*\/|xp_|sp_|exec|execute)/gi;
    const checkValue = (val) => {
        if (typeof val === 'string' && sqlPattern.test(val)) {
            return false;
        }
        return true;
    };
    
    // Check body
    if (req.body && typeof req.body === 'object') {
        for (let key in req.body) {
            if (!checkValue(req.body[key])) {
                return res.status(400).json({ message: "Invalid input detected" });
            }
        }
    }
    
    // Check query
    if (req.query && typeof req.query === 'object') {
        for (let key in req.query) {
            if (!checkValue(req.query[key])) {
                return res.status(400).json({ message: "Invalid input detected" });
            }
        }
    }
    
    next();
};

app.use(validateInput);

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        // Only allow safe file types
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Helper middleware to ensure DB is connected when required
function ensureDb(req, res, next) {
    if (!isDbConnected) {
        return res.status(503).json({ message: 'Service temporarily unavailable: database not connected. Please configure MONGODB_URI in your environment.' });
    }
    next();
}

// Authentication middleware for students
function authenticateStudent(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        req.studentId = decoded.id;
        req.studentCnic = decoded.cnic;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Authentication middleware for admin
function authenticateAdmin(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const decoded = jwt.verify(token, JWT_SECRET);
        // Check if it's an admin token (has username field)
        if (!decoded.username) {
            return res.status(403).json({ message: "Access denied. Admin privileges required." });
        }
        req.adminId = decoded.id;
        req.adminUsername = decoded.username;
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
    }
}

// Helper function to upload to Cloudinary
function uploadToCloudinary(buffer, folder = 'BS-Chemistry') {
    return new Promise((resolve, reject) => {
        // Check if Cloudinary is configured
        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return reject(new Error('Cloudinary is not configured. Please check your environment variables.'));
        }
        
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder },
            (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    reject(error);
                } else {
                    resolve(result);
                }
            }
        );
        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
}

// Generate unique ID for challan
function generateUniqueId() {
    return 'CHEM-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 5).toUpperCase();
}

// --- ROUTES ---

// 1. Student Sign Up
app.post('/api/student/signup', ensureDb, async (req, res) => {
    try {
        const { fullName, cnic, password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.status(400).json({ message: "Passwords do not match" });
        }
        
        const exists = await Student.findOne({ cnic });
        if (exists) {
            return res.status(400).json({ message: "CNIC already registered" });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const newStudent = new Student({ 
            fullName, 
            cnic, 
            password: hashedPassword 
        });
        await newStudent.save();
        
        res.status(201).json({ message: "Account created successfully! Please sign in." });
    } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ message: "Sign up error" });
    }
});

// 2. Student Login (New & Old)
app.post('/api/student/login', ensureDb, async (req, res) => {
    try {
        const { cnic, password } = req.body;
        
        // Check new students
        let student = await Student.findOne({ cnic });
        let isOld = false;
        
        // If not found, check old students
        if (!student) {
            student = await OldStudent.findOne({ cnic });
            isOld = true;
        }
        
        if (!student) {
            return res.status(401).json({ message: "Invalid CNIC or password" });
        }
        
        const isPasswordValid = await bcrypt.compare(password, student.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid CNIC or password" });
        }
        
        const token = jwt.sign({ id: student._id, cnic: student.cnic }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(200).json({ 
            message: "Login successful", 
            token,
            student: {
                _id: student._id,
                fullName: student.fullName,
                cnic: student.cnic,
                batch: student.batch,
                isOldStudent: isOld || student.isOldStudent
            }
        });
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ message: "Login error" });
    }
});

// 3. Admin Login
app.post('/api/admin/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // If DB is not connected, allow fallback to environment-provided admin credentials
        if (!isDbConnected) {
            const envAdminUser = process.env.ADMIN_USER || 'admin';
            const envAdminPass = process.env.ADMIN_PASS || 'admin123';
            if (username === envAdminUser && password === envAdminPass) {
                const token = jwt.sign({ id: null, username: envAdminUser }, JWT_SECRET, { expiresIn: '7d' });
                return res.status(200).json({ message: 'Admin login successful (env fallback)', token });
            }
            return res.status(503).json({ message: 'Service temporarily unavailable: database not connected. Please configure MONGODB_URI or set ADMIN_USER and ADMIN_PASS environment variables.' });
        }

        const admin = await Admin.findOne({ username });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if password is hashed or plain text
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, admin.password);
        } catch (bcryptError) {
            isPasswordValid = admin.password === password;
        }

        if (!isPasswordValid && admin.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // If password is plain text, hash it for future use
        if (admin.password === password && password !== 'admin123') {
            const hashedPassword = await bcrypt.hash(password, 10);
            admin.password = hashedPassword;
            await admin.save();
        }

        const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ message: 'Admin login successful', token });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ message: 'Login error' });
    }
});

// 4. Submit Registration Form (New Students)
app.post('/api/student/submit-form', upload.single('profileImage'), async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const student = await Student.findById(decoded.id);
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        const formData = req.body;
        
        // Upload profile image to Cloudinary
        let profileImageUrl = student.profileImage;
        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'chemistry-dept/profiles');
                profileImageUrl = uploadResult.secure_url;
            } catch (uploadError) {
                console.error('Profile image upload error:', uploadError);
                return res.status(500).json({ message: "Failed to upload profile image. Please check Cloudinary configuration." });
            }
        }
        
        // Generate unique ID for challan
        const uniqueId = generateUniqueId();
        
        // Update student with form data
        student.formData = {
            fName: formData.fName,
            dob: formData.dob,
            gender: formData.gender,
            caste: formData.caste,
            domicile: formData.domicile,
            email: formData.email,
            mobile: formData.mobile,
            address: formData.address,
            gName: formData.gName,
            gOcc: formData.gOcc,
            gJobAddr: formData.gJobAddr,
            gContact: formData.gContact,
            gAddress: formData.gAddress,
            matric: JSON.parse(formData.matric || '{}'),
            inter: JSON.parse(formData.inter || '{}')
        };
        student.profileImage = profileImageUrl;
        student.isFormFilled = true;
        student.uniqueId = uniqueId;
        student.challanStatus = 'Generated';
        await student.save();
        
        // Send email notification
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: formData.email,
                subject: 'Registration Form Submitted Successfully',
                html: `
                    <h2>Registration Form Submitted Successfully</h2>
                    <p>Dear ${formData.name || student.fullName},</p>
                    <p>Your registration form has been submitted successfully. Please generate and download your challan.</p>
                    <p>Your Unique ID: <strong>${uniqueId}</strong></p>
                    <p>Your registration status: <strong>Pending</strong></p>
                    <p>Thank you!</p>
                `
            });
        } catch (emailErr) {
            console.error("Email error:", emailErr);
        }
        
        res.status(200).json({ 
            message: "Form submitted successfully! Challan can be generated now.",
            uniqueId,
            studentId: student._id
        });
    } catch (err) {
        console.error("Form submission error:", err);
        res.status(500).json({ message: "Form submission error" });
    }
});

// 5. Generate Challan PDF (Professional Format)
app.get('/api/student/challan/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student || !student.isFormFilled) {
            return res.status(404).json({ message: "Student or form not found" });
        }
        
        const doc = new PDFDocument({ 
            size: 'A4', 
            layout: 'portrait',
            margin: 15
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=challan-${student.uniqueId}.pdf`);
        
        doc.pipe(res);
        
        // Helper function to draw a professional challan copy
        const drawChallan = (copyText) => {
            // Header background color (blue)
            doc.rect(15, 15, 565, 80).fill('#1e3a8a').stroke();
            doc.fillColor('white').fontSize(18).font('Helvetica-Bold').text('BS CHEMISTRY DEPARTMENT', 30, 25);
            doc.fontSize(11).text('Government Boys Degree College Umerkot', 30, 48);
            doc.fontSize(10).font('Helvetica').text('Sindh, Pakistan', 30, 63);
            
            // Copy type badge
            doc.rect(470, 25, 90, 30).fill('#dc2626').stroke();
            doc.fillColor('white').fontSize(12).font('Helvetica-Bold').text(copyText, 475, 32, { width: 80, align: 'center' });
            
            // Content box
            doc.moveTo(15, 100).lineTo(580, 100).stroke();
            doc.fillColor('black').fontSize(9);
            
            doc.fontSize(10).font('Helvetica-Bold').text('ADMISSION FEE CHALLAN', 20, 110);
            
            doc.moveTo(15, 130).lineTo(580, 130).stroke();
            
            // Student Details
            doc.fontSize(9).font('Helvetica');
            doc.text(`Unique ID: ${student.uniqueId}`, 20, 140);
            doc.text(`Student Name: ${student.fullName}`, 20, 155);
            doc.text(`Father's Name: ${student.formData?.fName || 'N/A'}`, 20, 170);
            doc.text(`CNIC: ${student.cnic}`, 20, 185);
            doc.text(`Program: BS Chemistry (Batch 2026)`, 20, 200);
            
            doc.moveTo(15, 215).lineTo(580, 215).stroke();
            
            // Fee Details
            doc.fontSize(10).font('Helvetica-Bold').text('FEE DETAILS', 20, 225);
            doc.fontSize(9).font('Helvetica');
            doc.text(`Admission Fee: Rs. 2,000/-`, 20, 242);
            doc.text(`Due Date: 15-01-2026`, 20, 257);
            
            doc.moveTo(15, 270).lineTo(580, 270).stroke();
            
            // Bank Details
            doc.fontSize(10).font('Helvetica-Bold').text('DEPOSIT TO:', 20, 280);
            doc.fontSize(9).font('Helvetica');
            doc.text(`Bank Name: JS BANK`, 20, 297);
            doc.text(`Branch: Umerkot`, 20, 312);
            doc.text(`Account Title: BS Chemistry Department`, 20, 327);
            doc.text(`Account Number: 1234567890`, 20, 342);
            
            doc.moveTo(15, 360).lineTo(580, 360).stroke();
            
            // Signature line
            doc.fontSize(8).text('Student Signature', 50, 375);
            doc.moveTo(20, 370).lineTo(150, 370).stroke();
            
            doc.fontSize(8).text('Bank Officer', 250, 375);
            doc.moveTo(220, 370).lineTo(350, 370).stroke();
            
            doc.fontSize(8).text('College Seal', 420, 375);
            doc.moveTo(400, 370).lineTo(530, 370).stroke();
            
            // Footer notes
            doc.fontSize(7).fillColor('#666').text('Note: This challan is valid for 30 days from the issue date.', 20, 400);
            doc.text('Please attach this challan with your admission form and upload the paid challan image online.', 20, 412);
            
            doc.addPage();
        };
        
        // Draw three copies: Bank, Office, Student
        drawChallan('BANK COPY');
        drawChallan('OFFICE COPY');
        drawChallan('STUDENT COPY');
        
        doc.end();
    } catch (err) {
        console.error("Challan generation error:", err);
        res.status(500).json({ message: "Challan generation error" });
    }
});

// 6. Upload Challan Image
app.post('/api/student/upload-challan', upload.single('challanImage'), async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        if (!req.file) {
            return res.status(400).json({ message: "File missing" });
        }

        // Server-side validation: only accept image files for challan
        if (!req.file.mimetype || !req.file.mimetype.startsWith('image/')) {
            return res.status(400).json({ message: "Invalid file type. Please upload an image (jpg, png)." });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        let student = await Student.findById(decoded.id);
        let isOld = false;
        
        if (!student) {
            student = await OldStudent.findById(decoded.id);
            isOld = true;
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'chemistry-dept/challans');
            
            // Only new students have challanStatus field
            if (!isOld && student.challanStatus !== undefined) {
                student.challanImage = uploadResult.secure_url;
                student.challanStatus = 'Uploaded';
            } else {
                // For old students, just save the image URL
                student.challanImage = uploadResult.secure_url;
            }
            
            await student.save();
            
            res.status(200).json({ message: "Challan uploaded successfully", challanImage: uploadResult.secure_url });
        } catch (uploadError) {
            console.error("Challan upload error:", uploadError);
            return res.status(500).json({ message: "Failed to upload challan image. Please check Cloudinary configuration." });
        }
    } catch (err) {
        console.error("Challan upload error:", err);
        res.status(500).json({ message: "Challan upload error" });
    }
});

// 7. Get Student Profile
app.get('/api/student/profile', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        let student = await Student.findById(decoded.id);
        let isOld = false;
        
        if (!student) {
            student = await OldStudent.findById(decoded.id);
            isOld = true;
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        res.status(200).json({ success: true, student, isOldStudent: isOld || student.isOldStudent });
    } catch (err) {
        console.error("Profile error:", err);
        res.status(500).json({ message: "Profile error" });
    }
});

// 8. Upload Assignment
app.post('/api/student/assignments/upload', upload.single('file'), async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        let student = await Student.findById(decoded.id);
        if (!student) {
            student = await OldStudent.findById(decoded.id);
        }
        
        if (!student || !req.file) {
            return res.status(400).json({ message: "Student not found or file missing" });
        }
        
        try {
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'chemistry-dept/assignments');
            
            const assignment = new Assignment({
                studentId: student._id,
                studentCnic: student.cnic,
                title: req.body.title,
                course: req.body.course,
                fileUrl: uploadResult.secure_url
            });
            await assignment.save();
            
            res.status(200).json({ success: true, message: "Assignment uploaded successfully" });
        } catch (uploadError) {
            console.error("Assignment upload error:", uploadError);
            return res.status(500).json({ message: "Failed to upload assignment. Please check Cloudinary configuration." });
        }
    } catch (err) {
        console.error("Assignment upload error:", err);
        res.status(500).json({ message: "Assignment upload error" });
    }
});

// 9. Get Student Assignments
app.get('/api/student/assignments', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const assignments = await Assignment.find({ studentId: decoded.id }).sort({ uploadedAt: -1 });
        
        res.status(200).json({ success: true, assignments });
    } catch (err) {
        console.error("Get assignments error:", err);
        res.status(500).json({ message: "Get assignments error" });
    }
});

// 10. Get Student Results
app.get('/api/student/results', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        let student = await Student.findById(decoded.id);
        if (!student) {
            student = await OldStudent.findById(decoded.id);
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        const results = await Result.find({ studentCnic: student.cnic }).sort({ semester: 1 });
        res.status(200).json({ success: true, results });
    } catch (err) {
        console.error("Get results error:", err);
        res.status(500).json({ message: "Get results error" });
    }
});

// 11. Get Notifications
app.get('/api/student/notifications', async (req, res) => {
    try {
        const notifications = await Notification.find({ isActive: true }).sort({ createdAt: -1 }).limit(10);
        res.status(200).json({ success: true, notifications });
    } catch (err) {
        console.error("Get notifications error:", err);
        res.status(500).json({ message: "Get notifications error" });
    }
});

// 12. Get Student Slip
app.get('/api/student/slip', async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const slip = await Slip.findOne({ studentId: decoded.id });
        
        if (!slip) {
            return res.status(404).json({ message: "Slip not found" });
        }
        
        const now = new Date();
        if (slip.availableDate && now < slip.availableDate) {
            return res.status(403).json({ message: "Slip is not available yet. Available from: " + slip.availableDate.toLocaleDateString() });
        }
        
        res.status(200).json({ success: true, slip });
    } catch (err) {
        console.error("Get slip error:", err);
        res.status(500).json({ message: "Get slip error" });
    }
});

// 13. Generate Slip PDF (Professional Format - University Style)
app.get('/api/student/slip/pdf/:slipId', async (req, res) => {
    try {
        const slip = await Slip.findById(req.params.slipId);
        if (!slip) {
            return res.status(404).json({ message: "Slip not found" });
        }
        
        const now = new Date();
        if (slip.availableDate && now < slip.availableDate) {
            return res.status(403).json({ message: "Slip is not available yet" });
        }
        
        let student = await Student.findById(slip.studentId);
        if (!student) {
            student = await OldStudent.findById(slip.studentId);
        }
        
        const doc = new PDFDocument({ size: 'A4', margin: 20 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=slip-${slip.rollNumber || slip.studentCnic}.pdf`);
        
        doc.pipe(res);
        
        // White background
        doc.rect(0, 0, 595, 842).fill('white');
        
        // TOP SECTION: Logo (left), Department/College info (center), QR Code (right)
        const logoX = 30;
        const logoY = 30;
        
        // Logo placeholder - "Chem"
        doc.rect(logoX, logoY, 60, 60).stroke();
        doc.font('Helvetica-Bold').fontSize(28).fillColor('#1e3a8a').text('Chem', logoX + 5, logoY + 15, { width: 50, align: 'center' });
        
        // Department and College Name (Center top)
        const centerX = 200;
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#000').text('Department of Chemistry', centerX, logoY + 10, { align: 'center', width: 180 });
        doc.fontSize(11).font('Helvetica').text('Government Boys Degree College Umerkot', centerX, logoY + 35, { align: 'center', width: 180 });
        
        // QR Code (Right side, top)
        if (slip.qrCode) {
            doc.image(Buffer.from(slip.qrCode, 'base64'), 500, logoY, { width: 65, height: 65 });
        } else {
            doc.rect(500, logoY, 65, 65).stroke();
        }
        
        // Red banner with "ENTRY TEST SLIP"
        const bannerY = 110;
        doc.rect(30, bannerY, 535, 45).fill('#dc2626');
        doc.fontSize(24).font('Helvetica-Bold').fillColor('white').text('ENTRY TEST SLIP', 30, bannerY + 8, { width: 535, align: 'center' });
        
        // MAIN CONTENT AREA
        let contentY = bannerY + 60;
        
        // Left side: Student Info (in one div, no lines between fields)
        const infoX = 30;
        const infoWidth = 300;
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('STUDENT INFORMATION', infoX, contentY);
        contentY += 20;
        
        doc.fontSize(9).font('Helvetica').fillColor('#000');
        const infoLines = [
            `Roll Number:  ${slip.rollNumber || 'N/A'}`,
            `Name:  ${student.fullName || 'N/A'}`,
            `Father's Name:  ${student.fatherName || student.formData?.fName || 'N/A'}`,
            `CNIC:  ${student.cnic || 'N/A'}`,
            `Date of Birth:  ${student.dob || 'N/A'}`,
            `Email:  ${student.email || 'N/A'}`,
            `Phone:  ${student.phone || student.formData?.phone || 'N/A'}`
        ];
        
        infoLines.forEach(line => {
            doc.text(line, infoX, contentY, { width: infoWidth });
            contentY += 15;
        });
        
        // Right side: Student Photo in border
        const photoX = 380;
        const photoY = bannerY + 60;
        const photoW = 140;
        const photoH = 170;
        
        // Photo border
        doc.rect(photoX, photoY, photoW, photoH).stroke('#999');
        
        if (student.profileImage) {
            try {
                // Use https/http module to fetch image
                const url = require('url');
                const https = require('https');
                const http = require('http');
                const parsedUrl = url.parse(student.profileImage);
                const client = parsedUrl.protocol === 'https:' ? https : http;
                
                const photoBuffer = await new Promise((resolve, reject) => {
                    client.get(student.profileImage, (res) => {
                        if (res.statusCode !== 200) {
                            reject(new Error(`Failed to fetch image: ${res.statusCode}`));
                            return;
                        }
                        const chunks = [];
                        res.on('data', chunk => chunks.push(chunk));
                        res.on('end', () => resolve(Buffer.concat(chunks)));
                        res.on('error', reject);
                    }).on('error', reject);
                });
                
                doc.image(photoBuffer, photoX + 2, photoY + 2, { width: photoW - 4, height: photoH - 4, fit: [photoW - 4, photoH - 4] });
            } catch (photoErr) {
                console.log('Could not fetch student photo:', photoErr.message);
                doc.fontSize(10).fillColor('#999').text('Photo', photoX, photoY + 70, { width: photoW, align: 'center' });
            }
        } else {
            doc.fontSize(10).fillColor('#999').text('Photo', photoX, photoY + 70, { width: photoW, align: 'center' });
        }
        
        // Divider line
        const dividerY = contentY;
        doc.moveTo(30, dividerY).lineTo(565, dividerY).stroke('#ccc');
        
        contentY = dividerY + 20;
        
        // Test Details Section
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e3a8a').text('TEST DETAILS', 30, contentY);
        contentY += 18;
        
        doc.fontSize(9).font('Helvetica').fillColor('#000');
        const testLines = [
            `Test Date:  ${slip.testDate ? slip.testDate.toLocaleDateString() : 'To be announced'}`,
            `Test Time:  10:00 AM - 01:00 PM`,
            `Test Venue:  ${slip.testVenue || 'Chemistry Lab, Chemistry Department'}`,
            `Duration:  3 Hours`,
            `Total Marks:  100`
        ];
        
        testLines.forEach(line => {
            doc.text(line, 30, contentY);
            contentY += 15;
        });
        
        // Divider line
        contentY += 5;
        doc.moveTo(30, contentY).lineTo(565, contentY).stroke('#ccc');
        contentY += 15;
        
        // Important Instructions
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#dc2626').text('⚠ IMPORTANT INSTRUCTIONS', 30, contentY);
        contentY += 16;
        
        doc.fontSize(8).font('Helvetica').fillColor('#000');
        const instructions = [
            '• This slip is mandatory for entry to the test center. Bring original printed copy.',
            '• Report 15 minutes before the scheduled test time. Gates close at test start time.',
            '• Bring valid CNIC/Passport and this printed slip as proof of identity.',
            '• No electronic devices (mobile phones, calculators, smartwatches) allowed inside the test center.',
            '• No unauthorized materials, notes, or books permitted. Violators will be disqualified.',
            '• Maintain complete silence and follow invigilator instructions at all times.',
            '• Use only black/blue ballpoint pen for marking answers. Pencil marks may not be recognized.',
            '• Any form of cheating or malpractice will result in immediate disqualification.'
        ];
        
        instructions.forEach(instruction => {
            doc.text(instruction, 30, contentY, { width: 535 });
            contentY += 13;
        });
        
        // Footer
        contentY += 10;
        doc.moveTo(30, contentY).lineTo(565, contentY).stroke('#ccc');
        contentY += 12;
        
        doc.fontSize(7).fillColor('#666').font('Helvetica').text('This is an electronically generated slip. For any discrepancies in the details, contact the Chemistry Department office immediately.', 30, contentY, { width: 535 });
        contentY += 12;
        doc.text(`Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()} | Slip ID: ${slip._id.toString().substring(0, 8).toUpperCase()}`, 30, contentY);
        
        doc.end();
    } catch (err) {
        console.error("Slip PDF error:", err);
        res.status(500).json({ message: "Slip PDF error" });
    }
});

// 14. Check Result by CNIC (Public)
app.post('/api/results/check', async (req, res) => {
    try {
        const { cnic } = req.body;
        const results = await Result.find({ studentCnic: cnic }).sort({ semester: 1 });
        res.status(200).json({ success: true, results });
    } catch (err) {
        console.error("Check result error:", err);
        res.status(500).json({ message: "Check result error" });
    }
});

// --- ADMIN ROUTES ---

// 15. Get All Students (Admin)
app.get('/api/admin/students', authenticateAdmin, async (req, res) => {
    try {
        const newStudents = await Student.find().sort({ registrationDate: -1 });
        const oldStudents = await OldStudent.find().sort({ registrationDate: -1 });
        res.status(200).json({ 
            success: true, 
            students: [...newStudents, ...oldStudents.map(s => ({ ...s.toObject(), isOldStudent: true }))] 
        });
    } catch (err) {
        console.error("Get students error:", err);
        res.status(500).json({ message: "Get students error" });
    }
});

// 16. Approve/Reject Student Registration
app.put('/api/admin/students/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const student = await Student.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Send email
        if (student.formData?.email) {
            try {
                await transporter.sendMail({
                    from: process.env.EMAIL_USER,
                    to: student.formData.email,
                    subject: `Registration ${status}`,
                    html: `<p>Your registration has been ${status.toLowerCase()}.</p>`
                });
            } catch (emailErr) {
                console.error("Email error:", emailErr);
            }
        }
        
        res.status(200).json({ success: true, message: `Student ${status.toLowerCase()}` });
    } catch (err) {
        console.error("Approve student error:", err);
        res.status(500).json({ message: "Approve student error" });
    }
});

// 17. Verify Challan
app.put('/api/admin/students/:id/verify-challan', authenticateAdmin, async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id, 
            { challanStatus: 'Verified' }, 
            { new: true }
        );
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({ success: true, message: "Challan verified" });
    } catch (err) {
        console.error("Verify challan error:", err);
        res.status(500).json({ message: "Verify challan error" });
    }
});

// 18. Register Old Student (Admin)
app.post('/api/admin/old-students', authenticateAdmin, async (req, res) => {
    try {
        const { fullName, cnic, batch, rollNumber, email, mobile, fatherName, caste, domicile, address, formData, password } = req.body;
        
        const exists = await OldStudent.findOne({ cnic });
        if (exists) {
            return res.status(400).json({ message: "CNIC already registered" });
        }
        
        const hashedPassword = await bcrypt.hash(password || cnic, 10);
        const oldStudent = new OldStudent({
            fullName,
            cnic,
            password: hashedPassword,
            batch,
            rollNumber,
            email,
            mobile,
            fatherName,
            caste,
            domicile,
            address,
            formData: formData || {}
        });
        await oldStudent.save();
        
        res.status(201).json({ 
            success: true, 
            message: "Old student registered successfully",
            student: oldStudent,
            password: password || cnic // Return password for admin to share
        });
    } catch (err) {
        console.error("Register old student error:", err);
        res.status(500).json({ message: "Register old student error" });
    }
});

// 19. Delete Student
app.delete('/api/admin/students/:id', authenticateAdmin, async (req, res) => {
    try {
        const { oldStudent } = req.query;
        
        if (oldStudent === 'true') {
            await OldStudent.findByIdAndDelete(req.params.id);
        } else {
            await Student.findByIdAndDelete(req.params.id);
        }
        
        res.status(200).json({ success: true, message: "Student deleted" });
    } catch (err) {
        console.error("Delete student error:", err);
        res.status(500).json({ message: "Delete student error" });
    }
});

// 20. Get All Assignments (Admin)
app.get('/api/admin/assignments', authenticateAdmin, async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ uploadedAt: -1 });
    
    // Populate student info
    const assignmentsWithStudent = await Promise.all(assignments.map(async (assignment) => {
      const assignmentObj = assignment.toObject();
      let student = await Student.findById(assignment.studentId);
      if (!student) {
        student = await OldStudent.findById(assignment.studentId);
      }
      if (student) {
        assignmentObj.studentId = {
          _id: student._id,
          fullName: student.fullName,
          cnic: student.cnic
        };
      }
      return assignmentObj;
    }));
    
    res.status(200).json({ success: true, assignments: assignmentsWithStudent });
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ message: "Get assignments error" });
  }
});

// 21. Grade Assignment
app.post('/api/admin/assignments/:id/grade', authenticateAdmin, async (req, res) => {
    try {
        const { grade } = req.body;
        const assignment = await Assignment.findByIdAndUpdate(
            req.params.id,
            { grade, status: 'graded' },
            { new: true }
        );
        if (!assignment) {
            return res.status(404).json({ message: "Assignment not found" });
        }
        res.status(200).json({ success: true, message: "Assignment graded" });
    } catch (err) {
        console.error("Grade assignment error:", err);
        res.status(500).json({ message: "Grade assignment error" });
    }
});

// 22. Upload Slip for Student
app.post('/api/admin/students/:id/slip', authenticateAdmin, async (req, res) => {
    try {
        const { testDate, rollNumber, availableDate } = req.body;
        const studentId = req.params.id;
        
        if (!rollNumber) {
            return res.status(400).json({ message: "Roll Number is required" });
        }
        
        // Generate QR code
        const qrData = JSON.stringify({ studentId, rollNumber, testDate, timestamp: Date.now() });
        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        const qrCodeBase64 = qrCodeBuffer.toString('base64');
        
        let student = await Student.findById(studentId);
        if (!student) {
            student = await OldStudent.findById(studentId);
        }
        
        const slip = new Slip({
            studentId,
            studentCnic: student.cnic,
            rollNumber,
            qrCode: qrCodeBase64,
            testDate: testDate ? new Date(testDate) : null,
            testVenue: 'Chemistry Lab',
            availableDate: availableDate ? new Date(availableDate) : new Date()
        });
        await slip.save();
        
        res.status(201).json({ success: true, message: "Slip created", slip });
    } catch (err) {
        console.error("Create slip error:", err);
        res.status(500).json({ message: "Create slip error" });
    }
});

// 23. Add Result
app.post('/api/admin/students/:id/results', authenticateAdmin, async (req, res) => {
    try {
        let student = await Student.findById(req.params.id);
        if (!student) {
            student = await OldStudent.findById(req.params.id);
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        const result = new Result({
            studentCnic: student.cnic,
            course: req.body.course,
            marks: req.body.marks,
            grade: req.body.grade,
            semester: req.body.semester
        });
        await result.save();
        
        res.status(201).json({ success: true, message: "Result added", result });
    } catch (err) {
        console.error("Add result error:", err);
        res.status(500).json({ message: "Add result error" });
    }
});

// 24. Get Contact Submissions
app.get('/api/admin/contact-submissions', authenticateAdmin, async (req, res) => {
    try {
        const submissions = await Contact.find().sort({ submittedAt: -1 });
        res.status(200).json({ success: true, submissions });
    } catch (err) {
        console.error("Get contact submissions error:", err);
        res.status(500).json({ message: "Get contact submissions error" });
    }
});

// 25. Reply to Contact
app.post('/api/admin/contact/:id/reply', authenticateAdmin, async (req, res) => {
    try {
        const { replyMessage } = req.body;
        const contact = await Contact.findById(req.params.id);
        
        if (!contact) {
            return res.status(404).json({ message: "Contact not found" });
        }
        
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: contact.email,
            subject: `Re: ${contact.subject}`,
            html: `<p>${replyMessage}</p>`
        });
        
        contact.replied = true;
        await contact.save();
        
        res.status(200).json({ success: true, message: "Reply sent" });
    } catch (err) {
        console.error("Reply contact error:", err);
        res.status(500).json({ message: "Reply contact error" });
    }
});

// 26. Get Admin Stats
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
    try {
        const totalStudents = await Student.countDocuments() + await OldStudent.countDocuments();
        const activeStudents = await Student.countDocuments({ status: 'Approved' }) + await OldStudent.countDocuments();
        const pendingRequests = await Student.countDocuments({ status: 'Pending' });
        
        res.status(200).json({ 
            success: true, 
            totalStudents, 
            activeStudents, 
            pendingRequests 
        });
    } catch (err) {
        console.error("Get stats error:", err);
        res.status(500).json({ message: "Get stats error" });
    }
});

// 27. Contact Form Submission
app.post('/api/contact', async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();
        res.status(200).json({ success: true, message: "Message received. We will contact you soon." });
    } catch (err) {
        console.error("Contact form error:", err);
        res.status(500).json({ message: "Contact form error" });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all for unmapped routes - serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// --- Server Start ---
const PORT = process.env.PORT || 3000;
// Export the Express app for serverless platforms and tests
module.exports = app;

// If this file is run directly (node server.js), start the HTTP server.
if (require.main === module) {
    if (!process.env.VERCEL) {
        app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
    }
}
