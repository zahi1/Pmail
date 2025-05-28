document.addEventListener("DOMContentLoaded", function () {
  const role = new URLSearchParams(window.location.search).get("role");
  if (role === "employee") {
    document.querySelectorAll('.employee-field').forEach(el=>el.style.display="block");
  }
  

  document.querySelectorAll('#registration-categories-container .category-item')
    .forEach(item => item.addEventListener('click', function(){
      this.classList.toggle('selected');
      const sel = [...document.querySelectorAll('.category-item.selected')]
        .map(i=>i.dataset.value).join(',');
      document.getElementById('user_categories').value = sel;
    }));
});


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
    .then(response => {
      if (response.status === 403) {
        return response.json().then(data => {
          showSuspensionMessage(data.message);
          throw new Error("Account suspended");
        });
      }
      return response.json();
    })
    .then(data => {
      if (data.message === "Login successful") {
        localStorage.setItem("user_id", data.user_id);
        localStorage.setItem("role", data.role);
        
        if (data.isAdmin) {
          localStorage.setItem("isAdmin", "true");
        } else if (data.isEmployer) {
          localStorage.setItem("isEmployer", "true");
        }
        
        let displayName = data.name || data.first_name || email.split('@')[0];
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        localStorage.setItem("displayName", displayName);
        
        if (data.warning && data.warning.violation) {
          localStorage.setItem("violation_warning", JSON.stringify(data.warning));
        }
        
        window.location.href = "splash.html";
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(error => {
      if (error.message !== "Account suspended") {
        console.error("Error:", error);
        alert("An error occurred during login.");
      }
    });
}

function showSuspensionMessage(message) {
  const suspensionModal = document.createElement('div');
  suspensionModal.className = 'suspension-modal';
  suspensionModal.innerHTML = `
    <div class="suspension-content">
      <div class="suspension-icon">
        <i class="fas fa-lock"></i>
      </div>
      <h2>Account Suspended</h2>
      <div class="suspension-divider"></div>
      <p>${message || "Your account has been suspended due to policy violations."}</p>
      <button class="close-suspension-btn" onclick="closeSuspensionModal()">Close</button>
    </div>
  `;
  document.body.appendChild(suspensionModal);
  
  // Add animation
  setTimeout(() => {
    suspensionModal.querySelector('.suspension-content').classList.add('show');
  }, 10);
}

function closeSuspensionModal() {
  const modal = document.querySelector('.suspension-modal');
  if (modal) {
    document.body.removeChild(modal);
  }
}

function showLoginSuccessScreen(email, redirectUrl) {
  console.log("Login success screen started");
  
  const existingScreen = document.querySelector('.login-success-screen');
  if (existingScreen) {
    document.body.removeChild(existingScreen);
  }

  const successScreen = document.createElement('div');
  successScreen.className = 'login-success-screen';
  
  const username = email.split('@')[0];
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  
  successScreen.innerHTML = `
    <img src="../public/images/Pmail1.png" alt="Pmail Logo" class="login-success-logo">
    <div class="login-success-message">Welcome back, ${displayName}!</div>
    <div class="login-loading-bar-container">
      <div class="login-loading-bar"></div>
    </div>
  `;
  
  document.querySelectorAll('body > *:not(script)').forEach(el => {
    if (el !== successScreen) {
      el.style.display = 'none';
    }
  });
  
  document.body.appendChild(successScreen);
  
  successScreen.classList.add('visible');
  console.log("Login screen visible");
  
  setTimeout(() => {
    const loadingBar = successScreen.querySelector('.login-loading-bar');
    console.log("Starting loading bar animation");
    
    loadingBar.style.width = "0%";
    loadingBar.style.backgroundColor = "#4a8af4"; 
    
    let width = 0;
    const animationInterval = setInterval(() => {
      width += 2; 
      if (width <= 100) {
        loadingBar.style.width = width + "%";
        console.log("Loading width:", width + "%");
      } else {
        clearInterval(animationInterval);
        console.log("Loading complete, redirecting");
        setTimeout(() => window.location.href = redirectUrl, 200);
      }
    }, 30); 
  }, 500);
}


function checkEmailAvailability(email) {
  return fetch(`/auth/check-email?email=${encodeURIComponent(email)}`)
    .then(response => response.json())
    .catch(error => {
      console.error("Error checking email:", error);
      return { error: "Failed to check email availability" };
    });
}

function checkPhoneAvailability(phone) {
  return fetch(`/auth/check-phone?phone=${encodeURIComponent(phone)}`)
    .then(response => response.json())
    .catch(error => {
      console.error("Error checking phone:", error);
      return { error: "Failed to check phone availability" };
    });
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

const debouncedCheckEmail = debounce(function(email, callback) {
  checkEmailAvailability(email).then(callback);
}, 300);

const debouncedCheckPhone = debounce(function(phone, callback) {
  checkPhoneAvailability(phone).then(callback);
}, 300);
