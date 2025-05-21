document.addEventListener('DOMContentLoaded', function() {
  const verificationForm = document.getElementById('verification-form');
  const newPasswordForm = document.getElementById('new-password-form');
  
  verificationForm.addEventListener('submit', handleVerification);
  newPasswordForm.addEventListener('submit', handlePasswordReset);
  
  window.userEmail = '';
});


function showError(message) {
  const errorElement = document.getElementById('error-message');
  const successElement = document.getElementById('success-message');
  
  errorElement.textContent = message;
  errorElement.style.display = 'block';
  successElement.style.display = 'none';
}


function showSuccess(message) {
  const errorElement = document.getElementById('error-message');
  const successElement = document.getElementById('success-message');
  
  successElement.textContent = message;
  successElement.style.display = 'block';
  errorElement.style.display = 'none';
}


function showStep(stepId) {
  document.querySelectorAll('.step-container').forEach(step => {
    step.classList.remove('active');
  });
  
  document.getElementById(stepId).classList.add('active');
}


function handleVerification(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const firstName = document.getElementById('first-name').value.trim();
  const lastName = document.getElementById('last-name').value.trim();
  const birthdate = document.getElementById('birthdate').value;
  const phone = document.getElementById('phone').value.trim();
  const role = document.querySelector('input[name="role"]:checked').value;
  
  if (!email || !firstName || !lastName || !birthdate || !phone || !role) {
    showError('All fields are required');
    return;
  }
  
  if (!email.endsWith('@pmail.com')) {
    showError('Email must end with @pmail.com');
    return;
  }
  
  window.userEmail = email;
  
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
      showSuccess('Identity verified! Please set a new password.');
      showStep('step-new-password');
    } else {
      showError(data.error || 'Identity verification failed. Please check your information.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showError('An error occurred. Please try again later.');
  });
}


function handlePasswordReset(e) {
  e.preventDefault();
  
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
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
      showSuccess('Password reset successful!');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      showError(data.error || 'Password reset failed. Please try again.');
    }
  })
  .catch(error => {
    console.error('Error:', error);
    showError('An error occurred. Please try again later.');
  });
}
