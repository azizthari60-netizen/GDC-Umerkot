
// Admin Dashboard JavaScript - Complete Implementation
const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// Check if admin is logged in

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

  // Search functionality
  const searchInput = document.getElementById('stdntSearch');
        searchInput.addEventListener('input', () => {
            const input = searchInput.value.toLowerCase();
            const studentItems = document.querySelectorAll('#students-list .student-item');
            studentItems.forEach(item => {
                const name = item.querySelector('strong').textContent.toLowerCase();
                const rollNumber = item.querySelector('.student-roll-number').textContent.toLowerCase();
                const batch = item.querySelector('.student-batch').textContent.toLowerCase();

                if (name.includes(input) || rollNumber.includes(input) || batch.includes(input)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });

  // Mark Attendance button handler (moved inside DOMContentLoaded for proper element selection)
  const markAttendanceBtn = document.getElementById('btn-mark-attendance-global');
  if (markAttendanceBtn) {
    markAttendanceBtn.addEventListener('click', () => {
      const studentId = prompt('Enter Student ID:');
      if (studentId) {
        markAttendancePrompt(studentId);
      }
    });
  }

  // Register Student Form
  const registerStudentForm = document.getElementById('register-student-form');
  if (registerStudentForm) {
    registerStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerStudentForm);
      const data = {
        fullName: formData.get('fullName'),
        fatherName: formData.get('fatherName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        cnic: formData.get('cnic'),
        password: formData.get('password') || formData.get('cnic'),
        batch: formData.get('batch'),
        rollNumber: formData.get('rollNumber'),
        dob: formData.get('dob'),
        gender: formData.get('gender')
      };

      const submitButton = registerStudentForm.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : 'Register Student';
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';
      }

      try {
        const adminToken = localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE_URL}/admin/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alert(`Student registered successfully!\nPassword: ${result.password}\n\nPlease save this password to share with the student.`);
          registerStudentForm.reset();
          loadStudents();
          loadStats();
        } else {
          alert(result.message || 'Failed to register student');
        }
      } catch (err) {
        console.error('Error registering student:', err);
        alert('Network error. Please try again.');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      }
    });
  }

  // Download Results Template button
  const downloadTemplateBtn = document.getElementById('btn-download-template');
  if (downloadTemplateBtn) {
    downloadTemplateBtn.addEventListener('click', async () => {
      const adminToken = localStorage.getItem('adminToken');
      try {
        downloadTemplateBtn.disabled = true;
        downloadTemplateBtn.textContent = 'Downloading...';
        
        const res = await fetch(`${API_BASE_URL}/admin/download-results-template`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'resultsTemplate.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          alert('Template downloaded successfully!');
        } else {
          alert('Failed to download template');
        }
      } catch (err) {
        console.error('Error downloading template:', err);
        alert('Network error. Please try again.');
      } finally {
        downloadTemplateBtn.disabled = false;
        downloadTemplateBtn.textContent = '📥 Download Results Template';
      }
    });
  }

  // Download Student Import Template button
  const downloadStudentsTemplateBtn = document.getElementById('btn-download-students-template');
  if (downloadStudentsTemplateBtn) {
    downloadStudentsTemplateBtn.addEventListener('click', async () => {
      const adminToken = localStorage.getItem('adminToken');
      try {
        downloadStudentsTemplateBtn.disabled = true;
        downloadStudentsTemplateBtn.textContent = 'Downloading...';
        
        const res = await fetch(`${API_BASE_URL}/admin/download-students-template`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`
          }
        });

        if (res.ok) {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'student-import-template.xlsx';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          alert('Student import template downloaded successfully!');
        } else {
          alert('Failed to download student import template');
        }
      } catch (err) {
        console.error('Error downloading student import template:', err);
        alert('Network error. Please try again.');
      } finally {
        downloadStudentsTemplateBtn.disabled = false;
        downloadStudentsTemplateBtn.textContent = '📥 Download Student Import Template';
      }
    });
  }

  // Clear all students button
  const clearAllStudentsBtn = document.getElementById('btn-clear-all-students');
  if (clearAllStudentsBtn) {
    clearAllStudentsBtn.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure you want to delete all students? This cannot be undone.');
      if (!confirmed) return;

      try {
        clearAllStudentsBtn.disabled = true;
        clearAllStudentsBtn.textContent = 'Deleting...';

        const res = await fetch(`${API_BASE_URL}/admin/students/delete-all`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
          }
        });

        const result = await res.json();
        if (res.ok) {
          alert(result.message || 'All students deleted successfully');
          loadStudents();
          loadStats();
        } else {
          alert(result.message || 'Failed to delete students');
        }
      } catch (err) {
        console.error('Error deleting all students:', err);
        alert('Network error. Please try again.');
      } finally {
        clearAllStudentsBtn.disabled = false;
        clearAllStudentsBtn.textContent = '🗑️ Clear All Students';
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
        return `
          <div class="student-item">
            <div style="flex: 1; min-width: 0;">
              <strong>${student.fullName}</strong> (${student.cnic})<br>
              <small>Batch: <span class="student-batch">${student.batch || 'N/A'}</span> | Roll: <span class="student-roll-number">${student.rollNumber || 'N/A'}</span> | Status: ${student.status || 'N/A'}</small>
            </div>
            <div class="student-actions">
              <button class="btn btn-primary btn-small" onclick="viewStudentProfile('${student._id}')">View Profile</button>
              <button class="btn btn-secondary btn-small" onclick="openEditStudentModal('${student._id}')">Edit Profile</button>
              <button class="btn btn-primary btn-small" onclick="markAttendancePrompt('${student._id}')">Mark Attendance</button>
              <button class="btn btn-warning btn-small" onclick="resetStudentPassword('${student._id}', '${student.cnic}')">Reset Password</button>
              <button class="btn btn-danger btn-small" onclick="deleteStudent('${student._id}')">Delete</button>
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



async function viewStudentProfile(studentId) {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to load student profile');
      return;
    }

    const student = data.student;
    const modal = document.getElementById('view-profile-modal');
    const content = document.getElementById('student-profile-content');
    const formData = student.formData || {};

    content.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
        <div><strong>Full Name:</strong> ${student.fullName || '-'}</div>
        <div><strong>CNIC:</strong> ${student.cnic || '-'}</div>
        <div><strong>Batch:</strong> ${student.batch || '-'}</div>
        <div><strong>Roll Number:</strong> ${student.rollNumber || '-'}</div>
        <div><strong>Father's Name:</strong> ${student.fatherName || formData.fName || '-'}</div>
        <div><strong>Caste:</strong> ${student.caste || formData.caste || '-'}</div>
        <div><strong>Domicile:</strong> ${student.domicile || formData.domicile || '-'}</div>
        <div><strong>Date of Birth:</strong> ${student.dob || formData.dob || '-'}</div>
        <div><strong>Gender:</strong> ${student.gender || formData.gender || '-'}</div>
        <div><strong>Email:</strong> ${student.email || formData.email || '-'}</div>
        <div><strong>Mobile:</strong> ${student.mobile || formData.mobile || '-'}</div>
        <div><strong>Address:</strong> ${student.address || formData.address || '-'}</div>
      </div>
      <div style="margin-top: 1.5rem; display:flex; gap:0.75rem; flex-wrap:wrap;">
        <button class="btn btn-primary btn-small" onclick="openEditStudentModal('${student._id}')">Edit Profile</button>
        <button class="btn btn-warning btn-small" onclick="resetStudentPassword('${student._id}', '${student.cnic}')">Reset Password</button>
      </div>
      ${student.profileImage ? `<div style="margin-top: 1.5rem; text-align: center;"><img src="${student.profileImage}" alt="Profile" style="max-width: 200px; border-radius: 8px; border: 2px solid #e5e7eb;"></div>` : ''}
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');

    const closeButtons = modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    });
  } catch (err) {
    console.error('Error loading student profile:', err);
    alert('Network error. Please try again.');
  }
}

async function openEditStudentModal(studentId) {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to load student');
      return;
    }

    const student = data.student;
    const modal = document.getElementById('view-profile-modal');
    const content = document.getElementById('student-profile-content');
    content.innerHTML = `
      <form id="edit-student-form" style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem;">
        <div>
          <label>Full Name</label>
          <input type="text" id="edit-fullName" value="${student.fullName || ''}" />
        </div>
        <div>
          <label>CNIC</label>
          <input type="text" value="${student.cnic || ''}" disabled />
        </div>
        <div>
          <label>Batch</label>
          <input type="text" id="edit-batch" value="${student.batch || ''}" />
        </div>
        <div>
          <label>Roll Number</label>
          <input type="text" id="edit-rollNumber" value="${student.rollNumber || ''}" />
        </div>
        <div>
          <label>Father's Name</label>
          <input type="text" id="edit-fatherName" value="${student.fatherName || ''}" />
        </div>
        <div>
          <label>Email</label>
          <input type="email" id="edit-email" value="${student.email || ''}" />
        </div>
        <div>
          <label>Mobile</label>
          <input type="text" id="edit-mobile" value="${student.mobile || ''}" />
        </div>
        <div>
          <label>Gender</label>
          <input type="text" id="edit-gender" value="${student.gender || ''}" />
        </div>
        <div style="grid-column: span 2;">
          <label>Address</label>
          <input type="text" id="edit-address" value="${student.address || ''}" />
        </div>
        <div>
          <label>Caste</label>
          <input type="text" id="edit-caste" value="${student.caste || ''}" />
        </div>
        <div>
          <label>Domicile</label>
          <input type="text" id="edit-domicile" value="${student.domicile || ''}" />
        </div>
        <div>
          <label>Date of Birth</label>
          <input type="date" id="edit-dob" value="${student.dob || ''}" />
        </div>
        <div>
          <label>Status</label>
          <select id="edit-status">
            <option value="Pending" ${student.status === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Challan Verified" ${student.status === 'Challan Verified' ? 'selected' : ''}>Challan Verified</option>
            <option value="Approved" ${student.status === 'Approved' ? 'selected' : ''}>Approved</option>
            <option value="Rejected" ${student.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </div>
      </form>
      <div style="margin-top: 1rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
        <button class="btn btn-primary btn-small" onclick="saveStudentProfile('${student._id}')">Save Changes</button>
        <button class="btn btn-secondary btn-small" data-close-modal>Cancel</button>
      </div>
    `;

    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    const closeButtons = modal.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
      });
    });
  } catch (err) {
    console.error('Error opening edit modal:', err);
    alert('Unable to load student details.');
  }
}

async function saveStudentProfile(studentId) {
  try {
    const updateData = {
      fullName: document.getElementById('edit-fullName')?.value,
      batch: document.getElementById('edit-batch')?.value,
      rollNumber: document.getElementById('edit-rollNumber')?.value,
      fatherName: document.getElementById('edit-fatherName')?.value,
      email: document.getElementById('edit-email')?.value,
      mobile: document.getElementById('edit-mobile')?.value,
      gender: document.getElementById('edit-gender')?.value,
      address: document.getElementById('edit-address')?.value,
      caste: document.getElementById('edit-caste')?.value,
      domicile: document.getElementById('edit-domicile')?.value,
      dob: document.getElementById('edit-dob')?.value,
      status: document.getElementById('edit-status')?.value
    };

    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify(updateData)
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.message || 'Failed to save student profile.');
      return;
    }

    alert('Student profile updated successfully.');
    document.getElementById('view-profile-modal').classList.remove('active');
    document.getElementById('view-profile-modal').setAttribute('aria-hidden', 'true');
    loadStudents();
    loadStats();
  } catch (err) {
    console.error('Error saving student profile:', err);
    alert('Unable to save student profile.');
  }
}

async function markAttendancePrompt(studentId) {
  const presentDays = prompt('Enter number of present days:');
  if (presentDays === null) return;
  const absentDays = prompt('Enter number of absent days:');
  if (absentDays === null) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/attendance/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ presentDays: Number(presentDays || 0), absentDays: Number(absentDays || 0) })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Attendance updated successfully.');
      loadAttendanceRecords();
    } else {
      alert(data.message || 'Failed to update attendance');
    }
  } catch (err) {
    console.error('Error updating attendance:', err);
    alert('Network error. Please try again.');
  }
}

async function resetStudentPassword(studentId, cnic) {
  const newPassword = prompt('Enter a new password for the student, or leave blank to reset to CNIC:');
  if (newPassword === null) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/reset-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      },
      body: JSON.stringify({ newPassword: newPassword || undefined })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Password reset successfully. New password: ${data.password}`);
    } else {
      alert(data.message || 'Failed to reset password');
    }
  } catch (err) {
    console.error('Error resetting password:', err);
    alert('Network error. Please try again.');
  }
}

async function deleteStudent(studentId) {
  const confirmed = confirm('Delete this student? This action cannot be undone.');
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Student deleted successfully.');
      loadStudents();
      loadStats();
    } else {
      alert(data.message || 'Failed to delete student');
    }
  } catch (err) {
    console.error('Error deleting student:', err);
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

async function saveAttendance(studentId) {
  try {
    const presentInput = document.getElementById(`present-${studentId}`);
    const absentInput = document.getElementById(`absent-${studentId}`);
    const presentDays = Number(presentInput?.value || 0);
    const absentDays = Number(absentInput?.value || 0);

    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/attendance/${studentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ presentDays, absentDays })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Attendance updated successfully');
      loadAttendanceRecords();
    } else {
      alert(data.message || 'Failed to update attendance');
    }
  } catch (err) {
    console.error('Error saving attendance:', err);
    alert('Network error. Please try again.');
  }
}

async function verifyChallan(studentId) {
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
      alert('Challan verified successfully');
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
      alert('Application approved successfully');
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

async function rejectApplication(studentId) {
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
      alert('Student rejected successfully');
      loadChallans();
      loadStats();
    } else {
      alert(data.message || 'Failed to reject student');
    }
  } catch (err) {
    console.error('Error rejecting student:', err);
    alert('Network error. Please try again.');
  }
}

async function uploadSlip(studentId) {
  try {
    const testDate = prompt('Enter test date (YYYY-MM-DD):');
    if (!testDate) {
      return;
    }
    const rollNumberSuffix = prompt('Enter roll number suffix (e.g. 001):', '001');
    if (!rollNumberSuffix) {
      return;
    }
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/admin/students/${studentId}/slip`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ testDate, rollNumberSuffix })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      alert('Slip created successfully');
      loadChallans();
    } else {
      alert(data.message || 'Failed to create slip');
    }
  } catch (err) {
    console.error('Error creating slip:', err);
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

//  result

const uploadForm = document.getElementById('upload-results-form');
if (uploadForm) {
  uploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('results-file');
    const formData = new FormData();

    // send file under predictable keys so server middleware catches it
    formData.append('resultsFile', fileInput.files[0]);
    formData.append('file', fileInput.files[0]); // older versions might expect 'file'
    try {
      const submitBtn = uploadForm.querySelector('button');
      submitBtn.innerText = 'uploading.....';
      submitBtn.disabled = true;
      const response = await fetch('/api/admin/upload-results', {method: 'POST', body: formData});

      const result = await response.json();
      if(response.ok){
        alert('Results uploaded successfully!');
        uploadForm.reset();
      } else {
        alert(result.message || 'Failed to upload results');
      }
      submitBtn.innerText = 'Upload Results';
      submitBtn.disabled = false;
    } catch (error) {
      console.error('Upload Error:', error);
      alert('Server Not working');
    }
  });
}

const uploadStudentsForm = document.getElementById('upload-students-form');
if (uploadStudentsForm) {
  uploadStudentsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('students-file');
    if (!fileInput.files.length) {
      alert('Please select an Excel file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('studentsFile', fileInput.files[0]);

    try {
      const submitBtn = uploadStudentsForm.querySelector('button');
      submitBtn.innerText = 'Uploading...';
      submitBtn.disabled = true;

      const response = await fetch(`${API_BASE_URL}/admin/upload-students`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: formData
      });

      const result = await response.json();
      if (response.ok) {
        alert(result.message || 'Students imported successfully!');
        uploadStudentsForm.reset();
        loadStudents();
        loadStats();
      } else {
        alert(result.message || 'Failed to import students');
      }
    } catch (error) {
      console.error('Upload Students Error:', error);
      alert('Server not working');
    } finally {
      const submitBtn = uploadStudentsForm.querySelector('button');
      if (submitBtn) {
        submitBtn.innerText = 'Upload Students';
        submitBtn.disabled = false;
      }
    }
  });
}

