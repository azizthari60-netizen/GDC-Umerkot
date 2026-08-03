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
    const cnic = cnicInput ? cnicInput.value.trim() : '';

    if (!cnic) {
        alert('براہ کرم CNIC یا Roll Number درج کریں');
        return;
    }

    try {
        const res = await fetch('/api/results/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cnic })
        });

        // رسپانس ٹیکسٹ حاصل کر کے چیک کریں تاکہ JSON parse error نہ آئے
        const responseText = await res.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            throw new Error('سرور سے غلط رسپانس ملا (Server 500 Error)');
        }

        if (res.ok && data.success && data.results && data.results.length > 0) {
            const student = data.results[0];
            const assignedClass = determineAssignedClass(student);

            resultsDisplay.innerHTML = `
                <div style="margin-top:20px; padding:15px; border:1px solid #ddd; border-radius:8px; background:#fff;">
                    <h3 style="color:#1e3a8a;">رزلٹ کی تفصیلات</h3>
                    <p><strong>نام:</strong> ${student.name || 'N/A'}</p>
                    <p><strong>والد کا نام:</strong> ${student.fatherName || 'N/A'}</p>
                    <p><strong>حاصل کردہ نمبر:</strong> ${student.marks ?? 'N/A'}</p>
                    <p><strong>شعبہ:</strong> ${student.appliedFor || 'N/A'}</p>
                    <p><strong>مقرر کردہ کلاس:</strong> <span style="color:#2563eb; font-weight:bold;">${assignedClass}</span></p>
                </div>
            `;
        } else {
            resultsDisplay.innerHTML = `<p style="color:red; margin-top:15px;">${data.message || 'ریکارڈ نہیں مل سکا'}</p>`;
        }
    } catch (err) {
        console.error(err);
        resultsDisplay.innerHTML = `<p style="color:red; margin-top:15px;">${err.message}</p>`;
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