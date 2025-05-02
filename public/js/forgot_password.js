document.addEventListener('DOMContentLoaded', function() {
  // Set up form submission handlers
  const verificationForm = document.getElementById('verification-form');
  const newPasswordForm = document.getElementById('new-password-form');
  
  verificationForm.addEventListener('submit', handleVerification);
  newPasswordForm.addEventListener('submit', handlePasswordReset);
  
  // Store user email for the second step
  window.userEmail = '';
});

/**
 * Show error message
 */
function showError(message) {
  const errorElement = document.getElementById('error-message');
  const successElement = document.getElementById('success-message');
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  successElement.style.display = 'none';
}

/**
 * Show success message
 */
function showSuccess(message) {
  const errorElement = document.getElementById('error-message');
  const successElement = document.getElementById('success-message');
  
  successElement.textContent = message;
  successElement.style.display = 'block';
  errorElement.style.display = 'none';
}

/**
 * Switch between form steps
 */
function showStep(stepId) {
  // Hide all steps
  document.querySelectorAll('.step-container').forEach(step => {
    step.classList.remove('active');
  });
  
  // Show requested step
  document.getElementById(stepId).classList.add('active');
}

/**
 * Handle the verification form submission
 */
function handleVerification(e) {
  e.preventDefault();
  
  // Get form values
  const email = document.getElementById('email').value.trim();
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const birthdate = document.getElementById('birthdate').value;
  const phone = document.getElementById('phone').value.trim();
  const role = document.querySelector('input[name="role"]:checked').value;
  
  // Validate form values
  if (!email || !firstName || !lastName || !birthdate || !phone || !role) {
    showError('All fields are required');
    return;
  }
  
  // Validate email format
  if (!email.endsWith('@pmail.com')) {
    showError('Email must end with @pmail.com');
    return;
  }
  
  // Store email for the second step
  window.userEmail = email;
  
  // Send verification request
  fetch('/auth/verify-identity', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
      birthdate,
      phone,
      role
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Verification successful, show password reset form
      showSuccess('Identity verified! Please set a new password.');
      showStep('step-new-password');
    } else {
      // Verification failed
      showError(data.error || 'Identity verification failed. Please check your information.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showError('An error occurred. Please try again later.');
  });
}

/**
 * Handle the password reset form submission
 */
function handlePasswordReset(e) {
  e.preventDefault();
  
  // Get password values
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Validate passwords
  if (!newPassword || !confirmPassword) {
    showError('Please enter and confirm your new password');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showError('Passwords do not match');
    return;
  }
  
  if (newPassword.length < 8) {
    showError('Password must be at least 8 characters long');
    return;
  }
  
  // Send password reset request
  fetch('/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: window.userEmail,
      password: newPassword
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      // Password reset successful
      showSuccess('Password reset successful!');
      
      // Redirect to login page after 2 seconds
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      // Password reset failed
      showError(data.error || 'Password reset failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showError('An error occurred. Please try again later.');
  });
}
