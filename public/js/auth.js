document.addEventListener("DOMContentLoaded", function () {
  // If there's a register button on the page, attach the register() function
  const registerBtn = document.getElementById("register-btn");
  if (registerBtn) {
    registerBtn.addEventListener("click", register);
  }
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
        
        // Get first name from response or email, then capitalize first letter
        let displayName = data.first_name || email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        localStorage.setItem("displayName", displayName);
        
        localStorage.setItem("role", data.role);
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
// 🔹 Registration Function
// --------------------------------------
function register() {
  const firstName = document.getElementById("first_name").value.trim();
  const lastName = document.getElementById("last_name").value.trim();
  const birthdate = document.getElementById("birthdate").value;
  const password = document.getElementById("password").value;
  const phone = document.getElementById("phone").value.trim();
  const role = new URLSearchParams(window.location.search).get("role");

  // Retrieve email from the radio buttons or custom input
  const selectedEmailOption = document.querySelector('input[name="email_option"]:checked');
  let email = "";
  if (selectedEmailOption) {
    if (selectedEmailOption.id === "custom_email_option") {
      email = document.getElementById("email_input").value.trim().toLowerCase();
    } else {
      email = selectedEmailOption.value.trim().toLowerCase();
    }
  }

  if (!email || !email.includes("@")) {
    alert("Please enter a valid email.");
    return;
  }

  const userData = {
    first_name: firstName,
    last_name: lastName,
    birthdate: birthdate,
    email: email,
    password: password,
    phone: phone,
    role: role
  };

  fetch("http://127.0.0.1:5000/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  })
    .then(response => response.json())
    .then(data => {
      if (data.message === "User registered successfully") {
        alert("Registration successful!");

        // Decide redirect here based on the returned role
        // Make sure this matches the pages you created
        if (data.role === "employee") {
          window.location.href = "/frontend/employee_inbox.html";
        } else {
          window.location.href = "/frontend/employer_inbox.html";
        }
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(error => console.error("Error:", error));
}
