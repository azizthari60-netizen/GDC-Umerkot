// Admin Dashboard JavaScript
const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// Check if admin is logged in
document.addEventListener('DOMContentLoaded', () => {
  const adminToken = localStorage.getItem('adminToken');
  if (!adminToken) {
    // Try to login with default credentials or redirect
    window.location.href = 'index.html';
    return;
  }

  loadStudents();
  loadContactSubmissions();
  loadStats();
  loadAssignments();

  // Register Old Student Form
  const registerOldStudentForm = document.getElementById('register-old-student-form');
  if (registerOldStudentForm) {
    registerOldStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerOldStudentForm);
      const data = {
        fullName: formData.get('fullName'),
        cnic: formData.get('cnic'),
        password: formData.get('password') || formData.get('cnic'), // Use CNIC as default password
        batch: formData.get('batch'),
        rollNumber: formData.get('rollNumber')
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
    
    if (res.ok && data.success) {
      if (data.students.length === 0) {
        studentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No students registered yet.</p>';
        return;
      }

      studentsList.innerHTML = data.students.map(student => {
        const statusClass = student.status === 'Approved' ? 'status-graded' : 
                           student.status === 'Rejected' ? 'status-pending' : 'status-pending';
        const challanStatus = student.challanStatus || 'Not Generated';
        const isOld = student.isOldStudent || false;
        
        let actions = '';
        if (!isOld && student.status === 'Pending') {
          actions += `<button class="btn btn-primary btn-small" onclick="approveStudent('${student._id}')">Approve</button>`;
          actions += `<button class="btn btn-danger btn-small" onclick="rejectStudent('${student._id}')">Reject</button>`;
        }
        if (!isOld && challanStatus === 'Uploaded') {
          actions += `<button class="btn btn-primary btn-small" onclick="verifyChallan('${student._id}')">Verify Challan</button>`;
        }
        actions += `<button class="btn btn-primary btn-small" onclick="uploadSlip('${student._id}')">Upload Slip</button>`;
        actions += `<button class="btn btn-danger btn-small" onclick="deleteStudent('${student._id}', ${isOld})">Delete</button>`;

        return `
          <div class="student-item">
            <div class="student-info" style="display: flex; align-items: center;">
              ${student.profileImage ? `<img src="${student.profileImage}" alt="Profile">` : ''}
              <div>
                <strong>${student.fullName}</strong><br>
                <small style="color: #6b7280;">CNIC: ${student.cnic} | Batch: ${student.batch || 'N/A'} ${isOld ? '| Old Student' : ''}</small><br>
                <span class="${statusClass}" style="margin-top: 0.25rem; display: inline-block;">Status: ${student.status || 'Active'}</span>
                ${!isOld ? `<br><small style="color: #6b7280;">Challan: ${challanStatus}</small>` : ''}
              </div>
            </div>
            <div class="student-actions">
              ${actions}
            </div>
          </div>
        `;
      }).join('');
    } else {
      studentsList.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Error loading students.</p>';
    }
  } catch (err) {
    console.error('Error loading students:', err);
    document.getElementById('students-list').innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Network error. Please refresh.</p>';
  }
}

async function approveStudent(studentId) {
  if (!confirm('Approve this student registration?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Approved' })
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
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function rejectStudent(studentId) {
  if (!confirm('Reject this student registration?')) return;
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Rejected' })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student rejected.');
      loadStudents();
      loadStats();
    } else {
      alert(data.message || 'Failed to reject student');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function verifyChallan(studentId) {
  if (!confirm('Verify this challan?')) return;
  
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
      alert('Challan verified successfully!');
      loadStudents();
    } else {
      alert(data.message || 'Failed to verify challan');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function uploadSlip(studentId) {
  const testDate = prompt('Enter test date (YYYY-MM-DD) or leave empty:');
  const availableDate = prompt('Enter available date (YYYY-MM-DD) or leave empty for immediate availability:');
  
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/slip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        testDate: testDate || null,
        availableDate: availableDate || null
      })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Slip created successfully!');
    } else {
      alert(data.message || 'Failed to create slip');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function deleteStudent(studentId, isOldStudent) {
  if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}?oldStudent=${isOldStudent}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student deleted successfully');
      loadStudents();
      loadStats();
    } else {
      alert(data.message || 'Failed to delete student');
    }
  } catch (err) {
    console.error('Error:', err);
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
    const submissionsDiv = document.getElementById('contact-submissions');
    
    if (res.ok && data.success && data.submissions && data.submissions.length > 0) {
      submissionsDiv.innerHTML = data.submissions.map(sub => `
        <div class="student-item">
          <div class="student-info">
            <strong>${sub.name}</strong> - ${sub.subject}<br>
            <small style="color: #6b7280;">${sub.email} | ${new Date(sub.submittedAt).toLocaleDateString()}</small><br>
            <p style="margin-top: 0.5rem; color: #4b5563;">${sub.message}</p>
            ${sub.replied ? '<span class="status-graded">Replied</span>' : '<span class="status-pending">Not Replied</span>'}
          </div>
          <div class="student-actions">
            ${!sub.replied ? `<button class="btn btn-primary btn-small" onclick="replyToContact('${sub._id}', '${sub.email}', '${sub.subject.replace(/'/g, "\\'")}')">Reply</button>` : ''}
          </div>
        </div>
      `).join('');
    } else {
      submissionsDiv.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No contact submissions yet.</p>';
    }
  } catch (err) {
    console.error('Error loading submissions:', err);
  }
}

async function replyToContact(contactId, email, subject) {
  const replyMessage = prompt('Enter your reply message:');
  if (!replyMessage) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/contact/${contactId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ replyMessage })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Reply sent successfully!');
      loadContactSubmissions();
    } else {
      alert(data.message || 'Failed to send reply');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function loadStats() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      document.getElementById('total-students').textContent = data.totalStudents || 0;
      document.getElementById('active-students').textContent = data.activeStudents || 0;
      document.getElementById('pending-requests').textContent = data.pendingRequests || 0;
    }
  } catch (err) {
    console.error('Error loading stats:', err);
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
    const assignmentsDiv = document.getElementById('assignments-list');
    
    if (res.ok && data.success && data.assignments && data.assignments.length > 0) {
      assignmentsDiv.innerHTML = data.assignments.map(assignment => {
        const statusClass = assignment.status === 'graded' ? 'status-graded' : 'status-pending';
        const statusText = assignment.status === 'graded' ? 'Graded' : 'Pending';
        return `
          <div class="student-item">
            <div class="student-info">
              <strong>${assignment.title}</strong><br>
              <small style="color: #6b7280;">${assignment.studentId?.fullName || 'N/A'} (${assignment.studentCnic}) | ${assignment.course} | ${new Date(assignment.uploadedAt).toLocaleDateString()}</small>
              ${assignment.grade ? `<br><small style="color: #1e3a8a;">Grade: ${assignment.grade}</small>` : ''}
              <br><span class="${statusClass}">${statusText}</span>
            </div>
            <div class="student-actions">
              ${assignment.fileUrl ? `<a href="${assignment.fileUrl}" target="_blank" class="btn btn-primary btn-small">View</a>` : ''}
              ${assignment.status !== 'graded' ? `<button class="btn btn-primary btn-small" onclick="gradeAssignment('${assignment._id}')">Grade</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      assignmentsDiv.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No assignments submitted yet.</p>';
    }
  } catch (err) {
    console.error('Error loading assignments:', err);
    document.getElementById('assignments-list').innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Network error. Please refresh.</p>';
  }
}

async function gradeAssignment(assignmentId) {
  const grade = prompt('Enter grade for this assignment:');
  if (!grade) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/assignments/${assignmentId}/grade`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ grade })
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Assignment graded successfully!');
      loadAssignments();
    } else {
      alert(data.message || 'Failed to grade assignment');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}
