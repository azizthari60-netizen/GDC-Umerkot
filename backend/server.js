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
const https = require('https');
const http = require('http');
const fs = require('fs');
const app = express();

// --- Configuration ---
console.log("Environment Check - Cloud ssName:", process.env.CLOUDINARY_CLOUD_NAME ? "Found" : "NOT FOUND");
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("🚀 MongoDB Connected Successfully");
        // Initialize admin if not exists
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
    })
    .catch(err => console.error("❌ DB Connection Error:", err));

// Email transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER || 'chemisrty.gdcu@gmail.com',
        pass: process.env.EMAIL_PASS || '123'
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
    status: { type: String, enum: ['Pending', 'Challan Verified', 'Approved', 'Rejected'], default: 'Pending' },
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
        dob: String,
        gender: String,
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
    dob: String,
    gender: String,
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
    rollNumber: String, // Format: Chem/batch/2026/001
    availableDate: Date, // Date when slip becomes downloadable
    isAvailable: { type: Boolean, default: true }, // Default to true for immediate availability
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
function generateUniqueId(serialNo) {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const dateStr = '${day}${month}${year}';
    const formattedSerial = String(serialNo).padStart(3, '0');

    return 'CHEM-${dateStr}-${formattedSerial}';
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
        
        const studentCount = await Student.countDocuments();
        const nextSerialNo = studentCount + 1;
        const uniqueId = generateUniqueId(nextSerialNo);

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
        
        // Check if password is hashed or plain text
        let isPasswordValid = false;
        try {
            isPasswordValid = await bcrypt.compare(password, admin.password);
        } catch (bcryptError) {
            // If bcrypt compare fails, might be plain text
            isPasswordValid = admin.password === password;
        }
        
        // Also check plain text for migration purposes
        if (!isPasswordValid && admin.password !== password) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        
        // If password is plain text, hash it for future use
        if (admin.password === password && password !== 'admin123') {
            const hashedPassword = await bcrypt.hash(password, 10);
            admin.password = hashedPassword;
            await admin.save();
        }
        
        const token = jwt.sign({ id: admin._id, username: admin.username }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ message: "Admin login successful", token });
    } catch (err) {
        console.error("Admin login error:", err);
        res.status(500).json({ message: "Login error" });
    }
});

// 3.5. Password Recovery Request
app.post('/api/student/recovery', async (req, res) => {
    try {
        const { 'recovery-id': recoveryId } = req.body;
        
        if (!recoveryId) {
            return res.status(400).json({ message: "Email or Roll Number is required" });
        }
        
        // Check in new students by email or roll number
        let student = await Student.findOne({
            $or: [
                { 'formData.email': recoveryId },
                { rollNumber: recoveryId }
            ]
        });
        
        // If not found, check old students
        if (!student) {
            student = await OldStudent.findOne({
                $or: [
                    { email: recoveryId },
                    { rollNumber: recoveryId }
                ]
            });
        }
        
        if (!student) {
            return res.status(404).json({ message: "No account found with the provided email or roll number." });
        }
        
        // Send email notification to admin/student about password recovery request
        try {
            const adminEmail = process.env.EMAIL_USER || 'chemisrty.gdcu@gmail.com';
            await transporter.sendMail({
                from: adminEmail,
                to: adminEmail,
                subject: 'Password Recovery Request',
                html: `
                    <h2>Password Recovery Request</h2>
                    <p>A password recovery request has been submitted for:</p>
                    <ul>
                        <li><strong>Name:</strong> ${student.fullName}</li>
                        <li><strong>CNIC:</strong> ${student.cnic}</li>
                        <li><strong>Email/Roll Number:</strong> ${recoveryId}</li>
                    </ul>
                    <p>Please verify and reset the password for this student.</p>
                `
            });
            
            // Also send confirmation to student if email is available
            const studentEmail = student.formData?.email || student.email;
            if (studentEmail) {
                await transporter.sendMail({
                    from: adminEmail,
                    to: studentEmail,
                    subject: 'Password Recovery Request Received',
                    html: `
                        <h2>Password Recovery Request Received</h2>
                        <p>Dear ${student.fullName},</p>
                        <p>Your password recovery request has been received. The department will verify your information and reset your password.</p>
                        <p>You will receive your new credentials via email once the verification is complete.</p>
                        <p>Thank you!</p>
                    `
                });
            }
        } catch (emailErr) {
            console.error("Email error:", emailErr);
            // Continue even if email fails
        }
        
        res.status(200).json({ 
            message: "Password recovery request submitted successfully. The department will verify and reset your password. You will receive an email with new credentials once verified." 
        });
    } catch (err) {
        console.error("Password recovery error:", err);
        res.status(500).json({ message: "Password recovery error" });
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
            caste: formData.caste,
            domicile: formData.domicile,
            dob: formData.dob,
            gender: formData.gender,
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
                from: process.env.EMAIL_USER || 'chemisrty.gdcu@gmail.com',
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
        
        // Validate student has uniqueId
        if (!student.uniqueId) {
            return res.status(400).json({ message: "Student unique ID not found. Please submit the form first." });
        }
        
        const doc = new PDFDocument({ 
            size: 'A4', 
            layout: 'landscape',
            margin: 20
        });
        
        // Set headers before piping
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=challan-${student.uniqueId}.pdf`);
        
        // Handle PDF generation errors
        doc.on('error', (err) => {
            console.error("PDF generation error:", err);
            if (!res.headersSent) {
                res.status(500).json({ message: "Error generating PDF" });
            }
        });
        
        doc.pipe(res);
        
        // Load department logo
        let logoBuffer = null;
        try {
            const logoPath = path.join(__dirname, '..', 'frontend', 'logo.png');
            if (fs.existsSync(logoPath)) {
                logoBuffer = fs.readFileSync(logoPath);
            }
        } catch (err) {
            console.error('Error loading logo:', err);
            // Continue without logo if it fails
        }
        
        // Page dimensions for landscape A4
        const pageWidth = 841.89;
        const pageHeight = 595.28;
        const margin = 20;
        const gap = 10;
        const challanWidth = (pageWidth - (margin * 2) - (gap * 2)) / 3;
        const challanHeight = pageHeight - (margin * 2);
        const startY = margin;
        
        // Helper function to draw dotted border
        const drawDottedRect = (x, y, width, height) => {
            doc.dash(2, 2);
            doc.strokeColor('#9e9e9e').lineWidth(1);
            doc.rect(x, y, width, height).stroke();
            doc.undash(); // Reset dash to solid line
        };
        
        // Helper function to draw a single challan
        const drawChallan = (x, y, copyText, copyColor) => {
            const padding = 10;
            const headerHeight = 50;
            const contentStartY = y + headerHeight;
            
            // Outer border (dotted for separation between copies)
            drawDottedRect(x, y, challanWidth, challanHeight);
            
            // Header background with color
            doc.fillColor(copyColor).rect(x, y, challanWidth, headerHeight).fill();
            
            // Logo in header - ensure it's always visible
            const logoSize = 32;
            const logoX = x + padding;
            const logoY = y + (headerHeight - logoSize) / 2;
            if (logoBuffer) {
                doc.image(logoBuffer, logoX, logoY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
            }
            
            // Header text - positioned after logo for all copies (consistent across all three)
            const headerTextX = x + (logoBuffer ? logoSize + padding + 5 : padding);
            const headerTextWidth = challanWidth - headerTextX - padding;
            
            doc.fontSize(11).font('Helvetica-Bold').fillColor('#0b33a0ff');
            doc.text('DEPARTMENT OF CHEMISTRY', headerTextX, y + 6, { width: headerTextWidth });
            doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#170a91ff');
            doc.text('GOVT. BOYS DEGREE COLLEGE UMERKOT', headerTextX, y + 20, { width: headerTextWidth });
            // Copy text (BANK COPY, OFFICE COPY, STUDENT COPY) - consistent formatting
            doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#96880fff');
            doc.text(copyText, headerTextX, y + 33, { width: headerTextWidth }, align='center');
            
            // Divider line below header
            doc.strokeColor('#757575').lineWidth(0.5);
            doc.moveTo(x + padding, contentStartY).lineTo(x + challanWidth - padding, contentStartY).stroke();
            
            // Content area
            let currentY = contentStartY + 12;
            const labelWidth = 70;
            const valueWidth = challanWidth - padding * 2 - labelWidth - 5;
            const contentX = x + padding;
            
            // Student Information
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#424242');
            doc.text('Unique ID:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica').fillColor('#212121');
            doc.text(student.uniqueId || '-', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('Name:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica').fillColor('#212121');
            doc.text(student.fullName || '-', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('Father\'s Name:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica').fillColor('#212121');
            doc.text(student.formData?.fName || student.fatherName || 'N/A', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('CNIC:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica').fillColor('#212121');
            doc.text(student.cnic || '-', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('Apply For:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica-Bold').fillColor('#1565c0');
            doc.text('BS Chemistry (Batch 2026)', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('Fees:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica-Bold').fillColor('#c62828');
            doc.text('Rs. 1500/-', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 14;
            
            doc.font('Helvetica-Bold').fillColor('#424242');
            doc.text('Last Date:', contentX, currentY, { width: labelWidth });
            doc.font('Helvetica').fillColor('#212121');
            doc.text('15-02-2026', contentX + labelWidth, currentY, { width: valueWidth });
            currentY += 18;
            
            // Divider
            doc.strokeColor('#e0e0e0').lineWidth(0.5);
            doc.moveTo(contentX, currentY).lineTo(x + challanWidth - padding, currentY).stroke();
            currentY += 10;
            
            // Bank Information
            doc.fontSize(8).font('Helvetica-Bold').fillColor('#1a237e');
            doc.text('BANK DETAILS', contentX, currentY);
            currentY += 12;
            
            doc.fontSize(7.5).font('Helvetica').fillColor('#424242');
            doc.text('Bank: SINDH BANK UMERKOT', contentX, currentY);
            currentY += 12;
            doc.font('Helvetica-Bold').fillColor('#212121');
            doc.text('Account: PRINCIPAL GOVT BOYS DEGREE COLLEGE UMERKOT \n (EXAMINATION FEES FOR DEGREE CLASSES)', contentX, currentY,{width: challanWidth - padding * 2});
            currentY += 25;
            doc.font('Helvetica-Bold').fillColor('#212121');
            doc.text('Account No: 0419-156150-1000', contentX, currentY);
            currentY += 18;
            
            // Signature line
            const signatureY = currentY + 25;
            doc.strokeColor('#9e9e9e').lineWidth(0.5);
            doc.moveTo(contentX + 20, currentY).lineTo(x + challanWidth - padding - 20, currentY).stroke();
            doc.fontSize(6.5).font('Helvetica').fillColor('#757575');
            doc.text('Authorized Signature', contentX + 20, signatureY + 2, { width: challanWidth - padding * 2 - 40, align: 'left' });
            doc.text('Bank Stamp', contentX + 20, signatureY + 2, { width: challanWidth - padding * 2 - 40, align: 'right' });
        };
        
        // Draw three copies with different header colors
        const copy1X = margin;
        const copy2X = margin + challanWidth + gap;
        const copy3X = margin + (challanWidth + gap) * 2;
        
        drawChallan(copy1X, startY, 'BANK COPY', '#1fb8dfff'); // Dark Blue
        drawChallan(copy2X, startY, 'OFFICE COPY', '#1fb8dfff'); // Blue
        drawChallan(copy3X, startY, 'STUDENT COPY', '#1fb8dfff'); // Red
        
        // Finalize PDF - this will trigger the stream to end
        doc.end();
        
    } catch (err) {
        console.error("Challan generation error:", err);
        // Only send error response if headers haven't been sent yet
        if (!res.headersSent) {
            res.status(500).json({ message: "Challan generation error: " + err.message });
        } else {
            // If headers already sent (PDF headers set), destroy the response stream
            if (!res.finished) {
                res.destroy();
            }
            console.error("Cannot send error response - headers already sent. Response destroyed.");
        }
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

// 7. Verify Challan (Admin)
app.post('/api/admin/verify-challan/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        student.challanStatus = 'Verified';
        student.status = 'Challan Verified';
        await student.save();
        
        res.status(200).json({ success: true, message: "Challan verified successfully", student });
    } catch (err) {
        console.error("Challan verification error:", err);
        res.status(500).json({ message: "Challan verification error" });
    }
});

// 8. Approve Application (Admin)
app.post('/api/admin/approve-application/:studentId', async (req, res) => {
    try {
        const student = await Student.findById(req.params.studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        student.status = 'Approved';
        await student.save();
        
        res.status(200).json({ success: true, message: "Application approved successfully", student });
    } catch (err) {
        console.error("Application approval error:", err);
        res.status(500).json({ message: "Application approval error" });
    }
});

// 9. Get All Students with Challan Details (Admin)
app.get('/api/admin/students-with-challans', async (req, res) => {
    try {
        const students = await Student.find({ isFormFilled: true }).select('_id fullName cnic challanStatus challanImage status formData profileImage');
        res.status(200).json({ success: true, students });
    } catch (err) {
        console.error("Get students error:", err);
        res.status(500).json({ message: "Get students error" });
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
        
        // Slip is immediately available when created (no date restriction)
        if (!slip.isAvailable) {
            return res.status(403).json({ message: "Slip is not available yet." });
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
        
        if (!slip.isAvailable) {
            return res.status(403).json({ message: "Slip is not available yet" });
        }
        
        let student = await Student.findById(slip.studentId);
        if (!student) {
            student = await OldStudent.findById(slip.studentId);
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=admit-card-${slip.studentCnic}.pdf`);
        
        doc.pipe(res);
        
        // Helper function to fetch image
        function fetchImage(url) {
            return new Promise((resolve) => {
                const protocol = url.startsWith('https') ? https : http;
                protocol.get(url, (response) => {
                    if (response.statusCode === 200) {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => {
                            resolve(Buffer.concat(chunks));
                        });
                    } else {
                        resolve(null);
                    }
                }).on('error', () => {
                    resolve(null);
                });
            });
        }
        
        // Load department logo
        let logoBuffer = null;
        try {
            const logoPath = path.join(__dirname, '..', 'frontend', 'logo.png');
            const fs = require('fs');
            if (fs.existsSync(logoPath)) {
                logoBuffer = fs.readFileSync(logoPath);
            }
        } catch (err) {
            console.error('Error loading logo:', err);
        }
        
        // Header Section with Logo and QR Code
        const headerY = 50;
        const logoSize = 60;
        const qrSize = 80;
        const pageWidth = 595.28;
        const leftMargin = 50;
        const rightMargin = 50;
        const qrX = pageWidth - rightMargin - qrSize;
        
        // Logo on top left
        if (logoBuffer) {
            doc.image(logoBuffer, leftMargin, headerY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
        }
        
        // QR Code on top right
        const qrY = headerY;
        if (slip.qrCode) {
            doc.image(Buffer.from(slip.qrCode, 'base64'), qrX, qrY, { width: qrSize, height: qrSize });
            if (slip.rollNumber) {
                const rollParts = slip.rollNumber.split('/');
                const rollSuffix = rollParts[rollParts.length - 1];
                doc.fontSize(9).font('Helvetica-Bold').fillColor('#1565c0');
                doc.text(rollSuffix, qrX, qrY + qrSize + 3, { width: qrSize, align: 'center' });
            }
        }
        
        // Header text positioned between logo and QR code (centered vertically with logo/QR)
        const logoRightEdge = leftMargin + logoSize;
        const qrLeftEdge = qrX;
        const headerTextStartX = logoRightEdge + 10;
        const headerTextWidth = qrLeftEdge - headerTextStartX - 10;
        const startX = headerTextStartX;
        const headerTextY = headerY + 5;
        
        doc.fontSize(14).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('DEPARTMENT OF CHEMISTRY', startX, headerTextY, { align: 'center', width: headerTextWidth });
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1565c0');
        doc.text('GOVERNMENT BOYS DEGREE COLLEGE UMERKOT', startX, headerTextY + 18, { align: 'center', width: headerTextWidth });
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#c62828');
        doc.text('ENTRY TEST SLIP', startX, headerTextY + 36, { align: 'center', width: headerTextWidth });
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#424242');
        doc.text('BATCH 2K26', startX, headerTextY + 52, { align: 'center', width: headerTextWidth });
        
        // Set Y position for next content
        doc.y = headerY + logoSize + 15;
        
        // Divider line
        doc.strokeColor('#757575').lineWidth(1);
        doc.moveTo(50, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke();
        doc.moveDown(1);
        
        // Candidate Information Section
        const startY = doc.y;
        let currentY = startY;
        
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('CANDIDATE INFORMATION', 50, currentY);
        currentY += 28;
        
        const labelWidth = 160;
        const valueWidth = 290;
        let xPos = 50;
        
        // Name
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#424242');
        doc.text('NAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.fullName || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // Father's Name
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('FATHER\'S NAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.formData?.fName || student.fatherName || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // Surname/Caste
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('SURNAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.formData?.caste || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // CNIC
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('CNIC:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.cnic || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // Program
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('PROGRAM:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica-Bold').fillColor('#1565c0');
        doc.text('BS CHEMISTRY', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // Seat No / Roll Number
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('SEAT NO:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica-Bold').fillColor('#c62828');
        doc.text(slip.rollNumber || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        // Held In
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('HELD IN:', xPos, currentY, { width: labelWidth });
        let heldIn = '-';
        if (slip.testDate) {
            const testDate = new Date(slip.testDate);
            const day = testDate.getDate();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = monthNames[testDate.getMonth()];
            const year = testDate.getFullYear();
            heldIn = `${day}: ${month}: ${year}`;
        }
        doc.font('Helvetica').fillColor('#212121');
        doc.text(heldIn, xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 24;
        
        // Photo (right side) - try to load student photo if available
        const photoX = 420;
        const photoY = startY + 25;
        const photoWidth = 85;
        const photoHeight = 105;
        const borderWidth = 3;
        
        // Draw border first
        doc.strokeColor('#424242').lineWidth(borderWidth);
        doc.rect(photoX - borderWidth/2, photoY - borderWidth/2, photoWidth + borderWidth, photoHeight + borderWidth).stroke();
        
        if (student.profileImage) {
            try {
                const imageBuffer = await fetchImage(student.profileImage);
                if (imageBuffer) {
                    // Draw photo with fit to fill the box properly
                    doc.image(imageBuffer, photoX, photoY, { 
                        width: photoWidth, 
                        height: photoHeight,
                        fit: [photoWidth, photoHeight]
                    });
                } else {
                    // Fallback to placeholder
                    doc.fontSize(9).font('Helvetica').fillColor('#757575');
                    doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
                }
            } catch (err) {
                console.error('Error loading profile image:', err);
                doc.fontSize(9).font('Helvetica').fillColor('#757575');
                doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
            }
        } else {
            // No photo available, show placeholder
            doc.fontSize(9).font('Helvetica').fillColor('#757575');
            doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
        }
        
        // Exam Centre
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('EXAM CENTRE:', xPos, currentY);
        doc.fontSize(10).font('Helvetica').fillColor('#212121');
        doc.text('BS CHEMISTRY BUILDING GOVERNMENT BOYS DEGREE COLLEGE UMERKOT', xPos + 110, currentY);
        currentY += 26;
        
        // Notes
        const noteTextWidth = pageWidth - rightMargin - xPos - 35;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#c62828');
        doc.text('NOTE:', xPos, currentY);
        doc.font('Helvetica').fillColor('#424242');
        doc.text('The Department of Chemistry Govt Boys Degree College Umerkot reserves the right of cancellation of examination, if registeration form/documents are found to be incomplete/incorrect at any stage.', xPos + 35, currentY, { width: noteTextWidth });
        currentY += 22;
        
        // Instructions
        const instructionTextWidth = pageWidth - rightMargin - xPos - 25;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('INSTRUCTIONS:', xPos, currentY);
        currentY += 15;
        doc.fontSize(9).font('Helvetica').fillColor('#424242');
        doc.text('(i) Mobile Phone / calculator or any other electronic device is not allowed.', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;
        doc.text('(ii) You are required to bring this admit card/Slip along with your original Computerized National Identity Card (CNIC).', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;
        doc.text('(iii) Entry Test will be of 100 marks consisting of Multiple Choice Questions (MCQs).', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;
        doc.text('(iv) Each question carries 1 mark. There is no negative marking for wrong answers.', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;
        doc.text('(v) The duration of the test will be 2 hours.', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;
        doc.text('(vi) Use of unfair means during examination is strictly prohibited and will lead to disqualification.', xPos + 25, currentY, { width: instructionTextWidth });
        currentY += 12;

        // Footer - positioned at bottom of page
        const pageHeight = 841.89; // A4 height in points
        const footerY = doc.y + 30
        doc.strokeColor('#e0e0e0').lineWidth(0.5);
        doc.moveTo(leftMargin, footerY - 5).lineTo(pageWidth - rightMargin, footerY - 5).stroke();
        doc.fontSize(8).font('Helvetica').fillColor('#757575');
        // Footer text in one line
        const footerText = 'CREATED BY: IT TEAM - DEPARTMENT OF CHEMISTRY';
        doc.text(footerText, leftMargin, footerY, { width: pageWidth - leftMargin - rightMargin, align: 'left' });
        
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
                    from: process.env.EMAIL_USER || 'chemisrty.gdcu@gmail.com',
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
            { 
                challanStatus: 'Verified',
                status: 'Challan Verified'
            }, 
            { new: true }
        );
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        res.status(200).json({ success: true, message: "Challan verified", student });
    } catch (err) {
        console.error("Verify challan error:", err);
        res.status(500).json({ message: "Verify challan error" });
    }
});

// 18. Register Old Student (Admin)
app.post('/api/admin/old-students', async (req, res) => {
    try {
        const { fullName, cnic, batch, rollNumber, email, mobile, fatherName, caste, domicile, dob, gender, address, formData, password } = req.body;
        
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
            dob,
            gender,
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

// 18. Approve Student (Admin)
app.post('/api/admin/students/:id/approve', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        student.status = 'Approved';
        await student.save();
        
        res.status(200).json({ success: true, message: "Student approved", student });
    } catch (err) {
        console.error("Approve student error:", err);
        res.status(500).json({ message: "Approve student error" });
    }
});

// 18b. Reject Student (Admin)
app.post('/api/admin/students/:id/reject', async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        student.status = 'Rejected';
        await student.save();
        
        res.status(200).json({ success: true, message: "Student rejected", student });
    } catch (err) {
        console.error("Reject student error:", err);
        res.status(500).json({ message: "Reject student error" });
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
        const { testDate, rollNumberSuffix } = req.body; // rollNumberSuffix is the last part (001, 002, etc.)
        const studentId = req.params.id;
        
        let student = await Student.findById(studentId);
        if (!student) {
            student = await OldStudent.findById(studentId);
        }
        
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }
        
        // Generate roll number in format: Chem/batch/2026/001
        const batch = student.batch || "2026";
        const suffix = rollNumberSuffix ? String(rollNumberSuffix).padStart(3, '0') : '001';
        const rollNumber = `Chem/${batch}/${suffix}`;
        
        // Generate QR code with student registration information
        const qrData = JSON.stringify({
            studentId: student._id.toString(),
            name: student.fullName,
            cnic: student.cnic,
            batch: student.batch,
            rollNumber: rollNumber,
            testDate: testDate,
            registrationDate: student.registrationDate,
            timestamp: Date.now()
        });
        const qrCodeBuffer = await QRCode.toBuffer(qrData);
        const qrCodeBase64 = qrCodeBuffer.toString('base64');
        
        // Check if slip already exists, update it or create new
        let slip = await Slip.findOne({ studentId });
        if (slip) {
            slip.qrCode = qrCodeBase64;
            slip.testDate = testDate ? new Date(testDate) : null;
            slip.rollNumber = rollNumber;
            slip.isAvailable = true;
            slip.availableDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Make available immediately
            await slip.save();
        } else {
            slip = new Slip({
                studentId,
                studentCnic: student.cnic,
                qrCode: qrCodeBase64,
                testDate: testDate ? new Date(testDate) : null,
                rollNumber: rollNumber,
                isAvailable: true,
                availableDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Make available immediately
            });
            await slip.save();
        }
        
        res.status(201).json({ success: true, message: "Slip created successfully", slip });
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
            from: process.env.EMAIL_USER || 'chemisrty.gdcu@gmail.com',
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
