// frontend/public/js/inbox.js

// Retrieve the user_id from localStorage; default to "0" if not set
let currentUserId = localStorage.getItem("user_id") || "0";
let currentView = 'inbox'; // Track current view: 'inbox', 'sent', or 'message'
let currentMessage = null; // Store the currently viewed message

document.addEventListener("DOMContentLoaded", () => {
  // Retrieve user_id again (in case it was updated) and log for debugging
  currentUserId = localStorage.getItem("user_id") || "0";
  console.log("currentUserId:", currentUserId);

  // If there's a Compose button, attach event listener
  const composeBtn = document.getElementById("compose-btn");
  if (composeBtn) {
    composeBtn.addEventListener("click", openCompose);
  }

  // Check if we have URL parameters (from job application)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('compose') === 'true') {
    const company = urlParams.get('company');
    const jobTitle = urlParams.get('job');
    openComposeWithJobDetails(company, jobTitle);
  }

  // Add event listener to recipient email field
  const recipientEmailField = document.getElementById('recipient-email');
  if (recipientEmailField) {
    recipientEmailField.addEventListener('blur', function() {
      const email = this.value.trim();
      if (email) {
        loadJobTitlesByEmployer(email);
      }
    });
  }

  // Add event listeners to sidebar navigation
  setupSidebarNavigation();

  // Load the inbox messages
  loadInbox();
  
  // Create message detail view container if it doesn't exist
  createMessageDetailContainer();

  // Determine if user is employer or employee based on current URL path
  const isEmployerPage = window.location.pathname.includes('employer');
  localStorage.setItem('isEmployer', isEmployerPage);
});

function setupSidebarNavigation() {
  // Add click event listener for "Inbox" link
  const inboxLink = document.querySelector('.nav-links li:nth-child(1)');
  if (inboxLink) {
    inboxLink.addEventListener('click', loadInbox);
  }

  // Add click event listener for "Sent" link
  const sentLink = document.querySelector('.nav-links li:nth-child(3)');
  if (sentLink) {
    sentLink.addEventListener('click', loadSentMessages);
  }
}

function createMessageDetailContainer() {
  // Check if container already exists
  if (document.getElementById("message-detail")) return;
  
  // Create container for message details (initially hidden)
  const messageContainer = document.createElement("div");
  messageContainer.id = "message-detail";
  messageContainer.classList.add("message-detail", "hidden");
  
  const mainContent = document.querySelector(".main-content");
  if (mainContent) {
    mainContent.appendChild(messageContainer);
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("sidebar-collapsed");
}

function openCompose() {
  const modal = document.getElementById("compose-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }

  // Clear previous form values
  document.getElementById('recipient-email').value = '';
  document.getElementById('subject-dropdown').selectedIndex = 0;
  document.getElementById('message-body').value = '';

  // Clear job titles - we'll load them when an employer email is entered
  clearJobTitles();
}

function closeCompose() {
  const modal = document.getElementById("compose-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

// Function to clear job titles dropdown except the default option
function clearJobTitles() {
  const dropdown = document.getElementById('subject-dropdown');
  if (dropdown) {
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }
  }
}

// Function to fetch job titles for a specific employer
function loadJobTitlesByEmployer(employerEmail) {
  if (!employerEmail) return;
  
  fetch(`/jobs/titles/employer/${encodeURIComponent(employerEmail)}`)
    .then(response => response.json())
    .then(jobs => {
      const dropdown = document.getElementById('subject-dropdown');
      
      // Clear existing options except the default one
      clearJobTitles();
      
      if (jobs.length === 0) {
        // Add a note if no jobs found for this employer
        const option = document.createElement('option');
        option.value = "";
        option.text = "No jobs found for this employer";
        option.disabled = true;
        dropdown.appendChild(option);
        return;
      }
      
      // Add job titles as options
      jobs.forEach(job => {
        const option = document.createElement('option');
        option.value = `Application for: ${job.title}`;
        option.text = job.title;
        option.dataset.jobId = job.id;
        option.dataset.companyName = job.company_name;
        dropdown.appendChild(option);
      });
    })
    .catch(error => console.error('Error loading job titles:', error));
}

// Replace the old loadJobTitles function with the employer-specific one
function loadJobTitles() {
  // This is now a no-op - we'll load job titles when employer email is entered
  // The old loadJobTitles functionality is replaced by loadJobTitlesByEmployer
}

// Function to open compose with job details pre-filled
function openComposeWithJobDetails(company, jobTitle) {
  openCompose();
  
  // Set the company email and trigger job title loading
  const emailField = document.getElementById('recipient-email');
  emailField.value = `${company.toLowerCase().replace(/\s+/g, '')}@example.com`;
  
  // Load job titles for this company
  loadJobTitlesByEmployer(emailField.value);
  
  // Wait for job titles to load, then select the matching one
  setTimeout(() => {
    const dropdown = document.getElementById('subject-dropdown');
    for (let i = 0; i < dropdown.options.length; i++) {
      if (dropdown.options[i].text === jobTitle) {
        dropdown.selectedIndex = i;
        break;
      }
    }
  }, 500); // Give time for job titles to load
}

function sendMessage() {
  // Check that currentUserId is set (should be a valid nonzero value)
  if (!currentUserId || currentUserId === "0") {
    alert("User is not logged in.");
    return;
  }

  const recipientEmail = document.getElementById("recipient-email").value.trim();
  const subjectDropdown = document.getElementById('subject-dropdown');
  const subject = subjectDropdown.value.trim();
  const body = document.getElementById("message-body").value.trim();

  if (!recipientEmail || !subject || !body) {
    alert("Please fill all fields.");
    return;
  }

  // Get selected job data
  let jobId = null;
  let companyName = null;
  if (subjectDropdown.selectedIndex > 0) {
    const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
    jobId = selectedOption.dataset.jobId;
    companyName = selectedOption.dataset.companyName;
  }

  const payload = {
    sender_id: currentUserId,
    recipient_email: recipientEmail,
    subject: subject,
    body: body,
    job_id: jobId,
    company_name: companyName
  };

  fetch("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.message === "Message sent successfully") {
        alert("Message sent!");
        closeCompose();
        // Optionally, clear the form fields:
        document.getElementById("recipient-email").value = "";
        document.getElementById("subject-dropdown").value = "";
        document.getElementById("message-body").value = "";
        // Optionally reload the inbox
        loadInbox();
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(err => {
      console.error("Error:", err);
      alert("An error occurred while sending the message.");
    });
}

function loadInbox() {
  // Ensure a valid currentUserId is set
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load inbox.");
    return;
  }

  currentView = 'inbox';
  
  // Hide message detail view if visible
  hideMessageDetail();
  
  // Show inbox message list
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
  }

  fetch(`/messages/inbox/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data, 'inbox');
    })
    .catch(err => {
      console.error("Error loading inbox:", err);
      alert("An error occurred while loading your inbox.");
    });
}

function loadSentMessages() {
  // Ensure a valid currentUserId is set
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load sent messages.");
    return;
  }

  currentView = 'sent';
  
  // Hide message detail view if visible
  hideMessageDetail();
  
  // Show inbox message list
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
  }

  fetch(`/messages/sent/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data, 'sent');
    })
    .catch(err => {
      console.error("Error loading sent messages:", err);
      alert("An error occurred while loading your sent messages.");
    });
}

function renderInbox(messages, view = 'inbox') {
  const container = document.getElementById("inbox-messages");
  if (!container) return;
  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = `<p style='padding:20px;'>No ${view} messages found.</p>`;
    return;
  }

  // Add a header to show which messages are displayed
  const header = document.createElement("div");
  header.classList.add("inbox-header");
  header.textContent = view === 'inbox' ? "Inbox" : "Sent Messages";
  container.appendChild(header);

  messages.forEach(msg => {
    const item = document.createElement("div");
    item.classList.add("email-item");
    
    // Get status (default to 'Pending' if not present)
    const status = msg.status || 'Pending';
    const statusBadge = `<span class="status-badge-small status-${status.toLowerCase().replace(' ', '-')}">${status}</span>`;
    
    // Display different info based on view (inbox vs sent)
    if (view === 'inbox') {
      item.innerHTML = `
        <div class="sender">${msg.sender_email}</div>
        <div class="subject">${msg.subject} ${statusBadge}</div>
        <div class="time">${msg.created_at}</div>
      `;
    } else {
      item.innerHTML = `
        <div class="recipient">To: ${msg.recipient_email}</div>
        <div class="subject">${msg.subject} ${statusBadge}</div>
        <div class="time">${msg.created_at}</div>
      `;
    }
    
    // Add click event to view message details
    item.addEventListener("click", () => viewMessage(msg, view));
    
    container.appendChild(item);
  });
}

function viewMessage(message, source = 'inbox') {
  currentView = 'message';
  currentMessage = message;
  
  // Hide inbox messages list
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.add("hidden");
  }
  
  // Show and populate message detail view
  const messageDetail = document.getElementById("message-detail");
  if (!messageDetail) return;
  
  messageDetail.classList.remove("hidden");
  
  // Determine if this is "From" or "To" depending on inbox vs. sent view
  const headerType = source === 'inbox' ? 'From' : 'To';
  const contactEmail = source === 'inbox' ? message.sender_email : message.recipient_email;
  
  // Get status (if not present, default to 'Pending')
  const status = message.status || 'Pending';
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  
  // Create status display based on user role
  let statusHtml = '';
  if (isEmployer && source === 'inbox') {
    // For employers viewing received messages: editable status
    statusHtml = `
      <div class="status-container">
        <span class="status-label">Status:</span>
        <span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>
        <select class="status-select" id="status-select" data-message-id="${message.id}">
          <option value="Pending" ${status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Under Review" ${status === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Accepted" ${status === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>
    `;
  } else {
    // For employees or sent messages: read-only status
    statusHtml = `
      <div class="status-container">
        <span class="status-label">Status:</span>
        <span class="status-badge status-${status.toLowerCase().replace(' ', '-')}">${status}</span>
      </div>
    `;
  }
  
  messageDetail.innerHTML = `
    <div class="message-header">
      <button id="back-to-inbox" class="back-btn">← Back</button>
      <h2>${message.subject}</h2>
      <div class="message-info">
        <div><strong>${headerType}:</strong> ${contactEmail}</div>
        <div><strong>Date:</strong> ${message.created_at}</div>
        ${statusHtml}
      </div>
    </div>
    <div class="message-body">
      ${message.body}
    </div>
  `;
  
  // Add event listener to back button
  const backButton = document.getElementById("back-to-inbox");
  if (backButton) {
    backButton.addEventListener("click", () => {
      source === 'inbox' ? loadInbox() : loadSentMessages();
    });
  }
  
  // Add event listener to status select if present
  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', updateMessageStatus);
  }
}

// Function to update message status
function updateMessageStatus(event) {
  const messageId = event.target.dataset.messageId;
  const newStatus = event.target.value;
  
  // Send status update to backend
  fetch(`/messages/${messageId}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status: newStatus })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    return response.json();
  })
  .then(data => {
    // Update the displayed status badge
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.textContent = newStatus;
      
      // Remove all status classes and add the new one
      statusBadge.className = 'status-badge';
      statusBadge.classList.add(`status-${newStatus.toLowerCase().replace(' ', '-')}`);
    }
    
    // Update the current message object
    if (currentMessage) {
      currentMessage.status = newStatus;
    }
    
    console.log('Status updated successfully');
  })
  .catch(error => {
    console.error('Error updating status:', error);
    alert('Failed to update message status');
  });
}

function hideMessageDetail() {
  const messageDetail = document.getElementById("message-detail");
  if (messageDetail) {
    messageDetail.classList.add("hidden");
  }
}
