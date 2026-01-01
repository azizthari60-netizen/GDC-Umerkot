# Setup Instructions

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
# MongoDB Atlas Connection String
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chemistry-dept?retryWrites=true&w=majority

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (for Nodemailer)
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# JWT Secret (change this to a random string in production)
JWT_SECRET=your-secret-key-change-in-production

# Port (optional, defaults to 3000)
PORT=3000
```

## Installation

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Install frontend dependencies (if any):
```bash
cd frontend
# No npm dependencies needed for frontend
```

## Running the Application

### Development Mode

1. Start the backend server:
```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

2. Open `frontend/index.html` in a browser or use a local server:
```bash
# Using Python
cd frontend
python -m http.server 8080

# Using Node.js http-server
npx http-server frontend -p 8080
```

### Production Deployment

The application is configured for Vercel deployment. The `vercel.json` file contains the routing configuration.

## Default Admin Credentials

- Username: `admin`
- Password: `admin123`

**Important:** Change the admin password after first login in production.

## Features

- Student registration and login
- Admission form submission (Batch 2026)
- Challan generation and upload
- Admin dashboard for student management
- Assignment upload and grading
- Results management
- Contact form with admin reply
- Old student registration
- Slip generation with QR code
- Result lookup by CNIC

## Database Models

- **Student**: New students (Batch 2026)
- **OldStudent**: Students registered by admin
- **Assignment**: Student assignments
- **Result**: Student results
- **Slip**: Admission slips
- **Contact**: Contact form submissions
- **Admin**: Admin accounts
- **Notification**: Announcements/notifications

## API Endpoints

### Student Routes
- `POST /api/student/signup` - Student registration
- `POST /api/student/login` - Student login
- `POST /api/student/submit-form` - Submit admission form
- `GET /api/student/challan/:studentId` - Generate challan PDF
- `POST /api/student/upload-challan` - Upload challan image
- `GET /api/student/profile` - Get student profile
- `POST /api/student/assignments/upload` - Upload assignment
- `GET /api/student/assignments` - Get student assignments
- `GET /api/student/results` - Get student results
- `GET /api/student/notifications` - Get notifications
- `GET /api/student/slip` - Get student slip
- `GET /api/student/slip/pdf/:slipId` - Download slip PDF

### Admin Routes
- `POST /api/admin/login` - Admin login
- `GET /api/admin/students` - Get all students
- `PUT /api/admin/students/:id/approve` - Approve/reject student
- `PUT /api/admin/students/:id/verify-challan` - Verify challan
- `POST /api/admin/old-students` - Register old student
- `DELETE /api/admin/students/:id` - Delete student
- `GET /api/admin/assignments` - Get all assignments
- `POST /api/admin/assignments/:id/grade` - Grade assignment
- `POST /api/admin/students/:id/slip` - Create slip for student
- `POST /api/admin/students/:id/results` - Add result
- `GET /api/admin/contact-submissions` - Get contact submissions
- `POST /api/admin/contact/:id/reply` - Reply to contact
- `GET /api/admin/stats` - Get admin statistics

### Public Routes
- `POST /api/contact` - Submit contact form
- `POST /api/results/check` - Check results by CNIC

## Notes

- All file uploads (images, PDFs) are stored in Cloudinary
- Student passwords are hashed using bcrypt
- JWT tokens are used for authentication
- Email notifications are sent for form submissions and approvals
- QR codes are generated for admission slips

## Vercel Deployment

This project is preconfigured for Vercel. I modified `backend/server.js` so the Express `app` is exported when running on Vercel and the server only listens locally. The `vercel.json` routes the `/api/*` paths to the backend function and serves the `frontend` folder as static files.

Steps to deploy with Vercel (Git integration):

1. Commit and push your changes to your GitHub/GitLab/Bitbucket repository.
2. On Vercel, create a new Project and import the repository.
3. In Project Settings → Environment Variables, add the following variables (set values from your environment):

- `MONGODB_URI` (MongoDB Atlas connection string)
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `EMAIL_SERVICE` (e.g., gmail)
- `EMAIL_USER`
- `EMAIL_PASS`
- `JWT_SECRET`

Set these for both `Production` and `Preview` as needed.

4. Review `vercel.json` (already included) — it maps `/api/*` to `backend/server.js` and static files to `frontend/`.

5. Deploy. Vercel will build the serverless function and host the static frontend. After deployment, visit your Vercel domain to verify the site.

Notes & troubleshooting:

- MongoDB Atlas: ensure your Atlas cluster accepts connections from Vercel. If you have IP whitelisting enabled, either add Vercel's IP ranges (documented by Vercel) or allow access from anywhere (0.0.0.0/0) during initial testing.
- Serverless limits: Vercel functions have execution time and memory limits. Long-running operations (huge PDF generation) should be optimized or moved to background jobs if you hit limits.
- Logs: use Vercel's function logs to debug runtime errors, especially missing environment variables.

Alternative (Vercel CLI):

If you prefer using the Vercel CLI, run the following from the repository root:

```bash
npm install -g vercel
vercel login
vercel link
vercel --prod
```

The CLI will prompt for project settings and environment variables (or you can set them in the dashboard afterwards).

