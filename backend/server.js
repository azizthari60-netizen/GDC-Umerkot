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

// 1. یوزرز (ایڈمن اور اسٹوڈنٹس)
const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    name: String,
    email: String,
    rollNumber: String,
    batch: String,
    semester: String,
    role: { type: String, enum: ['admin', 'student'], default: 'student' },
    status: { type: String, default: 'active' },
    token: String,
    cgpa: Number,
    coursesEnrolled: Number,
    results: [{ course: String, marks: Number, grade: String, semester: Number, addedAt: Date }]
});
const User = mongoose.model('User', UserSchema);

// 2. اسائنمنٹس
const AssignmentSchema = new mongoose.Schema({
    studentId: mongoose.Schema.Types.ObjectId,
    title: String,
    course: String,
    fileUrl: String, // Cloudinary URL
    originalFilename: String,
    status: { type: String, default: 'pending' },
    grade: String,
    uploadedAt: { type: Date, default: Date.now },
    gradedAt: Date
});
const Assignment = mongoose.model('Assignment', AssignmentSchema);

// 3. کانٹیکٹ فارم
const ContactSchema = new mongoose.Schema({
    name: String, email: String, subject: String, message: String, submittedAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

// --- API روٹس ---

// لاگ ان (Login)
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
        const token = Math.random().toString(36).substring(2);
        user.token = token;
        await user.save();
        return res.json({ success: true, token, role: user.role, user: { username: user.username, name: user.name, role: user.role } });
    }
    res.status(401).json({ success: false, error: 'Invalid credentials' });
});

// ایڈمن: نیا اسٹوڈنٹ بنانا
app.post('/api/admin/students', async (req, res) => {
    try {
        const { name, email, rollNumber, batch, semester } = req.body;
        const username = `@${name.split(' ')[0].toLowerCase()}_${rollNumber.toLowerCase()}`;
        const password = Math.random().toString(36).substring(2, 10).toUpperCase();

        const newStudent = new User({ name, email, rollNumber, batch, semester, username, password, role: 'student' });
        await newStudent.save();
        res.json({ success: true, username, password, student: newStudent });
    } catch (err) { res.status(400).json({ success: false, error: 'Student already exists' }); }
});

// اسٹوڈنٹ: اسائنمنٹ اپلوڈ (Cloudinary)
app.post('/api/student/assignments/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, error: 'No file' });

    const token = req.headers.authorization?.replace('Bearer ', '');
    const student = await User.findOne({ token });
    if (!student) return res.status(401).send("Unauthorized");

    let stream = cloudinary.uploader.upload_stream(
        { folder: "assignments", resource_type: "raw" },
        async (error, result) => {
            if (result) {
                const newAsg = new Assignment({
                    studentId: student._id,
                    title: req.body.title,
                    course: req.body.course,
                    fileUrl: result.secure_url,
                    originalFilename: req.file.originalname
                });
                await newAsg.save();
                res.json({ success: true, message: "Uploaded to Cloudinary!" });
            } else { res.status(500).json(error); }
        }
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
});

// ایڈمن: تمام اسائنمنٹس دیکھنا
app.get('/api/admin/assignments', async (req, res) => {
    const assignments = await Assignment.find().lean();
    for (let asg of assignments) {
        const student = await User.findById(asg.studentId);
        asg.studentName = student ? student.name : 'Unknown';
    }
    res.json({ success: true, assignments });
});

// کانٹیکٹ فارم
app.post('/api/contact', async (req, res) => {
    const newContact = new Contact(req.body);
    await newContact.save();
    res.json({ success: true, message: "Message saved in MongoDB!" });
});

app.get('/create-admin', async (req, res) => {
    try {
        const adminExists = await User.findOne({ role: 'admin' });
        if (adminExists) return res.send("Admin already exists!");

        const firstAdmin = new User({
            username: 'admin',
            password: 'admin123', // اسے بعد میں بدل لیجیے گا
            name: 'Main Admin',
            role: 'admin'
        });
        await firstAdmin.save();
        res.send("✅ Admin Created! Username: admin, Pass: admin123");
    } catch (err) { res.send(err.message); }
});

// --- سرور اسٹارٹ ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on http://localhost:${PORT}`));