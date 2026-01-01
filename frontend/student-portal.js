// Student Portal JavaScript - Complete Implementation
const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

let currentStudent = null;
let isOldStudent = false;

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
  loadNotifications();

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
        const res = await fetch(`${API_BASE_URL}/student/assignments/upload`, {
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
          alert(result.message || 'Failed to upload assignment');
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

  // Apply Now button
  const applyNowBtn = document.getElementById('btn-apply-now');
  if (applyNowBtn) {
    applyNowBtn.addEventListener('click', () => {
      window.location.href = 'apply-2k26.html';
    });
  }

  // Generate Challan button
  const generateChallanBtn = document.getElementById('btn-generate-challan');
  if (generateChallanBtn) {
    generateChallanBtn.addEventListener('click', () => {
      if (currentStudent && currentStudent._id) {
        window.open(`${API_BASE_URL}/student/challan/${currentStudent._id}`, '_blank');
      }
    });
  }

  // Upload Challan button
  const uploadChallanBtn = document.getElementById('btn-upload-challan');
  const challanFileInput = document.getElementById('challan-file-input');
  if (uploadChallanBtn && challanFileInput) {
    uploadChallanBtn.addEventListener('click', () => {
      challanFileInput.click();
    });

    challanFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append('challanImage', file);

      const studentToken = localStorage.getItem('studentToken');
      uploadChallanBtn.disabled = true;
      uploadChallanBtn.textContent = 'Uploading...';

      try {
        const res = await fetch(`${API_BASE_URL}/student/upload-challan`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${studentToken}`
          },
          body: formData
        });

        const result = await res.json();
        if (res.ok) {
          alert('Challan uploaded successfully!');
          loadStudentData(); // Reload to update status
        } else {
          alert(result.message || 'Failed to upload challan');
        }
      } catch (err) {
        console.error('Error uploading challan:', err);
        alert('Network error. Please try again.');
      } finally {
        uploadChallanBtn.disabled = false;
        uploadChallanBtn.textContent = 'Upload Challan';
        challanFileInput.value = '';
      }
    });
  }

  // Download Slip button
  const downloadSlipBtn = document.getElementById('btn-download-slip');
  if (downloadSlipBtn) {
    downloadSlipBtn.addEventListener('click', async () => {
      const studentToken = localStorage.getItem('studentToken');
      try {
        const res = await fetch(`${API_BASE_URL}/student/slip`, {
          headers: {
            'Authorization': `Bearer ${studentToken}`
          }
        });

        const data = await res.json();
        if (res.ok && data.success && data.slip) {
          window.open(`${API_BASE_URL}/student/slip/pdf/${data.slip._id}`, '_blank');
        } else {
          alert(data.message || 'Slip not available');
        }
      } catch (err) {
        console.error('Error loading slip:', err);
        alert('Network error. Please try again.');
      }
    });
  }

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('studentToken');
      localStorage.removeItem('studentData');
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
    const res = await fetch(`${API_BASE_URL}/student/profile`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.student) {
      currentStudent = data.student;
      isOldStudent = data.isOldStudent || false;
      
      // Update welcome banner
      document.getElementById('student-name').textContent = currentStudent.fullName || 'Student';
      
      // Update student information
      if (document.getElementById('info-name')) {
        document.getElementById('info-name').textContent = currentStudent.fullName || '-';
      }
      if (document.getElementById('info-cnic')) {
        document.getElementById('info-cnic').textContent = currentStudent.cnic || '-';
      }
      if (document.getElementById('info-father')) {
        document.getElementById('info-father').textContent = (currentStudent.formData?.fName || currentStudent.fatherName) || '-';
      }
      if (document.getElementById('info-caste')) {
        document.getElementById('info-caste').textContent = (currentStudent.formData?.caste || currentStudent.caste) || '-';
      }
      if (document.getElementById('info-email')) {
        document.getElementById('info-email').textContent = (currentStudent.formData?.email || currentStudent.email) || '-';
      }
      if (document.getElementById('info-batch')) {
        document.getElementById('info-batch').textContent = currentStudent.batch ? `Batch ${currentStudent.batch}` : '-';
      }
      if (document.getElementById('info-reg-status')) {
        document.getElementById('info-reg-status').textContent = currentStudent.status || 'Active';
      }

      // Profile image
      const profileImageDiv = document.getElementById('student-profile-image');
      if (profileImageDiv && currentStudent.profileImage) {
        profileImageDiv.innerHTML = `<img src="${currentStudent.profileImage}" alt="Profile" style="width: 100px; height: 120px; border-radius: 8px; object-fit: cover; border: 2px solid #1e3a8a;">`;
      }

      // Show Apply section for new students (2026 batch)
      if (!isOldStudent && currentStudent.batch === '2026') {
        updateApplySection();
      }
    } else {
      console.error('Failed to load student data');
    }
  } catch (err) {
    console.error('Error loading student data:', err);
  }
}

function updateApplySection() {
  if (!currentStudent) return;

  const statusText = document.getElementById('form-status-text');
  const applyNowBtn = document.getElementById('btn-apply-now');
  const generateChallanBtn = document.getElementById('btn-generate-challan');
  const uploadChallanBtn = document.getElementById('btn-upload-challan');
  const downloadSlipBtn = document.getElementById('btn-download-slip');
  const challanStatusDiv = document.getElementById('challan-status');

  if (!statusText || !applyNowBtn || !generateChallanBtn || !uploadChallanBtn || !downloadSlipBtn) {
    return; // Elements not found
  }

  if (!currentStudent.isFormFilled) {
    // No form submitted yet
    statusText.textContent = 'Please fill out the admission form to proceed.';
    applyNowBtn.style.display = 'inline-block';
    generateChallanBtn.style.display = 'none';
    uploadChallanBtn.style.display = 'none';
    downloadSlipBtn.style.display = 'none';
  } else {
    applyNowBtn.style.display = 'none';
    
    if (currentStudent.challanStatus === 'Not Generated' || currentStudent.challanStatus === 'Generated') {
      // Form submitted, generate and download challan
      statusText.textContent = 'Form submitted successfully! Generate and download your challan, then upload the paid challan image.';
      generateChallanBtn.style.display = 'inline-block';
      uploadChallanBtn.style.display = 'inline-block';
      downloadSlipBtn.style.display = 'none';
    } else if (currentStudent.challanStatus === 'Uploaded') {
      // Challan uploaded, waiting for verification
      statusText.textContent = 'Challan uploaded. Waiting for admin verification...';
      generateChallanBtn.style.display = 'inline-block';
      uploadChallanBtn.style.display = 'inline-block';
      downloadSlipBtn.style.display = 'none';
      
      if (currentStudent.challanImage) {
        challanStatusDiv.innerHTML = `<p style="color: #059669;">✓ Challan uploaded: <a href="${currentStudent.challanImage}" target="_blank">View Image</a></p>`;
      }
    } else if (currentStudent.challanStatus === 'Verified') {
      // Challan verified, show download slip button
      statusText.textContent = 'Challan verified! Download your admission slip.';
      generateChallanBtn.style.display = 'none';
      uploadChallanBtn.style.display = 'none';
      downloadSlipBtn.style.display = 'inline-block';
      challanStatusDiv.innerHTML = '<p style="color: #059669;">✓ Challan verified by admin</p>';
    }

    // Show status updates
    if (currentStudent.status === 'Pending') {
      statusText.textContent += ' | Status: Pending';
    } else if (currentStudent.status === 'Challan Verified') {
      statusText.textContent += ' | Status: Challan Verified';
    } else if (currentStudent.status === 'Approved') {
      statusText.textContent += ' | Status: Approved ✓';
      challanStatusDiv.innerHTML = '<p style="color: #059669;">✓ Registration Approved</p>';
    } else if (currentStudent.status === 'Rejected') {
      statusText.textContent += ' | Status: Rejected';
      challanStatusDiv.innerHTML = '<p style="color: #dc2626;">✗ Registration Rejected</p>';
    }
  }
}

async function loadAssignments() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/student/assignments`, {
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
            <div class="assignment-info">
              <strong>${assignment.title}</strong><br>
              ${assignment.course}<br>
              <small>${new Date(assignment.uploadedAt).toLocaleDateString()}</small>
            </div>
            <span class="assignment-status ${statusClass}">${statusText}</span>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading assignments:', err);
  }
}

async function loadResults() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/student/results`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    const resultsDiv = document.getElementById('results-display');
    
    if (res.ok && data.success && data.results && data.results.length > 0) {
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
  } catch (err) {
    console.error('Error loading results:', err);
  }
}

async function loadNotifications() {
  try {
    const res = await fetch(`${API_BASE_URL}/notifications`);
    const data = await res.json();
    const announcementsDiv = document.getElementById('announcements');
    
    if (res.ok && data.success && data.notifications && data.notifications.length > 0) {
      announcementsDiv.innerHTML = data.notifications
        .filter(notif => notif.isActive)
        .slice(0, 5)
        .map(notif => `
          <div style="padding: 0.75rem 0; border-bottom: 1px solid #f3f4f6;">
            <strong>${notif.title}</strong><br>
            <small style="color: #6b7280;">${notif.message}</small>
          </div>
        `).join('');
    } else {
      announcementsDiv.innerHTML = '<p style="color: #6b7280; padding: 1rem 0;">No announcements at this time.</p>';
    }
  } catch (err) {
    console.error('Error loading notifications:', err);
  }
}
