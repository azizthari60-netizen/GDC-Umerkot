try {
    require('dotenv').config();
} catch (error) {console.log("Dotenv not found but it's okay for production");}
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');

const app = express();

// --- کنفیگریشن ---
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("🚀 MongoDB Connected Successfully"))
    .catch(err => console.error("❌ DB Connection Error:", err));

// --- مڈل ویئر ---
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// --- ڈیٹا بیس ماڈلز (Schemas) ---
//  Student Schema (Batch 2026 کے لیے)
const studentSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    cnic: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    batch: { type: String, default: "2026" },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    isFormFilled: { type: Boolean, default: false },
    challanStatus: { type: String, enum: ['Not Generated', 'Generated', 'Uploaded'], default: 'Not Generated' },
    profileImage: String,
    challanImage: String,
    registrationDate: { type: Date, default: Date.now }
});

const Student = mongoose.model('Student', studentSchema);

// 3. Admin Schema
const adminSchema = new mongoose.Schema({
    username: { type: String, default: 'admin' },
    password: { type: String, default: 'admin123' }
});
const Admin = mongoose.model('Admin', adminSchema);

// --- ROUTES ---

// A. اسٹوڈنٹ سائن اپ (CNIC کی بنیاد پر)
app.post('/api/student/signup', async (req, res) => {
    try {
        const { fullName, cnic, password } = req.body;
        const exists = await Student.findOne({ cnic });
        if (exists) return res.status(400).json({ message: "یہ CNIC پہلے سے رجسٹرڈ ہے۔" });

        const newStudent = new Student({ fullName, cnic, password });
        await newStudent.save();
        res.status(201).json({ message: "اکاؤنٹ بن گیا! اب لاگ ان کریں۔" });
    } catch (err) {
        res.status(500).json({ message: "سائن اپ میں غلطی۔" });
    }
});

// B. اسٹوڈنٹ لاگ ان
app.post('/api/student/login', async (req, res) => {
    try {
        const { cnic, password } = req.body;
        const student = await Student.findOne({ cnic, password });
        if (!student) return res.status(401).json({ message: "غلط CNIC یا پاسورڈ" });
        res.status(200).json({ message: "کامیاب لاگ ان", student });
    } catch (err) {
        res.status(500).json({ message: "لاگ ان میں غلطی۔" });
    }
});

// C. ایڈمن لاگ ان
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });
    if (admin) res.status(200).json({ message: "ایڈمن لاگ ان کامیاب" });
    else res.status(401).json({ message: "غلط ایڈمن کریڈنشلز" });
});

// D. تمام اسٹوڈنٹس کی لسٹ (ایڈمن کے لیے)
app.get('/api/admin/students', async (req, res) => {
    const students = await Student.find();
    res.json(students);
});

// E. اسٹوڈنٹ اپروول (ایڈمن کے لیے)
app.put('/api/admin/approve/:id', async (req, res) => {
    await Student.findByIdAndUpdate(req.params.id, { status: 'Approved' });
    res.json({ message: "اسٹوڈنٹ اپروو ہو گیا!" });
});


// 3. کانٹیکٹ فارم
const ContactSchema = new mongoose.Schema({
    name: String, email: String, subject: String, message: String, submittedAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);



// کانٹیکٹ فارم
app.post('/api/contact', async (req, res) => {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.json({ success: true, message: "Message saved in MongoDB!" });
});

// --- سرور اسٹارٹ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));