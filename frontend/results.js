// Search results for CNIC or Roll Number
const searchResultsContainer = document.getElementById('search-results');
const searchForm = document.getElementById('search-form');

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const cnic = document.getElementById('cnic').value.trim();
  const rollNo = document.getElementById('rollNo').value.trim();
  try {
    const response = await fetch('/api/results/check', {
      method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cnic, rollNo }),
    });
    const data = await response.json();
    if (data.success) {
      displayResults(data.results);
    } else {
      searchResultsContainer.innerHTML = `<p>${data.message}</p>`;
    }
    } catch (error) {
        console.error('Error fetching results:', error);
        searchResultsContainer.innerHTML = `<p>نتائج حاصل کرنے میں خرابی۔ براہ کرم دوبارہ کوشش کریں۔</p>`;
    }
});

function displayResults(results) {
    if (results.length === 0) {
        searchResultsContainer.innerHTML = '<p>کوئی نتائج نہیں ملے۔</p>';
        return;
    }

    let resultsHTML = '<ul>';
    results.forEach((result) => {
        resultsHTML += `<li>Roll No: ${result.rollNo}, Name: ${result.name}, CNIC: ${result.cnic}, Applied For: ${result.appllyFor}, Assigned Class: ${determinedClass(results)}</li>`;
    });
    resultsHTML += '</ul>';
    searchResultsContainer.innerHTML = resultsHTML;
}

// determinedClass function to determine the class based on the results
function determinedClass(results) {
    const apllyFor = results[0].appllyFor; // Assuming all results have the same 'appllyFor' value
    const marks = results[0].marks; // Assuming all results have the same 'marks' value

    if (apllyFor === 'P.E') {
        return "XI E";
    } else if (apllyFor === 'C.S')  {
        return "XI F";
    } else if (apllyFor === 'P.M') {
        if (marks >= 48) {
            return "XI A";
        } else if (marks >= 33 && marks < 48) {
            return "XI B";
        } else if (marks >= 20 && marks < 33) {
            return "XI C";
        } else {
            return "XI D";
        }
    }
}