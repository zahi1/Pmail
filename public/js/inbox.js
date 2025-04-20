// frontend/public/js/inbox.js

// Retrieve the user_id from localStorage; default to "0" if not set
let currentUserId = localStorage.getItem("user_id") || "0";
let currentView = 'inbox'; // Track current view: 'inbox', 'sent', 'drafts', or 'message'
let currentMessage = null; // Store the currently viewed message
let currentDraftId = null; // Store the draft ID (if editing a draft)

document.addEventListener("DOMContentLoaded", () => {
  // Retrieve user_id again (in case it was updated) and log for debugging
  currentUserId = localStorage.getItem("user_id") || "0";
  console.log("currentUserId:", currentUserId);

  // If there's a Compose button, attach event listener that always starts a new email
  const composeBtn = document.getElementById("compose-btn");
  if (composeBtn) {
    composeBtn.addEventListener("click", () => openCompose(true));
  }

  // Check if we have URL parameters (from job application)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('compose') === 'true') {
    const employer = urlParams.get('employer');
    const jobTitle = urlParams.get('job');
    
    if (employer) {
      // Pre-fill the compose form with employer email and job title
      openComposeWithJobDetails(employer, jobTitle);
    }
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

  // Load the inbox messages by default
  loadInbox();
  
  // Create message detail view container if it doesn't exist
  createMessageDetailContainer();

  // Determine if user is employer or employee based on current URL path
  const isEmployerPage = window.location.pathname.includes('employer');
  localStorage.setItem('isEmployer', isEmployerPage);
});

// Toast notification helper for in‑app messages
function showToast(message) {
  let toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.innerText = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add("visible");
  }, 100);
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 500);
  }, 3000);
}

function setupSidebarNavigation() {
  // Add click event listener for "Inbox" link (first item)
  const inboxLink = document.querySelector('.nav-links li:nth-child(1)');
  if (inboxLink) {
    inboxLink.addEventListener('click', loadInbox);
  }

  // Add click event listener for "Sent" link (second item)
  const sentLink = document.querySelector('.nav-links li:nth-child(2)');
  if (sentLink) {
    sentLink.addEventListener('click', loadSentMessages);
  }
  
  // Add click event listener for "Drafts" link (third item)
  const draftsLink = document.querySelector('.nav-links li:nth-child(3)');
  if (draftsLink) {
    draftsLink.addEventListener('click', loadDraftMessages);
  }
  
  // Add visual indicator for active section
  document.querySelectorAll('.nav-links li').forEach(item => {
    item.addEventListener('click', function() {
      // Remove active class from all items
      document.querySelectorAll('.nav-links li').forEach(li => {
        li.classList.remove('active-nav');
      });
      // Add active class to clicked item
      this.classList.add('active-nav');
    });
  });
  
  // Set inbox as active by default
  const defaultActive = document.querySelector('.nav-links li:nth-child(1)');
  if (defaultActive) {
    defaultActive.classList.add('active-nav');
  }
}

function createMessageDetailContainer() {
  if (document.getElementById("message-detail")) return;
  
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

/**
 * openCompose(isNew)
 * @param {boolean} isNew - If true, start a new email (clear fields and draft id).
 *                          If false, keep currentDraftId and loaded content (for editing).
 */
function openCompose(isNew = true) {
  const modal = document.getElementById("compose-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
  if (isNew) {
    // When composing a new email, clear any existing draft id and clear fields.
    currentDraftId = null;
    document.getElementById('recipient-email').value = '';
    
    // Handle different subject fields based on user type
    if (localStorage.getItem('isEmployer') === 'true') {
      if (document.getElementById('subject-input'))
        document.getElementById('subject-input').value = '';
    } else {
      if (document.getElementById('subject-dropdown'))
        document.getElementById('subject-dropdown').selectedIndex = 0;
    }
    
    document.getElementById('message-body').value = '';
  }
  
  // Clear job titles for employee; they will be reloaded if needed
  if (localStorage.getItem('isEmployer') !== 'true') {
    clearJobTitles();
  }
}

function closeCompose() {
  const modal = document.getElementById("compose-modal");
  if (!modal) return;
  
  // Grab the current compose field values
  const recipientEmail = document.getElementById('recipient-email').value.trim();
  
  // Check if we're in employer or employee mode
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  let subject = '';
  
  if (isEmployer) {
    const subjectInput = document.getElementById('subject-input');
    subject = subjectInput ? subjectInput.value.trim() : '';
  } else {
    const subjectDropdown = document.getElementById('subject-dropdown');
    subject = subjectDropdown ? subjectDropdown.value.trim() : '';
  }
  
  const body = document.getElementById('message-body').value.trim();
  
  // If there is any content, save (or update) the draft before hiding the modal.
  if (recipientEmail || subject || body) {
    saveDraft().then(() => {
      modal.classList.add("hidden");
      // If we're currently viewing drafts, refresh the drafts list.
      if (currentView === 'drafts') {
        loadDraftMessages();
      }
    }).catch(err => {
      console.error("Error saving draft on close:", err);
      modal.classList.add("hidden");
    });
  } else {
    modal.classList.add("hidden");
  }
}

function clearJobTitles() {
  const dropdown = document.getElementById('subject-dropdown');
  if (dropdown) {
    while (dropdown.options.length > 1) {
      dropdown.remove(1);
    }
  }
}

function loadJobTitlesByEmployer(employerEmail) {
  if (!employerEmail) return;
  
  fetch(`/jobs/titles/employer/${encodeURIComponent(employerEmail)}`)
    .then(response => response.json())
    .then(jobs => {
      const dropdown = document.getElementById('subject-dropdown');
      clearJobTitles();
      if (jobs.length === 0) {
        const option = document.createElement('option');
        option.value = "";
        option.text = "No jobs found for this employer";
        option.disabled = true;
        dropdown.appendChild(option);
        return;
      }
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

function openComposeWithJobDetails(employer, jobTitle) {
  // When opening with job details, we are composing a new email.
  openCompose(true);
  
  // Set recipient email field directly with the employer's email
  const emailField = document.getElementById('recipient-email');
  if (emailField) {
    // Use the employer email directly without modification
    emailField.value = employer;
    
    // Load job titles for this employer
    loadJobTitlesByEmployer(employer);
    
    // Wait for job titles to load, then select the matching title
    setTimeout(() => {
      const dropdown = document.getElementById('subject-dropdown');
      if (dropdown && jobTitle) {
        // Look for exact match first
        let found = false;
        for (let i = 0; i < dropdown.options.length; i++) {
          if (dropdown.options[i].text === jobTitle) {
            dropdown.selectedIndex = i;
            found = true;
            break;
          }
        }
        
        // If no exact match, add it as a custom option
        if (!found) {
          const option = document.createElement('option');
          option.value = `Application for: ${jobTitle}`;
          option.text = jobTitle;
          dropdown.appendChild(option);
          dropdown.selectedIndex = dropdown.options.length - 1;
        }
        
        // Focus on message body field so user can start typing immediately
        const messageBody = document.getElementById('message-body');
        if (messageBody) {
          messageBody.focus();
        }
      }
    }, 500);
  }
}

function sendMessage() {
  if (!currentUserId || currentUserId === "0") {
    alert("User is not logged in.");
    return;
  }

  const recipientEmail = document.getElementById("recipient-email").value.trim();
  let subject = "";
  
  // Check if this is an employer (free-text subject) or employee (dropdown subject)
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  if (isEmployer) {
    // For employer: get text input subject
    const subjectInput = document.getElementById('subject-input');
    subject = subjectInput ? subjectInput.value.trim() : "";
  } else {
    // For employee: get dropdown subject
    const subjectDropdown = document.getElementById('subject-dropdown');
    subject = subjectDropdown ? subjectDropdown.value.trim() : "";
  }
  
  const body = document.getElementById("message-body").value.trim();

  if (!recipientEmail || !subject || !body) {
    alert("Please fill all fields.");
    return;
  }

  let jobId = null;
  let companyName = null;
  
  // Only try to get job data from dropdown for employees
  if (!isEmployer && document.getElementById('subject-dropdown')) {
    const subjectDropdown = document.getElementById('subject-dropdown');
    if (subjectDropdown.selectedIndex > 0) {
      const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
      jobId = selectedOption.dataset.jobId;
      companyName = selectedOption.dataset.companyName;
    }
  }

  const payload = {
    sender_id: currentUserId,
    recipient_email: recipientEmail,
    subject: subject,
    body: body,
    job_id: jobId,
    company_name: companyName,
    draft_id: currentDraftId // If editing an existing draft, include its ID
  };

  fetch("/messages/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      if (data.message && (data.message === "Message sent successfully" || data.message === "Draft sent successfully")) {
        showToast("Message sent!");
        
        // Clear the compose form and reset currentDraftId
        currentDraftId = null;
        document.getElementById("recipient-email").value = "";
        
        // Handle different subject fields based on user type
        if (isEmployer) {
          const subjectInput = document.getElementById('subject-input');
          if (subjectInput) subjectInput.value = "";
        } else {
          const subjectDropdown = document.getElementById('subject-dropdown');
          if (subjectDropdown) subjectDropdown.selectedIndex = 0;
        }
        
        document.getElementById("message-body").value = "";
        const modal = document.getElementById("compose-modal");
        if (modal) modal.classList.add("hidden");
        loadInbox();
      } else {
        showToast("Error: " + (data.error || "Unknown error"));
      }
    })
    .catch(err => {
      console.error("Error sending message:", err);
      showToast(`An error occurred while sending the message: ${err.message}`);
    });
}

function saveDraft() {
  const recipientEmail = document.getElementById("recipient-email").value.trim();
  let subject = "";
  let jobId = null;
  let companyName = null;
  
  // Handle different subject fields based on user type
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  if (isEmployer) {
    const subjectInput = document.getElementById('subject-input');
    subject = subjectInput ? subjectInput.value.trim() : "";
  } else {
    const subjectDropdown = document.getElementById('subject-dropdown');
    subject = subjectDropdown ? subjectDropdown.value.trim() : "";
    
    // Get job data from dropdown for employees
    if (subjectDropdown && subjectDropdown.selectedIndex > 0) {
      const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
      jobId = selectedOption.dataset.jobId;
      companyName = selectedOption.dataset.companyName;
    }
  }
  
  const body = document.getElementById("message-body").value.trim();
  
  const payload = {
    sender_id: currentUserId,
    recipient_email: recipientEmail,
    subject: subject,
    body: body,
    job_id: jobId,
    company_name: companyName,
    draft_id: currentDraftId  // If updating an existing draft
  };

  // Return the promise so the caller can wait on it
  return fetch("/messages/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
    .then(res => res.json())
    .then(data => {
      if (data.draft_id) {
        currentDraftId = data.draft_id;
        console.log("Draft saved/updated with id:", data.draft_id);
      } else {
        console.log("Draft saved/updated");
      }
      showToast("Your message is saved in drafts.");
    })
    .catch(err => {
      console.error("Error saving draft:", err);
      throw err;
    });
}

function loadInbox() {
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load inbox.");
    return;
  }

  currentView = 'inbox';
  hideMessageDetail();
  
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
    inboxMessages.innerHTML = '<p style="padding:20px;">Loading messages...</p>';
  }

  fetch(`/messages/inbox/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data, 'inbox');
    })
    .catch(err => {
      console.error("Error loading inbox:", err);
      inboxMessages.innerHTML = '<p style="padding:20px; color:#f44336;">Failed to load inbox messages.</p>';
    });
}

function loadSentMessages() {
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load sent messages.");
    return;
  }

  currentView = 'sent';
  hideMessageDetail();
  
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
    inboxMessages.innerHTML = '<p style="padding:20px;">Loading messages...</p>';
  }

  fetch(`/messages/sent/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data, 'sent');
    })
    .catch(err => {
      console.error("Error loading sent messages:", err);
      inboxMessages.innerHTML = '<p style="padding:20px; color:#f44336;">Failed to load sent messages.</p>';
    });
}

function loadDraftMessages() {
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load drafts.");
    return;
  }

  currentView = 'drafts';
  hideMessageDetail();
  
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
    inboxMessages.innerHTML = '<p style="padding:20px;">Loading drafts...</p>';
  }

  fetch(`/messages/drafts/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data, 'drafts');
    })
    .catch(err => {
      console.error("Error loading drafts:", err);
      inboxMessages.innerHTML = '<p style="padding:20px; color:#f44336;">Failed to load drafts.</p>';
    });
}

/**
 * Loads spam messages for the current user
 * Displays a "No spam messages" notice if none are found
 */
function loadSpam() {
  currentView = 'spam';
  hideMessageDetail();
  
  const inboxContainer = document.getElementById('inbox-messages');
  inboxContainer.classList.remove('hidden');
  
  // Show loading state
  inboxContainer.innerHTML = '<div style="padding: 20px; text-align: center;">Loading spam messages...</div>';
  
  // Fetch spam messages
  fetch(`/messages/spam/${currentUserId}`)
    .then(response => response.json())
    .then(data => {
      if (data.messages && data.messages.length > 0) {
        // Display spam messages
        let html = `
          <div class="inbox-header">
            <span>Spam</span>
            <span class="spam-subtitle">Messages detected as spam</span>
          </div>
        `;
        
        data.messages.forEach(message => {
          html += `
            <div class="email-item" onclick="viewSpamMessage(${JSON.stringify(message).replace(/"/g, '&quot;')})">
              <div class="sender">${message.sender_name || message.sender_email}</div>
              <div class="subject">${message.subject}</div>
              <div class="time">${message.created_at}</div>
            </div>
          `;
        });
        inboxContainer.innerHTML = html;
      } else {
        // No spam messages
        inboxContainer.innerHTML = `
          <div class="inbox-header">
            <span>Spam</span>
          </div>
          <div style="padding: 40px; text-align: center; color: #bbb;">
            <img src="../public/images/spam_icon.png" alt="No Spam" style="width: 50px; margin-bottom: 15px; opacity: 0.5;">
            <p>No spam messages found.</p>
            <p style="font-size: 14px;">Messages identified as spam will appear here.</p>
          </div>
        `;
      }
    })
    .catch(error => {
      console.error('Error loading spam messages:', error);
      inboxContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: #ff6b6b;">Error loading spam messages. Please try again later.</div>';
    });
}

function viewSpamMessage(message) {
  currentView = 'message';
  currentMessage = message;
  
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.add("hidden");
  }
  
  const messageDetail = document.getElementById("message-detail");
  if (!messageDetail) return;
  
  messageDetail.classList.remove("hidden");
  
  messageDetail.innerHTML = `
    <div class="message-header">
      <button id="back-to-spam" class="back-btn">← Back to Spam</button>
      <div class="spam-warning">
        <img src="../public/images/spam_icon.png" alt="Spam Warning" class="spam-icon">
        <span>This message was detected as spam</span>
        <button id="not-spam-btn" class="not-spam-btn" data-message-id="${message.id}">Not Spam</button>
      </div>
      <h2>${message.subject}</h2>
      <div class="message-info">
        <div><strong>From:</strong> ${message.sender_name || message.sender_email}</div>
        <div><strong>Date:</strong> ${message.created_at}</div>
      </div>
    </div>
    <div class="message-body">
      ${message.body}
    </div>
  `;
  
  // Add event listeners
  document.getElementById("back-to-spam").addEventListener("click", loadSpam);
  
  const notSpamBtn = document.getElementById("not-spam-btn");
  if (notSpamBtn) {
    notSpamBtn.addEventListener("click", function() {
      moveMessageFromSpam(this.getAttribute("data-message-id"));
    });
  }
}

function moveMessageFromSpam(messageId) {
  fetch(`/messages/not-spam/${messageId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(response => response.json())
  .then(data => {
    showToast("Message moved to inbox");
    loadInbox(); // Return to inbox where the message should now appear
  })
  .catch(error => {
    console.error('Error moving message from spam:', error);
    showToast("Error moving message from spam");
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

  const header = document.createElement("div");
  header.classList.add("inbox-header");
  header.textContent = (view === 'inbox') ? "Inbox" :
                         (view === 'sent') ? "Sent Messages" :
                         (view === 'drafts') ? "Drafts" : "";
  container.appendChild(header);

  messages.forEach(msg => {
    const item = document.createElement("div");
    item.classList.add("email-item");
    
    const status = msg.status || 'Pending';
    const statusBadge = `<span class="status-badge-small status-${status.toLowerCase().replace(' ', '-')}">${status}</span>`;
    
    if (view === 'inbox') {
      item.innerHTML = `
        <div class="sender">${msg.sender_email}</div>
        <div class="subject">${msg.subject} ${statusBadge}</div>
        <div class="time">${msg.created_at}</div>
      `;
      item.addEventListener("click", () => viewMessage(msg, view));
    } else if (view === 'sent') {
      item.innerHTML = `
        <div class="recipient">To: ${msg.recipient_email}</div>
        <div class="subject">${msg.subject} ${statusBadge}</div>
        <div class="time">${msg.created_at}</div>
      `;
      item.addEventListener("click", () => viewMessage(msg, view));
    } else if (view === 'drafts') {
      item.innerHTML = `
        <div class="recipient">Draft</div>
        <div class="subject">${msg.subject} ${statusBadge}</div>
        <div class="time">${msg.created_at}</div>
      `;
      item.addEventListener("click", () => viewDraft(msg));
    }
    
    container.appendChild(item);
  });
}

function viewMessage(message, source = 'inbox') {
  currentView = 'message';
  currentMessage = message;
  
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.add("hidden");
  }
  
  const messageDetail = document.getElementById("message-detail");
  if (!messageDetail) return;
  
  messageDetail.classList.remove("hidden");
  
  const headerType = source === 'inbox' ? 'From' : 'To';
  const contactEmail = source === 'inbox' ? message.sender_email : message.recipient_email;
  
  const status = message.status || 'Pending';
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  
  let statusHtml = '';
  if (isEmployer && source === 'inbox') {
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
  
  const backButton = document.getElementById("back-to-inbox");
  if (backButton) {
    backButton.addEventListener("click", () => {
      if (source === 'inbox') {
        loadInbox();
      } else if (source === 'sent') {
        loadSentMessages();
      } else {
        loadInbox();
      }
    });
  }
  
  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', updateMessageStatus);
  }
}

function viewDraft(draft) {
  // When a draft is clicked, load it for editing and set currentDraftId so that
  // any modifications will update the same draft record.
  currentDraftId = draft.id;
  openCompose(false); // false indicates we're editing an existing draft
  document.getElementById("recipient-email").value = draft.recipient_email || "";
  
  // Handle different subject fields based on user type
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  
  if (isEmployer) {
    // For employer: set the subject in text input
    const subjectInput = document.getElementById('subject-input');
    if (subjectInput) {
      subjectInput.value = draft.subject || "";
    }
  } else {
    // For employee: handle the dropdown
    const subjectDropdown = document.getElementById('subject-dropdown');
    if (subjectDropdown) {
      let found = false;
      for (let i = 0; i < subjectDropdown.options.length; i++) {
        if (subjectDropdown.options[i].text === draft.subject) {
          subjectDropdown.selectedIndex = i;
          found = true;
          break;
        }
      }
      if (!found) {
        const option = document.createElement('option');
        option.value = draft.subject;
        option.text = draft.subject;
        subjectDropdown.appendChild(option);
        subjectDropdown.selectedIndex = subjectDropdown.options.length - 1;
      }
    }
  }
  
  document.getElementById("message-body").value = draft.body || "";
}

function updateMessageStatus(event) {
  const messageId = event.target.dataset.messageId;
  const newStatus = event.target.value;
  
  fetch(`/messages/${messageId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: newStatus })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to update status');
    }
    return response.json();
  })
  .then(data => {
    const statusBadge = document.querySelector('.status-badge');
    if (statusBadge) {
      statusBadge.textContent = newStatus;
      statusBadge.className = 'status-badge';
      statusBadge.classList.add(`status-${newStatus.toLowerCase().replace(' ', '-')}`);
    }
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
