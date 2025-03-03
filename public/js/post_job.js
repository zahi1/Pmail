// frontend/public/js/post_job.js

document.addEventListener("DOMContentLoaded", () => {
  const postJobForm = document.getElementById("post-job-form");
  if (postJobForm) {
    postJobForm.addEventListener("submit", submitJobForm);
  }
  
  // Load existing jobs when the page loads
  loadEmployerJobs();
});

function submitJobForm(event) {
  event.preventDefault();

  const title = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const category = document.getElementById("category").value.trim();
  const jobType = document.getElementById("job_type").value.trim();
  const location = document.getElementById("location").value.trim();

  if (!title || !description || !category || !jobType || !location) {
    alert("Please fill all fields.");
    return;
  }

  const payload = {
    title: title,
    description: description,
    category: category,
    job_type: jobType,
    location: location
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
      container.innerHTML = "";
      
      if (!jobs || jobs.length === 0) {
        container.innerHTML = "<p>No jobs posted yet.</p>";
        return;
      }

      // Display each job
      jobs.forEach(job => {
        const jobCard = document.createElement("div");
        jobCard.className = "job-listing-card";
        jobCard.innerHTML = `
          <h3>${job.title}</h3>
          <p><strong>Category:</strong> ${job.category}</p>
          <p><strong>Job Type:</strong> ${job.job_type}</p>
          <p><strong>Location:</strong> ${job.location}</p>
          <p><strong>Description:</strong> ${job.description}</p>
          <button class="modify-btn" data-id="${job.id}">Modify</button>
        `;
        container.appendChild(jobCard);
        
        // Add event listener to the Modify button
        const modifyBtn = jobCard.querySelector(".modify-btn");
        modifyBtn.addEventListener("click", () => openEditModal(job));
      });
    })
    .catch(err => {
      console.error("Error loading jobs:", err);
      container.innerHTML = "<p>Error loading jobs. Please try again later.</p>";
    });
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

  if (!title || !description || !category || !jobType || !location) {
    alert("Please fill all fields.");
    return;
  }

  const payload = {
    title: title,
    description: description,
    category: category,
    job_type: jobType,
    location: location
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
