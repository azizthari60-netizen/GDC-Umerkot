
// Admin Dashboard JavaScript - Complete Implementation
const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// Utility to convert File object to Base64 string (used when registering old students)
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

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

  // Register Old Student Form
  const registerOldStudentForm = document.getElementById('register-old-student-form');
  if (registerOldStudentForm) {
    registerOldStudentForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(registerOldStudentForm);
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
        gender: formData.get('gender'),
        image: formData.get('userImage') ? await fileToBase64(formData.get('userImage')) : null // Convert image to Base64 if uploaded
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
        // Show all students (old and new)
      if (data.students.length > 0) {
        studentsList.innerHTML = data.students.map(student => {
          const typeLabel = student.isOldStudent ? 'Old Student' : 'New Student';
          return `
            <div class="student-item">
              <div style="flex: 1;">
                <strong>${student.fullName}</strong> (${student.cnic})<br>
                <small>Batch: <span class="student-batch">${student.batch || 'N/A'}</span> | Roll: <span class="student-roll-number">${student.rollNumber || 'N/A'}</span> | ${typeLabel}</small>
              </div>
              <div class="student-actions">
                <span style="color: #059669;">✓ Registered</span>
              </div>
            </div>
          `;
        }).join('');
      } else {
        studentsList.innerHTML = '<p style="text-align: center; color: #6b7280; padding: 2rem;">No students found.</p>';
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
        const uploadSlipBtn = (student.challanStatus === 'Verified' && student.status !== 'Rejected')
          ? `<button class="btn btn-primary btn-small" onclick="uploadSlip('${student._id}')">Upload Slip</button>`
          : '';
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
              ${uploadSlipBtn}
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
//  result

const uploadForm = document.getElementById('upload-results-form');
uploadForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const fileInput = document.getElementById('results-file');
  const formData = new FormData();

// send file under a predictable key that backend accepts
formData.append('resultsFile', fileInput.files[0]);

try {
  const submitBtn = uploadForm.querySelector('button');
  submitBtn.innerText = 'uploading.....'
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
  submitBtn.disabled = false
} catch (error) {console.error('Upload Error:', error);
  alert('Server Not working');
}
})
