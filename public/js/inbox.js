// frontend/public/js/inbox.js

// Retrieve the user_id from localStorage; default to "0" if not set
let currentUserId = localStorage.getItem("user_id") || "0";
let currentView = 'inbox'; // Track current view: 'inbox', 'sent', 'drafts', or 'message'
let currentMessage = null; // Store the currently viewed message
let currentReplyToId = null;  // track which message we're replying to
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
  if (urlParams.get('message_id')) {
    // Direct link to a specific message
    const messageId = urlParams.get('message_id');
    const shouldReply = urlParams.get('reply') === 'true';
    
    // Load the message and then reply if needed
    loadMessageById(messageId, shouldReply);
  } else if (urlParams.get('compose') === 'true') {
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
  
  // Always show the delete button for both new compositions and drafts
  const deleteBtn = document.getElementById("delete-draft-btn");
  if (deleteBtn) {
    deleteBtn.style.display = "block"; // Always show delete button
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

// Handle file selection
document.addEventListener('DOMContentLoaded', function() {
  const attachmentInput = document.getElementById('attachment-input');
  const selectedFile = document.getElementById('selected-file');
  const fileName = document.getElementById('file-name');
  const removeFileBtn = document.getElementById('remove-file');

  if (attachmentInput) {
    attachmentInput.addEventListener('change', function() {
      if (this.files.length > 0) {
        const file = this.files[0];
        
        // Check if file is PDF
        if (!file.name.toLowerCase().endswith('.pdf')) {
          showToast('Only PDF files are allowed');
          this.value = '';
          return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
          showToast('File size must be less than 5MB');
          this.value = '';
          return;
        }
        
        fileName.textContent = file.name;
        selectedFile.classList.remove('hidden');
      } else {
        selectedFile.classList.add('hidden');
      }
    });
  }

  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function() {
      attachmentInput.value = '';
      selectedFile.classList.add('hidden');
    });
  }
});

// Fix the sendMessage function to immediately hide the compose modal on send
function sendMessage() {
  const currentUserId = localStorage.getItem('user_id');
  if (!currentUserId) {
    alert('Please log in to send messages.');
    return;
  }
  
  const recipientEmail = document.getElementById('recipient-email').value;
  
  // Get subject based on which compose modal we're using
  let subject;
  const subjectInput = document.getElementById('subject-input');
  const subjectDropdown = document.getElementById('subject-dropdown');
  
  if (subjectInput && subjectInput.value) {
    subject = subjectInput.value;
  } else if (subjectDropdown && subjectDropdown.selectedIndex > 0) {
    const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
    subject = `Application for: ${selectedOption.text}`;
  } else {
    showToast('Please enter a subject');
    return;
  }
  
  const messageBody = document.getElementById('message-body').value;
  
  if (!recipientEmail || !messageBody) {
    showToast('Please fill in all required fields');
    return;
  }

  // Hide compose modal immediately upon clicking Send
  const modal = document.getElementById("compose-modal");
  if (modal) modal.classList.add("hidden");

  // Handle file attachment
  const attachmentInput = document.getElementById('attachment-input');
  const hasAttachment = attachmentInput && attachmentInput.files && attachmentInput.files.length > 0;
  
  // Create FormData object for multipart form data
  const formData = new FormData();
  formData.append('sender_id', currentUserId);
  formData.append('recipient_email', recipientEmail);
  formData.append('subject', subject);
  formData.append('body', messageBody);
  
  // Store current draft ID before hiding the modal
  const draftId = document.getElementById('compose-modal').dataset.draftId;
  
  // Add draft ID if editing an existing draft
  if (draftId) {
    formData.append('draft_id', draftId);
  }
  
  // Add parent message ID if replying to a message
  const parentMessageId = document.getElementById('compose-modal').dataset.parentId;
  if (parentMessageId) {
    formData.append('parent_message_id', parentMessageId);
  }
  
  // Add attachment file if present
  if (hasAttachment) {
    const file = attachmentInput.files[0];
    console.log(`Attaching file: ${file.name}, size: ${file.size}, type: ${file.type}`);
    formData.append('attachment', file);
  }
  
  // Show sending state
  const sendBtn = document.querySelector('.send-btn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  
  // Send the message using fetch
  fetch('/messages/send', {
    method: 'POST',
    body: formData // Browser sets the correct multipart/form-data content type with boundary
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    showToast('Message sent successfully');
    
    // Reset file input
    if (attachmentInput) {
      attachmentInput.value = '';
      
      // Reset the selected file display if it exists
      const selectedFile = document.getElementById('selected-file');
      if (selectedFile) {
        selectedFile.classList.add('hidden');
      }
    }
    
    // Refresh the inbox
    if (window.location.pathname.includes('inbox.html')) {
      loadInbox();
    }
  })
  .catch(error => {
    console.error('Error sending message:', error);
    showToast('Failed to send message: ' + error.message);
  })
  .finally(() => {
    // Reset button state (though modal is already hidden)
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  });
}

// Fix function to display message details with attachments
function displayMessageDetails(message) {
  const mainContent = document.querySelector('.main-content');
  mainContent.innerHTML = '';
  
  const messageDetail = document.createElement('div');
  messageDetail.className = 'message-detail';
  
  // Format the created date
  const createdDate = new Date(message.created_at);
  const formattedDate = createdDate.toLocaleString();
  
  // Build the HTML for the message header
  let detailHTML = `
    <div class="message-header">
      <button class="back-btn" onclick="loadInbox()">Back to Inbox</button>
      <button class="reply-btn" onclick="replyToMessage(${message.id}, '${message.sender_email}', '${message.subject}')">
        <img src="../public/images/reply_icon.png" alt="Reply" class="reply-icon">
        Reply
      </button>
      <h2>${message.subject || 'No Subject'}</h2>
      <div class="message-info">
        <strong>From:</strong> ${message.sender_email || 'Unknown'}<br>
        <strong>To:</strong> ${message.recipient_email || 'Unknown'}<br>
        <strong>Date:</strong> ${formattedDate}
      </div>`;
      
  // Add status section if applicable
  if (message.subject && message.subject.toLowerCase().includes('application for:')) {
    detailHTML += `
      <div class="status-container">
        <span class="status-label">Application Status:</span>
        <span class="status-badge status-${(message.status || 'pending').toLowerCase().replace(' ', '-')}">${message.status || 'Pending'}</span>
        
        <!-- Only show status dropdown for employers -->
        <select id="status-select" class="status-select" onchange="updateStatus(${message.id}, this.value)" 
                ${window.currentUserRole !== 'employer' ? 'style="display:none;"' : ''}>
          <option value="Pending" ${message.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Under Review" ${message.status === 'Under Review' ? 'selected' : ''}>Under Review</option>
          <option value="Accepted" ${message.status === 'Accepted' ? 'selected' : ''}>Accepted</option>
          <option value="Rejected" ${message.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
        </select>
      </div>`;
  }
  
  detailHTML += `</div>`;
  
  // Message body section
  detailHTML += `<div class="message-body">${message.body.replace(/\n/g, '<br>')}</div>`;
  
  // Attachment section
  if (message.attachments && message.attachments.length > 0) {
    detailHTML += `
      <div class="message-attachments">
        <h4>Attachments</h4>
        <div class="attachments-list">`;
    
    message.attachments.forEach(attachment => {
      detailHTML += `
        <div class="attachment-item">
          <img src="../public/images/pdf_icon.png" alt="PDF" class="attachment-icon">
          <div class="attachment-info">
            <div class="attachment-name">${attachment.filename}</div>
            <div class="attachment-size">${formatFileSize(attachment.file_size)}</div>
          </div>
          <div class="attachment-actions">
            <button class="preview-btn" onclick="togglePreview(${index})">
              <img src="../public/images/eye_icon.png" alt="Preview" class="preview-icon">
              Preview
            </button>
            <a href="/attachments/${attachment.id}?user_id=${localStorage.getItem('user_id')}" 
               class="download-btn" download target="_blank">
              <img src="../public/images/download_icon.png" alt="Download" class="download-icon">
              Download
            </a>
          </div>
        </div>`;
    });
    
    detailHTML += `</div>`;
    
    // PDF Preview section
    message.attachments.forEach(attachment => {
      detailHTML += `
        <div class="pdf-preview">
          <h4>PDF Preview: ${attachment.filename}</h4>
          <iframe src="/attachments/${attachment.id}?user_id=${localStorage.getItem('user_id')}" 
                  class="pdf-iframe" title="PDF Preview"></iframe>
        </div>`;
    });
    
    detailHTML += `</div>`;
  }
  
  // Replies section
  detailHTML += `<div id="replies-container"></div>`;
  
  // Set the HTML and add to DOM
  messageDetail.innerHTML = detailHTML;
  mainContent.appendChild(messageDetail);
  
  // Load replies if any
  loadRepliesForMessage(message.id);
}

// Helper function for file size formatting
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Add event handlers for file input when DOM loads
document.addEventListener('DOMContentLoaded', function() {
  // Setup file input handlers
  const attachmentInput = document.getElementById('attachment-input');
  const selectedFile = document.getElementById('selected-file');
  const fileName = document.getElementById('file-name');
  const removeFileBtn = document.getElementById('remove-file');
  
  if (attachmentInput) {
    // Show selected filename when a file is chosen
    attachmentInput.addEventListener('change', function(event) {
      if (this.files && this.files.length > 0) {
        const file = this.files[0];
        
        // Validate file type
        if (!file.name.toLowerCase().endswith('.pdf')) {
          showToast('Only PDF files are allowed');
          this.value = '';
          return;
        }
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          showToast('File size must be less than 5MB');
          this.value = '';
          return;
        }
        
        // Display the selected file name
        if (fileName && selectedFile) {
          fileName.textContent = file.name;
          selectedFile.classList.remove('hidden');
          console.log('File selected:', file.name, file.size + ' bytes');
        }
      } else if (selectedFile) {
        selectedFile.classList.add('hidden');
      }
    });
  }
  
  // Setup remove file button
  if (removeFileBtn) {
    removeFileBtn.addEventListener('click', function() {
      if (attachmentInput) {
        attachmentInput.value = '';
        if (selectedFile) {
          selectedFile.classList.add('hidden');
        }
      }
    });
  }
});

// Function to send a message with attachment
function sendMessage() {
  const currentUserId = localStorage.getItem('user_id');
  if (!currentUserId) {
    alert('Please log in to send messages.');
    return;
  }
  
  const recipientEmail = document.getElementById('recipient-email').value;
  
  // Get subject based on which compose modal we're using
  let subject;
  const subjectInput = document.getElementById('subject-input');
  const subjectDropdown = document.getElementById('subject-dropdown');
  
  if (subjectInput) {
    subject = subjectInput.value;
  } else if (subjectDropdown) {
    const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
    subject = selectedOption.value ? `Application for: ${selectedOption.text}` : '';
  }
  
  const messageBody = document.getElementById('message-body').value;
  const attachmentInput = document.getElementById('attachment-input');
  
  if (!recipientEmail || !subject || !messageBody) {
    showToast('Please fill in all required fields');
    return;
  }
  
  // Hide compose modal immediately upon clicking Send
  const modal = document.getElementById("compose-modal");
  if (modal) modal.classList.add("hidden");
  
  // Create FormData object for file upload - this is crucial for file upload
  const formData = new FormData();
  formData.append('sender_id', currentUserId);
  formData.append('recipient_email', recipientEmail);
  formData.append('subject', subject);
  formData.append('body', messageBody);
  
  // Handle draft ID if present
  const draftId = document.getElementById('compose-modal').dataset.draftId;
  if (draftId) {
    formData.append('draft_id', draftId);
  }
  
  // Handle parent message ID if replying
  const parentMessageId = document.getElementById('compose-modal').dataset.parentId;
  if (parentMessageId) {
    formData.append('parent_message_id', parentMessageId);
  }
  
  // Add attachment if present
  if (attachmentInput && attachmentInput.files && attachmentInput.files.length > 0) {
    const file = attachmentInput.files[0];
    console.log(`Attaching file: ${file.name} (${file.size} bytes) of type ${file.type}`);
    formData.append('attachment', file);
  }
  
  // Show loading state
  const sendBtn = document.querySelector('.send-btn');
  sendBtn.disabled = true;
  sendBtn.textContent = 'Sending...';
  
  // Send message with FormData (important for file upload)
  fetch('/messages/send', {
    method: 'POST',
    body: formData // Do NOT set Content-Type header here
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return response.json();
  })
  .then(data => {
    console.log('Message sent successfully:', data);
    showToast('Message sent successfully');
    
    // Reset file input
    if (attachmentInput) {
      attachmentInput.value = '';
      const selectedFile = document.getElementById('selected-file');
      if (selectedFile) {
        selectedFile.classList.add('hidden');
      }
    }
    
    // Refresh the inbox
    if (window.location.pathname.includes('inbox.html')) {
      loadInbox();
    }
  })
  .catch(error => {
    console.error('Error sending message:', error);
    showToast('Failed to send message: ' + error.message);
  })
  .finally(() => {
    // Reset button state
    sendBtn.disabled = false;
    sendBtn.textContent = 'Send';
  });
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

function replyToMessage(message) {
  currentReplyToId = message.id;
  openCompose(true);
  
  // prefill
  const recipientEmailField = document.getElementById('recipient-email');
  recipientEmailField.value = message.sender_email;
  
  // Check if user is employer or employee
  const isEmployer = localStorage.getItem('isEmployer') === 'true';
  
  // Disable recipient field for both employee and employer
  recipientEmailField.disabled = true;
  recipientEmailField.style.opacity = "0.7";
  recipientEmailField.style.cursor = "not-allowed";
  
  if (!isEmployer) {
    // Employee replying to employer
    // Handle subject field for employee
    const subjectDropdown = document.getElementById('subject-dropdown');
    if (subjectDropdown) {
      subjectDropdown.disabled = true;
      subjectDropdown.style.opacity = "0.7";
      subjectDropdown.style.cursor = "not-allowed";
      
      // If it's a reply, select or create the "Re:" option
      const reSubject = `Re: ${message.subject}`;
      
      // Try to find an existing option with the Re: prefix
      let found = false;
      for (let i = 0; i < subjectDropdown.options.length; i++) {
        if (subjectDropdown.options[i].text === reSubject) {
          subjectDropdown.selectedIndex = i;
          found = true;
          break;
        }
      }
      
      // If not found, add a new option
      if (!found) {
        const option = document.createElement('option');
        option.value = reSubject;
        option.text = reSubject;
        subjectDropdown.appendChild(option);
        subjectDropdown.selectedIndex = subjectDropdown.options.length - 1;
      }
    }
  } else {
    // Employer replying to employee
    // Handle subject field for employer
    const subjectInput = document.getElementById('subject-input');
    if (subjectInput) {
      subjectInput.value = `Re: ${message.subject}`;
      subjectInput.disabled = true;
      subjectInput.style.opacity = "0.7";
      subjectInput.style.cursor = "not-allowed";
    }
  }
  
  // Prefill message body with quoted text
  const bodyField = document.getElementById('message-body');
  if (bodyField) {
    bodyField.value = `\n\nOn ${message.created_at}, ${message.sender_email} wrote:\n${message.body}\n`;
    // Focus on the message body after everything is set up
    bodyField.focus();
  }
}

function fetchReplies(messageId) {
  const messageBody = document.querySelector('#message-detail .message-body');
  const threadContainer = document.createElement('div');
  threadContainer.classList.add('thread');
  // insert thread container immediately under the original message
  messageBody.insertAdjacentElement('afterend', threadContainer);

  fetch(`/messages/replies/${messageId}`)
    .then(res => res.json())
    .then(data => {
      data.forEach(reply => {
        const item = document.createElement('div');
        item.classList.add('reply-item');
        item.innerHTML = `
          <div class="reply-header">${reply.sender_email} - ${reply.created_at}</div>
          <div class="reply-body">${reply.body}</div>
        `;
        threadContainer.appendChild(item);
      });
    })
    .catch(err => console.error('Error loading replies:', err));
}

function deleteDraft() {
  if (currentDraftId) {
    // For existing drafts: Delete from the server
    if (!confirm("Are you sure you want to delete this draft?")) {
      return;  // User canceled the deletion
    }
    
    fetch(`/messages/draft/${currentDraftId}`, {
      method: 'DELETE'
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(data => {
      showToast("Draft deleted");
      
      // Reset the draft ID and close the compose modal
      currentDraftId = null;
      const modal = document.getElementById("compose-modal");
      if (modal) modal.classList.add("hidden");
      
      // If we're currently viewing drafts, refresh the drafts list
      if (currentView === 'drafts') {
        loadDraftMessages();
      }
    })
    .catch(err => {
      console.error("Error deleting draft:", err);
      showToast(`An error occurred while deleting the draft: ${err.message}`);
    });
  } else {
    // For new compositions: Just discard the message without saving to drafts
    if (confirm("Discard this message?")) {
      const modal = document.getElementById("compose-modal");
      if (modal) modal.classList.add("hidden");
    }
  }
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
  
  // Update the URL with message ID without refreshing the page
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('message_id', message.id);
  window.history.pushState({}, '', newUrl);
  
  // Before displaying the message details, fetch the complete message data including attachments
  fetch(`/messages/${message.id}?user_id=${currentUserId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(completeMessage => {
      // Now display the message with full data including attachments
      displayFullMessageDetails(completeMessage, source);
    })
    .catch(err => {
      console.error("Error fetching complete message data:", err);
      // Fall back to displaying with limited data
      displayFullMessageDetails(message, source);
    });
    
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.add("hidden");
  }
}

function displayFullMessageDetails(message, source = 'inbox') {
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
  
  // Build basic message details
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
      ${message.body.replace(/\n/g, '<br>')}
    </div>
  `;

  // Add attachment section if there are attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachmentsDiv = document.createElement('div');
    attachmentsDiv.className = 'message-attachments';
    attachmentsDiv.innerHTML = '<h4>Attachments</h4>';
    
    const attachmentsList = document.createElement('div');
    attachmentsList.className = 'attachments-list';
    
    message.attachments.forEach((attachment, index) => {
      const attachmentItem = document.createElement('div');
      attachmentItem.className = 'attachment-item';
      
      attachmentItem.innerHTML = `
        <img src="../public/images/pdf_icon.png" alt="PDF" class="attachment-icon">
        <div class="attachment-info">
          <div class="attachment-name">${attachment.filename}</div>
          <div class="attachment-size">${formatFileSize(attachment.file_size)}</div>
        </div>
        <div class="attachment-actions">
          <button class="preview-btn" onclick="togglePreview(${index})">
            <img src="../public/images/eye_icon.png" alt="Preview" class="preview-icon">
            Preview
          </button>
          <a href="/attachments/${attachment.id}?user_id=${localStorage.getItem('user_id')}" 
             class="download-btn" download target="_blank">
            <img src="../public/images/download_icon.png" alt="Download" class="download-icon">
            Download
          </a>
        </div>
      `;
      
      attachmentsList.appendChild(attachmentItem);
      
      // Create hidden PDF preview section for this attachment
      const previewDiv = document.createElement('div');
      previewDiv.className = 'pdf-preview hidden';
      previewDiv.id = `pdf-preview-${index}`;
      previewDiv.innerHTML = `
        <iframe src="/attachments/${attachment.id}?user_id=${localStorage.getItem('user_id')}" 
                class="pdf-iframe" title="PDF Preview"></iframe>
      `;
      attachmentsList.appendChild(previewDiv);
    });
    
    attachmentsDiv.appendChild(attachmentsList);
    messageDetail.appendChild(attachmentsDiv);
  }
  
  // Add reply button
  const replyBtn = document.createElement('button');
  replyBtn.id = 'reply-btn';
  replyBtn.classList.add('reply-btn');
  replyBtn.innerHTML = `
    <img src="../public/images/reply_icon.png" alt="Reply" class="reply-icon">
    Reply
  `;
  document.querySelector('.message-header').appendChild(replyBtn);
  replyBtn.addEventListener('click', () => replyToMessage(message));

  // Load replies
  fetchReplies(message.id);

  // Set up back button
  const backButton = document.getElementById("back-to-inbox");
  if (backButton) {
    backButton.addEventListener("click", () => {
      // Clear message_id from URL
      const baseUrl = window.location.pathname;
      window.history.pushState({}, '', baseUrl);
      
      // Return to appropriate view
      if (source === 'inbox') {
        loadInbox();
      } else if (source === 'sent') {
        loadSentMessages();
      } else {
        loadInbox();
      }
    });
  }
  
  // Set up status select
  const statusSelect = document.getElementById('status-select');
  if (statusSelect) {
    statusSelect.addEventListener('change', updateMessageStatus);
  }
}

// Add this new function to toggle preview visibility
function togglePreview(index) {
  const previewDiv = document.getElementById(`pdf-preview-${index}`);
  if (previewDiv) {
    previewDiv.classList.toggle('hidden');
    
    // Update button text based on visibility
    const button = document.querySelectorAll('.preview-btn')[index];
    if (button) {
      button.textContent = previewDiv.classList.contains('hidden') ? 'Preview' : 'Hide Preview';
    }
  }
}

function loadMessageById(messageId, shouldReply = false) {
  if (!currentUserId || currentUserId === "0") {
    console.error("User not logged in: cannot load message.");
    return;
  }

  // Show loading state
  hideMessageDetail();
  const inboxMessages = document.getElementById("inbox-messages");
  if (inboxMessages) {
    inboxMessages.classList.remove("hidden");
    inboxMessages.innerHTML = '<p style="padding:20px; text-align:center;">Loading message...</p>';
  }

  fetch(`/messages/${messageId}?user_id=${currentUserId}`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }
      return res.json();
    })
    .then(message => {
      console.log("Full message data:", message); // Add logging to inspect message
      
      // Determine if this is from inbox or sent based on sender_id
      const source = (message.sender_id == currentUserId) ? 'sent' : 'inbox';
      
      // Hide the inbox list
      if (inboxMessages) {
        inboxMessages.classList.add("hidden");
      }
      
      // Display the message with attachments
      displayFullMessageDetails(message, source);
      
      // If shouldReply is true, automatically open reply compose window
      if (shouldReply) {
        // Small delay to ensure viewMessage has completed rendering
        setTimeout(() => {
          const replyBtn = document.getElementById('reply-btn');
          if (replyBtn) {
            replyBtn.click();
          }
        }, 300);
      }
    })
    .catch(err => {
      console.error("Error loading message:", err);
      if (inboxMessages) {
        inboxMessages.innerHTML = `<p style="padding:20px; color:#f44336; text-align:center;">
          Failed to load message. The message may not exist or you may not have permission to view it.
        </p>`;
        
        // Also clear URL parameters on error
        window.history.pushState({}, '', window.location.pathname);
      }
    });
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

// Update the closeCompose function to automatically save drafts
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
    if (subjectDropdown && subjectDropdown.selectedIndex > 0) {
      const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
      subject = selectedOption.value.trim();
    }
  }
  
  const body = document.getElementById('message-body').value.trim();
  
  // If there is any content, save (or update) the draft before hiding the modal
  if (recipientEmail || subject || body) {
    saveDraft();
    showToast("Message saved as draft");
  }
  
  // Close the modal after saving (or immediately if empty)
  modal.classList.add("hidden");
  
  // If we're currently viewing drafts, refresh the drafts list
  if (currentView === 'drafts') {
    loadDraftMessages();
  }
}

// Fix the viewDraft function to properly load drafts for editing
function viewDraft(draft) {
  // Set the currentDraftId so we know we're editing an existing draft
  currentDraftId = draft.id;
  
  // Open the compose modal
  const modal = document.getElementById("compose-modal");
  if (modal) {
    // Store the draft ID in the modal's dataset for reference
    modal.dataset.draftId = draft.id;
    modal.classList.remove("hidden");
  }
  
  // Fill in recipient field
  const recipientEmailField = document.getElementById('recipient-email');
  if (recipientEmailField) {
    recipientEmailField.value = draft.recipient_email || "";
  }
  
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
      // First load job titles for this employer's email if available
      if (draft.recipient_email) {
        loadJobTitlesByEmployer(draft.recipient_email);
        
        // After a short delay to allow titles to load
        setTimeout(() => {
          let found = false;
          
          // Try to find a matching job title option
          for (let i = 0; i < subjectDropdown.options.length; i++) {
            if (subjectDropdown.options[i].value === draft.subject) {
              subjectDropdown.selectedIndex = i;
              found = true;
              break;
            }
          }
          
          // If no match found, add it as a custom option
          if (!found && draft.subject) {
            const option = document.createElement('option');
            option.value = draft.subject;
            option.text = draft.subject.replace('Application for: ', '');
            subjectDropdown.appendChild(option);
            subjectDropdown.selectedIndex = subjectDropdown.options.length - 1;
          }
        }, 300);
      }
    }
  }
  
  // Set message body
  const messageBody = document.getElementById('message-body');
  if (messageBody) {
    messageBody.value = draft.body || "";
  }
  
  console.log(`Loaded draft #${draft.id} for editing`);
}

// Update saveDraft function to return a promise and properly handle the draft ID
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
    if (subjectDropdown && subjectDropdown.selectedIndex > 0) {
      const selectedOption = subjectDropdown.options[subjectDropdown.selectedIndex];
      subject = selectedOption.value;
      jobId = selectedOption.dataset.jobId;
      companyName = selectedOption.dataset.companyName;
    }
  }
  
  const body = document.getElementById("message-body").value.trim();
  
  // Get draft ID from modal dataset if available
  const modal = document.getElementById("compose-modal");
  const draftId = modal.dataset.draftId || currentDraftId;
  
  const payload = {
    sender_id: currentUserId,
    recipient_email: recipientEmail,
    subject: subject,
    body: body,
    job_id: jobId,
    company_name: companyName,
    draft_id: draftId  // If updating an existing draft
  };

  // Send the draft to the server
  return fetch("/messages/draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(data => {
    if (data.draft_id) {
      // Update the currentDraftId and modal dataset with the new draft ID
      currentDraftId = data.draft_id;
      modal.dataset.draftId = data.draft_id;
      console.log("Draft saved/updated with id:", data.draft_id);
    }
    return data;
  })
  .catch(err => {
    console.error("Error saving draft:", err);
    throw err;
  });
}

// Ensure event listeners for close buttons are properly set up
document.addEventListener('DOMContentLoaded', function() {
  // ...existing code...
  
  // Update close buttons in both HTML files to use our closeCompose function
  const closeBtns = document.querySelectorAll('.compose-header .close-btn');
  closeBtns.forEach(btn => {
    // Remove inline onclick if present
    btn.removeAttribute('onclick');
    // Add event listener
    btn.addEventListener('click', closeCompose);
  });
  
  // ...existing code...
});

