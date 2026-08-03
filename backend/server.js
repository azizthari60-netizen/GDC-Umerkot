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
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { stringAt } = require('pdfkit/js/data');

const app = express();




// --- DATABASE CONNECTION (Serverless Optimized) ---
let cachedDb = null;

async function connectToDatabase() {
    if (cachedDb && mongoose.connection.readyState === 1) {
        return cachedDb;
    }

    console.log("⏳ Connecting to MongoDB Atlas...");
    
    // اگر URI میں dbName نہ بھی ہو تو یہ زبردستی gdc-umerkot سے ہی کنیکٹ کرے گا
    cachedDb = await mongoose.connect(process.env.MONGODB_URI, {
        dbName: 'gdc-umerkot',
        serverSelectionTimeoutMS: 5000, 
        bufferCommands: false, // 🛑 buffering بند کرے گا تاکہ 10 سیکنڈ انتظار نہ کرے اور فوراً ایرر پکڑے
    });

    console.log("🚀 Connected to MongoDB: gdc-umerkot");
    return cachedDb;
}s
// --- Middleware ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// --- Database Schemas & Models ---

// Result Schema (Supports String and Number for Roll No & CNIC)
const resultSchema = new mongoose.Schema({
    rollNo: { type: String, required: true },
    name: String,
    fatherName: String,
    caste: String,
    obtainedMarks: Number,
    applyFor: String,
    cnic: mongoose.Schema.Types.Mixed,
    mobileNo: mongoose.Schema.Types.Mixed,
    district: String,
    createdAt: { type: Date, default: Date.now }
}, { collection: 'results' });

// Slip Schema
const slipSchema = new mongoose.Schema({
    studentId: mongoose.Schema.Types.ObjectId,
    studentCnic: String,
    qrCode: String,
    testDate: Date,
    rollNumber: String,
    isAvailable: { type: Boolean, default: false },
    availableDate: Date
});

// Admission Schema
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

// Safe Model Compilation
const Result = mongoose.models.Result || mongoose.model('Result', resultSchema);
const Slip = mongoose.models.Slip || mongoose.model('Slip', slipSchema);
const Admission = mongoose.models.Admission || mongoose.model('Admission', admissionSchema);

const upload = multer({ storage: multer.memoryStorage() });
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Helper function to upload to Cloudinary
function uploadToCloudinary(buffer, folder = 'BS-Chemistry') {
    return new Promise((resolve, reject) => {
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

// Submit Application Route
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
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// Admission Slip Lookup
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
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
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

// PDF Slip Download
app.get('/api/applications/slip/:cnic/pdf', async (req, res) => {
    try {
        const cnic = req.params.cnic;
        const application = await Admission.findOne({ cnic: cnic });
        if (!application) {
            return res.status(404).json({ success: false, message: 'Application not found.' });
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
            ['CNIC / B-Form', application.cnic],
            ['Date of Birth', application.dob],
            ['Religion', application.religion],
            ['Domicile District', application.domicileDistrict],
            ['Home Address', application.homeAddress],
            ['Choice Of Faculty', application.choiceOfFaculty || '-'],
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
        res.status(500).json({ success: false, message: 'Slip PDF error' });
    }
});


// --- ADMISSION TEST RESULT ROUTE ---
app.post('/api/results/check', async (req, res) => {
    try {
        const { cnic, rollNo } = req.body;
        const searchQuery = (cnic || rollNo || '').trim();

        if (!searchQuery) {
            return res.status(400).json({ success: false, message: 'CNIC یا Roll No درج کرنا ضروری ہے۔' });
        }

        await connectToDatabase();

        // MongoDB Atlas میں CNIC یا Roll No سے میچ کریں
        const student = await Result.findOne({
            $or: [
                { cnic: searchQuery },
                { rollNo: searchQuery }
            ]
        });

        if (!student) {
            return res.status(404).json({ success: false, message: 'اس CNIC / Roll No کا کوئی رزلٹ نہیں ملا۔' });
        }

        return res.status(200).json({
            success: true,
            results: [student]
        });
    } catch (err) {
        console.error('Result fetch error:', err);
        return res.status(500).json({ success: false, message: 'سرور میں تکنیکی خرابی ہے۔' });
    }
});


// --- Server Start ---
const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));
}

module.exports = app;