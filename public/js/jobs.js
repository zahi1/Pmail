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
  
  // -----------------------
  // 1) JOBS LIST PAGE
  // -----------------------
  function initJobsPage() {
    const filterBtn = document.getElementById("filter-btn");
    filterBtn.addEventListener("click", () => {
      const category = document.getElementById("category-select").value;
      const jobType = document.getElementById("jobtype-select").value;
      fetchJobs(category, jobType);
    });
  
    // Fetch all jobs initially
    fetchJobs("", "");
  }
  
  function fetchJobs(category, jobType) {
    let url = "/jobs"; // Because we registered jobs_bp at root url_prefix=""
    let params = [];
  
    if (category) params.push(`category=${encodeURIComponent(category)}`);
    if (jobType)   params.push(`job_type=${encodeURIComponent(jobType)}`);
  
    if (params.length > 0) {
      url += "?" + params.join("&");
    }
  
    fetch(url)
      .then(response => response.json())
      .then(data => {
        renderJobListings(data);
      })
      .catch(err => console.error("Error fetching jobs:", err));
  }
  
  function renderJobListings(jobs) {
    const listingsContainer = document.getElementById("job-listings");
    listingsContainer.innerHTML = ""; // Clear old
  
    if (jobs.length === 0) {
      listingsContainer.innerHTML = "<p>No jobs found.</p>";
      return;
    }
  
    jobs.forEach(job => {
      const jobDiv = document.createElement("div");
      jobDiv.classList.add("job-item");
      jobDiv.innerHTML = `
        <h3>${job.title}</h3>
        <p><strong>Company:</strong> ${job.company_name}</p>
        <p><strong>Location:</strong> ${job.location}</p>
        <p><strong>Category:</strong> ${job.category}</p>
        <p><strong>Job Type:</strong> ${job.job_type}</p>
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
    container.innerHTML = `
      <h2>${job.title}</h2>
      <p><strong>Company:</strong> ${job.company_name}</p>
      <p><strong>Location:</strong> ${job.location}</p>
      <p><strong>Category:</strong> ${job.category}</p>
      <p><strong>Job Type:</strong> ${job.job_type}</p>
      <p><strong>Description:</strong> ${job.description}</p>
      <p><em>Posted on: ${job.created_at}</em></p>
    `;
  }
  