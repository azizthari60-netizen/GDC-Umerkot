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
      // Filter to show ONLY old students (isOldStudent: true)
      const oldStudents = data.students.filter(student => student.isOldStudent === true);
      
      if (oldStudents.length > 0) {
        studentsList.innerHTML = oldStudents.map(student => {
          return `
            <div class="student-item">
              <div style="flex: 1;">
                <strong>${student.fullName}</strong> (${student.cnic})<br>
                <small>Batch: ${student.batch || 'N/A'} | Roll: ${student.rollNumber || 'N/A'} | Status: Active</small>
              </div>
              <div class="student-actions">
                <span style="color: #059669;">✓ Registered</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        studentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No old students registered yet.</p>';
      }
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
      // Show ALL students who submitted forms (isFormFilled: true)
      // They are already filtered by the API endpoint
      
      challansList.innerHTML = data.students.map(student => {
        // Status badge with color
        let statusBadge = '';
        if (student.status === 'Pending') {
          statusBadge = '<span class="status-pending">Pending</span>';
        } else if (student.status === 'Challan Verified') {
          statusBadge = '<span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Challan Verified</span>';
        } else if (student.status === 'Approved') {
          statusBadge = '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Approved</span>';
        } else if (student.status === 'Rejected') {
          statusBadge = '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Rejected</span>';
        } else {
          statusBadge = `<span>${student.status || 'N/A'}</span>`;
        }
        
        // Buttons based on status
        const viewProfileBtn = `<button class="btn btn-primary btn-small" onclick="viewStudentProfile('${student._id}')">View Profile</button>`;
        const viewChallanBtn = student.challanImage 
          ? `<button class="btn btn-primary btn-small" onclick="viewChallanImage('${student._id}', '${student.challanImage}')">View Challan</button>`
          : '<span style="color: #6b7280; font-size: 0.85rem;">No Challan</span>';
        const verifyChallanBtn = (student.challanStatus === 'Uploaded' && student.status !== 'Rejected')
          ? `<button class="btn btn-primary btn-small" onclick="verifyChallan('${student._id}')">Verify Challan</button>`
          : (student.challanStatus === 'Verified' ? '<span style="color: #059669;">✓ Verified</span>' : '');
        const approveBtn = (student.challanStatus === 'Verified' && student.status !== 'Approved' && student.status !== 'Rejected')
          ? `<button class="btn btn-primary btn-small" onclick="approveApplication('${student._id}')">Approve</button>`
          : '';
        const rejectBtn = (student.status === 'Pending' || student.status === 'Challan Verified')
          ? `<button class="btn btn-danger btn-small" onclick="rejectApplication('${student._id}')">Reject</button>`
          : '';
        
        return `
          <div class="student-item">
            <div style="flex: 1;">
              <strong>${student.fullName}</strong> (${student.cnic})<br>
              <small>Challan Status: ${student.challanStatus || 'Not Generated'} | Application Status: ${statusBadge}</small>
            </div>
            <div class="student-actions" style="flex-wrap: wrap; gap: 0.5rem;">
              ${viewProfileBtn}
              ${viewChallanBtn}
              ${verifyChallanBtn}
              ${approveBtn}
              ${rejectBtn}
            </div>
          </div>
        `;
      }).join('');
    } else {
      challansList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No students with submitted applications.</p>';
    }
  } catch (err) {
    console.error('Error loading challans:', err);
  }
}

async function verifyChallan(studentId) {
  if (!confirm('Verify this challan and update status to "Challan Verified"?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/verify-challan`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Challan verified successfully! Student status updated to "Challan Verified".');
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
  if (!confirm('Approve this student application? This will change the status to "Approved".')) return;
  
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
      alert('Application approved successfully! Student status updated to "Approved".');
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

async function rejectApplication(studentId) {
  if (!confirm('Reject this student application? This action cannot be undone.')) return;
  
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
      alert('Application rejected successfully!');
      loadChallans();
      loadStats();
    } else {
      alert(data.message || 'Failed to reject application');
    }
  } catch (err) {
    console.error('Error rejecting application:', err);
    alert('Network error. Please try again.');
  }
}

async function viewStudentProfile(studentId) {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students-with-challans`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const student = data.students.find(s => s._id === studentId);
      if (!student) {
        alert('Student not found');
        return;
      }

      const modal = document.getElementById('view-profile-modal');
      const content = document.getElementById('student-profile-content');
      
      // Build profile HTML
      const formData = student.formData || {};
      content.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
          <div><strong>Full Name:</strong> ${student.fullName || '-'}</div>
          <div><strong>CNIC:</strong> ${student.cnic || '-'}</div>
          <div><strong>Father's Name:</strong> ${formData.fName || '-'}</div>
          <div><strong>Caste:</strong> ${formData.caste || '-'}</div>
          <div><strong>Domicile:</strong> ${formData.domicile || '-'}</div>
          <div><strong>Date of Birth:</strong> ${formData.dob || '-'}</div>
          <div><strong>Gender:</strong> ${formData.gender || '-'}</div>
          <div><strong>Email:</strong> ${formData.email || '-'}</div>
          <div><strong>Mobile:</strong> ${formData.mobile || '-'}</div>
          <div><strong>Address:</strong> ${formData.address || '-'}</div>
          <div><strong>Guardian Name:</strong> ${formData.gName || '-'}</div>
          <div><strong>Guardian Occupation:</strong> ${formData.gOcc || '-'}</div>
          <div><strong>Guardian Contact:</strong> ${formData.gContact || '-'}</div>
          <div><strong>Guardian Address:</strong> ${formData.gAddress || '-'}</div>
        </div>
        <div style="margin-top: 1.5rem;">
          <h4 style="margin-bottom: 0.5rem;">Matriculation Details</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div><strong>Board:</strong> ${formData.matric?.brd || '-'}</div>
            <div><strong>Year:</strong> ${formData.matric?.yr || '-'}</div>
            <div><strong>Roll Number:</strong> ${formData.matric?.roll || '-'}</div>
            <div><strong>Group:</strong> ${formData.matric?.grp || '-'}</div>
            <div><strong>Percentage:</strong> ${formData.matric?.per || '-'}%</div>
          </div>
        </div>
        <div style="margin-top: 1.5rem;">
          <h4 style="margin-bottom: 0.5rem;">Intermediate Details</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
            <div><strong>Board:</strong> ${formData.inter?.brd || '-'}</div>
            <div><strong>Year:</strong> ${formData.inter?.yr || '-'}</div>
            <div><strong>Roll Number:</strong> ${formData.inter?.roll || '-'}</div>
            <div><strong>Group:</strong> ${formData.inter?.grp || '-'}</div>
            <div><strong>Percentage:</strong> ${formData.inter?.per || '-'}%</div>
          </div>
        </div>
        ${student.profileImage ? `<div style="margin-top: 1.5rem; text-align: center;"><img src="${student.profileImage}" alt="Profile" style="max-width: 200px; border-radius: 8px; border: 2px solid #e5e7eb;"></div>` : ''}
      `;
      
      // Show modal
      modal.classList.add('active');
      modal.setAttribute('aria-hidden', 'false');
      
      // Close modal handlers
      const closeButtons = modal.querySelectorAll('[data-close-modal]');
      closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          modal.classList.remove('active');
          modal.setAttribute('aria-hidden', 'true');
        });
      });
    } else {
      alert('Failed to load student profile');
    }
  } catch (err) {
    console.error('Error loading student profile:', err);
    alert('Network error. Please try again.');
  }
}

function viewChallanImage(studentId, challanImageUrl) {
  const modal = document.getElementById('view-challan-modal');
  const content = document.getElementById('challan-image-content');
  
  content.innerHTML = `
    <img src="${challanImageUrl}" alt="Challan Image" style="max-width: 100%; border-radius: 8px; border: 2px solid #e5e7eb;">
    <p style="margin-top: 1rem;"><a href="${challanImageUrl}" target="_blank" style="color: #1e3a8a;">Open in new tab</a></p>
  `;
  
  // Show modal
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  
  // Close modal handlers
  const closeButtons = modal.querySelectorAll('[data-close-modal]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.remove('active');
      modal.setAttribute('aria-hidden', 'true');
    });
  });
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
