// frontend/public/js/post_job.js

document.addEventListener("DOMContentLoaded", () => {
  const postJobForm = document.getElementById("post-job-form");
  if (postJobForm) {
    postJobForm.addEventListener("submit", submitJobForm);
  }
  
  // Load existing jobs when the page loads
  loadEmployerJobs();
});

// Global variable to store all jobs for sorting
let allEmployerJobs = [];

function submitJobForm(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value.trim();
  const jobType = document.getElementById("job_type").value.trim();
  const location = document.getElementById("location").value.trim();
  const deadline = document.getElementById("deadline").value.trim();
  const salaryRange = document.getElementById("salary_range").value.trim();

  if (!title || !description || !category || !jobType || !location || !salaryRange || !deadline) {
    alert("Please fill all required fields.");
    return;
  }

  const payload = {
    title: title,
    description: description,
    category: category,
    job_type: jobType,
    location: location,
    salary_range: salaryRange,
    deadline: deadline  // Always include deadline in the payload
  };

  fetch("/jobs/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.message === "Job posted successfully") {
      alert("Job posted successfully!");
      document.getElementById("post-job-form").reset();
      
      // Reload the jobs list after successfully posting a new job
      loadEmployerJobs();
    } else {
      alert("Error: " + (data.error || "Unknown error"));
    }
  })
  .catch(err => console.error("Error posting job:", err));
}

// Function to load employer's existing jobs
function loadEmployerJobs() {
  const container = document.getElementById("employer-jobs-container");
  if (!container) return;
  
  fetch("/jobs/employer")
    .then(res => res.json())
    .then(jobs => {
      // Store all jobs globally for sorting
      allEmployerJobs = jobs;
      
      // Display jobs with current sort order
      sortEmployerJobs();
    })
    .catch(err => {
      console.error("Error loading jobs:", err);
      container.innerHTML = "<p>Error loading jobs. Please try again later.</p>";
    });
}

// Function to sort and display employer jobs
function sortEmployerJobs() {
  const sortOrder = document.getElementById("jobs-sort").value;
  const container = document.getElementById("employer-jobs-container");
  
  if (!container || !allEmployerJobs) return;
  
  container.innerHTML = "";
  
  if (!allEmployerJobs || allEmployerJobs.length === 0) {
    container.innerHTML = "<p>No jobs posted yet.</p>";
    return;
  }
  
  // Sort the jobs based on selected criteria
  const sortedJobs = sortJobs(allEmployerJobs, sortOrder);
  
  // Display each job
  sortedJobs.forEach(job => {
    // Create status badge for open/closed status
    const statusBadge = job.is_open ? 
      '<span class="status-badge open">OPEN</span>' : 
      '<span class="status-badge closed">CLOSED</span>';
    
    // Format deadline for display
    const deadlineText = job.deadline ? 
      `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
      '<p><strong>Application Deadline:</strong> No deadline</p>';
      
    // Format salary range for display
    const salaryText = job.salary_range ? 
      `<p><strong>Salary Range:</strong> ${job.salary_range}</p>` : 
      '<p><strong>Salary Range:</strong> Not specified</p>';
      
    const jobCard = document.createElement("div");
    jobCard.className = "job-listing-card";
    jobCard.innerHTML = `
      <h3>${job.title} ${statusBadge}</h3>
      <p><strong>Category:</strong> ${job.category}</p>
      <p><strong>Job Type:</strong> ${job.job_type}</p>
      <p><strong>Location:</strong> ${job.location}</p>
      ${salaryText}
      ${deadlineText}
      <p><strong>Description:</strong> ${job.description}</p>
      <button class="modify-btn" data-id="${job.id}">Modify</button>
    `;
    container.appendChild(jobCard);
    
    // Add event listener to the Modify button
    const modifyBtn = jobCard.querySelector(".modify-btn");
    modifyBtn.addEventListener("click", () => openEditModal(job));
  });
}

// Generic function to sort jobs
function sortJobs(jobs, sortOrder) {
  const sortedJobs = [...jobs];
  
  switch (sortOrder) {
    case 'date-desc': // Newest first
      return sortedJobs.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
    
    case 'date-asc': // Oldest first
      return sortedJobs.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    
    case 'title-asc': // A-Z
      return sortedJobs.sort((a, b) => a.title.localeCompare(b.title));
    
    case 'title-desc': // Z-A
      return sortedJobs.sort((a, b) => b.title.localeCompare(a.title));
    
    case 'status': // Open first
      return sortedJobs.sort((a, b) => (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0));
    
    case 'status-closed': // Closed first
      return sortedJobs.sort((a, b) => (a.is_open ? 1 : 0) - (b.is_open ? 1 : 0));
    
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

// Function to open the edit modal with job data
function openEditModal(job) {
  // Fill the modal fields with the job data
  document.getElementById("edit-job-id").value = job.id;
  document.getElementById("edit-title").value = job.title;
  document.getElementById("edit-description").value = job.description;
  document.getElementById("edit-category").value = job.category;
  document.getElementById("edit-job-type").value = job.job_type;
  document.getElementById("edit-location").value = job.location;
  document.getElementById("edit-salary-range").value = job.salary_range || "";
  
  // Set deadline if available
  if (job.deadline) {
    document.getElementById("edit-deadline").value = job.deadline;
  } else {
    document.getElementById("edit-deadline").value = "";
  }

  // Show the modal
  document.getElementById("edit-modal-backdrop").style.display = "flex";
}

// Function to close the edit modal
function closeEditModal() {
  document.getElementById("edit-modal-backdrop").style.display = "none";
}

// Function to save job edits
function saveJobEdits() {
  const jobId = document.getElementById("edit-job-id").value;
  const title = document.getElementById("edit-title").value.trim();
  const description = document.getElementById("edit-description").value.trim();
  const category = document.getElementById("edit-category").value;
  const jobType = document.getElementById("edit-job-type").value;
  const location = document.getElementById("edit-location").value.trim();
  const deadline = document.getElementById("edit-deadline").value.trim();
  const salaryRange = document.getElementById("edit-salary-range").value.trim();

  if (!title || !description || !category || !jobType || !location || !salaryRange || !deadline) {
    alert("Please fill all required fields.");
    return;
  }

  const payload = {
    title: title,
    description: description,
    category: category,
    job_type: jobType,
    location: location,
    salary_range: salaryRange,
    deadline: deadline  // Always include deadline in the payload
  };

  fetch(`/jobs/${jobId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.message === "Job updated successfully") {
      alert("Job updated successfully!");
      closeEditModal();
      loadEmployerJobs();
    } else {
      alert("Error: " + (data.error || "Unknown error"));
    }
  })
  .catch(err => console.error("Error updating job:", err));
}

// Make the functions available globally for use in HTML
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveJobEdits = saveJobEdits;
window.sortEmployerJobs = sortEmployerJobs;
