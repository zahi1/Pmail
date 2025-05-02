document.addEventListener("DOMContentLoaded", () => {
    // Check if we're on jobs.html
    if (document.getElementById("job-listings")) {
      initJobsPage();
    }
    // Check if we're on job_detail.html
    if (document.getElementById("job-detail-container")) {
      initJobDetailPage();
    }
  });
  
  // Global variable to store all jobs for sorting
  let allJobs = [];
  
  // -----------------------
  // 1) JOBS LIST PAGE
  // -----------------------
  function initJobsPage() {
    const filterBtn = document.getElementById("filter-btn");
    filterBtn.addEventListener("click", () => {
      const category = document.getElementById("category-select").value;
      const jobType = document.getElementById("jobtype-select").value;
      const salaryRange = document.getElementById("salary-select").value;
      const showClosed = document.getElementById("show-closed-checkbox")?.checked || false;
      fetchJobs(category, jobType, salaryRange, showClosed);
    });
  
    // Fetch all jobs initially
    fetchJobs("", "", "", false);
  }
  
  function fetchJobs(category, jobType, salaryRange, showClosed) {
    let url = "/jobs"; // Because we registered jobs_bp at root url_prefix=""
    let params = [];
  
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (jobType)   params.push(`job_type=${encodeURIComponent(jobType)}`);
    if (salaryRange) params.push(`salary_range=${encodeURIComponent(salaryRange)}`);
    params.push(`show_closed=${showClosed}`);
  
    if (params.length > 0) {
      url += "?" + params.join("&");
    }
  
    // Show loading indicator
    const listingsContainer = document.getElementById("job-listings");
    listingsContainer.innerHTML = "<div class='loading-indicator'>Loading jobs...</div>";
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        // Store all jobs for sorting
        allJobs = data;
        renderJobListings(data);
      })
      .catch(err => {
        console.error("Error fetching jobs:", err);
        listingsContainer.innerHTML = "<p>Error loading jobs. Please try again.</p>";
      });
  }
  
  function renderJobListings(jobs) {
    const listingsContainer = document.getElementById("job-listings");
    const sortOrder = document.getElementById("sort-select")?.value || "date-desc";
    
    listingsContainer.innerHTML = ""; // Clear old
  
    if (jobs.length === 0) {
      listingsContainer.innerHTML = "<p>No jobs found.</p>";
      return;
    }
  
    // Sort jobs before displaying
    const sortedJobs = sortJobs(jobs, sortOrder);
  
    sortedJobs.forEach(job => {
      const jobDiv = document.createElement("div");
      jobDiv.classList.add("job-item");
      
      // Add status badge
      const statusBadge = job.is_open ? 
        '<span class="status-badge open">OPEN</span>' : 
        '<span class="status-badge closed">CLOSED</span>';
      
      // Format deadline
      const deadlineDisplay = job.deadline ? 
        `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
        '<p><strong>Application Deadline:</strong> No deadline</p>';
      
      // Format salary display
      const salaryDisplay = job.salary_range ? 
        `<p><strong>Salary Range:</strong> ${job.salary_range}</p>` : 
        '<p><strong>Salary:</strong> Not specified</p>';
      
      jobDiv.innerHTML = `
        <h3>${job.title} ${statusBadge}</h3>
        <p><strong>Company:</strong> ${job.company_name}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        ${salaryDisplay}
        <p><strong>Category:</strong> ${job.category}</p>
        <p><strong>Job Type:</strong> ${job.job_type}</p>
        ${deadlineDisplay}
        <button class="view-details-btn" data-id="${job.id}">View Details</button>
      `;
      listingsContainer.appendChild(jobDiv);
    });
  
    // Attach event listeners for "View Details" buttons
    const detailButtons = document.querySelectorAll(".view-details-btn");
    detailButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const jobId = e.target.getAttribute("data-id");
        window.location.href = `job_detail.html?id=${jobId}`;
      });
    });
  }
  
  // Generic function to sort jobs (same as in post_job.js)
  function sortJobs(jobs, sortOrder) {
    const sortedJobs = [...jobs];
    
    switch (sortOrder) {
      case 'date-desc': // Newest first
        return sortedJobs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      case 'date-asc': // Oldest first
        return sortedJobs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      
      case 'title-asc': // A-Z
        return sortedJobs.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'title-desc': // Z-A
        return sortedJobs.sort((a, b) => b.title.localeCompare(a.title));
      
      case 'salary-desc': // High to low
        return sortedJobs.sort((a, b) => {
          const salaryA = parseSalaryForSort(a.salary_range);
          const salaryB = parseSalaryForSort(b.salary_range);
          return salaryB - salaryA;
        });
      
      case 'salary-asc': // Low to high
        return sortedJobs.sort((a, b) => {
          const salaryA = parseSalaryForSort(a.salary_range);
          const salaryB = parseSalaryForSort(b.salary_range);
          return salaryA - salaryB;
        });
      
      default:
        return sortedJobs;
    }
  }
  
  // Helper function to parse salary for sorting
  function parseSalaryForSort(salaryText) {
    if (!salaryText) return 0;
    try {
      // Strip all currency symbols, commas, and spaces
      const cleanText = salaryText.replace(/[€$,\s]/g, '');
      
      // Check if it's a range with a hyphen
      if (cleanText.includes('-')) {
        const parts = cleanText.split('-');
        return parseInt(parts[0]); // Use the minimum value for sorting
      } else {
        // It's a single value
        return parseInt(cleanText);
      }
    } catch (e) {
      console.error("Error parsing salary:", e);
      return 0;
    }
  }
  
  // -----------------------
  // 2) JOB DETAIL PAGE
  // -----------------------
  function initJobDetailPage() {
    // Grab the job ID from the URL
    const params = new URLSearchParams(window.location.search);
    const jobId = params.get("id");
    if (!jobId) {
      document.getElementById("job-detail-container").innerHTML = "<p>Invalid job ID.</p>";
      return;
    }
  
    fetch(`/jobs/${jobId}`)
      .then(response => response.json())
      .then(data => {
        renderJobDetail(data);
      })
      .catch(err => {
        console.error("Error fetching job details:", err);
        document.getElementById("job-detail-container").innerHTML = "<p>Failed to load job details.</p>";
      });
  }
  
  function renderJobDetail(job) {
    const container = document.getElementById("job-detail-container");
    
    // Create status badge
    const statusBadge = job.is_open ? 
      '<span class="status-badge open">OPEN</span>' : 
      '<span class="status-badge closed">CLOSED</span>';
      
    // Format deadline
    const deadlineDisplay = job.deadline ? 
      `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
      '<p><strong>Application Deadline:</strong> No deadline</p>';
      
    // Format salary display
    const salaryDisplay = job.salary_range ? 
      `<p><strong>Salary Range:</strong> ${job.salary_range}</p>` : 
      '<p><strong>Salary:</strong> Not specified</p>';
      
    // Use the actual employer email from the API response
    const employerEmail = job.employer_email;
    
    // Apply button - only enabled if job is open
    // Pass the actual employer email to the inbox compose
    const applyButton = job.is_open ?
      `<button class="apply-btn" onclick="window.location.href='employee_inbox.html?compose=true&employer=${encodeURIComponent(employerEmail)}&job=${encodeURIComponent(job.title)}'">Apply Now</button>` :
      `<button class="apply-btn" disabled>Applications Closed</button>`;
    
    container.innerHTML = `
      <div class="job-detail-header">
        <h2>${job.title} ${statusBadge}</h2>
        <p><strong>Company:</strong> ${job.company_name}</p>
      </div>
      
      <div class="job-detail-info">
        <p><strong>Location:</strong> ${job.location}</p>
        ${salaryDisplay}
        <p><strong>Category:</strong> ${job.category}</p>
        <p><strong>Job Type:</strong> ${job.job_type}</p>
        ${deadlineDisplay}
        <p><em>Posted on: ${job.created_at}</em></p>
      </div>
      
      <div class="job-description">
        <h3>Description</h3>
        <p>${job.description}</p>
      </div>
      
      <div class="job-actions">
        ${applyButton}
        <button class="back-btn" onclick="window.location.href='jobs.html'">Back to Jobs</button>
      </div>
    `;
  }
