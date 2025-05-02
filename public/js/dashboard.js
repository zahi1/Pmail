// frontend/public/js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your dashboard.");
    return;
  }

  // Global variables for filtering
  window.allApplications = [];
  
  fetch(`/dashboard/employee/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      // Store applications globally
      window.allApplications = data.applications;
      
      // Extract unique categories for filter dropdown
      const uniqueCategories = new Set();
      data.applications.forEach(app => {
        if (app.job_category && app.job_category !== 'N/A') {
          uniqueCategories.add(app.job_category);
        }
      });

      // Populate category filter dropdown
      const categoryFilter = document.getElementById("categoryFilter");
      if (categoryFilter) {
        uniqueCategories.forEach(category => {
          const option = document.createElement("option");
          option.value = category;
          option.textContent = category;
          categoryFilter.appendChild(option);
        });
      }

      // 1) Status distribution (pie)
      renderStatusChart(data.status_counts);

      // 2) Monthly time series (line)
      renderTimeSeriesChart(data.time_series);

      // 3) Category distribution (bar)
      renderCategoryChart(data.category_counts);

      // 4) Day of week distribution (bar)
      renderDayOfWeekChart(data.day_of_week_counts);

      // Display all applications initially
      displayApplicationCards(data.applications);
    })
    .catch(err => {
      console.error("Error fetching dashboard data:", err);
    });
});

// Function to filter applications based on selected criteria
function filterApplications() {
  const statusFilter = document.getElementById("statusFilter").value;
  const categoryFilter = document.getElementById("categoryFilter").value;
  const salaryFilter = document.getElementById("salaryFilter").value;
  const sortBy = document.getElementById("sortBy").value;
  
  let filteredApps = [...window.allApplications];
  
  // Filter by status
  if (statusFilter !== "all") {
    filteredApps = filteredApps.filter(app => app.status === statusFilter);
  }
  
  // Filter by category
  if (categoryFilter !== "all") {
    filteredApps = filteredApps.filter(app => app.job_category === categoryFilter);
  }
  
  // Filter by salary range
  if (salaryFilter !== "all") {
    filteredApps = filteredApps.filter(app => {
      // Skip applications without salary data
      if (!app.salary_range || app.salary_range === "Not specified") {
        return false;
      }
      
      // Parse the salary filter (e.g., "3000-5000" or "12000+")
      let filterMin, filterMax;
      if (salaryFilter.endsWith('+')) {
        filterMin = parseInt(salaryFilter.replace('+', ''));
        filterMax = Number.MAX_SAFE_INTEGER;
      } else {
        [filterMin, filterMax] = salaryFilter.split('-').map(Number);
      }
      
      // Parse the application's salary range
      const parsedSalary = parseSalaryRange(app.salary_range);
      
      // Check if the ranges overlap
      return !(parsedSalary.max < filterMin || parsedSalary.min > filterMax);
    });
  }
  
  // Apply sorting
  filteredApps = sortApplications(filteredApps, sortBy);
  
  // Display filtered and sorted applications
  displayApplicationCards(filteredApps);
}

// New function to sort applications based on the selected criteria
function sortApplications(applications, sortCriteria) {
  const [field, direction] = sortCriteria.split('-');
  
  return applications.sort((a, b) => {
    let comparison = 0;
    
    // Sort by date
    if (field === 'date') {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      comparison = dateA - dateB;
    } 
    // Sort by title
    else if (field === 'title') {
      // Extract job title from subject
      const titleA = a.subject ? a.subject.replace(/^Application for:\s*/i, '') : '';
      const titleB = b.subject ? b.subject.replace(/^Application for:\s*/i, '') : '';
      comparison = titleA.localeCompare(titleB);
    } 
    // Sort by salary
    else if (field === 'salary') {
      // Get min salary values for comparison
      const salaryA = getSalaryValue(a.salary_range);
      const salaryB = getSalaryValue(b.salary_range);
      comparison = salaryA - salaryB;
    }
    
    // Adjust direction based on asc/desc
    return direction === 'asc' ? comparison : -comparison;
  });
}

// Helper function to extract a numeric value from salary range for sorting
function getSalaryValue(salaryRange) {
  if (!salaryRange || salaryRange === 'Not specified') {
    return 0; // Place unspecified salaries at the bottom/top depending on sort order
  }
  
  try {
    const parsed = parseSalaryRange(salaryRange);
    // Use min value for comparison by default
    return parsed.min || 0;
  } catch (e) {
    console.error("Error parsing salary for sorting:", e);
    return 0;
  }
}

// Parse salary range string into min and max values
function parseSalaryRange(salaryText) {
  if (!salaryText || salaryText === "Not specified") {
    return { min: 0, max: 0 };
  }
  
  try {
    // Strip all currency symbols, commas, and spaces
    const cleanText = salaryText.replace(/[€$,\s]/g, '');
    
    // Check if it's a range with a hyphen
    if (cleanText.includes('-')) {
      const parts = cleanText.split('-');
      return {
        min: parseInt(parts[0]),
        max: parseInt(parts[1])
      };
    } else {
      // It's a single value
      const value = parseInt(cleanText);
      return { min: value, max: value };
    }
  } catch (e) {
    console.error("Error parsing salary range:", e);
    return { min: 0, max: Number.MAX_SAFE_INTEGER };
  }
}

function renderStatusChart(statusCounts) {
  const statuses = Object.keys(statusCounts);
  const counts = statuses.map(s => statusCounts[s]);

  const ctx = document.getElementById("statusChart").getContext("2d");
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: statuses,
      datasets: [{
        data: counts,
        backgroundColor: ['#ff6384','#36a2eb','#ffcd56','#4bc0c0','#9966ff']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Application Status Distribution',
          color: '#fff'
        }
      },
      responsive: true
    }
  });
}

function renderTimeSeriesChart(timeSeriesData) {
  const months = Object.keys(timeSeriesData).sort();
  const counts = months.map(m => timeSeriesData[m]);

  const ctx = document.getElementById("timeSeriesChart").getContext("2d");
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: months,
      datasets: [{
        label: 'Applications Over Time',
        data: counts,
        borderColor: '#8ab4f8',
        backgroundColor: 'rgba(138,180,248,0.2)',
        fill: true,
        tension: 0.1
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Monthly Applications',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Month',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderCategoryChart(categoryCounts) {
  const categories = Object.keys(categoryCounts);
  const counts = categories.map(cat => categoryCounts[cat]);

  const ctx = document.getElementById("categoryChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: categories,
      datasets: [{
        label: 'Applications by Category',
        data: counts,
        backgroundColor: '#ff9f40'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Applications by Category',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Category',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderDayOfWeekChart(dayOfWeekData) {
  // Typical day-of-week order
  const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  // Filter out days that are not in dayOfWeekData
  const days = order.filter(d => dayOfWeekData[d] !== undefined);
  const counts = days.map(d => dayOfWeekData[d]);

  const ctx = document.getElementById("dayOfWeekChart").getContext("2d");
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [{
        label: 'Applications by Day of Week',
        data: counts,
        backgroundColor: '#9f80ff'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Applications by Day of Week',
          color: '#fff'
        }
      },
      scales: {
        x: {
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Day',
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          ticks: { color: '#fff' },
          title: {
            display: true,
            text: 'Count',
            color: '#fff'
          }
        }
      }
    }
  });
}

function displayApplicationCards(applications) {
  // First, find or create the applications container
  let applicationsContainer = document.querySelector('.applications-container');
  if (!applicationsContainer) {
    applicationsContainer = document.createElement('div');
    applicationsContainer.className = 'applications-container';
    applicationsContainer.innerHTML = '<h2>My Applications</h2>';
    
    const chartsGrid = document.querySelector('.charts-grid');
    if (chartsGrid) {
      chartsGrid.parentNode.insertBefore(applicationsContainer, chartsGrid.nextSibling);
    } else {
      document.querySelector('.dashboard-container').appendChild(applicationsContainer);
    }
  }
  
  // Find existing grid or create new one
  let applicationsGrid = applicationsContainer.querySelector('.applications-grid');
  if (!applicationsGrid) {
    applicationsGrid = document.createElement('div');
    applicationsGrid.className = 'applications-grid';
    applicationsContainer.appendChild(applicationsGrid);
  } else {
    // Clear existing cards
    applicationsGrid.innerHTML = "";
  }
  
  // Handle empty state
  if (!applications || applications.length === 0) {
    applicationsGrid.innerHTML = `
      <div class="no-applications">
        <img src="../public/images/inbox_icon.png" alt="No Applications">
        <p>No applications found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  // Create cards for each application
  applications.forEach((app, index) => {
    const card = document.createElement('div');
    card.className = 'application-card';
    card.style.setProperty('--card-index', index);
    
    const status = app.status || 'Pending';
    
    // Format the date to be more readable
    const date = new Date(app.created_at);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    card.innerHTML = `
      <div class="card-header">
        <h3 class="job-title">${app.subject || 'No Subject'}</h3>
        <span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>
      </div>
      <div class="card-body">
        <div class="applicant-info">
          <div class="applicant-avatar">
            ${app.recipient_email ? app.recipient_email.charAt(0).toUpperCase() : 'C'}
          </div>
          <div class="applicant-details">
            <p class="applicant-name">Employer</p>
            <p class="applicant-email">${app.recipient_email || 'Unknown'}</p>
          </div>
        </div>
        <div class="application-details">
          <div class="detail-row">
            <span class="detail-label">Category:</span>
            <span class="detail-value">${app.job_category || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Job Type:</span>
            <span class="detail-value">${app.job_type || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Location:</span>
            <span class="detail-value">${app.job_location || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Company:</span>
            <span class="detail-value">${app.job_company || 'N/A'}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Salary Range:</span>
            <span class="detail-value">${app.salary_range || 'Not specified'}</span>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="card-date">${formattedDate}</span>
        <div class="card-actions">
          <button class="action-btn" onclick="window.location.href='employee_inbox.html?message_id=${app.id}'">
            View Application
          </button>
        </div>
      </div>
    `;
    
    applicationsGrid.appendChild(card);
  });
}
