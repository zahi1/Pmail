document.addEventListener("DOMContentLoaded", function () {
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "employee") {
    document.querySelectorAll('.employee-field').forEach(el=>el.style.display="block");
  }
  // attach register()
  const registerBtn = document.getElementById("register-btn");
  if (registerBtn) registerBtn.addEventListener("click", register);

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
// 🔹 Registration Function
// --------------------------------------
function register() {
  const btn = document.getElementById("register-btn");
  if (btn.disabled) return;
  btn.disabled = true;

  // clear previous inline errors
  document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');

  const firstName = document.getElementById("first_name").value.trim();
  const lastName  = document.getElementById("last_name").value.trim();
  const birthdate = document.getElementById("birthdate").value;
  const password  = document.getElementById("password").value;
  const phone     = document.getElementById("phone").value.trim();
  const role      = new URLSearchParams(window.location.search).get("role");
  const emailElem = document.querySelector('input[name="email_option"]:checked');
  const email     = emailElem
    ? (emailElem.id === "custom_email_option"
       ? document.getElementById("email_input").value.trim().toLowerCase()
       : emailElem.value.trim().toLowerCase())
    : "";

  // phone validation
  const phoneError = document.getElementById("phone-error");
  const phonePattern = /^[0-9()+\-\s]{7,20}$/;
  if (!phone) {
    phoneError.textContent = "Please enter your phone number.";
    phoneError.style.display = "block";
    btn.disabled = false;
    return;
  }
  if (!phonePattern.test(phone)) {
    phoneError.textContent = "Phone must be 7–20 digits and may include +, -, (), or spaces.";
    phoneError.style.display = "block";
    btn.disabled = false;
    return;
  }

  // categories validation
  if (role === "employee") {
    const cats = document.getElementById("user_categories").value;
    const catError = document.getElementById("categories-error");
    if (!cats) {
      catError.textContent = "Please select at least one job category.";
      catError.style.display = "block";
      btn.disabled = false;
      return;
    }
  }

  // email validation
  const emailError = document.getElementById("email-error");
  if (!email || !/^[^@]+@pmail\.com$/.test(email)) {
    emailError.textContent = "Please select or enter a valid Pmail address.";
    emailError.style.display = "block";
    btn.disabled = false;
    return;
  }

  const userData = {
    first_name: firstName,
    last_name: lastName,
    birthdate: birthdate,
    email: email,
    password: password,
    phone: phone,
    role: role,
    user_categories: role === "employee"
      ? document.getElementById('user_categories').value
      : undefined
  };

  fetch("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  })
  .then(res => res.json())
  .then(data => {
    const step5 = document.getElementById("step-5");
    // Success
    if (data.message === "User registered successfully") {
      // insert or update success paragraph
      let successEl = document.getElementById("register-success");
      if (!successEl) {
        successEl = document.createElement("p");
        successEl.id = "register-success";
        successEl.className = "success-message";
        step5.insertBefore(successEl, step5.firstChild);
      }
      successEl.textContent = data.message;
      // delay then redirect
      setTimeout(() => {
        window.location.href = role === "employee"
          ? "/frontend/employee_inbox.html"
          : "/frontend/employer_inbox.html";
      }, 1000);
    }
    // Error
    else {
      // show server error inline at bottom of form
      let serverError = document.getElementById("register-server-error");
      if (!serverError) {
        serverError = document.createElement("p");
        serverError.id = "register-server-error";
        serverError.className = "error-message";
        const step5 = document.getElementById("step-5");
        step5.insertBefore(serverError, step5.firstChild);
      }
      serverError.textContent = data.error || "Registration failed";
      serverError.style.display = "block";
      btn.disabled = false;
    }
  })
  .catch(err => {
    console.error("Error:", err);
    let networkError = document.getElementById("register-server-error");
    if (networkError) {
      networkError.textContent = "Network error, please try again";
      networkError.style.display = "block";
    }
    btn.disabled = false;
  });
}
