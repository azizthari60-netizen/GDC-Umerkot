// Admin Dashboard JavaScript - Complete Implementation
const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// Check if admin is logged in
document.addEventListener('DOMContentLoaded', () => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    window.location.href = 'index.html';
    return;
  }

  loadStudents();
  loadContactSubmissions();
  loadStats();
  loadAssignments();
  loadChallans();

  // Register Old Student Form
  const registerOldStudentForm = document.getElementById('register-old-student-form');
  if (registerOldStudentForm) {
    registerOldStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerOldStudentForm);
      const data = {
        fullName: formData.get('fullName'),
        cnic: formData.get('cnic'),
        password: formData.get('password') || formData.get('cnic'),
        batch: formData.get('batch'),
        rollNumber: formData.get('rollNumber'),
        dob: formData.get('dob'),
        gender: formData.get('gender')
      };

      const submitButton = registerOldStudentForm.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : 'Register Old Student';
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';
      }

      try {
        const res = await fetch(`${API_BASE_URL}/admin/old-students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alert(`Old student registered successfully!\nPassword: ${result.password}\n\nPlease save this password to share with the student.`);
          registerOldStudentForm.reset();
          loadStudents();
          loadStats();
        } else {
          alert(result.message || 'Failed to register old student');
        }
      } catch (err) {
        console.error('Error registering old student:', err);
        alert('Network error. Please try again.');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('adminToken');
      window.location.href = 'index.html';
    });
  }

  // Footer year
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

async function loadStudents() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const studentsList = document.getElementById('students-list');
    
    if (res.ok && data.success && data.students.length > 0) {
      studentsList.innerHTML = data.students.map(student => {
        const approveBtn = `<button class="btn btn-primary btn-small" onclick="approveStudent('${student._id}')">Approve</button>`;
        const rejectBtn = `<button class="btn btn-danger btn-small" onclick="rejectStudent('${student._id}')">Reject</button>`;
        
        return `
          <div class="student-item">
            <div style="flex: 1;">
              <strong>${student.fullName}</strong> (${student.cnic})<br>
              <small>Batch: ${student.batch || 'N/A'} | Status: ${student.status || 'N/A'}</small>
            </div>
            <div class="student-actions">
              ${student.status === 'Pending' ? approveBtn + ' ' + rejectBtn : `<span style="color: #059669;">✓ ${student.status}</span>`}
            </div>
          </div>
        `;
      }).join('');
    } else {
      studentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No students found.</p>';
    }
  } catch (err) {
    console.error('Error loading students:', err);
  }
}

async function loadChallans() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students-with-challans`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const challansList = document.getElementById('challans-list');
    
    if (res.ok && data.success && data.students.length > 0) {
      // Filter students with uploaded challans
      const challengsToVerify = data.students.filter(s => s.challanStatus === 'Uploaded' || s.challanStatus === 'Verified');
      
      if (challengsToVerify.length > 0) {
        challansList.innerHTML = challengsToVerify.map(student => {
          const verifyChallanBtn = student.challanStatus === 'Uploaded' 
            ? `<button class="btn btn-primary btn-small" onclick="verifyChallan('${student._id}')">Verify</button>`
            : `<span style="color: #059669;">✓ Verified</span>`;
          
          const approvAppBtn = student.status === 'Challan Verified' || student.status === 'Approved'
            ? `<button class="btn btn-primary btn-small" onclick="approveApplication('${student._id}')">Approve App</button>`
            : `<span style="color: #059669;">✓ Approved</span>`;
          
          // Upload Slip button for approved students
          const uploadSlipBtn = (student.status === 'Approved' || student.status === 'Challan Verified')
            ? `<button class="btn btn-primary btn-small" onclick="uploadSlip('${student._id}')">Upload Slip</button>`
            : '';
          
          return `
            <div class="student-item">
              <div style="flex: 1;">
                <strong>${student.fullName}</strong> (${student.cnic})<br>
                <small>Challan: ${student.challanStatus} | App Status: ${student.status}</small><br>
                ${student.challanImage ? `<a href="${student.challanImage}" target="_blank" style="color: #1e3a8a; font-size: 0.85rem;">📷 View Challan Image</a>` : ''}
              </div>
              <div class="student-actions">
                ${verifyChallanBtn}
                ${student.challanStatus === 'Verified' ? approvAppBtn : ''}
                ${uploadSlipBtn}
              </div>
            </div>
          `;
        }).join('');
      } else {
        challansList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No challans pending verification.</p>';
      }
    } else {
      challansList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No students with challans.</p>';
    }
  } catch (err) {
    console.error('Error loading challans:', err);
  }
}

async function verifyChallan(studentId) {
  if (!confirm('Verify this challan and update status to "Challan Verified"?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/verify-challan/${studentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Challan verified successfully!');
      loadChallans();
      loadStats();
    } else {
      alert(data.message || 'Failed to verify challan');
    }
  } catch (err) {
    console.error('Error verifying challan:', err);
    alert('Network error. Please try again.');
  }
}

async function approveApplication(studentId) {
  if (!confirm('Approve this student application?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/approve-application/${studentId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Application approved successfully!');
      loadChallans();
      loadStats();
    } else {
      alert(data.message || 'Failed to approve application');
    }
  } catch (err) {
    console.error('Error approving application:', err);
    alert('Network error. Please try again.');
  }
}

async function approveStudent(studentId) {
  if (!confirm('Approve this student?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student approved successfully!');
      loadStudents();
      loadStats();
    } else {
      alert(data.message || 'Failed to approve student');
    }
  } catch (err) {
    console.error('Error approving student:', err);
    alert('Network error. Please try again.');
  }
}

async function rejectStudent(studentId) {
  if (!confirm('Reject this student?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/reject`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student rejected successfully!');
      loadStudents();
      loadStats();
    } else {
      alert(data.message || 'Failed to reject student');
    }
  } catch (err) {
    console.error('Error rejecting student:', err);
    alert('Network error. Please try again.');
  }
}

async function loadContactSubmissions() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/contact-submissions`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const contactList = document.getElementById('contact-submissions');
    
    if (res.ok && data.success && data.submissions.length > 0) {
      contactList.innerHTML = data.submissions.map(submission => `
        <div class="student-item">
          <div style="flex: 1;">
            <strong>${submission.name}</strong><br>
            <small>${submission.email} | Subject: ${submission.subject}</small><br>
            <small style="color: #6b7280;">Message: ${submission.message.substring(0, 100)}...</small>
          </div>
          <div class="student-actions">
            <button class="btn btn-primary btn-small" onclick="replyToContact('${submission._id}')">Reply</button>
          </div>
        </div>
      `).join('');
    } else {
      contactList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No submissions.</p>';
    }
  } catch (err) {
    console.error('Error loading contact submissions:', err);
  }
}

async function loadAssignments() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/assignments`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const assignmentsList = document.getElementById('assignments-list');
    
    if (res.ok && data.success && data.assignments.length > 0) {
      const pending = data.assignments.filter(a => a.status === 'pending');
      
      if (pending.length > 0) {
        assignmentsList.innerHTML = pending.map(assignment => `
          <div class="student-item">
            <div style="flex: 1;">
              <strong>${assignment.title}</strong> - ${assignment.course}<br>
              <small>Student CNIC: ${assignment.studentCnic}</small>
            </div>
            <div class="student-actions">
              <button class="btn btn-primary btn-small" onclick="gradeAssignment('${assignment._id}')">Grade</button>
            </div>
          </div>
        `).join('');
      } else {
        assignmentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">All assignments graded.</p>';
      }
    } else {
      assignmentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No assignments.</p>';
    }
  } catch (err) {
    console.error('Error loading assignments:', err);
  }
}

async function loadStats() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const [studentsRes, approvalsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/admin/students`, { headers: { 'Authorization': `Bearer ${adminToken}` } }),
      fetch(`${API_BASE_URL}/admin/students-with-challans`, { headers: { 'Authorization': `Bearer ${adminToken}` } })
    ]);

    const studentsData = await studentsRes.json();
    const approvalsData = await approvalsRes.json();

    const totalStudents = studentsData.students ? studentsData.students.length : 0;
    const activeStudents = studentsData.students ? studentsData.students.filter(s => s.status === 'Approved').length : 0;
    const pendingRequests = approvalsData.students ? approvalsData.students.filter(s => s.challanStatus === 'Uploaded').length : 0;

    const totalSpan = document.getElementById('total-students');
    const activeSpan = document.getElementById('active-students');
    const pendingSpan = document.getElementById('pending-requests');

    if (totalSpan) totalSpan.textContent = totalStudents;
    if (activeSpan) activeSpan.textContent = activeStudents;
    if (pendingSpan) pendingSpan.textContent = pendingRequests;
  } catch (err) {
    console.error('Error loading stats:', err);
  }
}

function replyToContact(submissionId) {
  alert('Reply functionality will be added soon!');
}

function gradeAssignment(assignmentId) {
  alert('Grading functionality will be added soon!');
}

async function uploadSlip(studentId) {
  try {
    // First prompt: Test Date
    const testDateInput = prompt('Enter Test Date (YYYY-MM-DD):');
    if (!testDateInput) {
      return; // User cancelled
    }
    
    // Validate date format
    const testDate = new Date(testDateInput);
    if (isNaN(testDate.getTime())) {
      alert('Invalid date format. Please use YYYY-MM-DD format.');
      return;
    }
    
    // Second prompt: Roll Number Suffix (last part: 001, 002, etc.)
    const rollNumberSuffix = prompt('Enter Roll Number Suffix (e.g., 001, 002, 003...):');
    if (!rollNumberSuffix) {
      return; // User cancelled
    }
    
    // Validate roll number suffix (should be numeric)
    if (!/^\d+$/.test(rollNumberSuffix)) {
      alert('Invalid roll number suffix. Please enter numbers only (e.g., 001, 002).');
      return;
    }
    
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/slip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        testDate: testDateInput,
        rollNumberSuffix: rollNumberSuffix
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Slip created successfully! The student can now download their admit card.');
      loadChallans();
    } else {
      alert(data.message || 'Failed to create slip');
    }
  } catch (err) {
    console.error('Error uploading slip:', err);
    alert('Network error. Please try again.');
  }
}
