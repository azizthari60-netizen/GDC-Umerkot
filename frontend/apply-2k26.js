const API_BASE_URL = (window.location.hostname === 'localhost') ? 'http://localhost:3000/api' : '/api';

function getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name.split('.').slice(0, -1).join('.') + '.jpg', { type: 'image/jpeg' }));
                }, 'image/jpeg', 0.7);
            };
        };
    });
}

function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('student-photo-preview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if (preview) {
                preview.src = e.target.result;
                preview.style.display = 'block';
            }
            window.tempPhotoData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function hideSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

window.addEventListener('DOMContentLoaded', () => {
    const closeModal = document.getElementById('closeModal');
    if (closeModal) {
        closeModal.addEventListener('click', hideSuccessModal);
    }
});

function buildPrintHtml(values) {
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Admission Slip</title><style>body{font-family:Arial,sans-serif;color:#111;padding:24px;}h1,h2{margin:0;} .header{text-align:center;margin-bottom:18px;} .section{margin-bottom:16px;} .section h3{margin:0 0 8px;padding:8px 10px;background:#1e3a8a;color:#fff;border-radius:4px;} .row{margin:5px 0;} .label{display:inline-block;width:180px;font-weight:700;} .photo{float:right;width:120px;height:140px;border:1px solid #ccc;object-fit:cover;margin-left:14px;} .print-btn{display:inline-block;margin-top:16px;padding:10px 14px;background:#1e3a8a;color:#fff;border:none;border-radius:4px;cursor:pointer;}</style></head><body><div class="header"><h1>Government Boys Degree College Umerkot</h1><h2>2026 Admission Application</h2></div>${values.photo ? `<img class="photo" src="${values.photo}" alt="Student Photo">` : ''}<div class="section"><h3>Personal Information</h3>${[['Name','fullName'],['Father Name','fatherName'],['CNIC / B-Form No','cnic'],['Date of Birth','dob'],['Gender','gender'],['Email','email'],['Mobile','mobile'],['Domicile District','domicileDistrict'],['Father\'s Domicile District','fathersDomicileDistrict'],['Father/Guardian CNIC','fatherGuardianCnic'],['Father/Guardian Mobile','fatherGuardianMobile'],['Home Address','homeAddress']].map(([label,key]) => `<div class="row"><span class="label">${label}:</span>${values[key] || '-'}</div>`).join('')}</div><div class="section"><h3>Academic Information</h3>${[['Ninth Roll No','ninthRollNo'],['Ninth Passing Year','ninthPassingYear'],['Matric Roll No','matricRollNo'],['Matric Passing Year','matricPassingYear'],['Board','board'],['Study Group','studyGroup'],['Faculty','faculty'],['School Name','schoolName'],['Total Marks','totalMarks'],['Obtained Marks','obtainedMarks'],['Scaled Obtained Marks','scaledObtainedMarks']].map(([label,key]) => `<div class="row"><span class="label">${label}:</span>${values[key] || '-'}</div>`).join('')}</div><button class="print-btn" onclick="window.print();">Print / Save as PDF</button></body></html>`;
}

async function processAndPrint() {
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

    const values = {
        fullName: getInputValue('in-name'),
        fatherName: getInputValue('in-fname'),
        cnic: getInputValue('in-cnic'),
        dob: getInputValue('in-dob'),
        gender: getInputValue('in-gender'),
        email: getInputValue('in-email'),
        mobile: getInputValue('in-mobile'),
        domicileDistrict: getInputValue('in-domicile'),
        fathersDomicileDistrict: getInputValue('in-fathers-domicile'),
        fatherGuardianCnic: getInputValue('in-fg-cnic'),
        fatherGuardianMobile: getInputValue('in-fg-mobile'),
        homeAddress: getInputValue('in-address'),
        ninthRollNo: getInputValue('in-ninth-roll'),
        ninthPassingYear: getInputValue('in-ninth-year'),
        matricRollNo: getInputValue('in-matric-roll'),
        matricPassingYear: getInputValue('in-matric-year'),
        board: getInputValue('in-board'),
        studyGroup: getInputValue('in-study-group'),
        faculty: getInputValue('in-faculty'),
        schoolName: getInputValue('in-school-name'),
        totalMarks: getInputValue('in-total-marks'),
        obtainedMarks: getInputValue('in-obtained-marks'),
        scaledObtainedMarks: getInputValue('in-scaled-obtained')
    };

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
        if (key === 'faculty') {
            formData.append('choiceOfFaculty', value);
        } else {
            formData.append(key, value);
        }
    });

    const imageInput = document.getElementById('userImage');
    if (imageInput && imageInput.files[0]) {
        try {
            const file = imageInput.files[0];
            if (file.size > 500 * 1024) {
                const compressedFile = await compressImage(file);
                formData.append('profileImage', compressedFile);
                values.photo = URL.createObjectURL(compressedFile);
            } else {
                formData.append('profileImage', file);
                values.photo = URL.createObjectURL(file);
            }
        } catch (error) {
            console.error('Image compression failed:', error);
            formData.append('profileImage', imageInput.files[0]);
        }
    }

    try {
        const response = await fetch(`${API_BASE_URL}/applications/submit`, {
            method: 'POST',
            body: formData
        });
        const responseText = await response.text();
        let result = {};

        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch (parseError) {
            console.warn('Response was not valid JSON:', responseText);
        }

        if (!response.ok) {
            const message = result.message || response.statusText || 'Unable to submit application.';
            throw new Error(message);
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(buildPrintHtml(values));
            printWindow.document.close();
            printWindow.focus();
        }
        showSuccessModal();
    } catch (error) {
        console.error('Submit error:', error);
        alert(error.message || 'An error occurred while submitting the application.');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Submit Application';
        }
    }
}
