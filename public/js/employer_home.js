// Employer Home Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Fetch employer statistics and data
  fetchEmployerStats();
  fetchRecentApplications();
  fetchActiveJobs();
  
  // Add toggle functionality for sidebar
  document.getElementById('menu-toggle')?.addEventListener('click', function() {
    document.querySelector('.company-sidebar').classList.toggle('collapsed');
    document.querySelector('.main-content-area').classList.toggle('expanded');
  });

  // Premium button functionality
  const premiumButton = document.querySelector('.premium-btn');
  premiumButton?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Upgrading to Pmail Premium would unlock additional features like advanced analytics, candidate matching algorithms, and prioritized job postings.');
  });
});

// Function to fetch employer stats
function fetchEmployerStats() {
  // Show loading state in profile section
  document.querySelector('.company-profile h2').textContent = "Loading...";
  document.querySelector('.company-info').textContent = "Loading...";
  document.querySelectorAll('.stat-number').forEach(el => {
    el.textContent = "...";
  });
  
  // Also show loading state in summary cards
  document.querySelectorAll('.card-value').forEach(el => {
    el.textContent = "...";
  });
  
  // Fetch employer profile data from the backend
  fetch("/employer/profile")
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // Update company name
      const companyName = document.querySelector('.company-profile h2');
      if (companyName) {
        companyName.textContent = data.company_name;
        // Store in localStorage for other parts of the app
        localStorage.setItem("company", data.company_name);
      }
      
      // Update address (only address, no industry/category)
      const companyInfo = document.querySelector('.company-info');
      if (companyInfo) {
        companyInfo.textContent = data.address;
      }
      
      // Update profile stats
      const activeJobsNumber = document.querySelector('.stat-item:nth-child(1) .stat-number');
      const applicationsNumber = document.querySelector('.stat-item:nth-child(2) .stat-number');
      const underReviewNumber = document.querySelector('.stat-item:nth-child(3) .stat-number');
      const underReviewLabel = document.querySelector('.stat-item:nth-child(3) .stat-label');
      
      if (activeJobsNumber) activeJobsNumber.textContent = data.stats.active_jobs;
      if (applicationsNumber) applicationsNumber.textContent = data.stats.applications;
      if (underReviewNumber) underReviewNumber.textContent = data.stats.under_review;
      if (underReviewLabel) underReviewLabel.textContent = "Under Review";
      
      // Update summary cards with real data
      const summaryCards = document.querySelectorAll('.summary-card');
      if (summaryCards.length >= 4) {
        // Total Applications card
        const totalApplicationsValue = summaryCards[0].querySelector('.card-value');
        if (totalApplicationsValue) totalApplicationsValue.textContent = data.stats.applications;
        
        // New This Week card
        const newThisWeekValue = summaryCards[1].querySelector('.card-value');
        if (newThisWeekValue) newThisWeekValue.textContent = data.stats.new_this_week;
        
        // Interview Stage (Under Review) card
        const interviewValue = summaryCards[2].querySelector('.card-value');
        const interviewLabel = summaryCards[2].querySelector('.card-label');
        if (interviewValue) interviewValue.textContent = data.stats.under_review;
        if (interviewLabel) interviewLabel.textContent = "Under Review";
        
        // Pending Offers (Accepted) card
        const pendingOffersValue = summaryCards[3].querySelector('.card-value');
        const pendingOffersLabel = summaryCards[3].querySelector('.card-label');
        if (pendingOffersValue) pendingOffersValue.textContent = data.stats.accepted;
        if (pendingOffersLabel) pendingOffersLabel.textContent = "Accepted Applications";
      }
    })
    .catch(error => {
      console.error("Error fetching employer profile:", error);
      // Show error state or fallback
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

// Function to fetch recent applications
function fetchRecentApplications() {
  const applicationsTable = document.querySelector('.applications-table');
  if (!applicationsTable) return;
  
  // Clear existing rows except header
  const header = applicationsTable.querySelector('.table-header');
  applicationsTable.innerHTML = '';
  applicationsTable.appendChild(header);
  
  // Add loading state
  const loadingRow = document.createElement('div');
  loadingRow.className = 'table-row loading';
  loadingRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px;">Loading recent applications...</div>';
  applicationsTable.appendChild(loadingRow);
  
  // Fetch data from backend
  fetch("/employer/recent-applications")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch applications");
      }
      return response.json();
    })
    .then(applications => {
      // Remove loading row
      applicationsTable.removeChild(loadingRow);
      
      // Handle empty state
      if (applications.length === 0) {
        const emptyRow = document.createElement('div');
        emptyRow.className = 'table-row empty';
        emptyRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px;">No recent applications found.</div>';
        applicationsTable.appendChild(emptyRow);
        return;
      }
      
      // Render each application
      applications.forEach(app => {
        const row = document.createElement('div');
        row.className = 'table-row';
        
        // Create avatar URL or use default
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
      
      // Add event listeners to view buttons
      document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const messageId = this.getAttribute('data-id');
          window.location.href = `employer_inbox.html?message_id=${messageId}`;
        });
      });
    })
    .catch(error => {
      console.error("Error fetching applications:", error);
      // Show error state
      applicationsTable.removeChild(loadingRow);
      const errorRow = document.createElement('div');
      errorRow.className = 'table-row error';
      errorRow.innerHTML = '<div style="text-align:center; width:100%; padding:20px; color:#f44336;">Failed to load applications. Please try again later.</div>';
      applicationsTable.appendChild(errorRow);
    });
}

// Function to fetch active jobs
function fetchActiveJobs() {
  const jobCardsContainer = document.querySelector('.job-cards');
  if (!jobCardsContainer) return;
  
  // Clear existing job cards
  jobCardsContainer.innerHTML = '<div class="loading-jobs">Loading active job postings...</div>';
  
  // Fetch data from backend
  fetch("/employer/active-jobs")
    .then(response => {
      if (!response.ok) {
        throw new Error("Failed to fetch active jobs");
      }
      return response.json();
    })
    .then(jobs => {
      // Remove loading message
      jobCardsContainer.innerHTML = '';
      
      // Handle empty state
      if (jobs.length === 0) {
        jobCardsContainer.innerHTML = '<div class="empty-jobs">No active job postings found. <a href="employer_post_job.html">Post your first job</a></div>';
        return;
      }
      
      // Render each job card
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
      
      // Add event listeners for view candidates buttons
      document.querySelectorAll('.view-candidates-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          // Redirect to the dashboard page instead of candidates page
          window.location.href = `employer_dashboard.html`;
        });
      });
    })
    .catch(error => {
      console.error("Error fetching active jobs:", error);
      // Show error state
      jobCardsContainer.innerHTML = '<div class="error-jobs">Failed to load job postings. Please try again later.</div>';
    });
}
