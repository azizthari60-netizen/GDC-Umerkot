
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
          alert('Challan uploaded successfully! Waiting for admin verification.');
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
      if (document.getElementById('info-dob')) {
        const dob = currentStudent.formData?.dob || currentStudent.dob;
        document.getElementById('info-dob').textContent = dob ? new Date(dob).toLocaleDateString() : '-';
      }
      if (document.getElementById('info-gender')) {
        document.getElementById('info-gender').textContent = currentStudent.formData?.gender || currentStudent.gender || '-';
      }
      if (document.getElementById('info-address')) {
        document.getElementById('info-address').textContent = currentStudent.formData?.address || currentStudent.address || '-';
      }
      if (document.getElementById('info-district')) {
        document.getElementById('info-district').textContent = currentStudent.formData?.district || currentStudent.district || '-';
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
    statusText.innerHTML = 'Please fill out the admission form to proceed.';
    applyNowBtn.style.display = 'inline-block';
    generateChallanBtn.style.display = 'none';
    uploadChallanBtn.style.display = 'none';
    downloadSlipBtn.style.display = 'none';
    challanStatusDiv.innerHTML = '';
  } else {
    // Form submitted
    applyNowBtn.style.display = 'none';
    
    // Show application status with color
    let statusHTML = '';
    if (currentStudent.status === 'Pending') {
      statusHTML = '<span style="background: #fef3c7; color: #92400e; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Application Status: Pending</span>';
    } else if (currentStudent.status === 'Challan Verified') {
      statusHTML = '<span style="background: #dbeafe; color: #1e40af; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Application Status: Challan Verified</span>';
    } else if (currentStudent.status === 'Approved') {
      statusHTML = '<span style="background: #d1fae5; color: #065f46; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Application Status: Approved ✓</span>';
    } else if (currentStudent.status === 'Rejected') {
      statusHTML = '<span style="background: #fee2e2; color: #991b1b; padding: 0.25rem 0.75rem; border-radius: 999px; font-size: 0.85rem; font-weight: 500;">Application Status: Rejected ✗</span>';
    }
    
    if (currentStudent.challanStatus === 'Not Generated' || currentStudent.challanStatus === 'Generated') {
      // Form submitted, show generate and upload buttons
      statusText.innerHTML = 'Form submitted successfully! Generate and download your challan, then upload the paid challan image.<br><br>' + statusHTML;
      generateChallanBtn.style.display = 'inline-block';
      uploadChallanBtn.style.display = 'inline-block';
      downloadSlipBtn.style.display = 'none';
      challanStatusDiv.innerHTML = '';
    } else if (currentStudent.challanStatus === 'Uploaded') {
      // Challan uploaded, still show buttons until verified
      statusText.innerHTML = 'Challan uploaded. Waiting for admin verification...<br><br>' + statusHTML;
      generateChallanBtn.style.display = 'inline-block';
      uploadChallanBtn.style.display = 'inline-block';
      downloadSlipBtn.style.display = 'none';
      
      if (currentStudent.challanImage) {
        challanStatusDiv.innerHTML = `<p style="color: #059669; margin-top: 0.5rem;">✓ Challan uploaded: <a href="${currentStudent.challanImage}" target="_blank" style="color: #1e3a8a;">View Image</a></p>`;
      }
    } else if (currentStudent.challanStatus === 'Verified') {
      // Challan verified, hide generate/upload buttons, show download slip button
      statusText.innerHTML = 'Challan verified! Download your admission slip.<br><br>' + statusHTML;
      generateChallanBtn.style.display = 'none';
      uploadChallanBtn.style.display = 'none';
      downloadSlipBtn.style.display = 'inline-block';
      challanStatusDiv.innerHTML = '<p style="color: #059669; margin-top: 0.5rem;">✓ Challan verified by admin</p>';
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
    if (!assignmentsDiv) {
      // assignments section is not present (maybe commented out), nothing to do
      return;
    }
    
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

// Fetch results from server and render using displayResult()
async function loadResults() {
  try {
    const studentToken = localStorage.getItem('studentToken');
    const res = await fetch(`${API_BASE_URL}/student/results`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const displayDiv = document.getElementById('results-display');
      if (!displayDiv) return;
      if (!data.results || data.results.length === 0) {
        displayDiv.innerHTML = '<p style="color: #6b7280; padding: 1rem 0; text-align: center;">No results available.</p>';
      } else {
        // show the first result (entry test) and ignore others if present
        displayResult(data.results[0]);
      }
    }
  } catch (err) {
    console.error('Error loading results:', err);
  }
}

// results
function displayResult(result) {
  const displayDiv = document.getElementById('results-display');
  if (!displayDiv) {
    console.error('Results display div not found');
    return;
  }

  const statusClass = result.marks >= 33 ? 'text-success' : 'text-danger';
  const statusText = result.marks >= 33 ? 'Qualified' : 'Not Qualified';
  let html = `
  <div class="result-card">
  <h4> Your Entry test Marks: ${result.marks}</h4>
  <h3 class="${statusClass}">${statusText}</h3>`;

  if(result.marks >= 33){
    // determine interview date based on gender derived from CNIC last digit
    let interviewDate = '14-March-2026'; // default female
    let cnic = currentStudent?.cnic;

    if (!cnic) {
      // try to read from localStorage if not yet loaded
      const stored = localStorage.getItem('studentData');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          cnic = parsed.cnic;
        } catch (e) {
          console.error('Error parsing studentData from localStorage', e);
        }
      }
    }

    if (cnic) {
      // CNIC format: 44401-2434420-1
      // Gender determined by last digit after final dash
      const cnicParts = cnic.toString().split('-');
      const lastPart = cnicParts[cnicParts.length - 1];
      const genderDigit = parseInt(lastPart, 10);

      if (!isNaN(genderDigit)) {
        // even = female (14th March), odd = male (16th March)
        interviewDate = (genderDigit % 2 === 0) ? '14-March-2026' : '16-March-2026';
      }
    }

    html += `<p>Congratulations! You have qualified the Pre-Admission Test. Your interview is scheduled on ${interviewDate}, Time: 09:00am</p>`;
  } else {
    html += `<p>Unfortunately, you did not qualify Pre-Admission Test. Please review your performance and consider reapplying in the future.</p>`;
  }

  html += `</div>`;
  displayDiv.innerHTML = html;
}


