document.addEventListener('DOMContentLoaded', function() {
  fetchEmployerStats();
  fetchRecentApplications();
  fetchActiveJobs();
  
  document.getElementById('menu-toggle')?.addEventListener('click', function() {
    document.querySelector('.company-sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content-area').classList.toggle('expanded');
  });

  const premiumButton = document.querySelector('.premium-btn');
  premiumButton?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Upgrading to Pmail Premium would unlock additional features like advanced analytics, candidate matching algorithms, and prioritized job postings.');
  });

  const currentUserId = localStorage.getItem("user_id") || "0";
  if (currentUserId === "0") {
    alert("Please log in to view your home page.");
    return;
  }

  checkForViolationWarning();
});

function checkForViolationWarning() {
  const warningData = localStorage.getItem("violation_warning");
  if (warningData) {
    try {
      const warning = JSON.parse(warningData);
      showViolationWarning(warning.message);
    } catch (e) {
      console.error("Error parsing violation warning:", e);
    }
  }
}

function showViolationWarning(message) {
  const warningBanner = document.createElement('div');
  warningBanner.className = 'violation-warning';
  warningBanner.innerHTML = `
    <div class="warning-icon">⚠️</div>
    <div class="warning-message">${message}</div>
    <button class="warning-close" onclick="acknowledgeViolation()">×</button>
  `;
  
  const homeContainer = document.querySelector('.home-container');
  if (homeContainer) {
    homeContainer.insertBefore(warningBanner, homeContainer.firstChild);
  } else {
    document.body.insertBefore(warningBanner, document.body.firstChild);
  }
}

function acknowledgeViolation() {
  fetch('/auth/acknowledge-violation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      localStorage.removeItem('violation_warning');
      const warningBanner = document.querySelector('.violation-warning');
      if (warningBanner) {
        warningBanner.remove();
      }
    }
  })
  .catch(error => {
    console.error('Error acknowledging violation:', error);
  });
}

function fetchEmployerStats() {
  document.querySelector('.company-profile h2').textContent = "Loading...";
  document.querySelector('.company-info').textContent = "Loading...";
  document.querySelectorAll('.stat-number').forEach(el => {
    el.textContent = "...";
  });
  
  document.querySelectorAll('.card-value').forEach(el => {
    el.textContent = "...";
  });
  
  fetch("/employer/profile")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      const companyName = document.querySelector('.company-profile h2');
      if (companyName) {
        companyName.textContent = data.company_name;
        localStorage.setItem("company", data.company_name);
      }
      
      const companyInfo = document.querySelector('.company-info');
      if (companyInfo) {
        companyInfo.textContent = data.address;
      }
      
      const activeJobsNumber = document.querySelector('.stat-item:nth-child(1) .stat-number');
      const applicationsNumber = document.querySelector('.stat-item:nth-child(2) .stat-number');
      const underReviewNumber = document.querySelector('.stat-item:nth-child(3) .stat-number');
      const underReviewLabel = document.querySelector('.stat-item:nth-child(3) .stat-label');
      
      if (activeJobsNumber) activeJobsNumber.textContent = data.stats.active_jobs;
      if (applicationsNumber) applicationsNumber.textContent = data.stats.applications;
      if (underReviewNumber) underReviewNumber.textContent = data.stats.under_review;
      if (underReviewLabel) underReviewLabel.textContent = "Under Review";
      
      const summaryCards = document.querySelectorAll('.summary-card');
      if (summaryCards.length >= 4) {
        const totalApplicationsValue = summaryCards[0].querySelector('.card-value');
        if (totalApplicationsValue) totalApplicationsValue.textContent = data.stats.applications;
        
        const newThisWeekValue = summaryCards[1].querySelector('.card-value');
        if (newThisWeekValue) newThisWeekValue.textContent = data.stats.new_this_week;
        
        const interviewValue = summaryCards[2].querySelector('.card-value');
        const interviewLabel = summaryCards[2].querySelector('.card-label');
        if (interviewValue) interviewValue.textContent = data.stats.under_review;
        if (interviewLabel) interviewLabel.textContent = "Under Review";
        
        const pendingOffersValue = summaryCards[3].querySelector('.card-value');
        const pendingOffersLabel = summaryCards[3].querySelector('.card-label');
        if (pendingOffersValue) pendingOffersValue.textContent = data.stats.accepted;
        if (pendingOffersLabel) pendingOffersLabel.textContent = "Accepted Applications";
      }
    })
    .catch(error => {
      console.error("Error fetching employer profile:", error);
      const companyName = document.querySelector('.company-profile h2');
      const companyInfo = document.querySelector('.company-info');
      
      if (companyName) companyName.textContent = "Your Company";
      if (companyInfo) companyInfo.textContent = "Address not available";
      
      document.querySelectorAll('.stat-number').forEach(el => {
        el.textContent = "0";
      });
      
      document.querySelectorAll('.card-value').forEach(el => {
        el.textContent = "0";
      });
    });
}

function fetchRecentApplications() {
  const applicationsTable = document.querySelector('.applications-table');
  if (!applicationsTable) return;
  
  const header = applicationsTable.querySelector('.table-header');
  applicationsTable.innerHTML = '';
  applicationsTable.appendChild(header);
  
  const loadingRow = document.createElement('div');
  loadingRow.className = 'table-row loading';
  loadingRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px;">Loading recent applications...</div>';
  applicationsTable.appendChild(loadingRow);
  
  fetch("/employer/recent-applications")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }
      return response.json();
    })
    .then(applications => {
      applicationsTable.removeChild(loadingRow);
      
      if (applications.length === 0) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'table-row empty';
        emptyRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px;">No recent applications found.</div>';
        applicationsTable.appendChild(emptyRow);
        return;
      }
      
      applications.forEach(app => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        const avatarUrl = app.applicant_avatar || '../public/images/default_avatar.png';
        
        row.innerHTML = `
          <div class="col-candidate">
            <!-- <img src="${avatarUrl}" alt="Candidate" class="candidate-avatar"> -->
            <div class="candidate-info">
              <div class="candidate-name">${app.applicant_name}</div>
              <div class="candidate-title">${app.applicant_title}</div>
            </div>
          </div>
          <div class="col-position">${app.position}</div>
          <div class="col-date">${app.date}</div>
          <div class="col-status"><span class="status-badge status-${app.status.toLowerCase().replace(' ', '-')}">${app.status}</span></div>
          <div class="col-action">
            <button class="view-btn" data-id="${app.id}">View</button>
          </div>
        `;
        
        applicationsTable.appendChild(row);
      });
      
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const messageId = this.getAttribute('data-id');
          window.location.href = `employer_inbox.html?message_id=${messageId}`;
        });
      });
    })
    .catch(error => {
      console.error("Error fetching applications:", error);
      applicationsTable.removeChild(loadingRow);
      const errorRow = document.createElement('div');
      errorRow.className = 'table-row error';
      errorRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px; color:#f44336;">Failed to load applications. Please try again later.</div>';
      applicationsTable.appendChild(errorRow);
    });
}

function fetchActiveJobs() {
  const jobCardsContainer = document.querySelector('.job-cards');
  if (!jobCardsContainer) return;
  
  jobCardsContainer.innerHTML = '<div class="loading-jobs">Loading active job postings...</div>';
  
  fetch("/employer/active-jobs")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch active jobs");
      }
      return response.json();
    })
    .then(jobs => {
      jobCardsContainer.innerHTML = '';
      
      if (jobs.length === 0) {
        jobCardsContainer.innerHTML = '<div class="empty-jobs">No active job postings found. <a href="employer_post_job.html">Post your first job</a></div>';
        return;
      }
      
      jobs.forEach(job => {
        const jobCard = document.createElement('div');
        jobCard.className = 'job-card';
        jobCard.innerHTML = `
          <div class="job-card-header">
            <h3>${job.title}</h3>
            <div class="job-badge ${job.badge.toLowerCase()}">${job.badge}</div>
          </div>
          <div class="job-stats">
            <div class="job-stat">
              <span class="stat-value">${job.applications}</span>
              <span class="stat-label">Applications</span>
            </div>
            <div class="job-stat">
              <span class="stat-value">${job.accepted}</span>
              <span class="stat-label">Accepted</span>
            </div>
            <div class="job-stat">
              <span class="stat-value">${job.rejected}</span>
              <span class="stat-label">Rejected</span>
            </div>
          </div>
          <div class="job-footer">
            <span class="job-date">${job.posted_date}</span>
            <div class="job-actions">
              <button class="view-candidates-btn" data-id="${job.id}" data-title="${job.title}">View Candidates</button>
            </div>
          </div>
        `;
        
        jobCardsContainer.appendChild(jobCard);
      });
      
      document.querySelectorAll('.view-candidates-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          window.location.href = `employer_dashboard.html`;
        });
      });
    })
    .catch(error => {
      console.error("Error fetching active jobs:", error);
      jobCardsContainer.innerHTML = '<div class="error-jobs">Failed to load job postings. Please try again later.</div>';
    });
}
