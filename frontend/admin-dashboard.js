// Admin Dashboard JavaScript
// Always use backend server URL for API calls
const API_BASE_URL = (window.location.port === '5500' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:3000' 
  : '';

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
  populateStudentDropdowns();

  // Add student form
  const addStudentForm = document.getElementById('add-student-form');
  if (addStudentForm) {
    addStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitButton = addStudentForm.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : 'Create Student Account';
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Creating...';
      }

      const formData = new FormData(addStudentForm);
      const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        rollNumber: formData.get('rollNumber'),
        batch: formData.get('batch'),
        semester: formData.get('semester')
      };

      console.log('Submitting student data:', data);
      console.log('Admin token:', adminToken ? 'Present' : 'Missing');

      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(data)
        });

        console.log('Response status:', res.status);
        const result = await res.json();
        console.log('Response data:', result);

        if (res.ok && result.success) {
          alert('Student account created successfully!\n\nUsername: ' + result.username + '\nPassword: ' + result.password + '\n\nPlease save these credentials!');
          addStudentForm.reset();
          loadStudents();
          loadStats();
        } else {
          alert(result.error || 'Failed to create student account. Please check all fields are filled.');
        }
      } catch (err) {
        console.error('Error creating student:', err);
        alert('Network error: ' + err.message + '\n\nPlease make sure the backend server is running on http://localhost:3000');
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
        }
      }
    });
  } else {
    console.error('Add student form not found!');
  }

  // Update results form
  const updateResultsForm = document.getElementById('update-results-form');
  if (updateResultsForm) {
    updateResultsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(updateResultsForm);
      const data = {
        studentId: formData.get('studentId'),
        course: formData.get('course'),
        marks: parseFloat(formData.get('marks')),
        grade: formData.get('grade'),
        semester: parseInt(formData.get('semester'))
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/students/${data.studentId}/results`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alert('Result added successfully!');
          updateResultsForm.reset();
        } else {
          alert(result.error || 'Failed to add result');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Network error. Please try again.');
      }
    });
  }

  // Update CGPA form
  const updateCgpaForm = document.getElementById('update-cgpa-form');
  if (updateCgpaForm) {
    updateCgpaForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(updateCgpaForm);
      const data = {
        studentId: formData.get('studentId'),
        cgpa: parseFloat(formData.get('cgpa')),
        coursesEnrolled: parseInt(formData.get('coursesEnrolled'))
      };

      try {
        const res = await fetch(`${API_BASE_URL}/api/admin/students/${data.studentId}/cgpa`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify(data)
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alert('CGPA updated successfully!');
          updateCgpaForm.reset();
          loadStudents();
        } else {
          alert(result.error || 'Failed to update CGPA');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Network error. Please try again.');
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
    const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
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

      studentsList.innerHTML = data.students.map(student => `
        <div class="student-item">
          <div class="student-info">
            <strong>${student.name}</strong><br>
            <small style="color: #6b7280;">${student.rollNumber} | ${student.email} | Batch ${student.batch} | Semester ${student.semester}</small>
            ${student.cgpa ? `<br><small style="color: #1e3a8a;">CGPA: ${student.cgpa.toFixed(2)}</small>` : ''}
          </div>
          <div class="student-actions">
            <button class="btn btn-primary btn-small" onclick="resetPassword('${student._id || student.id}')">Reset Password</button>
            <button class="btn btn-danger btn-small" onclick="deleteStudent('${student._id || student.id}')">Delete</button>
          </div>
        </div>
      `).join('');
      
      // Update dropdowns after loading students
      populateStudentDropdowns();
    } else {
      studentsList.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Error loading students.</p>';
    }
  } catch (err) {
    console.error('Error loading students:', err);
    document.getElementById('students-list').innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Network error. Please refresh.</p>';
  }
}

async function loadContactSubmissions() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/contact/submissions`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const submissionsDiv = document.getElementById('contact-submissions');
    
    if (Array.isArray(data) && data.length > 0) {
      submissionsDiv.innerHTML = data.map(sub => `
        <div class="student-item">
          <div class="student-info">
            <strong>${sub.name}</strong> - ${sub.subject}<br>
            <small style="color: #6b7280;">${sub.email} | ${new Date(sub.submittedAt).toLocaleDateString()}</small><br>
            <p style="margin-top: 0.5rem; color: #4b5563;">${sub.message}</p>
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

async function loadStats() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
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

async function resetPassword(studentId) {
  if (!confirm('Reset password for this student? A new password will be generated.')) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/students/${studentId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      alert('Password reset successfully!\nNew Password: ' + data.password);
    } else {
      alert(data.error || 'Failed to reset password');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function deleteStudent(studentId) {
  if (!confirm('Are you sure you want to delete this student? This action cannot be undone.')) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/students/${studentId}`, {
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
      populateStudentDropdowns();
    } else {
      alert(data.error || 'Failed to delete student');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

async function loadAssignments() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/assignments`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    const assignmentsDiv = document.getElementById('assignments-list');
    
    if (res.ok && data.success) {
      if (data.assignments.length === 0) {
        assignmentsDiv.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No assignments submitted yet.</p>';
        return;
      }

      assignmentsDiv.innerHTML = data.assignments.map(assignment => {
        const statusClass = assignment.status === 'graded' ? 'status-graded' : 'status-pending';
        const statusText = assignment.status === 'graded' ? 'Graded' : 'Pending';
        return `
          <div class="student-item">
            <div class="student-info">
              <strong>${assignment.title}</strong><br>
              <small style="color: #6b7280;">${assignment.studentName} (${assignment.studentRoll}) | ${assignment.course} | ${new Date(assignment.uploadedAt).toLocaleDateString()}</small>
              ${assignment.grade ? `<br><small style="color: #1e3a8a;">Grade: ${assignment.grade}</small>` : ''}
            </div>
            <div class="student-actions">
              <a href="${API_BASE_URL}/api/admin/assignments/${assignment.id}/download" target="_blank" class="btn btn-primary btn-small">Download</a>
              ${assignment.status !== 'graded' ? `<button class="btn btn-primary btn-small" onclick="gradeAssignment('${assignment.id}')">Grade</button>` : ''}
            </div>
          </div>
        `;
      }).join('');
    } else {
      assignmentsDiv.innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Error loading assignments.</p>';
    }
  } catch (err) {
    console.error('Error loading assignments:', err);
    document.getElementById('assignments-list').innerHTML = '<p style="text-align: center; color: #dc2626; padding: 2rem;">Network error. Please refresh.</p>';
  }
}

async function populateStudentDropdowns() {
  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/students`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success) {
      const resultStudent = document.getElementById('result-student');
      const cgpaStudent = document.getElementById('cgpa-student');
      
      const options = data.students.map(s => 
        `<option value="${s.id || s._id}">${s.name} (${s.rollNumber})</option>`
      ).join('');
      
      if (resultStudent) {
        resultStudent.innerHTML = '<option value="">Select Student</option>' + options;
      }
      if (cgpaStudent) {
        cgpaStudent.innerHTML = '<option value="">Select Student</option>' + options;
      }
    }
  } catch (err) {
    console.error('Error loading students for dropdown:', err);
  }
}

async function gradeAssignment(assignmentId) {
  const grade = prompt('Enter grade for this assignment:');
  if (!grade) return;

  try {
    const adminToken = localStorage.getItem('adminToken');
    const res = await fetch(`${API_BASE_URL}/api/admin/assignments/${assignmentId}/grade`, {
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
      alert(data.error || 'Failed to grade assignment');
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Network error. Please try again.');
  }
}

