// splash.js

document.addEventListener("DOMContentLoaded", () => {
    // Get the display name from localStorage (or use a fallback)
    const displayName = localStorage.getItem("displayName") || "User";
    const welcomeMessageElem = document.getElementById("welcome-message");
    welcomeMessageElem.textContent = `Welcome back, ${displayName}!`;
  
    // After the loading animation (3 seconds), redirect the user to the Inbox.
    setTimeout(() => {
      // Determine role from localStorage; default to employee.
      const role = localStorage.getItem("role") || "employee";
      if (role === "employer") {
        window.location.href = "employer_inbox.html";
      } else {
        window.location.href = "employee_inbox.html";
      }
    }, 3000);
  });
  