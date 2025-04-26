// Employee Home Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
  // Fetch user's recent applications
  fetchRecentApplications();
  
  // Add hover effects for job cards
  const jobCards = document.querySelectorAll('.job-match-card');
  
  jobCards.forEach(card => {
    card.addEventListener('mouseenter', function() {
      this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
    });
    
    card.addEventListener('mouseleave', function() {
      this.style.boxShadow = 'none';
    });
  });

  // Add click handlers for apply buttons
  const applyButtons = document.querySelectorAll('.apply-btn');
  
  applyButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Get job title and company from closest job match card
      const jobCard = this.closest('.job-match-card');
      const jobTitle = jobCard.querySelector('h3').textContent;
      const companyName = jobCard.querySelector('.company-name').textContent;
      
      alert(`You are applying for: ${jobTitle} at ${companyName}`);
      // Here you would normally redirect to an application form or page
    });
  });

  // Add click handlers for save buttons
  const saveButtons = document.querySelectorAll('.save-btn');
  
  saveButtons.forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      
      // Toggle saved state
      if (this.textContent === 'Save') {
        this.textContent = 'Saved';
        this.style.backgroundColor = '#444';
      } else {
        this.textContent = 'Save';
        this.style.backgroundColor = '#2a2a2a';
      }
    });
  });
});

// Function to fetch recent applications for the current user
function fetchRecentApplications() {
  const container = document.getElementById('recent-applications-container');
  const loadingElement = document.getElementById('applications-loading');
  
  // Simulating API call with setTimeout
  // In a real application, this would be an actual API fetch
  setTimeout(() => {
    // Remove loading spinner
    if (loadingElement) {
      loadingElement.remove();
    }
    
    // Mock data - in a real app, this would come from your backend
    const applications = [
      {
        companyLogo: '../public/images/company4.png',
        jobTitle: 'UX Designer',
        companyName: 'DesignHub',
        applicationDate: 'May 15, 2023',
        status: 'Under Review'
      },
      {
        companyLogo: '../public/images/company5.png',
        jobTitle: 'JavaScript Developer',
        companyName: 'WebTech',
        applicationDate: 'May 10, 2023',
        status: 'Interview'
      },
      {
        companyLogo: '../public/images/company6.png',
        jobTitle: 'Backend Engineer',
        companyName: 'DataSystems',
        applicationDate: 'May 5, 2023',
        status: 'Not Selected'
      }
    ];
    
    // Check if there are applications
    if (applications.length === 0) {
      container.innerHTML = '<p class="no-applications">You haven\'t submitted any applications yet.</p>';
      return;
    }
    
    // Create HTML for each application
    applications.forEach(app => {
      const statusClass = getStatusClass(app.status);
      
      const applicationElement = document.createElement('div');
      applicationElement.className = 'application-item';
      applicationElement.innerHTML = `
        <img src="${app.companyLogo}" alt="${app.companyName} Logo" class="company-logo-sm">
        <div class="application-details">
          <h3>${app.jobTitle}</h3>
          <p>${app.companyName} • Applied ${app.applicationDate}</p>
        </div>
        <div class="status-badge ${statusClass}">${app.status}</div>
      `;
      
      container.appendChild(applicationElement);
    });
  }, 1000);
}

// Helper function to get the CSS class for each status
function getStatusClass(status) {
  switch(status) {
    case 'Under Review': return 'status-under-review';
    case 'Interview': return 'status-accepted';
    case 'Not Selected': return 'status-rejected';
    default: return '';
  }
}
