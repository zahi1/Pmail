document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("job-listings")) {
      initJobsPage();
    }
    if (document.getElementById("job-detail-container")) {
      initJobDetailPage();
    }
  });
  
  let allJobs = [];
  
  function initJobsPage() {
    const filterBtn = document.getElementById("filter-btn");
    filterBtn.addEventListener("click", () => {
      const category = document.getElementById("category-select").value;
      const jobType = document.getElementById("jobtype-select").value;
      const salaryRange = document.getElementById("salary-select").value;
      const showClosed = document.getElementById("show-closed-checkbox")?.checked || false;
      fetchJobs(category, jobType, salaryRange, showClosed);
    });
  
    fetchJobs("", "", "", false);
  }
  
  function fetchJobs(category, jobType, salaryRange, showClosed) {
    let url = "/jobs"; 
    let params = [];
  
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (jobType)   params.push(`job_type=${encodeURIComponent(jobType)}`);
    if (salaryRange) params.push(`salary_range=${encodeURIComponent(salaryRange)}`);
    params.push(`show_closed=${showClosed}`);
  
    if (params.length > 0) {
      url += "?" + params.join("&");
    }
  
    const listingsContainer = document.getElementById("job-listings");
    listingsContainer.innerHTML = "<div class='loading-indicator'>Loading jobs...</div>";
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
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
    
    listingsContainer.innerHTML = ""; 
  
    if (jobs.length === 0) {
      listingsContainer.innerHTML = "<p>No jobs found.</p>";
      return;
    }
  
    const sortedJobs = sortJobs(jobs, sortOrder);
  
    sortedJobs.forEach(job => {
      const jobDiv = document.createElement("div");
      jobDiv.classList.add("job-item");
      
      const statusBadge = job.is_open ? 
        '<span class="status-badge open">OPEN</span>' : 
        '<span class="status-badge closed">CLOSED</span>';
      
      const deadlineDisplay = job.deadline ? 
        `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
        '<p><strong>Application Deadline:</strong> No deadline</p>';
      
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
  
    const detailButtons = document.querySelectorAll(".view-details-btn");
    detailButtons.forEach(btn => {
      btn.addEventListener("click", (e) => {
        const jobId = e.target.getAttribute("data-id");
        window.location.href = `job_detail.html?id=${jobId}`;
      });
    });
  }
  
  function sortJobs(jobs, sortOrder) {
    const sortedJobs = [...jobs];
    
    switch (sortOrder) {
      case 'date-desc': 
        return sortedJobs.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
      
      case 'date-asc': 
        return sortedJobs.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
      
      case 'title-asc': 
        return sortedJobs.sort((a, b) => a.title.localeCompare(b.title));
      
      case 'title-desc': 
        return sortedJobs.sort((a, b) => b.title.localeCompare(a.title));
      
      case 'salary-desc': 
        return sortedJobs.sort((a, b) => {
          const salaryA = parseSalaryForSort(a.salary_range);
          const salaryB = parseSalaryForSort(b.salary_range);
          return salaryB - salaryA;
        });
      
      case 'salary-asc': 
        return sortedJobs.sort((a, b) => {
          const salaryA = parseSalaryForSort(a.salary_range);
          const salaryB = parseSalaryForSort(b.salary_range);
          return salaryA - salaryB;
        });
      
      default:
        return sortedJobs;
    }
  }
  
  function parseSalaryForSort(salaryText) {
    if (!salaryText) return 0;
    try {
      const cleanText = salaryText.replace(/[€$,\s]/g, '');
      
   
      if (cleanText.includes('-')) {
        const parts = cleanText.split('-');
        return parseInt(parts[0]); 
      } else {
        
        return parseInt(cleanText);
      }
    } catch (e) {
      console.error("Error parsing salary:", e);
      return 0;
    }
  }
  

  function initJobDetailPage() {
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
    
    const statusBadge = job.is_open ? 
      '<span class="status-badge open">OPEN</span>' : 
      '<span class="status-badge closed">CLOSED</span>';
      
    const deadlineDisplay = job.deadline ? 
      `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
      '<p><strong>Application Deadline:</strong> No deadline</p>';
      
   
    const salaryDisplay = job.salary_range ? 
      `<p><strong>Salary Range:</strong> ${job.salary_range}</p>` : 
      '<p><strong>Salary:</strong> Not specified</p>';
      
    
    const employerEmail = job.employer_email;
    
  
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
        <div class="description-container">
          <div class="description-text collapsed">${job.description}</div>
          <button class="read-more-btn">Read More</button>
        </div>
      </div>
      
      <div class="job-actions">
        ${applyButton}
        <button class="back-btn" onclick="window.location.href='jobs.html'">Back to Jobs</button>
      </div>
    `;
    
    setupReadMoreLess(container);
  }
  
  
  function setupReadMoreLess(container) {
    const readMoreBtn = container.querySelector('.read-more-btn');
    const descText = container.querySelector('.description-text');
    
    if (!readMoreBtn || !descText) return;
    
    readMoreBtn.addEventListener('click', function() {
      if (descText.classList.contains('collapsed')) {
        descText.classList.remove('collapsed');
        this.textContent = 'Read Less';
      } else {
        descText.classList.add('collapsed');
        this.textContent = 'Read More';
      }
    });
  }
