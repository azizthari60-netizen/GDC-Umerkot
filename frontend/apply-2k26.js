const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// Check if student is logged in
document.addEventListener('DOMContentLoaded', async () => {
  const studentToken = localStorage.getItem('studentToken');
  if (!studentToken) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }

  // Load student data and pre-fill form
  try {
    const res = await fetch(`${API_BASE_URL}/student/profile`, {
      headers: {
        'Authorization': `Bearer ${studentToken}`
      }
    });

    const data = await res.json();
    if (res.ok && data.student) {
      preFillForm(data.student);
    }
  } catch (err) {
    console.error('Error loading student data:', err);
  }
});

function preFillForm(student) {
  // Pre-fill name and CNIC
  document.getElementById('in-name').value = student.fullName || '';
  document.getElementById('in-cnic').value = student.cnic || '';
  
  // If form was already filled, pre-fill all fields
  if (student.isFormFilled && student.formData) {
    const fd = student.formData;
    document.getElementById('in-fname').value = fd.fName || '';
    document.getElementById('in-caste').value = fd.caste || '';
    document.getElementById('in-domicile').value = fd.domicile || '';
    document.getElementById('in-dob').value = fd.dob || '';
    document.getElementById('in-gender').value = fd.gender || '';
    document.getElementById('in-email').value = fd.email || '';
    document.getElementById('in-mobile').value = fd.mobile || '';
    document.getElementById('in-address').value = fd.address || '';
    
    // Guardian info
    document.getElementById('in-gname').value = fd.gName || '';
    document.getElementById('in-gjob').value = fd.gOcc || '';
    document.getElementById('in-gjob-addr').value = fd.gJobAddr || '';
    document.getElementById('in-gcontact').value = fd.gContact || '';
    document.getElementById('in-gperm-addr').value = fd.gAddress || '';
    
    // Academic info
    if (fd.matric) {
      document.getElementById('m-board').value = fd.matric.brd || '';
      document.getElementById('m-year').value = fd.matric.yr || '';
      document.getElementById('m-roll').value = fd.matric.roll || '';
      document.getElementById('m-group').value = fd.matric.grp || '';
      document.getElementById('m-perc').value = fd.matric.per || '';
    }
    
    if (fd.inter) {
      document.getElementById('i-board').value = fd.inter.brd || '';
      document.getElementById('i-year').value = fd.inter.yr || '';
      document.getElementById('i-roll').value = fd.inter.roll || '';
      document.getElementById('i-group').value = fd.inter.grp || '';
      document.getElementById('i-perc').value = fd.inter.per || '';
    }
    
    // Profile image
    if (student.profileImage) {
      document.getElementById('student-photo-preview').src = student.profileImage;
      document.getElementById('student-photo-preview').style.display = 'block';
    }
  }
}

function previewImage(event) {
  const file = event.target.files[0];
  const preview = document.getElementById('student-photo-preview');
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      if(preview) { 
        preview.src = e.target.result; 
        preview.style.display = 'block'; 
      }
      window.tempPhotoData = e.target.result;
    };
    reader.readAsDataURL(file);
  }
}

async function processAndPrint() {
  const studentToken = localStorage.getItem('studentToken');
  if (!studentToken) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }

  // Get all data from form fields
  const formData = {
    name: document.getElementById('in-name').value,
    fName: document.getElementById('in-fname').value,
    caste: document.getElementById('in-caste').value,
    cnic: document.getElementById('in-cnic').value,
    domicile: document.getElementById('in-domicile').value,
    dob: document.getElementById('in-dob').value,
    gender: document.getElementById('in-gender').value,
    email: document.getElementById('in-email').value,
    mobile: document.getElementById('in-mobile').value,
    address: document.getElementById('in-address').value,
    gName: document.getElementById('in-gname').value,
    gOcc: document.getElementById('in-gjob').value,
    gJobAddr: document.getElementById('in-gjob-addr').value,
    gContact: document.getElementById('in-gcontact').value,
    gAddress: document.getElementById('in-gperm-addr').value,
    matric: JSON.stringify({
      brd: document.getElementById('m-board').value,
      yr: document.getElementById('m-year').value,
      roll: document.getElementById('m-roll').value,
      grp: document.getElementById('m-group').value,
      per: document.getElementById('m-perc').value
    }),
    inter: JSON.stringify({
      brd: document.getElementById('i-board').value,
      yr: document.getElementById('i-year').value,
      roll: document.getElementById('i-roll').value,
      grp: document.getElementById('i-group').value,
      per: document.getElementById('i-perc').value
    })
  };

  // Create FormData for file upload
  const submitFormData = new FormData();
  
  // Add text fields
  Object.keys(formData).forEach(key => {
    submitFormData.append(key, formData[key]);
  });
  
  // Add image file if selected
  const imageInput = document.getElementById('userImage');
  if (imageInput.files.length > 0) {
    submitFormData.append('profileImage', imageInput.files[0]);
  }

  const submitButton = document.querySelector('.submit-btn');
  const originalText = submitButton ? submitButton.textContent : 'Submit and Download';
  
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
  }

  try {
    const res = await fetch(`${API_BASE_URL}/student/submit-form`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${studentToken}`
      },
      body: submitFormData
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message || 'Form submitted successfully! Challan can be generated now.');
      
      // Redirect to student portal
      window.location.href = 'student-portal.html';
    } else {
      alert(data.message || 'Failed to submit form. Please try again.');
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  } catch (err) {
    console.error('Form submission error:', err);
    alert('Network error. Please check your connection and try again.');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}
