try {
    require('dotenv').config();
} catch (error) { console.log("Dotenv not found but it's okay for production"); }

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
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("🚀 MongoDB Connected Successfully"))
    .catch(err => console.error("❌ DB Connection Error:", err));

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

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// --- Database Models ---

// Student Schema (New Students - Batch 2026)
const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch: { type: String, default: "2026" },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    isFormFilled: { type: Boolean, default: false },
    challanStatus: { type: String, enum: ['Not Generated', 'Generated', 'Uploaded', 'Verified'], default: 'Not Generated' },
    profileImage: String,
    challanImage: String,
    registrationDate: { type: Date, default: Date.now },
    // Form data
    formData: {
        fName: String,
        caste: String,
        domicile: String,
        email: String,
        mobile: String,
        address: String,
        gName: String,
        gOcc: String,
        gJobAddr: String,
        gContact: String,
        gAddress: String,
        matric: { brd: String, yr: String, roll: String, grp: String, per: String },
        inter: { brd: String, yr: String, roll: String, grp: String, per: String }
    },
    uniqueId: String, // For challan
    isOldStudent: { type: Boolean, default: false }
});

// Old Student Schema (Registered by Admin)
const oldStudentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch: String,
    rollNumber: String,
    email: String,
    mobile: String,
    fatherName: String,
    caste: String,
    domicile: String,
    address: String,
    profileImage: String,
    // All form data
    formData: mongoose.Schema.Types.Mixed,
    registrationDate: { type: Date, default: Date.now },
    isOldStudent: { type: Boolean, default: true }
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
    qrCode: String,
    testDate: Date,
    availableDate: Date, // Date when slip becomes downloadable
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

const Student = mongoose.model('Student', studentSchema);
const OldStudent = mongoose.model('OldStudent', oldStudentSchema);
const Assignment = mongoose.model('Assignment', assignmentSchema);
const Result = mongoose.model('Result', resultSchema);
const Slip = mongoose.model('Slip', slipSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, default: 'admin' },
    password: { type: String, default: 'admin123' }
});
const Admin = mongoose.model('Admin', adminSchema);

// Contact Schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    submittedAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false }
});
const Contact = mongoose.model('Contact', contactSchema);

// Helper function to upload to Cloudinary
function uploadToCloudinary(buffer, folder = 'chemistry-dept') {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { folder: folder },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
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
app.post('/api/student/signup', async (req, res) => {
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
app.post('/api/student/login', async (req, res) => {
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
        const admin = await Admin.findOne({ username });
        
        if (!admin) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid && admin.password !== password) { // Support both hashed and plain for migration
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ message: "Admin login successful", token });
    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({ message: "Login error" });
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
            const uploadResult = await uploadToCloudinary(req.file.buffer, 'chemistry-dept/profiles');
            profileImageUrl = uploadResult.secure_url;
        }
        
        // Generate unique ID for challan
        const uniqueId = generateUniqueId();
        
        // Update student with form data
        student.formData = {
            fName: formData.fName,
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

// 5. Generate Challan PDF
app.get('/api/student/challan/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student || !student.isFormFilled) {
            return res.status(404).json({ message: "Student or form not found" });
        }
        
        const doc = new PDFDocument({ 
            size: 'A4', 
            layout: 'landscape',
            margin: 20
        });
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=challan-${student.uniqueId}.pdf`);
        
        doc.pipe(res);
        
        // Helper function to draw a single challan
        const drawChallan = (x, y, copyText) => {
            doc.fontSize(10);
            
            // Header with logo placeholder
            doc.rect(x, y, 240, 160).stroke();
            doc.fontSize(12).font('Helvetica-Bold').text('BS CHEMISTRY DEPARTMENT', x + 10, y + 5, { align: 'center', width: 220 });
            doc.fontSize(10).font('Helvetica').text('Govt. Boys Degree College Umerkot', x + 10, y + 20, { align: 'center', width: 220 });
            doc.fontSize(9).font('Helvetica-Bold').text(copyText, x + 10, y + 35, { align: 'center', width: 220 });
            
            doc.moveTo(x + 10, y + 45).lineTo(x + 230, y + 45).stroke();
            
            // Content
            doc.fontSize(8).font('Helvetica');
            doc.text(`Unique ID: ${student.uniqueId}`, x + 15, y + 50);
            doc.text(`Name: ${student.fullName}`, x + 15, y + 60);
            doc.text(`Father's Name: ${student.formData?.fName || 'N/A'}`, x + 15, y + 70);
            doc.text(`CNIC: ${student.cnic}`, x + 15, y + 80);
            doc.text(`Apply For: BS Chemistry (Batch 2026)`, x + 15, y + 90);
            doc.text(`Fees: Rs. 2000/-`, x + 15, y + 100);
            doc.text(`Last Date: 15-01-2026`, x + 15, y + 110);
            
            doc.moveTo(x + 10, y + 125).lineTo(x + 230, y + 125).stroke();
            
            doc.fontSize(8).text('Bank: JS BANK UMERKOT', x + 15, y + 130);
            doc.text('Account: BS CHEMISTRY GBDC UMERKOT', x + 15, y + 140);
            doc.text('Account No: 1234567890', x + 15, y + 150);
            
            doc.moveTo(x + 100, y + 155).lineTo(x + 180, y + 155).stroke();
            doc.fontSize(7).text('Signature', x + 130, y + 157, { align: 'center', width: 50 });
        };
        
        // Draw three copies
        drawChallan(20, 20, 'BANK COPY');
        drawChallan(280, 20, 'OFFICE COPY');
        drawChallan(540, 20, 'STUDENT COPY');
        
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
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const student = await Student.findById(decoded.id);
        
        if (!student || !req.file) {
            return res.status(400).json({ message: "Student not found or file missing" });
        }
        
        const uploadResult = await uploadToCloudinary(req.file.buffer, 'chemistry-dept/challans');
        student.challanImage = uploadResult.secure_url;
        student.challanStatus = 'Uploaded';
        await student.save();
        
        res.status(200).json({ message: "Challan uploaded successfully", challanImage: uploadResult.secure_url });
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

// 13. Generate Slip PDF
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
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=slip-${slip.studentCnic}.pdf`);
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(20).font('Helvetica-Bold').text('BS CHEMISTRY DEPARTMENT', { align: 'center' });
        doc.fontSize(14).font('Helvetica').text('Govt. Boys Degree College Umerkot', { align: 'center' });
        doc.moveDown();
        
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown();
        
        // Student Info
        doc.fontSize(14).font('Helvetica-Bold').text('Admission Slip', { align: 'center' });
        doc.moveDown();
        
        doc.fontSize(12).font('Helvetica');
        doc.text(`Name: ${student.fullName}`, 50, doc.y);
        doc.text(`CNIC: ${student.cnic}`, 50, doc.y + 20);
        doc.text(`Batch: ${student.batch}`, 50, doc.y + 20);
        if (slip.testDate) {
            doc.text(`Test Date: ${slip.testDate.toLocaleDateString()}`, 50, doc.y + 20);
        }
        
        doc.moveDown(2);
        
        // QR Code (as base64 image)
        if (slip.qrCode) {
            doc.image(Buffer.from(slip.qrCode, 'base64'), 400, doc.y - 100, { width: 100, height: 100 });
        }
        
        doc.moveDown(2);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        
        doc.fontSize(10).text('This slip is required for the test. Please bring a printed copy.', { align: 'center' });
        
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
app.get('/api/admin/students', async (req, res) => {
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
app.put('/api/admin/students/:id/approve', async (req, res) => {
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
app.put('/api/admin/students/:id/verify-challan', async (req, res) => {
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
app.post('/api/admin/old-students', async (req, res) => {
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
app.delete('/api/admin/students/:id', async (req, res) => {
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
app.get('/api/admin/assignments', async (req, res) => {
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
app.post('/api/admin/assignments/:id/grade', async (req, res) => {
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
app.post('/api/admin/students/:id/slip', async (req, res) => {
    try {
        const { testDate, availableDate } = req.body;
        const studentId = req.params.id;
        
        // Generate QR code
        const qrData = JSON.stringify({ studentId, testDate, timestamp: Date.now() });
        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        const qrCodeBase64 = qrCodeBuffer.toString('base64');
        
        let student = await Student.findById(studentId);
        if (!student) {
            student = await OldStudent.findById(studentId);
        }
        
        const slip = new Slip({
            studentId,
            studentCnic: student.cnic,
            qrCode: qrCodeBase64,
            testDate: testDate ? new Date(testDate) : null,
            availableDate: availableDate ? new Date(availableDate) : new Date(Date.now() - 24 * 60 * 60 * 1000) // Default: 1 day ago (available)
        });
        await slip.save();
        
        res.status(201).json({ success: true, message: "Slip created", slip });
    } catch (err) {
        console.error("Create slip error:", err);
        res.status(500).json({ message: "Create slip error" });
    }
});

// 23. Add Result
app.post('/api/admin/students/:id/results', async (req, res) => {
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
app.get('/api/admin/contact-submissions', async (req, res) => {
    try {
        const submissions = await Contact.find().sort({ submittedAt: -1 });
        res.status(200).json({ success: true, submissions });
    } catch (err) {
        console.error("Get contact submissions error:", err);
        res.status(500).json({ message: "Get contact submissions error" });
    }
});

// 25. Reply to Contact
app.post('/api/admin/contact/:id/reply', async (req, res) => {
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
app.get('/api/admin/stats', async (req, res) => {
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

// --- Server Start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
