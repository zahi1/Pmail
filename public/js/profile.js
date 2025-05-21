document.addEventListener("DOMContentLoaded", () => {
    fetchProfile();
    
    const profileUpload = document.getElementById("profile-upload");
    if (profileUpload) {
        profileUpload.addEventListener("change", handleProfilePicture);
    }
    
    const editProfileBtn = document.getElementById("edit-profile-btn");
    if (editProfileBtn) {
        editProfileBtn.addEventListener("click", toggleEditProfile);
    }
    
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", cancelEdit);
    }
    
    const privacyBtn = document.getElementById("privacy-btn");
    if (privacyBtn) {
        privacyBtn.addEventListener("click", () => {
            window.location.href = "privacy_policy.html";
        });
    }
    
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", handleLogout);
    }
    
    const profileForm = document.getElementById("profile-form");
    if (profileForm) {
        profileForm.addEventListener("submit", updateProfile);
    }
    
    setupTabNavigation();
    
    loadProfilePicture();
    
    loadActivityData();
    
    const userRole = localStorage.getItem('isEmployer') === 'true' ? 'employer' : 'employee';
    if (userRole === 'employer') {
        loadEmployerJobs();
        loadReceivedApplications();
        loadStatusMessages(); 
    } else {
        loadUserApplications();
    }
    
    const statusMessagesForm = document.getElementById('status-messages-form');
    if (statusMessagesForm) {
        statusMessagesForm.addEventListener('submit', saveStatusMessages);
    }
    
    const resetDefaultBtn = document.getElementById('reset-default-messages');
    if (resetDefaultBtn) {
        resetDefaultBtn.addEventListener('click', resetStatusMessages);
    }
    
    initCategories();
    initCategorySelection();

    document.querySelectorAll('#categories-container .category-item')
        .forEach(item => item.addEventListener('click', function() {
            this.classList.toggle('selected');
            updateCategoriesValue();
        }));
});

function setupTabNavigation() {
    const tabLinks = document.querySelectorAll('.tab-nav li');
    
    tabLinks.forEach(link => {
        link.addEventListener('click', function() {
            tabLinks.forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
            
            this.classList.add('active');
            
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
            console.log("Profile data received:", data); 
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
    if (data.role === "employee") {
        if (document.getElementById("first_name"))
            document.getElementById("first_name").value = data.first_name || "";
        if (document.getElementById("last_name"))
            document.getElementById("last_name").value = data.last_name || "";
    }
    else if (data.role === "employer") {
        if (document.getElementById("company_name"))
            document.getElementById("company_name").value = data.company_name || "";
        if (document.getElementById("contact_name"))
            document.getElementById("contact_name").value = data.contact_name || "";
        if (document.getElementById("address"))
            document.getElementById("address").value = data.address || "";
    }
    
    if (document.getElementById("birthdate"))
        document.getElementById("birthdate").value = data.birthdate || "";
    if (document.getElementById("phone"))
        document.getElementById("phone").value = data.phone || "";
    if (document.getElementById("email"))
        document.getElementById("email").value = data.email || "";
    
    if (data.role === "employee" && data.user_categories) {
        console.log("Loading categories:", data.user_categories);
        const cats = data.user_categories.split(',');
        
        const categoriesInput = document.getElementById('user_categories');
        if (categoriesInput) {
            categoriesInput.value = data.user_categories;
        }
        
        document.querySelectorAll('#categories-container .category-item').forEach(item => {
            if (cats.includes(item.dataset.value)) {
                item.classList.add('selected');
            }
        });

        updateCategoriesValue();
    }
}

function populateProfileInfo(data) {
    console.log("Populating profile info with:", data);
    
    if (data.role === "employee") {
        if (document.getElementById("info-first-name"))
            document.getElementById("info-first-name").textContent = data.first_name || "-";
        if (document.getElementById("info-last-name"))
            document.getElementById("info-last-name").textContent = data.last_name || "-";
            
        const infoCategories = document.getElementById("info-categories");
        console.log("Categories element:", infoCategories);
        console.log("User categories data:", data.user_categories);
        
        if (infoCategories) {
            if (data.user_categories && data.user_categories.trim() !== "") {
                const categories = data.user_categories.split(',');
                console.log("Categories array:", categories);
                
                const categoryBadges = categories.map(category => 
                    `<span class="category-badge">${category}</span>`
                ).join(' ');
                
                console.log("Setting HTML to:", categoryBadges);
                infoCategories.innerHTML = categoryBadges;
            } else {
                console.log("No categories found, setting default text");
                infoCategories.textContent = "No categories selected";
            }
        } else {
            console.error("info-categories element not found in DOM");
        }
    } else if (data.role === "employer") {
        if (document.getElementById("info-company-name"))
            document.getElementById("info-company-name").textContent = data.company_name || "-";
        if (document.getElementById("info-contact-name"))
            document.getElementById("info-contact-name").textContent = data.contact_name || "-";
        if (document.getElementById("info-address"))
            document.getElementById("info-address").textContent = data.address || "-";
    }
    
    if (document.getElementById("info-birthdate"))
        document.getElementById("info-birthdate").textContent = formatDate(data.birthdate) || "-";
    if (document.getElementById("info-phone"))
        document.getElementById("info-phone").textContent = data.phone || "-";
}

function formatDate(dateString) {
    if (!dateString) return "";
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    
    return date.toLocaleString('en-GB', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false, 
        timeZone: 'Europe/Helsinki' 
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
    
    fetchProfile();
}

function updateProfile(event) {
    event.preventDefault();

    const payload = {};

    if (document.getElementById("first_name")) {
        payload.first_name = document.getElementById("first_name").value.trim();
        payload.last_name = document.getElementById("last_name").value.trim();
        
        const selectedCategories = [];
        document.querySelectorAll('#categories-container .category-item.selected').forEach(item => {
            selectedCategories.push(item.getAttribute('data-value'));
        });
        payload.user_categories = selectedCategories.join(',');
    }
    if (document.getElementById("company_name")) {
        payload.company_name = document.getElementById("company_name").value.trim();
    }
    if (document.getElementById("contact_name")) {
        payload.contact_name = document.getElementById("contact_name").value.trim();
    }
    if (document.getElementById("address")) {
        payload.address = document.getElementById("address").value.trim();
    }
    
    payload.birthdate = document.getElementById("birthdate").value.trim();
    payload.phone = document.getElementById("phone").value.trim();

    if (document.getElementById('user_categories')){
        payload.user_categories = document.getElementById('user_categories').value;
    }

    fetch("/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.message) {
            showNotification("Profile updated successfully", "success");
            fetchProfile(); 
            toggleEditProfile(); 
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
    
    if (!file.type.startsWith('image/')) {
        showNotification("Please select an image file", "error");
        return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
        showNotification("Image size exceeds 5MB", "error");
        return;
    }
    
    const profilePic = document.getElementById("profile-picture");
    if (profilePic) {
        profilePic.classList.add('uploading');
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            localStorage.setItem('profilePicture', e.target.result);
            
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
    
    reader.readAsDataURL(file);
    
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
    const savedPicture = localStorage.getItem('profilePicture');
    if (savedPicture) {
        updateProfilePictureDisplay(savedPicture);
    }
}

function loadActivityData() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;
    
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
                iconName = 'activity_icon.png';
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
    
    const currentUserId = localStorage.getItem("user_id") || "0";
    if (currentUserId === "0") {
        applicationsContainer.innerHTML = `
            <div class="text-center mt-4">
                <p>Please log in to view received applications.</p>
            </div>
        `;
        return;
    }
    
    fetch(`/dashboard/employer/${currentUserId}`)
        .then(response => response.json())
        .then(data => {
            if (data.applications && data.applications.length > 0) {
                window.employerApplications = data.applications;
                
                updateApplicationsCount(data.applications.length);
                
                populateJobFilter(data.applications);
                
                renderEmployerApplications(data.applications);
            } else {
                applicationsContainer.innerHTML = `
                    <div class="text-center mt-4">
                        <p>No applications received yet.</p>
                        <p class="small-text">When candidates apply to your jobs, they will appear here.</p>
                    </div>
                `;
                updateApplicationsCount(0);
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

function updateApplicationsCount(count) {
    const countElement = document.getElementById('applications-count');
    if (countElement) {
        countElement.textContent = `(${count})`;
    }
}

function populateJobFilter(applications) {
    const filterDropdown = document.getElementById('job-filter');
    if (!filterDropdown) return;
    
    while (filterDropdown.options.length > 1) {
        filterDropdown.remove(1);
    }
    
    const uniqueJobs = [...new Set(applications.map(app => {
  
        let subject = app.subject || '';
        if (subject.startsWith('Application for:')) {
            return subject.substring('Application for:'.length).trim();
        }
        return subject;
    }))];
    
    uniqueJobs.forEach(job => {
        if (job) {  
            const option = document.createElement('option');
            option.value = job;
            option.textContent = job;
            filterDropdown.appendChild(option);
        }
    });
    
    filterDropdown.addEventListener('change', function() {
        const selectedJob = this.value;
        filterApplications(selectedJob);
    });
}

function filterApplications(jobTitle) {
    if (!window.employerApplications) return;
    
    let filteredApplications;
    
    if (jobTitle === 'all') {
        filteredApplications = window.employerApplications;
    } else {
        filteredApplications = window.employerApplications.filter(app => {
            const subject = app.subject || '';
            return subject.includes(jobTitle);
        });
    }
    
    updateApplicationsCount(filteredApplications.length);
    
    renderEmployerApplications(filteredApplications);
}

function renderEmployerApplications(applications) {
    const container = document.getElementById('received-applications');
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
        
        const applicationDate = app.created_at ? formatRelativeTime(app.created_at) : 'Unknown date';
        
        let jobTitle = app.subject || 'Job Position';
        if (jobTitle.startsWith('Application for:')) {
            jobTitle = jobTitle.substring('Application for:'.length).trim();
        }
        
        appItem.innerHTML = `
            <div class="activity-icon">
                <img src="../public/images/apply_icon.png" alt="Application">
            </div>
            <div class="activity-content">
                <div class="activity-title">
                    Application for: ${jobTitle}
                    <span class="status-badge-small ${statusClass}">${app.status || 'Pending'}</span>
                </div>
                <div class="activity-subtitle">
                    ${app.sender_name || app.sender_email || 'Applicant'} • 
                    ${app.job_category || 'Category'} • 
                    ${app.job_type || 'Job Type'} • 
                    ${app.created_at ? formatRelativeTime(app.created_at) : 'Unknown date'}
                </div>
            </div>
        `;
        
        container.appendChild(appItem);
    });
}

function loadUserApplications() {
    const applicationsContainer = document.getElementById('applications-container');
    if (!applicationsContainer) return;
    
    const currentUserId = localStorage.getItem("user_id") || "0";
    if (currentUserId === "0") {
        applicationsContainer.innerHTML = `
            <div class="text-center mt-4">
                <p>Please log in to view your applications.</p>
            </div>
        `;
        return;
    }
    
    fetch(`/dashboard/employee/${currentUserId}`)
        .then(response => response.json())
        .then(data => {
            if (data.applications && data.applications.length > 0) {
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
        
        const applicationDate = app.created_at ? formatRelativeTime(app.created_at) : 'Unknown date';
        
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
        localStorage.clear();
        
        window.location.href = "login.html";
    })
    .catch(err => {
        console.error("Error logging out:", err);
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

function loadStatusMessages() {
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    
    fetch(`/status-messages/${userId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                document.getElementById('pending-message').value = data.messages.pending || '';
                document.getElementById('under-review-message').value = data.messages.under_review || '';
                document.getElementById('accepted-message').value = data.messages.accepted || '';
                document.getElementById('rejected-message').value = data.messages.rejected || '';
            }
        })
        .catch(error => {
            console.error('Error loading status messages:', error);
            showNotification('Failed to load status messages', 'error');
        });
}

function saveStatusMessages(event) {
    event.preventDefault();
    
    const userId = localStorage.getItem("user_id");
    if (!userId) return;
    
    const messages = {
        pending: document.getElementById('pending-message').value.trim(),
        under_review: document.getElementById('under-review-message').value.trim(),
        accepted: document.getElementById('accepted-message').value.trim(),
        rejected: document.getElementById('rejected-message').value.trim()
    };
    
    fetch('/status-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: userId,
            messages: messages
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Status messages saved successfully', 'success');
        } else {
            showNotification('Error: ' + (data.error || 'Failed to save status messages'), 'error');
        }
    })
    .catch(error => {
        console.error('Error saving status messages:', error);
        showNotification('Failed to save status messages', 'error');
    });
}

function resetStatusMessages() {
    const defaultMessages = {
        pending: "Thank you for your application for {job_title}. Your application is currently in our pending queue and will be reviewed soon.",
        under_review: "Good news! Your application for {job_title} is now being reviewed by our team. We'll be in touch with updates as we evaluate your candidacy.",
        accepted: "Congratulations! We are pleased to inform you that your application for {job_title} has been accepted. We'll contact you shortly with next steps regarding the interview process.",
        rejected: "Thank you for your interest in {job_title}. After careful consideration, we regret to inform you that we've decided to move forward with other candidates at this time.\n\nWe appreciate your interest in our organization and wish you success in your job search."
    };
    
    document.getElementById('pending-message').value = defaultMessages.pending;
    document.getElementById('under-review-message').value = defaultMessages.under_review;
    document.getElementById('accepted-message').value = defaultMessages.accepted;
    document.getElementById('rejected-message').value = defaultMessages.rejected;
    
    showNotification('Status messages reset to default values', 'info');
}

function initCategories(){
  document.querySelectorAll('#categories-container .category-item')
    .forEach(item => item.addEventListener('click', function(){
      this.classList.toggle('selected');
      const sel = [...document.querySelectorAll('.category-item.selected')]
        .map(i=>i.dataset.value).join(',');
      document.getElementById('user_categories').value = sel;
    }));
}

function initCategorySelection() {
    const categoryItems = document.querySelectorAll('#categories-container .category-item');
    if (categoryItems.length > 0) {
        console.log("Initializing category selection");
        categoryItems.forEach(item => {
            item.addEventListener('click', function() {
                this.classList.toggle('selected');
                updateCategoriesInput();
            });
        });
    }
}

function updateCategoriesInput() {
    const selectedCategories = [];
    document.querySelectorAll('#categories-container .category-item.selected').forEach(item => {
        selectedCategories.push(item.getAttribute('data-value'));
    });
    
    const categoriesInput = document.getElementById('user_categories');
    if (categoriesInput) {
        categoriesInput.value = selectedCategories.join(',');
        console.log("Updated categories:", categoriesInput.value);
    }
}

function updateCategoriesValue() {
    const selected = Array.from(
        document.querySelectorAll('#categories-container .category-item.selected')
    ).map(el => el.dataset.value);
    const input = document.getElementById('user_categories');
    if (input) input.value = selected.join(',');
}
