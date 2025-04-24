// splash.js

document.addEventListener("DOMContentLoaded", () => {
  // Get the display name from localStorage (or use a fallback)
  const displayName = localStorage.getItem("displayName") || "User";
  const welcomeMessageElem = document.getElementById("welcome-message");
  welcomeMessageElem.textContent = `Welcome back, ${displayName}!`;

  // Log the role for debugging
  console.log("User role from localStorage:", localStorage.getItem("role"));
  console.log("isAdmin flag:", localStorage.getItem("isAdmin"));
  
  // After the loading animation (3 seconds), redirect the user based on role
  setTimeout(() => {
    // Check for admin explicitly first, then determine other roles
    if (localStorage.getItem("isAdmin") === "true" || localStorage.getItem("role") === "admin") {
      console.log("Redirecting to admin dashboard");
      window.location.href = "admin_dashboard.html";
    } else if (localStorage.getItem("isEmployer") === "true" || localStorage.getItem("role") === "employer") {
      console.log("Redirecting to employer inbox");
      window.location.href = "employer_inbox.html";
    } else {
      console.log("Redirecting to employee inbox");
      window.location.href = "employee_inbox.html";
    }
  }, 3000);
});
