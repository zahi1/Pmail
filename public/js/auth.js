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
        alert("Login successful!");
        // Store the user_id returned from the backend
        localStorage.setItem("user_id", data.user_id);
        window.location.href = data.redirect;
      } else {
        alert("Error: " + data.error);
      }
    })
    .catch(error => {
      console.error("Error:", error);
      alert("An error occurred during login.");
    });
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
