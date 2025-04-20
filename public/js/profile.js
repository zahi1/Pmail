// frontend/public/js/profile.js

document.addEventListener("DOMContentLoaded", () => {
    fetchProfile();
    
    // Profile picture upload functionality
    const profileUpload = document.getElementById("profile-upload");
    if (profileUpload) {
        profileUpload.addEventListener("change", handleProfilePicture);
    }
    
    // Edit profile toggle
    const editProfileBtn = document.getElementById("edit-profile-btn");
    if (editProfileBtn) {
        editProfileBtn.addEventListener("click", toggleEditProfile);
    }
    
    // Cancel edit button
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", cancelEdit);
    }
    
    // Privacy policy button
    const privacyBtn = document.getElementById("privacy-btn");
    if (privacyBtn) {
        privacyBtn.addEventListener("click", () => {
            window.location.href = "privacy_policy.html";
        });
    }
    
    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    
    // Profile form submission
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", updateProfile);
    }
    
    // Tab navigation
    setupTabNavigation();
    
    // Load profile picture
    loadProfilePicture();
    
    // Load activity data
    loadActivityData();
    
    // Load jobs or applications based on user role
    const userRole = localStorage.getItem('isEmployer') === 'true' ? 'employer' : 'employee';
    if (userRole === 'employer') {
        loadEmployerJobs();
        loadReceivedApplications();
    } else {
        loadUserApplications();
    }
});

function setupTabNavigation() {
    const tabLinks = document.querySelectorAll('.tab-nav li');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            // Remove active class from all tabs and panes
            tabLinks.forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show the corresponding pane
            const tabId = this.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function fetchProfile() {
    fetch("/profile", {
        method: "GET",
        headers: { "Content-Type": "application/json" }
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            showNotification("Error: " + data.error, "error");
        } else {
            populateProfileForm(data);
            populateProfileInfo(data);
            setProfileHeader(data);
            setProfileInitials(data);
        }
    })
    .catch(err => {
        console.error("Error fetching profile:", err);
        showNotification("Failed to load profile data", "error");
    });
}

function setProfileHeader(data) {
    // Set profile name and email in header
    const nameElement = document.getElementById("profile-name");
    const emailElement = document.getElementById("profile-email");
    
    if (data.role === "employee") {
        if (nameElement) nameElement.textContent = `${data.first_name || ''} ${data.last_name || ''}`.trim() || "User Name";
    } else if (data.role === "employer") {
        if (nameElement) nameElement.textContent = data.company_name || "Company Name";
    }
    
    if (emailElement) emailElement.textContent = data.email || "email@example.com";
}

function setProfileInitials(data) {
    const initialsElement = document.getElementById("profile-initials");
    if (!initialsElement) return;
    
    let initials = "";
    if (data.role === "employee") {
        const firstInitial = data.first_name ? data.first_name.charAt(0).toUpperCase() : "";
        const lastInitial = data.last_name ? data.last_name.charAt(0).toUpperCase() : "";
        initials = firstInitial + lastInitial;
    } else if (data.role === "employer") {
        initials = data.company_name ? data.company_name.charAt(0).toUpperCase() : "C";
    }
    
    initialsElement.textContent = initials || "?";
}

function populateProfileForm(data) {
    // Employee fields
    if (data.role === "employee") {
        if (document.getElementById("first_name"))
            document.getElementById("first_name").value = data.first_name || "";
        if (document.getElementById("last_name"))
            document.getElementById("last_name").value = data.last_name || "";
    }
    // Employer fields
    else if (data.role === "employer") {
        if (document.getElementById("company_name"))
            document.getElementById("company_name").value = data.company_name || "";
        if (document.getElementById("contact_name"))
            document.getElementById("contact_name").value = data.contact_name || "";
        if (document.getElementById("address"))
            document.getElementById("address").value = data.address || "";
    }
    
    // Common fields
    if (document.getElementById("birthdate"))
        document.getElementById("birthdate").value = data.birthdate || "";
    if (document.getElementById("phone"))
        document.getElementById("phone").value = data.phone || "";
    if (document.getElementById("email"))
        document.getElementById("email").value = data.email || "";
}

function populateProfileInfo(data) {
    // Update info display section
    if (data.role === "employee") {
        if (document.getElementById("info-first-name"))
            document.getElementById("info-first-name").textContent = data.first_name || "-";
        if (document.getElementById("info-last-name"))
            document.getElementById("info-last-name").textContent = data.last_name || "-";
    } else if (data.role === "employer") {
        if (document.getElementById("info-company-name"))
            document.getElementById("info-company-name").textContent = data.company_name || "-";
        if (document.getElementById("info-contact-name"))
            document.getElementById("info-contact-name").textContent = data.contact_name || "-";
        if (document.getElementById("info-address"))
            document.getElementById("info-address").textContent = data.address || "-";
    }
    
    // Common fields
    if (document.getElementById("info-birthdate"))
        document.getElementById("info-birthdate").textContent = formatDate(data.birthdate) || "-";
    if (document.getElementById("info-phone"))
        document.getElementById("info-phone").textContent = data.phone || "-";
}

function formatDate(dateString) {
    if (!dateString) return "";
    
    // Convert YYYY-MM-DD to readable format
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatRelativeTime(dateString) {
    // Parse the dateString into a Date object
    const date = new Date(dateString);
    
    // Use the browser's local timezone instead of manual offset
    // This will automatically handle DST and timezone differences
    return date.toLocaleString('en-GB', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, // Use 24-hour format
        timeZone: 'Europe/Helsinki' // Explicitly set timezone to Helsinki
    });
}

function toggleEditProfile() {
    const formContainer = document.getElementById("profile-form-container");
    const infoContainer = document.getElementById("profile-info");
    
    formContainer.classList.toggle("hidden");
    infoContainer.classList.toggle("hidden");
}

function cancelEdit() {
    const formContainer = document.getElementById("profile-form-container");
    const infoContainer = document.getElementById("profile-info");
    
    formContainer.classList.add("hidden");
    infoContainer.classList.remove("hidden");
    
    // Reload profile data to reset form values
    fetchProfile();
}

function updateProfile(event) {
    event.preventDefault();

    const payload = {};

    // Employee profile fields
    if (document.getElementById("first_name")) {
        payload.first_name = document.getElementById("first_name").value.trim();
    }
    if (document.getElementById("last_name")) {
        payload.last_name = document.getElementById("last_name").value.trim();
    }
    // Employer profile fields
    if (document.getElementById("company_name")) {
        payload.company_name = document.getElementById("company_name").value.trim();
    }
    if (document.getElementById("contact_name")) {
        payload.contact_name = document.getElementById("contact_name").value.trim();
    }
    if (document.getElementById("address")) {
        payload.address = document.getElementById("address").value.trim();
    }
    
    // Common fields
    payload.birthdate = document.getElementById("birthdate").value.trim();
    payload.phone = document.getElementById("phone").value.trim();

    fetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            showNotification("Profile updated successfully", "success");
            fetchProfile(); // Refresh profile data
            toggleEditProfile(); // Return to view mode
        } else {
            showNotification("Error: " + (data.error || "Unknown error occurred"), "error");
        }
    })
    .catch(err => {
        console.error("Error updating profile:", err);
        showNotification("Failed to update profile", "error");
    });
}

function handleProfilePicture(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Check file type
    if (!file.type.startsWith('image/')) {
        showNotification("Please select an image file", "error");
        return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
        showNotification("Image size exceeds 5MB", "error");
        return;
    }
    
    // Show loading state
    const profilePic = document.getElementById("profile-picture");
    if (profilePic) {
        profilePic.classList.add('uploading');
    }
    
    // Skip server upload and directly use FileReader to store in localStorage
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            // Store image data in localStorage
            localStorage.setItem('profilePicture', e.target.result);
            
            // Update profile picture display
            updateProfilePictureDisplay(e.target.result);
            
            showNotification("Profile picture updated successfully", "success");
        } catch (error) {
            console.error('Error storing profile picture:', error);
            showNotification("Failed to store profile picture. The image might be too large.", "error");
        }
    };
    
    reader.onerror = function() {
        showNotification("Failed to read the image file", "error");
    };
    
    // Read the file as a data URL
    reader.readAsDataURL(file);
    
    // Remove loading state when done
    reader.onloadend = function() {
        if (profilePic) {
            profilePic.classList.remove('uploading');
        }
    };
}

function updateProfilePictureDisplay(imageUrl) {
    const profilePic = document.getElementById("profile-picture");
    const initials = document.getElementById("profile-initials");
    
    if (profilePic) {
        profilePic.style.backgroundImage = `url(${imageUrl})`;
    }
    
    if (initials) {
        initials.style.display = "none";
    }
}

function loadProfilePicture() {
    // Only load from localStorage
    const savedPicture = localStorage.getItem('profilePicture');
    if (savedPicture) {
        updateProfilePictureDisplay(savedPicture);
    }
}

function loadActivityData() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    // Load recent activity from server
    fetch('/profile/activity')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.activities && data.activities.length > 0) {
                renderActivities(data.activities);
            } else {
                activityList.innerHTML = `
                    <div class="text-center mt-4">
                        <p>No recent activity found.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching activity data:', error);
            activityList.innerHTML = `
                <div class="text-center mt-4">
                    <p>Failed to load activity data.</p>
                </div>
            `;
        });
}

function renderActivities(activities) {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
    activityList.innerHTML = '';
    
    activities.forEach(activity => {
        const activityItem = document.createElement('li');
        activityItem.className = 'activity-item';
        
        let iconName;
        switch (activity.type) {
            case 'application':
                iconName = 'apply_icon.png';
                break;
            case 'message':
                iconName = 'message_icon.png';
                break;
            case 'profile_update':
                iconName = 'edit_icon.png';
                break;
            case 'login':
                iconName = 'activity_icon.png'; // New icon for login activity
                break;
            default:
                iconName = 'activity_icon.png';
        }
        
        activityItem.innerHTML = `
            <div class="activity-icon">
                <img src="../public/images/${iconName}" alt="${activity.type}">
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-subtitle">${activity.description}</div>
            </div>
            <div class="activity-time">${formatRelativeTime(activity.timestamp)}</div>
        `;
        
        activityList.appendChild(activityItem);
    });
}

function loadEmployerJobs() {
    const jobsContainer = document.getElementById('employer-jobs');
    if (!jobsContainer) return;
    
    fetch('/jobs/employer')
        .then(response => response.json())
        .then(jobs => {
            if (jobs && jobs.length > 0) {
                renderEmployerJobs(jobs);
            } else {
                jobsContainer.innerHTML = `
                    <div class="text-center mt-4">
                        <p>No jobs posted yet.</p>
                        <a href="employer_post_job.html" class="profile-btn edit-btn" style="display: inline-block; margin-top: 15px;">
                            Post Your First Job
                        </a>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching employer jobs:', error);
            jobsContainer.innerHTML = `
                <div class="text-center mt-4">
                    <p>Failed to load job data.</p>
                </div>
            `;
        });
}

function renderEmployerJobs(jobs) {
    const jobsContainer = document.getElementById('employer-jobs');
    if (!jobsContainer) return;
    
    jobsContainer.innerHTML = '';
    
    jobs.forEach(job => {
        const jobItem = document.createElement('div');
        jobItem.className = 'activity-item';
        
        const statusBadge = job.is_open ? 
            '<span class="status-badge open" style="margin-left:10px;">OPEN</span>' : 
            '<span class="status-badge closed" style="margin-left:10px;">CLOSED</span>';
        
        jobItem.innerHTML = `
            <div class="activity-icon">
                <img src="../public/images/job_icon.png" alt="Job">
            </div>
            <div class="activity-content">
                <div class="activity-title">${job.title} ${statusBadge}</div>
                <div class="activity-subtitle">${job.category} • ${job.job_type} • ${job.location}</div>
            </div>
            <a href="employer_post_job.html?edit=${job.id}" class="profile-btn edit-btn" style="padding:8px 15px; font-size:13px;">
                Edit
            </a>
        `;
        
        jobsContainer.appendChild(jobItem);
    });
}

function loadReceivedApplications() {
    const applicationsContainer = document.getElementById('received-applications');
    if (!applicationsContainer) return;
    
    fetch('/employer/applications')
        .then(response => response.json())
        .then(data => {
            if (data.applications && data.applications.length > 0) {
                renderApplications(data.applications, 'employer');
            } else {
                applicationsContainer.innerHTML = `
                    <div class="text-center mt-4">
                        <p>No applications received yet.</p>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching applications:', error);
            applicationsContainer.innerHTML = `
                <div class="text-center mt-4">
                    <p>Failed to load applications data.</p>
                </div>
            `;
        });
}

function loadUserApplications() {
    const applicationsContainer = document.getElementById('applications-container');
    if (!applicationsContainer) return;
    
    // Get current user ID
    const currentUserId = localStorage.getItem("user_id") || "0";
    if (currentUserId === "0") {
        applicationsContainer.innerHTML = `
            <div class="text-center mt-4">
                <p>Please log in to view your applications.</p>
            </div>
        `;
        return;
    }
    
    // Use the dashboard endpoint to get comprehensive application data
    fetch(`/dashboard/employee/${currentUserId}`)
        .then(response => response.json())
        .then(data => {
            if (data.applications && data.applications.length > 0) {
                // Pass the applications array to the render function
                renderEnhancedApplications(data.applications);
            } else {
                applicationsContainer.innerHTML = `
                    <div class="text-center mt-4">
                        <p>No job applications yet.</p>
                        <a href="jobs.html" class="profile-btn edit-btn" style="display: inline-block; margin-top: 15px;">
                            Browse Jobs
                        </a>
                    </div>
                `;
            }
        })
        .catch(error => {
            console.error('Error fetching applications data:', error);
            applicationsContainer.innerHTML = `
                <div class="text-center mt-4">
                    <p>Failed to load applications data.</p>
                </div>
            `;
        });
}

// New function to render enhanced application data
function renderEnhancedApplications(applications) {
    const container = document.getElementById('applications-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    applications.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'activity-item';
        
        let statusClass = '';
        switch ((app.status || '').toLowerCase()) {
            case 'pending': statusClass = 'status-pending'; break;
            case 'under review': statusClass = 'status-under-review'; break;
            case 'accepted': statusClass = 'status-accepted'; break;
            case 'rejected': statusClass = 'status-rejected'; break;
        }
        
        // Format the date nicely
        const applicationDate = app.created_at ? formatRelativeTime(app.created_at) : 'Unknown date';
        
        // Create HTML content for each application - removed the View button
        appItem.innerHTML = `
            <div class="activity-icon">
                <img src="../public/images/apply_icon.png" alt="Application">
            </div>
            <div class="activity-content">
                <div class="activity-title">
                    ${app.subject || 'Application'} 
                    <span class="status-badge-small ${statusClass}">${app.status || 'Unknown'}</span>
                </div>
                <div class="activity-subtitle">
                    ${app.job_company || 'Company'} • 
                    ${app.job_category || 'Category'} • 
                    ${app.job_type || 'Job Type'} • 
                    ${app.job_location || 'Location'} • 
                    ${applicationDate}
                </div>
            </div>
        `;
        
        container.appendChild(appItem);
    });
}

function renderApplications(applications, viewType) {
    const containerId = viewType === 'employer' ? 'received-applications' : 'applications-container';
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    applications.forEach(app => {
        const appItem = document.createElement('div');
        appItem.className = 'activity-item';
        
        let statusClass = '';
        switch (app.status.toLowerCase()) {
            case 'pending': statusClass = 'status-pending'; break;
            case 'under review': statusClass = 'status-under-review'; break;
            case 'accepted': statusClass = 'status-accepted'; break;
            case 'rejected': statusClass = 'status-rejected'; break;
        }
        
        let content;
        if (viewType === 'employer') {
            content = `
                <div class="activity-content">
                    <div class="activity-title">
                        <strong>${app.applicant_name}</strong> applied for ${app.job_title}
                        <span class="status-badge-small ${statusClass}">${app.status}</span>
                    </div>
                    <div class="activity-subtitle">${app.applicant_email} • ${formatRelativeTime(app.created_at)}</div>
                </div>
                <a href="employer_inbox.html?view=${app.message_id}" class="profile-btn edit-btn" style="padding:8px 15px; font-size:13px;">
                    View
                </a>
            `;
        } else {
            content = `
                <div class="activity-content">
                    <div class="activity-title">
                        Application for ${app.job_title} at ${app.company}
                        <span class="status-badge-small ${statusClass}">${app.status}</span>
                    </div>
                    <div class="activity-subtitle">${app.job_type} • ${app.location} • ${formatRelativeTime(app.created_at)}</div>
                </div>
                <a href="employee_inbox.html?view=${app.message_id}" class="profile-btn edit-btn" style="padding:8px 15px; font-size:13px;">
                    View
                </a>
            `;
        }
        
        appItem.innerHTML = `
            <div class="activity-icon">
                <img src="../public/images/apply_icon.png" alt="Application">
            </div>
            ${content}
        `;
        
        container.appendChild(appItem);
    });
}

function handleLogout() {
    fetch("/logout", { method: "POST" })
    .then(res => {
        // Clear all localStorage items including profile picture
        localStorage.clear();
        
        // Redirect to login page
        window.location.href = "login.html";
    })
    .catch(err => {
        console.error("Error logging out:", err);
        // Still clear storage and redirect on error
        localStorage.clear();
        window.location.href = "login.html";
    });
}

function showNotification(message, type = 'info') {
    let toast = document.createElement("div");
    toast.className = `toast-notification ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add("visible");
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => {
            document.body.removeChild(toast);
        }, 500);
    }, 3000);
}
