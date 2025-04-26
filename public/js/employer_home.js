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

  // View candidate button functionality
  const viewButtons = document.querySelectorAll('.view-btn');
  viewButtons.forEach(button => {
    button.addEventListener('click', function() {
      const row = this.closest('.table-row');
      const candidateName = row.querySelector('.candidate-name').textContent;
      const position = row.querySelector('.col-position').textContent;
      alert(`Viewing candidate: ${candidateName} for position: ${position}`);
      // In a real app, this would link to candidate profile or detail page
    });
  });

  // View candidates for job posting
  const viewCandidatesButtons = document.querySelectorAll('.view-candidates-btn');
  viewCandidatesButtons.forEach(button => {
    button.addEventListener('click', function() {
      const jobCard = this.closest('.job-card');
      const jobTitle = jobCard.querySelector('h3').textContent;
      alert(`Viewing all candidates for: ${jobTitle}`);
      // In a real app, this would link to a filtered list of candidates for this job
    });
  });

  // Edit job posting
  const editButtons = document.querySelectorAll('.edit-btn');
  editButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.stopPropagation();
      const jobCard = this.closest('.job-card');
      const jobTitle = jobCard.querySelector('h3').textContent;
      
      // Redirect to the edit job page
      window.location.href = `employer_post_job.html?job=${encodeURIComponent(jobTitle)}&action=edit`;
    });
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
  // In a real application, this would be an API call
  // For now, we'll use setTimeout to simulate an API call
  setTimeout(() => {
    // Update profile stats with data from backend
    // This is where you would update the page with actual data from your backend
    const statNumbers = document.querySelectorAll('.stat-number');
    
    // Example: update company name
    const companyName = document.querySelector('.company-profile h2');
    if (companyName) {
      // This would come from your API
      // companyName.textContent = userData.companyName;
    }
    
    // Example: update active jobs count
    const activeJobsElement = document.querySelector('.stat-item:first-child .stat-number');
    if (activeJobsElement) {
      // This would come from your API
      // activeJobsElement.textContent = userData.activeJobs;
    }
    
    // Example: update applications count
    const applicationsElement = document.querySelector('.stat-item:nth-child(2) .stat-number');
    if (applicationsElement) {
      // This would come from your API
      // applicationsElement.textContent = userData.totalApplications;
    }
    
    // Update summary cards with actual data
  }, 500);
}

// Function to fetch recent applications
function fetchRecentApplications() {
  // In a real app, this would be an API call
  // For now, we're just simulating with setTimeout
  const applicationsTable = document.querySelector('.applications-table');
  
  if (!applicationsTable) return;
  
  // Add a loading indicator if needed
  // ... 
}

// Function to fetch active jobs
function fetchActiveJobs() {
  // In a real app, this would be an API call
  const jobCards = document.querySelector('.job-cards');
  
  if (!jobCards) return;
  
  // Add a loading indicator if needed
  // ...
}
