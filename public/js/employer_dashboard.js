document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your dashboard.");
    return;
  }

  // Global variable to store all applications for filtering
  window.allApplications = []; 

  // Fetch dashboard data
  fetch(`/dashboard/employer/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      // Store applications globally for filtering
      window.allApplications = data.applications;
      
      // Extract unique categories
      const uniqueCategories = new Set();
      data.applications.forEach(app => {
        if (app.job_category && app.job_category !== "N/A") {
          uniqueCategories.add(app.job_category);
        }
      });
      
      // Populate category filter
      const categoryFilter = document.getElementById("categoryFilter");
      uniqueCategories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
      
      // Render charts with the data
      renderStatusChart(data.status_counts);
      renderTimeSeriesChart(data.time_series);
      renderCategoryChart(data.category_counts);
      renderDayOfWeekChart(data.day_of_week_counts);
      
      // Display applications
      displayApplicationCards(window.allApplications);
    })
    .catch(err => {
      console.error("Error loading dashboard data:", err);
    });
});

// Filter applications based on selected status and category
function filterApplications() {
  const statusValue = document.getElementById("statusFilter").value;
  const categoryValue = document.getElementById("categoryFilter").value;
  
  const filtered = window.allApplications.filter(app => {
    const matchesStatus = statusValue === "all" || app.status === statusValue;
    const matchesCategory = categoryValue === "all" || app.job_category === categoryValue;
    return matchesStatus && matchesCategory;
  });
  
  displayApplicationCards(filtered);
}

function displayApplicationCards(applications) {
  const container = document.getElementById("applicationsGrid");
  if (!container) return;
  
  container.innerHTML = "";
  
  if (applications.length === 0) {
    container.innerHTML = `
      <div class="no-applications">
        <p>No applications found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  applications.forEach(app => {
    // Create card element
    const card = document.createElement("div");
    card.className = "application-card";
    card.dataset.appId = app.id; // Store application ID in the DOM element
    
    // Get applicant initial for avatar
    const initial = app.sender_email ? app.sender_email.charAt(0).toUpperCase() : "?";
    
    // Format date for display
    const date = new Date(app.created_at);
    const formattedDate = date.toLocaleDateString("en-US", { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    card.innerHTML = `
      <div class="card-header">
        <h3 class="job-title">${app.subject || 'No Subject'}</h3>
        <span class="status-badge status-${(app.status || 'pending').toLowerCase().replace(' ', '-')}">${app.status || 'Pending'}</span>
      </div>
      <div class="card-body">
        <div class="applicant-info">
          <div class="applicant-avatar">${initial}</div>
          <div class="applicant-details">
            <p class="applicant-name">Applicant</p>
            <p class="applicant-email">${app.sender_email || 'Unknown'}</p>
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
          <select class="status-select" onchange="updateApplicationStatus(${app.id}, this.value)">
            <option value="Pending" ${(app.status || '') === 'Pending' ? 'selected' : ''}>Pending</option>
            <option value="Under Review" ${(app.status || '') === 'Under Review' ? 'selected' : ''}>Under Review</option>
            <option value="Accepted" ${(app.status || '') === 'Accepted' ? 'selected' : ''}>Accepted</option>
            <option value="Rejected" ${(app.status || '') === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
          <button class="action-btn view-btn" onclick="viewApplication(${app.id})">View</button>
        </div>
      </div>
    `;
    
    container.appendChild(card);
  });
}

function updateApplicationStatus(messageId, newStatus) {
  // Debug logs
  console.log(`Updating status for message ${messageId} to ${newStatus}`);
  
  fetch(`/messages/${messageId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log("Status update response:", data);
    
    // Update application in the global array
    const appIndex = window.allApplications.findIndex(app => app.id == messageId);
    if (appIndex !== -1) {
      window.allApplications[appIndex].status = newStatus;
      
      // Update the badge visually in the DOM
      const card = document.querySelector(`.application-card[data-app-id="${messageId}"]`);
      if (card) {
        const statusBadge = card.querySelector('.status-badge');
        if (statusBadge) {
          statusBadge.textContent = newStatus;
          statusBadge.className = `status-badge status-${newStatus.toLowerCase().replace(' ', '-')}`;
        }
      }
    }
    
    showToast("Application status updated successfully");
  })
  .catch(error => {
    console.error("Error updating status:", error);
    showToast("Failed to update status: " + error.message);
  });
}

function viewApplication(messageId) {
  window.location.href = `employer_inbox.html?message_id=${messageId}`;
}

function replyToApplicant(email, subject) {
  window.location.href = `employer_inbox.html?compose=true&recipient=${encodeURIComponent(email)}&subject=Re: ${encodeURIComponent(subject)}`;
}

function showToast(message) {
  // Create toast notification
  let toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerText = message;
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add("visible");
  }, 100);
  
  // Hide toast after delay
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}

// Chart rendering functions
function renderStatusChart(statusCounts) {
  // Implementation for status chart
  const ctx = document.getElementById("statusChart").getContext("2d");
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: ['#3a3a3a', '#554b29', '#1e4620', '#621b16']
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Application Status Distribution',
          color: '#fff'
        },
        legend: {
          labels: {
            color: '#fff'
          }
        }
      },
      responsive: true
    }
  });
}

function renderTimeSeriesChart(timeSeriesData) {
  // Implementation for time series chart
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
        backgroundColor: 'rgba(138, 180, 248, 0.2)',
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
        },
        legend: {
          labels: {
            color: '#fff'
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderCategoryChart(categoryCounts) {
  // Implementation for category chart
  const categories = Object.keys(categoryCounts);
  const counts = categories.map(c => categoryCounts[c]);
  
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
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        }
      }
    }
  });
}

function renderDayOfWeekChart(dayOfWeekData) {
  // Implementation for day of week chart
  const order = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const days = order.filter(day => dayOfWeekData[day] !== undefined);
  const counts = days.map(day => dayOfWeekData[day]);
  
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
        },
        legend: {
          display: false
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          },
          ticks: {
            color: '#fff'
          }
        }
      }
    }
  });
}
