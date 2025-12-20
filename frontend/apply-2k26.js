function previewImage(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('student-photo-preview');
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            if(preview) { preview.src = e.target.result; preview.style.display = 'block'; }
            window.tempPhotoData = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

async function processAndPrint() {
//    get all data from form fields
    const data = {
        // personal data
        name: document.getElementById('in-name').value,
        fName: document.getElementById('in-fname').value,
        caste: document.getElementById('in-caste').value,
        cnic: document.getElementById('in-cnic').value,
        domicile: document.getElementById('in-domicile').value,
        email: document.getElementById('in-email').value,
        mobile: document.getElementById('in-mobile').value,
        address: document.getElementById('in-address').value,
        photo: window.tempPhotoData || "Student Photo Not Uploaded",
        // guardian data
        gName: document.getElementById('in-gname').value,
        gOcc: document.getElementById('in-gjob').value,
        gJobAddr: document.getElementById('in-gjob-addr').value,
        gContact: document.getElementById('in-gcontact').value,
        gAddress: document.getElementById('in-gperm-addr').value,
        // academic data
        m: { brd: document.getElementById('m-board').value, yr: document.getElementById('m-year').value, roll: document.getElementById('m-roll').value, grp: document.getElementById('m-group').value, per: document.getElementById('m-perc').value },
        i: { brd: document.getElementById('i-board').value, yr: document.getElementById('i-year').value, roll: document.getElementById('i-roll').value, grp: document.getElementById('i-group').value, per: document.getElementById('i-perc').value }
    };

    // سرور پر بھیجنا
    try {
        const res = await fetch('http://localhost:3000/submit-registration', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            // پرنٹ کا بہترین طریقہ: نئی ونڈو تاکہ اصل اسکرین خراب نہ ہو
             const p = window.open('', 'Print-Window');
            p.document.write(`
                <html>
                <head>
                    <style>
                        body { font-family: sans-serif; padding: 30px; line-height: 1.6; }
                        .header { background: #506cb8ff; color: white; display: flex; justify-content: space-between; align-items: center; padding: 20px; border-radius: 10px; -webkit-print-color-adjust: exact; }
                        .header-text h1 { margin: 0; font-size: 22px; }
                        .tag { background: #ffd700; color: #000; padding: 2px 15px; font-weight: bold; border-radius: 15px; font-size: 14px; }
                        .section { background: #303133ff; color: white; border-left: 20px solid #506cb8ff; padding: 10px; margin: 20px 0 10px; font-weight: bold; -webkit-print-color-adjust: exact; }
                        .row { display: flex; border-bottom: 1px solid #eee; padding: 8px 0; }
                        .col { flex: 1; }
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                        th, td { border: 1px solid #333; padding: 10px; text-align: center; }
                        th { background: #374a7cff; color: white; -webkit-print-color-adjust: exact; }
                        .challan-container { display: flex; justify-content: space-between; margin-top: 60px; page-break-before: always; }
                        .challan { width: 31%; border: 2px dashed #000; padding: 10px; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <img src="logo.png" width="80">
                        <div class="header-text" style="text-align:center;">
                            <h1>BS CHEMISTRY DEPARTMENT</h1>
                            <p>Govt. Boys Degree College Umerkot</p>
                            <span class="tag">REDISTRATION FORM - 2026</span>
                        </div>
                        <img src="${data.photo}" width="100" height="110" style="border:3px solid #fff;">
                    </div>

                    <div class="section">1. PERSONAL INFORMATION</div>
                    <div class="row"><div class="col"><b>Name:</b> ${data.name}</div><div class="col"><b>Father's Name:</b> ${data.fName}</div></div>
                    <div class="row"><div class="col"><b>Caste:</b> ${data.caste}</div><div class="col"><b>CNIC:</b> ${data.cnic}</div></div>
                    <div class="row"><div class="col"><b>Mobile:</b> ${data.mobile}</div><div class="col"><b>Email:</b> ${data.email}</div></div>
                    <div class="row"><div class="col"><b>Domicile:</b> ${data.domicile}</div><div class="col"><b>Address:</b> ${data.address}</div></div>

                    <div class="section">2. GUARDIAN INFORMATION</div>
                    <div class="row"><div class="col"><b>Guardian:</b> ${data.gName}</div><div class="col"><b>Occupation:</b> ${data.gOcc}</div></div>
                    <div class="row"><div class="col"><b>Job Address:</b> ${data.gJobAddr}</div><div class="col"><b>Permanent Address:</b> ${data.gAddress}</div></div>
                    <div class="row"><div class="col"><b>Contact:</b> ${data.gContact}</div></div>

                    <div class="section">3. ACADEMIC DETAILS</div>
                    <table>
                        <tr><th>Exam</th><th>Board</th><th>Year</th><th>Roll No</th><th>Group</th><th>Percentage</th></tr>
                        <tr><td>Matric</td><td>${data.m.brd}</td><td>${data.m.yr}</td><td>${data.m.roll}</td><td>${data.m.grp}</td><td>${data.m.per}</td></tr>
                        <tr><td>Inter</td><td>${data.i.brd}</td><td>${data.i.yr}</td><td>${data.i.roll}</td><td>${data.i.grp}</td><td>${data.i.per}</td></tr>
                    </table>
                    <br><br>    
                    <p>Applicant's Signature: ______________________</p>

                    <div class="challan-container">
                        ${['BANK COPY', 'OFFICE COPY', 'STUDENT COPY'].map(type => `
                            <div class="challan">
                                <center><b>JS BANK UMERKOT</b><br><b>BS CHEMISTRY GBDC UMERKOT</b><br><small>Account No: 1234567890</small><br><small>${type}</small></center>
                                <hr>
                                <p>Name: ${data.name}</p>
                                <p>Father's Name: ${data.fName}</p>
                                <p>CNIC: ${data.cnic}</p>
                                <p>Apply For: BS Chemistry</p>
                                <p>Fees: 2000/-</p>
                                <p>Last Date: 15-01-2026</p>
                                <br>Sign: ________
                            </div>
                        `).join('')}
                    </div>
                </body>
                </html>
            `);
            p.document.close();
            p.print();
        }
    } catch (e) { alert("Error connecting to server."); }
}