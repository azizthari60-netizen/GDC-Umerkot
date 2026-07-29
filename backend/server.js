const dotenv = require('dotenv');
dotenv.config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const https = require('https');
const http = require('http');
const app = express();
const xlsx = require('xlsx');

// --- Configuration ---
mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
})
.then(async () => {
    console.log("🚀 MongoDB Connected Successfully");
    // Initialize admin if not exists
    const adminCount = await Admin.countDocuments();
    if (adminCount === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await new Admin({ username: 'admin', password: hashedPassword }).save();
        console.log("✅ Default admin created");
    }
})
.catch(err => console.error("❌ DB Connection Error:", err));

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// --- Middleware ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Database Models ---
// Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, default: 'admin' },
    password: { type: String, default: 'admin123' }
});

// Student Schema
const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: true },
});

// result schema
const resultSchema = new mongoose.Schema({
    rollNo: { type: String, required: true },
    name: String,
    fatherName: String,
    caste: String,
    obtainedMarks: Number,
    applyFor: String,
    cnic: Number,
    mobileNo: Number,
    createdAt: { type: Date, default: Date.now }
});

// contact schema
const contactSchema = new mongoose.Schema({
    name: String,
    email: String,
    subject: String,
    message: String,
    submittedAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false }
});

// slip schema
const slipSchema = new mongoose.Schema({
    studentId: mongoose.Schema.Types.ObjectId,
    studentCnic: String,
    qrCode: String,
    testDate: Date,
    rollNumber: String,
    isAvailable: { type: Boolean, default: false },
    availableDate: Date
});

// admission schema
const admissionSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    fatherName: { type: String, required: true },
    gender: { type: String, required: true },
    email: { type: String },
    cnic: { type: String, required: true },
    mobile: { type: String, required: true },
    dob: { type: String, required: true },
    placeOfBirth: { type: String },
    nationality: { type: String },
    religion: { type: String },
    domicileDistrict: { type: String, required: true },
    fathersDomicileDistrict: { type: String, required: true },
    fatherGuardianCnic: { type: String, required: true },
    fatherGuardianMobile: { type: String, required: true },
    homeAddress: { type: String, required: true },
    ninthRollNo: String,
    ninthPassingYear: String,
    matricRollNo: String,
    matricPassingYear: String,
    province: String,
    board: String,
    studyGroup: String,
    subject: String,
    schoolName: String,
    totalMarks: String,
    obtainedMarks: String,
    scaledTotalMarks: String,
    scaledObtainedMarks: String,
    collegeBoard: String,
    zone: String,
    choiceOfFaculty: String,
    chosenColleges: String,
    profileImage: String,
    createdAt: { type: Date, default: Date.now }
});

const Admin = mongoose.model('Admin', adminSchema);
const Student = mongoose.model('Student', studentSchema);
const Result = mongoose.model('Result', resultSchema);
const Contact = mongoose.model('Contact', contactSchema);
const Slip = mongoose.model('Slip', slipSchema);
const Admission = mongoose.model('Admission', admissionSchema);

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// 2. Student Login (Fixed) ---
app.post('/api/student/login', async (req, res) => {
    try {
        const { cnic, password } = req.body;
        let student = await Student.findOne({ cnic });
        
        if (!student) {
            return res.status(401).json({ message: "Invalid CNIC or password" });
        }
        
        // ✅ پاسورڈ چیک کرنے کا صحیح طریقہ
        const isPasswordValid = await bcrypt.compare(password, student.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid CNIC or password" });
        }
        
        const token = jwt.sign({ id: student._id, cnic: student.cnic }, JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ 
            message: "Login successful", 
            token,
            student: { _id: student._id, fullName: student.fullName, cnic: student.cnic }
        });
    } catch (err) {
        res.status(500).json({ message: "Login server error" });
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

/// --- 3.5. Password Recovery (Fixed) ---
app.post('/api/student/recovery', async (req, res) => {
    try {
        const { 'recovery-id': recoveryId, 'new-password': newPassword } = req.body;
        
        let student = await Student.findOne({ cnic: recoveryId });

        if (!student) {
            return res.status(404).json({ message: "CNIC not found in our records." });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await Student.updateOne({ cnic: recoveryId }, { $set: { password: hashedPassword } });

        res.status(200).json({ message: "Password updated! You can now login." });
    } catch (err) {
        res.status(500).json({ message: "Recovery error: " + err.message });
    }
});

// New public route for admission form submissions
app.post('/api/applications/submit', upload.single('profileImage'), async (req, res) => {
    try {
        const {
            fullName, fatherName, gender, email, cnic, mobile, dob, placeOfBirth,
            nationality, religion, domicileDistrict, fathersDomicileDistrict,
            fatherGuardianCnic, fatherGuardianMobile, homeAddress,
            ninthRollNo, ninthPassingYear, matricRollNo, matricPassingYear,
            province, board, studyGroup, subject, schoolName,
            totalMarks, obtainedMarks, scaledTotalMarks, scaledObtainedMarks,
            collegeBoard, zone, choiceOfFaculty, faculty, chosenColleges
        } = req.body;

        let profileImageUrl = '';
        if (req.file) {
            try {
                const uploadResult = await uploadToCloudinary(req.file.buffer, 'admissions/profiles');
                profileImageUrl = uploadResult.secure_url;
            } catch (uploadErr) {
                console.error('Cloudinary upload failed:', uploadErr);
            }
        }

        const application = new Admission({
            fullName,
            fatherName,
            gender,
            email,
            cnic,
            mobile,
            dob,
            placeOfBirth,
            nationality,
            religion,
            domicileDistrict,
            fathersDomicileDistrict,
            fatherGuardianCnic,
            fatherGuardianMobile,
            homeAddress,
            ninthRollNo,
            ninthPassingYear,
            matricRollNo,
            matricPassingYear,
            province,
            board,
            studyGroup,
            subject,
            schoolName,
            totalMarks,
            obtainedMarks,
            scaledTotalMarks,
            scaledObtainedMarks,
            collegeBoard,
            zone,
            choiceOfFaculty: choiceOfFaculty || faculty,
            chosenColleges,
            profileImage: profileImageUrl
        });

        await application.save();

        res.status(201).json({ success: true, applicationId: application._id, message: 'Your application has been submitted successfully.' });
    } catch (err) {
        console.error('Application submit error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

app.get('/api/applications/slip/:cnic', async (req, res) => {
    try {
        const cnic = req.params.cnic;
        const application = await Admission.findOne({ cnic: cnic });
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found for this CNIC.' });
        }
        res.status(200).json({ success: true, application });
    } catch (err) {
        console.error('Slip lookup error:', err);
        res.status(500).json({ message: 'Server error: ' + err.message });
    }
});

async function fetchImage(url) {
    if (!url) return null;
    return new Promise((resolve) => {
        const protocol = url.startsWith('https') ? https : http;
        protocol.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }, (response) => {
            if (response.statusCode === 200) {
                const chunks = [];
                response.on('data', (chunk) => chunks.push(chunk));
                response.on('end', () => resolve(Buffer.concat(chunks)));
            } else {
                resolve(null);
            }
        }).on('error', () => resolve(null));
    });
}

app.get('/api/applications/slip/:cnic/pdf', async (req, res) => {
    try {
        const cnic = req.params.cnic;
        const application = await Admission.findOne({ cnic: cnic });
        if (!application) {
            return res.status(404).json({ message: 'Application not found.' });
        }

        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=admission-slip-${cnic}.pdf`);
        doc.pipe(res);

        doc.fillColor('#1e3a8a').fontSize(18).text('Government Boys Degree College Umerkot', { align: 'center' });
        doc.moveDown(0.2);
        doc.fontSize(14).fillColor('#333').text('Admission Application Slip 2026', { align: 'center' });
        doc.moveDown(0.6);

        if (application.profileImage) {
            const imageBuffer = await fetchImage(application.profileImage);
            if (imageBuffer) {
                try {
                    doc.image(imageBuffer, 450, 110, { width: 90, height: 110, fit: [90, 110] });
                } catch (imgErr) {
                    console.error('PDF image embed error:', imgErr);
                }
            }
        }

        const printRows = [
            ['Name', application.fullName],
            ['Father Name', application.fatherName],
            ['Gender', application.gender],
            ['Email', application.email || '-'],
            ['CNIC / B-Form', application.cnic],
            ['Mobile No', application.mobile],
            ['Date of Birth', application.dob],
            ['Place of Birth', application.placeOfBirth],
            ['Nationality', application.nationality],
            ['Religion', application.religion],
            ['Domicile District', application.domicileDistrict],
            ['Father\'s Domicile District', application.fathersDomicileDistrict],
            ['Father/Guardian CNIC', application.fatherGuardianCnic],
            ['Father/Guardian Mobile No', application.fatherGuardianMobile],
            ['Home Address', application.homeAddress],
            ['Ninth Roll No', application.ninthRollNo || '-'],
            ['Ninth Passing Year', application.ninthPassingYear || '-'],
            ['Matric Roll No', application.matricRollNo || '-'],
            ['Matric Passing Year', application.matricPassingYear || '-'],
            ['Province', application.province || '-'],
            ['Board', application.board || '-'],
            ['Study Group', application.studyGroup || '-'],
            ['Subject', application.subject || '-'],
            ['School Name', application.schoolName || '-'],
            ['Total Marks', application.totalMarks || '-'],
            ['Obtained Marks', application.obtainedMarks || '-'],
            ['Scaled Total Marks', application.scaledTotalMarks || '-'],
            ['Scaled Obtained Marks', application.scaledObtainedMarks || '-'],
            ['College Board', application.collegeBoard || '-'],
            ['Zone', application.zone || '-'],
            ['Choice Of Faculty', application.choiceOfFaculty || '-'],
            ['Chosen Colleges', application.chosenColleges || '-']
        ];

        const labelX = 50;
        const valueX = 220;
        let y = 160;
        doc.fontSize(10).fillColor('#000');
        printRows.forEach(([label, value]) => {
            doc.text(label + ':', labelX, y, { continued: true, width: 160 });
            doc.fillColor('#333').text(value || '-', valueX, y, { width: 330 });
            y += 18;
            if (y > 740) { doc.addPage(); y = 50; }
            doc.fillColor('#000');
        });

        doc.moveDown(2);
        doc.fontSize(10).fillColor('#1e3a8a').text('Required Documents:', labelX);
        doc.fontSize(9).fillColor('#333');
        doc.text('1) SSC or Ninth Marksheet', { indent: 15 });
        doc.text('2) Detail Marks / Provisional Certificate of the last exam passed', { indent: 15 });
        doc.text('3) Character Certificate', { indent: 15 });
        doc.text('4) Self/Father/Guardian B-Form/CNIC', { indent: 15 });
        doc.text('5) Colored Photograph', { indent: 15 });
        doc.text('6) Undertaking to ensure 75% attendance in black and white by Parent/Guardian', { indent: 15 });

        doc.end();
    } catch (err) {
        console.error('Application slip PDF error:', err);
        res.status(500).json({ message: 'Slip PDF error' });
    }
});

//  Generate Slip PDF
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
        
        // --- تصویر کھینچنے کا بہتر فنکشن (تصویر لانے کے لیے) ---
        function fetchImage(url) {
            return new Promise((resolve) => {
                if (!url) return resolve(null);
                const protocol = url.startsWith('https') ? https : http;
                protocol.get(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' } // کلاؤڈینیری سیکیورٹی بائی پاس کے لیے
                }, (response) => {
                    if (response.statusCode === 200) {
                        const chunks = [];
                        response.on('data', (chunk) => chunks.push(chunk));
                        response.on('end', () => {
                            resolve(Buffer.concat(chunks));
                        });
                    } else {
                        console.error('Image status error:', response.statusCode);
                        resolve(null);
                    }
                }).on('error', (err) => {
                    console.error('Fetch error:', err.message);
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
        
        if (logoBuffer) {
            doc.image(logoBuffer, leftMargin, headerY, { width: logoSize, height: logoSize, fit: [logoSize, logoSize] });
        }
        
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
        
        doc.y = headerY + logoSize + 15;
        doc.strokeColor('#757575').lineWidth(1);
        doc.moveTo(50, doc.y).lineTo(pageWidth - rightMargin, doc.y).stroke();
        doc.moveDown(1);
        
        const startY = doc.y;
        let currentY = startY;
        
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('CANDIDATE INFORMATION', 50, currentY);
        currentY += 28;
        
        const labelWidth = 160;
        const valueWidth = 290;
        let xPos = 50;
        
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#424242');
        doc.text('NAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.fullName || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('FATHER\'S NAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.formData?.fName || student.fatherName || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('SURNAME:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.formData?.caste || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('CNIC:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica').fillColor('#212121');
        doc.text(student.cnic || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('PROGRAM:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica-Bold').fillColor('#1565c0');
        doc.text('BS CHEMISTRY', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('SEAT NO:', xPos, currentY, { width: labelWidth });
        doc.font('Helvetica-Bold').fillColor('#c62828');
        doc.text(slip.rollNumber || '-', xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;
        
        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('HELD ON:', xPos, currentY, { width: labelWidth });
    
        const heldIn = "07: Mar: 2026"; 
        
        doc.font('Helvetica').fillColor('#212121');
        doc.text(heldIn, xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 20;

        doc.font('Helvetica-Bold').fillColor('#424242');
        doc.text('TIME:', xPos, currentY, { width: labelWidth });
        const time = "10:00 AM to 12:00 PM";
        doc.font('Helvetica').fillColor('#212121');
        doc.text(time, xPos + labelWidth, currentY, { width: valueWidth });
        currentY += 24;
        
        // Photo Section
        const photoX = 420;
        const photoY = startY + 25;
        const photoWidth = 80;
        const photoHeight = 100;
        const borderWidth = 3;
        
        doc.strokeColor('#424242').lineWidth(borderWidth);
        doc.rect(photoX - borderWidth/2, photoY - borderWidth/2, photoWidth + borderWidth, photoHeight + borderWidth).stroke();
        
        if (student.profileImage) {
            try {
                const smartImageUrl = student.profileImage.replace('/upload/', '/upload/c_fill,g_face,h_800,w_600,e_background_removal,b_rgb:0000FF/');
                const imageBuffer = await fetchImage(smartImageUrl);
                if (imageBuffer) {
                    doc.image(imageBuffer, photoX, photoY, { 
                        width: photoWidth, 
                        height: photoHeight,
                        fit: [photoWidth, photoHeight]
                    });
                } else {
                    doc.fontSize(9).font('Helvetica').fillColor('#757575');
                    doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
                }
            } catch (err) {
                console.error('Error loading image:', err);
                doc.fontSize(9).font('Helvetica').fillColor('#757575');
                doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
            }
        } else {
            doc.fontSize(9).font('Helvetica').fillColor('#757575');
            doc.text('PHOTO', photoX, photoY + 45, { width: photoWidth, align: 'center' });
        }
        
        // باقی انسٹرکشنز اور فوٹر (آپ کے اصل ڈیزائن کے مطابق)
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#1a237e');
        doc.text('EXAM CENTRE:', xPos, currentY);
        doc.fontSize(10).font('Helvetica').fillColor('#212121');
        doc.text('DEPARTMENT OF CHEMISTRY, GOVERNMENT BOYS DEGREE COLLEGE UMERKOT', xPos + 110, currentY);
        currentY += 26;
        
        const noteTextWidth = pageWidth - rightMargin - xPos - 35;
        doc.fontSize(10).font('Helvetica-Bold').fillColor('#c62828');
        doc.text('NOTE:', xPos, currentY);
        doc.font('Helvetica').fillColor('#424242');
        doc.text('The Department of Chemistry Govt Boys Degree College Umerkot reserves the right of cancellation of examination, if registeration form/documents are found to be incomplete/incorrect at any stage.', xPos + 35, currentY, { width: noteTextWidth });
        currentY += 28;
        
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
        
        const footerY = doc.y + 30;
        doc.strokeColor('#e0e0e0').lineWidth(0.5);
        doc.moveTo(leftMargin, footerY - 5).lineTo(pageWidth - rightMargin, footerY - 5).stroke();
        doc.fontSize(8).font('Helvetica').fillColor('#757575');
        doc.text('CREATED BY: IT TEAM - DEPARTMENT OF CHEMISTRY', leftMargin, footerY, { width: pageWidth - leftMargin - rightMargin, align: 'left' });
        
        doc.end();
    } catch (err) {
        console.error("Slip PDF error:", err);
        res.status(500).json({ message: "Slip PDF error" });
    }
});

// Route to fetch result by Roll Number
// Express Route to render downloadable/printable Result Card HTML
app.get('/api/result-card', async (req, res) => {
  try {
    const searchVal = req.query.search ? req.query.search.trim() : "";

    if (!searchVal) {
      return res.status(400).send("<h3>Please provide a Roll Number or CNIC.</h3>");
    }

    // Search in MongoDB by rollNo or cnic
    const student = await db.collection('results').findOne({
      $or: [
        { rollNo: searchVal },
        { cnic: searchVal },
        { RollNo: searchVal },
        { CNIC: searchVal }
      ]
    });

    if (!student) {
      return res.status(404).send(`
        <div style="font-family: Arial; text-align: center; margin-top: 50px;">
          <h2 style="color: #dc2626;">Result Not Found</h2>
          <p>No student found matching Roll No / CNIC: <b>${searchVal}</b></p>
          <button onclick="window.close()" style="padding: 8px 16px; cursor: pointer;">Close Window</button>
        </div>
      `);
    }

    // ----------------------------------------------------
    // Logic for Assigned Class
    // ----------------------------------------------------
    const marks = Number(student.obtainedMarks || student.marks || 0);
    const applyFor = (student.applyFor || "").trim().toLowerCase();
    let assignedClass = "N/A";

    if (applyFor.includes("P.E")) {
      assignedClass = "XI E";
    } else if (applyFor.includes("C.S")) {
        assignedClass = "XI F";
    } else if(applyFor.includes("P.M")) {
      if (marks >= 48) {
        assignedClass = "XI A";
      } else if (marks >= 33 && marks < 48) {
        assignedClass = "XI B";
      } else if (marks >= 20 && marks < 33) {
        assignedClass = "X C"
      } else {
        assignedClass = "Class C";
      }
    }

    // ----------------------------------------------------
    // HTML + CSS Template for Printable Result Card
    // ----------------------------------------------------
    const htmlResponse = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Result Card - ${student.rollNo || searchVal}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 0;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
          }
          body {
            background-color: #f1f5f9;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 30px 10px;
          }
          .action-bar {
            margin-bottom: 20px;
          }
          .btn-print {
            background-color: #16a34a;
            color: #ffffff;
            border: none;
            padding: 12px 26px;
            font-size: 15px;
            font-weight: bold;
            border-radius: 6px;
            cursor: pointer;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
          }
          .btn-print:hover {
            background-color: #15803d;
          }
          
          /* Card Container */
          .card-container {
            width: 700px;
            background-color: #ffffff;
            border: 2px solid #1e3a8a;
            border-radius: 4px;
            overflow: hidden;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          }

          /* Blue Header */
          .card-header {
            background-color: #1e3a8a;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
          }
          .logo {
            width: 65px;
            height: 65px;
            border-radius: 50%;
            background: #ffffff;
            padding: 3px;
            object-fit: contain;
          }
          .college-name {
            color: #ffffff;
            font-size: 20px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          /* Card Title */
          .card-title-box {
            text-align: center;
            padding: 12px 0;
            border-bottom: 2px solid #e2e8f0;
            background-color: #f8fafc;
          }
          .card-title {
            font-size: 17px;
            color: #1e3a8a;
            font-weight: bold;
            letter-spacing: 0.5px;
          }

          /* Details Grid (Two Columns) */
          .details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 22px;
            padding: 30px 40px;
          }
          .detail-item {
            display: flex;
            flex-direction: column;
            border-bottom: 1px dashed #cbd5e1;
            padding-bottom: 5px;
          }
          .full-width {
            grid-column: span 2;
          }
          .label {
            font-size: 11px;
            color: #64748b;
            font-weight: bold;
            text-transform: uppercase;
          }
          .value {
            font-size: 16px;
            color: #0f172a;
            font-weight: 600;
            margin-top: 3px;
          }
          .assigned-class {
            color: #1e3a8a;
            font-size: 18px;
            font-weight: 800;
          }

          /* Blue Footer Bar */
          .card-footer {
            background-color: #1e3a8a;
            height: 20px;
            margin-top: 15px;
          }

          /* Hide Action Bar on PDF / Print */
          @media print {
            body {
              background-color: #ffffff;
              padding: 0;
            }
            .action-bar {
              display: none;
            }
            .card-container {
              box-shadow: none;
              width: 100%;
              border: 2px solid #1e3a8a;
            }
          }
        </style>
      </head>
      <body>

        <div class="action-bar">
          <button class="btn-print" onclick="window.print()">Download / Print PDF</button>
        </div>

        <div class="card-container">
          <!-- Header -->
          <div class="card-header">
            <img src="/forntend/logo.png" alt="Logo" class="logo" />
            <h1 class="college-name">Government Degree College Umerkot</h1>
          </div>

          <!-- Title -->
          <div class="card-title-box">
            <h2 class="card-title">ADMISSION TEST RESULT CARD</h2>
          </div>

          <!-- Details (2 Columns Grid) -->
          <div class="details-grid">
            <div class="detail-item">
              <span class="label">Roll No</span>
              <span class="value">${student.rollNo || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Name</span>
              <span class="value">${student.name || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Father Name</span>
              <span class="value">${student.fatherName || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Caste</span>
              <span class="value">${student.caste || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Applied For</span>
              <span class="value">${student.applyFor || "-"}</span>
            </div>
            <div class="detail-item">
              <span class="label">Obtained Marks</span>
              <span class="value">${student.obtainedMarks || 0}</span>
            </div>
            <div class="detail-item full-width">
              <span class="label">Assigned Class</span>
              <span class="value assigned-class">${assignedClass}</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="card-footer"></div>
        </div>

      </body>
      </html>
    `;

    res.send(htmlResponse);

  } catch (error) {
    console.error("Error generating result card:", error);
    res.status(500).send("<h3>Internal Server Error while generating result card.</h3>");
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

// 23. Download Results Template (Excel)
app.get('/api/admin/download-results-template', async (req, res) => {
    try {
        const adminToken = req.headers.authorization?.replace('Bearer ', '');
        if (!adminToken) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        
        // Verify admin token
        jwt.verify(adminToken, JWT_SECRET);
        
        // Create a new workbook
        const workbook = xlsx.utils.book_new();
        
        // Create sample data with headers
        const sampleData = [
            { CNIC: '12345-6789012-3', Marks: 45 },
            { CNIC: '12345-6789012-4', Marks: 35 }
        ];
        
        // Create worksheet from data
        const worksheet = xlsx.utils.json_to_sheet(sampleData);
        
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 20 },  // CNIC column
            { wch: 12 }   // Marks column
        ];
        
        // Add worksheet to workbook
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Results');
        
        // Generate buffer
        const buffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'buffer' });
        
        // Send file as response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="resultsTemplate.xlsx"');
        res.send(buffer);
    } catch (err) {
        console.error('Download template error:', err);
        res.status(500).json({ message: 'Download template error' });
    }
});

// 24. Bulk Upload Results for Student
app.post('/api/admin/upload-results', upload.any(), 
    async (req, res) => {
    try {
      // multer stores all uploaded files in req.files array
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const file = req.files[0];
      const workbook = xlsx.read(file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = xlsx.utils.sheet_to_json(sheet);

      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const row of rows) {
        try {
          const cnic = row.CNIC || row.cnic;
          const marks = row.Marks || row.marks;
          const course = row.Course || row.course || 'Entry Test';
          const semester = row.Semester || row.semester || 1;

          if (!cnic || marks === undefined || marks === null) {
            errors.push(`Row ${rows.indexOf(row) + 2}: Missing CNIC or Marks`);
            errorCount++;
            continue;
          }

          // Find existing result or create new
          let result = await Result.findOne({ studentCnic: cnic, course, semester });
          if (result) {
            result.marks = marks;
            await result.save();
          } else {
            result = new Result({
              studentCnic: cnic,
              course,
              marks,
              semester
            });
            await result.save();
          }

          successCount++;
        } catch (rowErr) {
          console.error("Row error:", rowErr);
          errors.push(`Row ${rows.indexOf(row) + 2}: ${rowErr.message}`);
          errorCount++;
        }
      }

      res.status(200).json({ 
        success: true, 
        message: `Results uploaded: ${successCount} success, ${errorCount} errors`,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (err) {
        console.error("Upload results error:", err);
        res.status(500).json({ message: "Upload results error" });
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

if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}

module.exports = app;
