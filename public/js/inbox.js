// frontend/public/js/inbox.js

// Retrieve the user_id from localStorage; default to "0" if not set
let currentUserId = localStorage.getItem("user_id") || "0";

document.addEventListener("DOMContentLoaded", () => {
  // Retrieve user_id again (in case it was updated) and log for debugging
  currentUserId = localStorage.getItem("user_id") || "0";
  console.log("currentUserId:", currentUserId);

  // If there's a Compose button, attach event listener
  const composeBtn = document.getElementById("compose-btn");
  if (composeBtn) {
    composeBtn.addEventListener("click", openCompose);
  }

  // Load the inbox messages
  loadInbox();
});

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  sidebar.classList.toggle("sidebar-collapsed");
}

function openCompose() {
  const modal = document.getElementById("compose-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeCompose() {
  const modal = document.getElementById("compose-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
}

function sendMessage() {
  // Check that currentUserId is set (should be a valid nonzero value)
  if (!currentUserId || currentUserId === "0") {
    alert("User is not logged in.");
    return;
  }

  const recipientEmail = document.getElementById("recipient-email").value.trim();
  const subject = document.getElementById("subject-dropdown").value.trim();
  const body = document.getElementById("message-body").value.trim();

  if (!recipientEmail || !subject || !body) {
    alert("Please fill all fields.");
    return;
  }

  const payload = {
    sender_id: currentUserId,
    recipient_email: recipientEmail,
    subject: subject,
    body: body
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

  fetch(`/messages/inbox/${currentUserId}`)
    .then(res => res.json())
    .then(data => {
      renderInbox(data);
    })
    .catch(err => {
      console.error("Error loading inbox:", err);
      alert("An error occurred while loading your inbox.");
    });
}

function renderInbox(messages) {
  const container = document.getElementById("inbox-messages");
  if (!container) return;
  container.innerHTML = "";

  if (!messages || messages.length === 0) {
    container.innerHTML = "<p style='padding:20px;'>No messages found.</p>";
    return;
  }

  messages.forEach(msg => {
    const item = document.createElement("div");
    item.classList.add("email-item");
    // Display sender email, subject, and time
    item.innerHTML = `
      <div class="sender">${msg.sender_email}</div>
      <div class="subject">${msg.subject}</div>
      <div class="time">${msg.created_at}</div>
    `;
    // Optionally, add an event listener for viewing message details.
    container.appendChild(item);
  });
}
