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
        alert('Please enter a CNIC or Roll Number.');
        return;
    }

    if (checkResults.isChecking) {
        const button = document.getElementById('check-results');
        button.disabled = true;
        button.textContent = 'Checking...';
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
            throw new Error('Invalid JSON response from server: ' + responseText);
        }

        if (res.ok && data.success && data.results && data.results.length > 0) {
            const student = data.results[0];
            const assignedClass = getAssignedClass(student.applyFor, student.obtainedMarks);

            resultsDisplay.innerHTML = `
                <div style="margin-top:20px; padding:15px; border:1px solid #ddd; border-radius:8px; background:#fff;">
                    <h3 style="color:#1e3a8a;">Your Results</h3>
                    <p><strong>Name:</strong> ${student.name || 'N/A'}</p>
                    <p><strong>Father's Name:</strong> ${student.fatherName || 'N/A'}</p>
                    <p><strong>Marks Obtained:</strong> ${student.obtainedMarks ?? 'N/A'}</p>
                    <p><strong>Stream:</strong> ${student.applyFor || 'N/A'}</p>
                    <p><strong>Assigned Class:</strong> <span style="color:#2563eb; font-weight:bold;">${assignedClass || 'N/A'}</span></p>
                </div>
            `;
        } else {
            resultsDisplay.innerHTML = `<p style="color:red; margin-top:15px;">${data.message || 'Record not found'}</p>`;
        }
    } catch (err) {
        console.error(err);
        resultsDisplay.innerHTML = `<p style="color:red; margin-top:15px;">${err.message}</p>`;
    }
};

        // AssignedClass 
        function getAssignedClass(applyFor, obtainedMarks) {
    if (!applyFor) return 'N/A';
    
    const stream = applyFor.toString().trim().toUpperCase();
    const marks = Number(obtainedMarks) || 0;

    // CS / Engineering / ICS
    if (stream.includes('C.S') || stream.includes('CS') || stream.includes('P.E') || stream.includes('ICS')) {
        return 'First Year E';
    } 
    // Medical / Pre-Medical
    else if (stream.includes('P.M') || stream.includes('PRE-MED')) {
        if (marks >= 48) {
            return 'First Year A';
        } else if (marks >= 33 && marks < 48) {
            return 'First Year B';
        } else if (marks >= 20 && marks < 33) {
            return 'First Year C';
        } else {
            return 'First Year D';
        }
    }

    return 'First Year';
}