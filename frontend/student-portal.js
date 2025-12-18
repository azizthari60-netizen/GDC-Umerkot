// Student Portal JavaScript
const API_BASE_URL = (window.location.port === '5500' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:')
  ? 'http://localhost:3000' 
  : '';

// Check if student is logged in
document.addEventListener('DOMContentLoaded', () => {
  const studentToken = localStorage.getItem('studentToken');
  if (!studentToken) {
    window.location.href = 'index.html';
    return;
  }

  loadStudentData();
  loadAssignments();
  loadResults();

  // Assignment upload form
  const assignmentForm = document.getElementById('assignment-upload-form');
  if (assignmentForm) {
    assignmentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitButton = assignmentForm.querySelector('button[type="submit"]');
      const originalText = submitButton ? submitButton.textContent : 'Upload Assignment';
      
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Uploading...';
      }

      const formData = new FormData(assignmentForm);
      const studentToken = localStorage.getItem('studentToken');

      try {
        const res = await fetch(`${API_BASE_URL}/api/student/assignments/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${studentToken}`
          },
          body: formData
        });

        const result = await res.json();
        if (res.ok && result.success) {
          alert('Assignment uploaded successfully!');
          assignmentForm.reset();
          loadAssignments();
        } else {
          alert(result.error || 'Failed to upload assignment');
        }
      } catch (err) {
        console.error('Error uploading assignment:', err);
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
      localStorage.removeItem('studentToken');
      window.location.href = 'index.html';
    });
  }

  // Footer year
  const yearSpan = document.getElementById('year');
  if (yearSpan) {
    yearSpan.textContent = new Date().getFullYear();
  }
});

async function loadStudentData() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/api/student/profile`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.success && data.student) {
      const student = data.student;
      
      // Update welcome banner
      document.getElementById('student-name').textContent = student.name || 'Student';
      
      // Update student information
      document.getElementById('info-name').textContent = student.name || '-';
      document.getElementById('info-roll').textContent = student.rollNumber || '-';
      document.getElementById('info-email').textContent = student.email || '-';
      document.getElementById('info-batch').textContent = student.batch ? `Batch ${student.batch}` : '-';
      document.getElementById('info-semester').textContent = student.semester ? `Semester ${student.semester}` : '-';
      document.getElementById('info-cgpa').textContent = student.cgpa ? student.cgpa.toFixed(2) : 'N/A';
      document.getElementById('info-courses').textContent = student.coursesEnrolled || '0';
      document.getElementById('info-status').textContent = student.status || 'Active';
    } else {
      alert('Failed to load student data. Please login again.');
      localStorage.removeItem('studentToken');
      window.location.href = 'index.html';
    }
  } catch (err) {
    console.error('Error loading student data:', err);
    alert('Network error. Please try again.');
  }
}

async function loadAssignments() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/api/student/assignments`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    const assignmentsDiv = document.getElementById('my-assignments');
    
    if (res.ok && data.success) {
      if (data.assignments.length === 0) {
        assignmentsDiv.innerHTML = '<p style="color: #6b7280; padding: 1rem 0; text-align: center;">No assignments uploaded yet.</p>';
        return;
      }

      assignmentsDiv.innerHTML = data.assignments.map(assignment => {
        const statusClass = assignment.status === 'graded' ? 'status-graded' : 'status-pending';
        const statusText = assignment.status === 'graded' ? 'Graded' : 'Pending';
        return `
          <div class="assignment-item">
            <div>
              <strong>${assignment.title}</strong><br>
              <small style="color: #6b7280;">${assignment.course} | Uploaded: ${new Date(assignment.uploadedAt).toLocaleDateString()}</small>
              ${assignment.grade ? `<br><small style="color: #1e3a8a;">Grade: ${assignment.grade}</small>` : ''}
            </div>
            <span class="assignment-status ${statusClass}">${statusText}</span>
          </div>
        `;
      }).join('');
    } else {
      assignmentsDiv.innerHTML = '<p style="color: #dc2626; padding: 1rem 0; text-align: center;">Error loading assignments.</p>';
    }
  } catch (err) {
    console.error('Error loading assignments:', err);
    document.getElementById('my-assignments').innerHTML = '<p style="color: #dc2626; padding: 1rem 0; text-align: center;">Network error. Please refresh.</p>';
  }
}

async function loadResults() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/api/student/results`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    const resultsDiv = document.getElementById('results-display');
    
    if (res.ok && data.success) {
      if (data.results && data.results.length > 0) {
        resultsDiv.innerHTML = `
          <table class="results-table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Marks</th>
                <th>Grade</th>
                <th>Semester</th>
              </tr>
            </thead>
            <tbody>
              ${data.results.map(result => `
                <tr>
                  <td>${result.course}</td>
                  <td>${result.marks}</td>
                  <td>${result.grade}</td>
                  <td>${result.semester}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `;
      } else {
        resultsDiv.innerHTML = '<p style="color: #6b7280; padding: 1rem 0; text-align: center;">No results available yet.</p>';
      }
    } else {
      resultsDiv.innerHTML = '<p style="color: #dc2626; padding: 1rem 0; text-align: center;">Error loading results.</p>';
    }
  } catch (err) {
    console.error('Error loading results:', err);
    document.getElementById('results-display').innerHTML = '<p style="color: #dc2626; padding: 1rem 0; text-align: center;">Network error. Please refresh.</p>';
  }
}
