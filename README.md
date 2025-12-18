# BS Chemistry Department Website

A modern website for the BS Chemistry Department with frontend and backend integration.

## Features

- **Frontend**: Responsive HTML/CSS/JavaScript website
- **Backend**: Node.js + Express server
- **Contact Form**: Saves submissions to JSON file
- **Student Login**: Authentication system (demo mode)
- **Password Recovery**: Request password reset

## Project Structure

```
chem-dept-site/
├── frontend/                 # Frontend files
│   ├── index.html           # Home page
│   ├── about.html           # About page
│   ├── contact.html         # Contact page
│   ├── faculty.html         # Faculty page
│   ├── academic-policy.html # Academic policy page
│   ├── script.js            # Frontend JavaScript
│   └── styles.css           # Stylesheet
├── backend/                 # Backend files
│   ├── server.js            # Express server
│   ├── package.json         # Dependencies
│   └── contact-submissions.json  # Contact form data (auto-generated)
├── .gitignore              # Git ignore file
└── README.md               # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Installation

1. Navigate to the backend folder:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

4. Open your browser and visit:
```
http://localhost:3000
```

## Backend API Endpoints

### Contact Form
- **POST** `/api/contact` - Submit contact form
  - Body: `{ name, email, subject, message }`
  - Response: `{ success: true, message: "..." }`

### Authentication
- **POST** `/api/auth/login` - Student login
  - Body: `{ username, password }`
  - Demo credentials: `username: "demo"`, `password: "demo123"`

- **POST** `/api/auth/recovery` - Password recovery request
  - Body: `{ "recovery-id": "email or roll number" }`

### Admin (Optional)
- **GET** `/api/contact/submissions` - Get all contact submissions

## Notes

- Contact form submissions are saved to `backend/contact-submissions.json`
- Login system is in demo mode - replace with real database authentication
- All static files (HTML, CSS, JS) are served from the `frontend` folder
- Server runs on port 3000 by default (change via PORT environment variable)

## Development

### Backend
To modify the backend, edit `backend/server.js` and restart the server.

### Frontend
To modify the frontend, edit files in the `frontend` folder - changes will be visible after refreshing the browser.

## Running the Server

Always run the server from the `backend` folder:

```bash
cd backend
npm start
```

The server will automatically serve files from the `frontend` folder.
