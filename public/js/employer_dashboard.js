document.addEventListener("DOMContentLoaded", () => {
  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your dashboard.");
    return;
  }
  
  window.allApplications = []; 
  window.openApplications = [];
  window.closedApplications = [];
  window.jobTitles = new Set();

  fetch(`/dashboard/employer/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      window.allApplications = data.applications;
      
      const uniqueCategories = new Set();
      data.applications.forEach(app => {
        if (app.job_category && app.job_category !== "N/A") {
          uniqueCategories.add(app.job_category);
        }
        
        if (app.subject && app.subject.toLowerCase().includes("application for:")) {
          const jobTitle = app.subject.split("Application for:")[1].trim();
          window.jobTitles.add(jobTitle);
        }
      });
      
      const categoryFilter = document.getElementById("categoryFilter");
      uniqueCategories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryFilter.appendChild(option);
      });
      
      const jobTitleFilter = document.getElementById("jobTitleFilter");
      window.jobTitles.forEach(title => {
        const option = document.createElement("option");
        option.value = title;
        option.textContent = title;
        jobTitleFilter.appendChild(option);
      });
      
      renderStatusChart(data.status_counts);
      renderTimeSeriesChart(data.time_series);
      renderCategoryChart(data.category_counts);
      renderDayOfWeekChart(data.day_of_week_counts);
      
      separateApplications(window.allApplications);
      
      displayApplicationCards(window.openApplications, "applicationsGrid");
      displayApplicationCards(window.closedApplications, "closedApplicationsGrid");
    })
    .catch(err => {
      console.error("Error loading dashboard data:", err);
    });
});

function separateApplications(applications) {
  window.openApplications = applications.filter(app => !app.job_closed);
  window.closedApplications = applications.filter(app => app.job_closed);
}

function filterApplications() {
  const statusValue = document.getElementById("statusFilter").value;
  const categoryValue = document.getElementById("categoryFilter").value;
  const jobTitleValue = document.getElementById("jobTitleFilter").value;
  const sortByValue = document.getElementById("sortBy").value;
  
  const filteredOpen = window.openApplications.filter(app => {
    const matchesStatus = statusValue === "all" || app.status === statusValue;
    const matchesCategory = categoryValue === "all" || app.job_category === categoryValue;
    
    let appJobTitle = "";
    if (app.subject && app.subject.toLowerCase().includes("application for:")) {
      appJobTitle = app.subject.split("Application for:")[1].trim();
    }
    
    const matchesJobTitle = jobTitleValue === "all" || appJobTitle === jobTitleValue;
    
    return matchesStatus && matchesCategory && matchesJobTitle;
  });
  
  const filteredClosed = window.closedApplications.filter(app => {
    const matchesStatus = statusValue === "all" || app.status === statusValue;
    const matchesCategory = categoryValue === "all" || app.job_category === categoryValue;
    
    let appJobTitle = "";
    if (app.subject && app.subject.toLowerCase().includes("application for:")) {
      appJobTitle = app.subject.split("Application for:")[1].trim();
    }
    
    const matchesJobTitle = jobTitleValue === "all" || appJobTitle === jobTitleValue;
    
    return matchesStatus && matchesCategory && matchesJobTitle;
  });
  
  const sortedOpen = sortApplications(filteredOpen, sortByValue);
  const sortedClosed = sortApplications(filteredClosed, sortByValue);
  
  displayApplicationCards(sortedOpen, "applicationsGrid");
  displayApplicationCards(sortedClosed, "closedApplicationsGrid");
  
  const closedHeader = document.querySelector('.closed-applications-header');
  const closedGrid = document.getElementById("closedApplicationsGrid");
  
  if (sortedClosed.length === 0) {
    if (closedHeader) closedHeader.style.display = 'none';
    if (closedGrid) closedGrid.style.display = 'none';
  } else {
    if (closedHeader) closedHeader.style.display = 'block';
    if (closedGrid) closedGrid.style.display = 'grid';
  }
}

function sortApplications(applications, sortCriteria) {
  if (!sortCriteria || sortCriteria === "date-desc") {
    return [...applications];
  }

  const [field, direction] = sortCriteria.split('-');
  
  return applications.sort((a, b) => {
    let comparison = 0;
    
    if (field === 'date') {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      comparison = dateA - dateB;
    } 
    else if (field === 'title') {
      let titleA = "", titleB = "";
      if (a.subject && a.subject.toLowerCase().includes("application for:")) {
        titleA = a.subject.split("Application for:")[1].trim();
      }
      if (b.subject && b.subject.toLowerCase().includes("application for:")) {
        titleB = b.subject.split("Application for:")[1].trim();
      }
      comparison = titleA.localeCompare(titleB);
    } 
    else if (field === 'salary') {
      const salaryA = getSalaryValue(a.salary_range);
      const salaryB = getSalaryValue(b.salary_range);
      comparison = salaryA - salaryB;
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}

function getSalaryValue(salaryRange) {
  if (!salaryRange || salaryRange === "Not specified") {
    return 0; 
  }
  
  try {
    const cleanText = salaryRange.replace(/[€$,\s]/g, '');
    
    if (cleanText.includes('-')) {
      const parts = cleanText.split('-');
      return parseInt(parts[0]);
    } else {
      return parseInt(cleanText);
    }
  } catch (e) {
    console.error("Error parsing salary for sorting:", e);
    return 0;
  }
}

window.selectedApplications = [];

function displayApplicationCards(applications, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = "";
  
  if (containerId === "applicationsGrid") {
    updateBulkActionsPanel();
  }
  
  if (applications.length === 0) {
    container.innerHTML = `
      <div class="no-applications">
        <p>No applications found matching your criteria.</p>
      </div>
    `;
    return;
  }
  
  applications.forEach(app => {
    const card = document.createElement("div");
    card.className = "application-card";
    card.dataset.appId = app.id; 
    
    if (containerId === "closedApplicationsGrid") {
      card.classList.add("closed-application");
    }
    
    const initial = app.sender_email ? app.sender_email.charAt(0).toUpperCase() : "?";
    
    const date = new Date(app.created_at);
    const formattedDate = date.toLocaleDateString("en-US", { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
    
    let jobTitle = app.subject;
    if (app.subject && app.subject.toLowerCase().includes("application for:")) {
      jobTitle = app.subject.split("Application for:")[1].trim();
    }
    
    card.innerHTML = `
      <div class="card-header">
        <h3 class="job-title">${jobTitle || 'No Subject'}</h3>
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
          <div class="detail-row">
            <span class="detail-label">Salary Range:</span>
            <span class="detail-value">${app.salary_range || 'Not specified'}</span>
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
    
    if (containerId === "applicationsGrid") {
      const cardCheckbox = document.createElement("input");
      cardCheckbox.type = "checkbox";
      cardCheckbox.className = "card-checkbox";
      cardCheckbox.dataset.id = app.id;
      cardCheckbox.addEventListener("change", function() {
        toggleApplicationSelection(app.id, this.checked);
      });
      
      card.insertBefore(cardCheckbox, card.firstChild);
    }
    
    container.appendChild(card);
  });
}

function toggleApplicationSelection(appId, isSelected) {
  if (isSelected) {
    if (!window.selectedApplications.includes(appId)) {
      window.selectedApplications.push(appId);
      
      const card = document.querySelector(`.application-card[data-app-id="${appId}"]`);
      if (card) card.classList.add('selected');
    }
  } else {
    window.selectedApplications = window.selectedApplications.filter(id => id != appId);
    
    const card = document.querySelector(`.application-card[data-app-id="${appId}"]`);
    if (card) card.classList.remove('selected');
    
    document.getElementById("selectAll").checked = false;
  }
  
  updateBulkActionsPanel();
}

function toggleSelectAll() {
  const isChecked = document.getElementById("selectAll").checked;
  const checkboxes = document.querySelectorAll('.card-checkbox');
  
  window.selectedApplications = [];
  
  checkboxes.forEach(checkbox => {
    checkbox.checked = isChecked;
    
    if (isChecked) {
      const appId = parseInt(checkbox.dataset.id);
      window.selectedApplications.push(appId);
      
      const card = checkbox.closest('.application-card');
      if (card) card.classList.add('selected');
    } else {
      const cards = document.querySelectorAll('.application-card');
      cards.forEach(card => card.classList.remove('selected'));
    }
  });
  
  updateBulkActionsPanel();
}

function updateBulkActionsPanel() {
  const selectedCount = window.selectedApplications.length;
  
  document.getElementById("selectedCount").textContent = `(${selectedCount} selected)`;
  
  const bulkActionSelect = document.getElementById("bulkActionSelect");
  const applyButton = document.getElementById("applyBulkAction");
  
  if (selectedCount > 0) {
    bulkActionSelect.disabled = false;
    applyButton.disabled = bulkActionSelect.value === "";
  } else {
    bulkActionSelect.disabled = true;
    applyButton.disabled = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const bulkActionSelect = document.getElementById("bulkActionSelect");
  if (bulkActionSelect) {
    bulkActionSelect.addEventListener('change', function() {
      const applyButton = document.getElementById("applyBulkAction");
      applyButton.disabled = this.value === "" || window.selectedApplications.length === 0;
    });
  }
});

function applyBulkAction() {
  const action = document.getElementById("bulkActionSelect").value;
  
  if (!action || window.selectedApplications.length === 0) {
    return;
  }
  
  const confirmMessage = `Are you sure you want to change ${window.selectedApplications.length} application(s) to status "${action}"?`;
  if (!confirm(confirmMessage)) {
    return;
  }
  
  fetch('/messages/bulk-status-update', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message_ids: window.selectedApplications,
      status: action
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    window.selectedApplications.forEach(appId => {
      const appIndex = window.allApplications.findIndex(app => app.id == appId);
      if (appIndex !== -1) {
        window.allApplications[appIndex].status = action;
      }
      
      const card = document.querySelector(`.application-card[data-app-id="${appId}"]`);
      if (card) {
        const statusBadge = card.querySelector('.status-badge');
        const statusSelect = card.querySelector('.status-select');
        
        if (statusBadge) {
          statusBadge.textContent = action;
          statusBadge.className = `status-badge status-${action.toLowerCase().replace(' ', '-')}`;
        }
        
        if (statusSelect) {
          statusSelect.value = action;
        }
        
        card.classList.remove('selected');
        const checkbox = card.querySelector('.card-checkbox');
        if (checkbox) checkbox.checked = false;
      }
    });
    
    window.selectedApplications = [];
    document.getElementById("selectAll").checked = false;
    updateBulkActionsPanel();
    
    showToast(`Successfully updated ${data.updated_count || data.count || 'all'} applications`);
  })
  .catch(error => {
    console.error('Error applying bulk action:', error);
    showToast('Failed to update applications: ' + error.message);
  });
}

function updateApplicationStatus(messageId, newStatus) {
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
    
    const appIndex = window.allApplications.findIndex(app => app.id == messageId);
    if (appIndex !== -1) {
      window.allApplications[appIndex].status = newStatus;
      
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
  let toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerText = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add("visible");
  }, 100);
  
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}

function renderStatusChart(statusCounts) {
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
