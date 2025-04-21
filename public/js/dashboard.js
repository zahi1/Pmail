// frontend/public/js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your dashboard.");
    return;
  }

  fetch(`/dashboard/employee/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      // 1) Status distribution (pie)
      renderStatusChart(data.status_counts);

      // 2) Monthly time series (line)
      renderTimeSeriesChart(data.time_series);

      // 3) Category distribution (bar)
      renderCategoryChart(data.category_counts);

      // 4) Day of week distribution (bar)
      renderDayOfWeekChart(data.day_of_week_counts);

      // Display applications using cards instead of a table
      displayApplicationCards(data.applications);
    })
    .catch(err => {
      console.error("Error fetching dashboard data:", err);
    });
});

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
  // First, find or create a container for the applications
  let applicationsContainer = document.querySelector('.applications-container');
  if (!applicationsContainer) {
    // If the container doesn't exist yet, create it
    applicationsContainer = document.createElement('div');
    applicationsContainer.className = 'applications-container';
    applicationsContainer.innerHTML = '<h2>My Applications</h2>';
    
    // Add it to the page after the charts
    const chartsGrid = document.querySelector('.charts-grid');
    if (chartsGrid) {
      chartsGrid.parentNode.insertBefore(applicationsContainer, chartsGrid.nextSibling);
    } else {
      document.querySelector('.dashboard-container').appendChild(applicationsContainer);
    }
  }
  
  // Create grid container for cards
  const applicationsGrid = document.createElement('div');
  applicationsGrid.className = 'applications-grid';
  applicationsContainer.appendChild(applicationsGrid);
  
  // Remove the old table if it exists
  const oldTable = document.getElementById('applicationsTable');
  if (oldTable) {
    oldTable.parentNode.removeChild(oldTable);
  }
  
  // Handle empty state
  if (!applications || applications.length === 0) {
    applicationsGrid.innerHTML = `
      <div class="no-applications">
        <img src="../public/images/inbox_icon.png" alt="No Applications">
        <p>You haven't submitted any job applications yet.</p>
        <p>Once you apply for jobs, they will appear here.</p>
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
        </div>
      </div>
      <div class="card-footer">
        <span class="card-date">${formattedDate}</span>
        <div class="card-actions">
          <button class="action-btn" onclick="window.location.href='employee_inbox.html?view_message=${app.id}'">
            View Application
          </button>
        </div>
      </div>
    `;
    
    applicationsGrid.appendChild(card);
  });
}
