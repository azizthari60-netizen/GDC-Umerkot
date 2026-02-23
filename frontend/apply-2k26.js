const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

// --- نیا فنکشن: تصویر کو کمپریس کرنے کے لیے ---
async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // چوڑائی 800px تک محدود
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // 70% کوالٹی پر JPEG میں تبدیل کریں تاکہ سائز کم ہو جائے
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.split('.')[0] + ".jpg", { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.7);
            };
        };
    });
}

// Check if student is logged in
document.addEventListener('DOMContentLoaded', async () => {
  const studentToken = localStorage.getItem('studentToken');
  if (!studentToken) {
    alert('Please login first');
    window.location.href = 'index.html';
    return;
  }

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
  document.getElementById('in-name').value = student.fullName || '';
  document.getElementById('in-cnic').value = student.cnic || '';
  
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
    
    document.getElementById('in-gname').value = fd.gName || '';
    document.getElementById('in-gjob').value = fd.gOcc || '';
    document.getElementById('in-gjob-addr').value = fd.gJobAddr || '';
    document.getElementById('in-gcontact').value = fd.gContact || '';
    document.getElementById('in-gperm-addr').value = fd.gAddress || '';
    
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

// --- اپ ڈیٹ شدہ مین فنکشن ---
async function processAndPrint() {
  const studentToken = localStorage.getItem('studentToken');
  const admissionForm = document.getElementById('admissionForm');
  
  if (!admissionForm.checkValidity()) {
    admissionForm.reportValidity();
    return;
  }
  
  const submitButton = document.querySelector('.submit-btn');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = 'Submitting...';
  }

  const submitFormData = new FormData();
  
  // ڈیٹا اکٹھا کرنا
  submitFormData.append('fName', document.getElementById('in-fname').value);
  submitFormData.append('caste', document.getElementById('in-caste').value);
  submitFormData.append('cnic', document.getElementById('in-cnic').value);
  submitFormData.append('domicile', document.getElementById('in-domicile').value);
  submitFormData.append('dob', document.getElementById('in-dob').value);
  submitFormData.append('gender', document.getElementById('in-gender').value);
  submitFormData.append('email', document.getElementById('in-email').value);
  submitFormData.append('mobile', document.getElementById('in-mobile').value);
  submitFormData.append('address', document.getElementById('in-address').value);
  
  submitFormData.append('gName', document.getElementById('in-gname').value);
  submitFormData.append('gOcc', document.getElementById('in-gjob').value);
  submitFormData.append('gJobAddr', document.getElementById('in-gjob-addr').value);
  submitFormData.append('gContact', document.getElementById('in-gcontact').value);
  submitFormData.append('gAddress', document.getElementById('in-gperm-addr').value);
  
  submitFormData.append('matric', JSON.stringify({
    brd: document.getElementById('m-board').value,
    yr: document.getElementById('m-year').value,
    roll: document.getElementById('m-roll').value,
    grp: document.getElementById('m-group').value,
    per: document.getElementById('m-perc').value
  }));
  
  submitFormData.append('inter', JSON.stringify({
    brd: document.getElementById('i-board').value,
    yr: document.getElementById('i-year').value,
    roll: document.getElementById('i-roll').value,
    grp: document.getElementById('i-group').value,
    per: document.getElementById('i-perc').value
  }));
   
  // --- تصویر کو کمپریس کر کے شامل کرنا ---
  const imageInput = document.getElementById('userImage');
  if (imageInput && imageInput.files[0]) {
    try {
      const originalFile = imageInput.files[0];
      // صرف بڑی تصاویر کو کمپریس کریں (مثلاً 500KB سے بڑی)
      if (originalFile.size > 500 * 1024) {
        const compressedFile = await compressImage(originalFile);
        submitFormData.append('profileImage', compressedFile);
      } else {
        submitFormData.append('profileImage', originalFile);
      }
    } catch (e) {
      console.error("Image compression failed, sending original", e);
      submitFormData.append('profileImage', imageInput.files[0]);
    }
  }

  try {
    const res = await fetch(`${API_BASE_URL}/student/submit-form`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${studentToken}` },
      body: submitFormData
    });

    const data = await res.json();
    if (res.ok) {
      alert("Success! Form Submitted.");
      window.location.href = 'student-portal.html';
    } else {
      alert(data.message || "Error occurred");
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Submit';
      }
    }
  } catch (err) {
    alert("Network Error or Timeout!");
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = 'Submit';
    }
  }
}