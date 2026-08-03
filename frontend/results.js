// page loader
    
const loader = document.getElementById('loader');
if (loader) {
  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      setTimeout(() => {
        loader.style.display = 'none';
      }, 400);
    }, 900);
  });
}

// Search results for CNIC or Roll Number
async function checkResults() {
    const cnicInput = document.getElementById('cnic');
    const resultsDisplay = document.getElementById('results-display');
    const submitButton = document.getElementById('search-btn');

    const cnic = cnicInput ? cnicInput.value.trim() : '';

    if (!cnic) {
        alert('براہ کرم CNIC یا Roll Number درج کریں۔');
        return;
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Checking...';
    }

    try {
        const res = await fetch('/api/results/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnic })
        });

        const data = await res.json();

        if (res.ok && data.success && data.results && data.results.length > 0) {
            const student = data.results[0];
            const assignedClass = determineAssignedClass(student);

            resultsDisplay.innerHTML = `
                <div style="margin-top: 20px; padding: 15px; border: 1px solid #ccc; border-radius: 8px; background: #fff;">
                    <h3 style="margin-bottom: 1rem; color: #1e3a8a;">رزلٹ کی تفصیلات</h3>
                    <p><strong>Name:</strong> ${student.name || 'N/A'}</p>
                    <p><strong>Father Name:</strong> ${student.fatherName || 'N/A'}</p>
                    <p><strong>Marks:</strong> ${student.marks ?? 'N/A'}</p>
                    <p><strong>Applied For:</strong> ${student.appliedFor || 'N/A'}</p>
                    <p><strong>Assigned Class:</strong> <span style="color: #2563eb; font-weight: bold;">${assignedClass}</span></p>
                </div>
            `;
        } else {
            resultsDisplay.innerHTML = `<p style="color: red; margin-top: 15px;">${data.message || 'No results found'}</p>`;
        }
    } catch (error) {
        console.error(error);
        resultsDisplay.innerHTML = `<p style="color: red; margin-top: 15px;">Server Error!</p>`;
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Check Results';
        }
    }
}

function determineAssignedClass(student) {
    const field = (student.appliedFor || '').toLowerCase();
    const marks = Number(student.marks) || 0;

    if (field.includes('engineering') || field.includes('computer science') || field.includes('ics')) {
        return 'First Year E';
    } else if (field.includes('medical') || field.includes('pre-medical')) {
        return marks >= 49 ? 'First Year A' : 'First Year B';
    }
    return 'First Year';
}