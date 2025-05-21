document.addEventListener("DOMContentLoaded", () => {
  const postJobForm = document.getElementById("post-job-form");
  if (postJobForm) {
    postJobForm.addEventListener("submit", submitJobForm);
  }
  
  loadEmployerJobs();
});

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
    deadline: deadline  
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
      
      loadEmployerJobs();
    } else {
      alert("Error: " + (data.error || "Unknown error"));
    }
  })
  .catch(err => console.error("Error posting job:", err));
}

function loadEmployerJobs() {
  const container = document.getElementById("employer-jobs-container");
  if (!container) return;
  
  fetch("/jobs/employer")
    .then(res => res.json())
    .then(jobs => {
      allEmployerJobs = jobs;
      
      sortEmployerJobs();
    })
    .catch(err => {
      console.error("Error loading jobs:", err);
      container.innerHTML = "<p>Error loading jobs. Please try again later.</p>";
    });
}

function sortEmployerJobs() {
  const sortOrder = document.getElementById("jobs-sort").value;
  const container = document.getElementById("employer-jobs-container");
  
  if (!container || !allEmployerJobs) return;
  
  container.innerHTML = "";
  
  if (!allEmployerJobs || allEmployerJobs.length === 0) {
    container.innerHTML = "<p>No jobs posted yet.</p>";
    return;
  }
  
  const sortedJobs = sortJobs(allEmployerJobs, sortOrder);
  
  sortedJobs.forEach(job => {
    const statusBadge = job.is_open ? 
      '<span class="status-badge open">OPEN</span>' : 
      '<span class="status-badge closed">CLOSED</span>';
    
    const deadlineText = job.deadline ? 
      `<p><strong>Application Deadline:</strong> ${job.deadline}</p>` : 
      '<p><strong>Application Deadline:</strong> No deadline</p>';
      
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
    
    const modifyBtn = jobCard.querySelector(".modify-btn");
    modifyBtn.addEventListener("click", () => openEditModal(job));
  });
}

function sortJobs(jobs, sortOrder) {
  const sortedJobs = [...jobs];
  
  switch (sortOrder) {
    case 'date-desc': 
      return sortedJobs.sort((a, b) => new Date(b.deadline || 0) - new Date(a.deadline || 0));
    
    case 'date-asc': 
      return sortedJobs.sort((a, b) => new Date(a.deadline || 0) - new Date(b.deadline || 0));
    
    case 'title-asc':
      return sortedJobs.sort((a, b) => a.title.localeCompare(b.title));
    
    case 'title-desc':
      return sortedJobs.sort((a, b) => b.title.localeCompare(a.title));
    
    case 'status': 
      return sortedJobs.sort((a, b) => (b.is_open ? 1 : 0) - (a.is_open ? 1 : 0));
    
    case 'status-closed':
      return sortedJobs.sort((a, b) => (a.is_open ? 1 : 0) - (b.is_open ? 1 : 0));
    
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

function openEditModal(job) {
  document.getElementById("edit-job-id").value = job.id;
  document.getElementById("edit-title").value = job.title;
  document.getElementById("edit-description").value = job.description;
  document.getElementById("edit-category").value = job.category;
  document.getElementById("edit-job-type").value = job.job_type;
  document.getElementById("edit-location").value = job.location;
  document.getElementById("edit-salary-range").value = job.salary_range || "";
  
  if (job.deadline) {
    document.getElementById("edit-deadline").value = job.deadline;
  } else {
    document.getElementById("edit-deadline").value = "";
  }

  document.getElementById("edit-modal-backdrop").style.display = "flex";
}

function closeEditModal() {
  document.getElementById("edit-modal-backdrop").style.display = "none";
}

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
    deadline: deadline  
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

window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveJobEdits = saveJobEdits;
window.sortEmployerJobs = sortEmployerJobs;
