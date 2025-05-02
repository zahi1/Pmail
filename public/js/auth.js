document.addEventListener("DOMContentLoaded", function () {
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "employee") {
    document.querySelectorAll('.employee-field').forEach(el=>el.style.display="block");
  }
  
  // Remove the event listener for register-btn since we handle it directly in register.html
  // const registerBtn = document.getElementById("register-btn");
  // if (registerBtn) registerBtn.addEventListener("click", register);

  // categories click
  document.querySelectorAll('#registration-categories-container .category-item')
    .forEach(item => item.addEventListener('click', function(){
      this.classList.toggle('selected');
      const sel = [...document.querySelectorAll('.category-item.selected')]
        .map(i=>i.dataset.value).join(',');
      document.getElementById('user_categories').value = sel;
    }));
});

// --------------------------------------
// 🔹 Login Function
// --------------------------------------
function login() {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) {
    alert("Please enter both email and password.");
    return;
  }

  fetch("http://127.0.0.1:5000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email, password: password })
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === "Login successful") {
        // Store the user_id and role from the backend response
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("role", data.role);
        
        // Store additional role flags for different UIs
        if (data.isAdmin) {
          localStorage.setItem("isAdmin", "true");
        } else if (data.isEmployer) {
          localStorage.setItem("isEmployer", "true");
        }
        
        // Get first name from response or email, then capitalize first letter
        let displayName = data.name || data.first_name || email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        localStorage.setItem("displayName", displayName);
        
        // Redirect to the splash screen
        window.location.href = "splash.html";
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("An error occurred during login.");
    });
}


/**
 * Display a stylish full-screen animation after successful login
 * Shows logo, welcome message, and animated loading bar before redirecting
 */
function showLoginSuccessScreen(email, redirectUrl) {
  console.log("Login success screen started");
  
  // Remove any existing success screen
  const existingScreen = document.querySelector('.login-success-screen');
  if (existingScreen) {
    document.body.removeChild(existingScreen);
  }

  // Create a new success screen
  const successScreen = document.createElement('div');
  successScreen.className = 'login-success-screen';
  
  // Extract username from email and capitalize first letter
  const username = email.split('@')[0];
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  
  // Add logo, welcome message and loading bar
  successScreen.innerHTML = `
    <img src="../public/images/Pmail1.png" alt="Pmail Logo" class="login-success-logo">
    <div class="login-success-message">Welcome back, ${displayName}!</div>
    <div class="login-loading-bar-container">
      <div class="login-loading-bar"></div>
    </div>
  `;
  
  // Hide any existing content
  document.querySelectorAll('body > *:not(script)').forEach(el => {
    if (el !== successScreen) {
      el.style.display = 'none';
    }
  });
  
  // Add to document
  document.body.appendChild(successScreen);
  
  // Show the screen with fade-in
  successScreen.classList.add('visible');
  console.log("Login screen visible");
  
  // Simple direct animation with setInterval
  setTimeout(() => {
    const loadingBar = successScreen.querySelector('.login-loading-bar');
    console.log("Starting loading bar animation");
    
    // Force initial state
    loadingBar.style.width = "0%";
    loadingBar.style.backgroundColor = "#4a8af4"; // Bright blue
    
    let width = 0;
    const animationInterval = setInterval(() => {
      width += 2; // Increase by 2% each time for smooth animation
      if (width <= 100) {
        loadingBar.style.width = width + "%";
        console.log("Loading width:", width + "%");
      } else {
        clearInterval(animationInterval);
        console.log("Loading complete, redirecting");
        setTimeout(() => window.location.href = redirectUrl, 200);
      }
    }, 30); // Update every 30ms for ~1.5 second total duration
  }, 500);
}

// --------------------------------------
// 🔹 Email and Phone Availability Checks
// --------------------------------------

// Check if an email is available (not already in use)
function checkEmailAvailability(email) {
  return fetch(`/auth/check-email?email=${encodeURIComponent(email)}`)
    .then(response => response.json())
    .catch(error => {
      console.error("Error checking email:", error);
      return { error: "Failed to check email availability" };
    });
}

// Check if a phone number is available (not already in use)
function checkPhoneAvailability(phone) {
  return fetch(`/auth/check-phone?phone=${encodeURIComponent(phone)}`)
    .then(response => response.json())
    .catch(error => {
      console.error("Error checking phone:", error);
      return { error: "Failed to check phone availability" };
    });
}

// Debounce function to limit API calls
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

// Debounced versions of the check functions
const debouncedCheckEmail = debounce(function(email, callback) {
  checkEmailAvailability(email).then(callback);
}, 300);

const debouncedCheckPhone = debounce(function(phone, callback) {
  checkPhoneAvailability(phone).then(callback);
}, 300);
