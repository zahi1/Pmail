document.addEventListener("DOMContentLoaded", () => {
    console.log("Admin page loaded, initializing...");
    
    initAdminDashboard();
    
    // Immediately load all users so the table is populated on page load
    loadUsers().catch(err => {
        console.error("Error loading users on init:", err);
    });
});

// Main initialization function with proper sequencing
function initAdminDashboard() {
    console.log("Starting admin dashboard initialization...");
    
    // First check if we're on an admin page before proceeding
    if (!document.querySelector('.admin-layout')) {
        console.log("Not on admin dashboard page, skipping initialization");
        return;
    }

    // First load dashboard stats (most visible/important)
    loadDashboardStats()
        .then(statsData => {
            console.log("Dashboard stats loaded successfully:", statsData);
            
            // After stats are loaded, check admin authentication
            return checkAdminAuth();
        })
        .then(() => {
            console.log("Admin authentication verified, setting up UI...");
            
            // Setup UI components
            setupTabNavigation();
            setupEventListeners();
            
            // Load all data in parallel but handle each separately to prevent cascading failures
            loadUsers().catch(err => {
                console.error("Error loading users:", err);
                // Don't rethrow - continue with execution
            });
            
            loadJobs().catch(err => {
                console.error("Error loading jobs:", err);
                // Don't rethrow - continue with execution
            });
            
            loadJobCategories().catch(err => {
                console.error("Error loading job categories:", err);
                // Don't rethrow - continue with execution
            });
            
            // Initialize charts after a short delay to ensure DOM is ready
            setTimeout(() => {
                try {
                    initializeCharts();
                    console.log("Charts initialized successfully");
                } catch (err) {
                    console.error("Error initializing charts:", err);
                    // Non-critical error, don't show notification
                }
            }, 100);
        })
        .catch(err => {
            console.error("Error during admin dashboard initialization:", err);
            // Only show notification for authentication failures, not for non-critical data loading
            if (err.message === "Not authorized") {
                showNotification("Authentication failed. Please log in again.", "error");
            }
        });
}

// Convert checkAdminAuth to return a Promise - With better error handling
function checkAdminAuth() {
    return new Promise((resolve, reject) => {
        // First check localStorage to see if user is marked as admin
        const isAdminLocal = localStorage.getItem("isAdmin") === "true" || localStorage.getItem("role") === "admin";
        console.log("Local storage admin check:", isAdminLocal ? "admin" : "not admin");
        
        // Check if the current user is an admin via server
        fetch('/admin/auth-check', {
            credentials: 'include' // Include credentials to ensure cookies are sent
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Not authorized');
                }
                return response.json();
            })
            .then(data => {
                if (data.isAdmin) {
                    // Update admin info
                    console.log("Server confirms user is admin");
                    const adminEmailEl = document.getElementById('admin-email');
                    const adminNameEl = document.getElementById('admin-name');
                    
                    if (adminEmailEl) adminEmailEl.textContent = data.email || "admin@pmail.com";
                    if (adminNameEl) adminNameEl.textContent = data.name || "Administrator";
                    
                    // Set/update admin status in localStorage
                    localStorage.setItem("isAdmin", "true");
                    localStorage.setItem("role", "admin");
                    resolve(data);
                } else {
                    console.log("Server says user is not admin, redirecting to login");
                    window.location.href = 'login.html';
                    reject("Not authorized");
                }
            })
            .catch(error => {
                console.error('Auth check failed:', error);
                
                // If we're fairly confident this is an admin from localStorage,
                // try to continue anyway instead of immediately redirecting
                if (isAdminLocal) {
                    console.log("Auth check failed but admin in localStorage, trying to continue");
                    const adminEmailEl = document.getElementById('admin-email');
                    const adminNameEl = document.getElementById('admin-name');
                    
                    if (adminEmailEl) adminEmailEl.textContent = localStorage.getItem("email") || "admin@pmail.com";
                    if (adminNameEl) adminNameEl.textContent = "Administrator";
                    resolve({ isAdmin: true });
                    return;
                }
                
                // Otherwise redirect to login page
                window.location.href = 'login.html';
                reject(error);
            });
    });
}

// Update loadDashboardStats to be more robust with retries
function loadDashboardStats() {
    return new Promise((resolve, reject) => {
        const maxRetries = 2;
        let retryCount = 0;
        
        function attemptLoad() {
            console.log(`Fetching dashboard statistics... (attempt ${retryCount + 1})`);
            fetch('/admin/dashboard-stats', {
                credentials: 'include', // Ensure cookies are sent
                headers: {
                    'Cache-Control': 'no-cache', // Prevent caching issues
                    'Pragma': 'no-cache'
                }
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Server returned ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    console.log("Dashboard stats loaded:", data);
                    
                    // Immediately update UI with the stats data
                    updateDashboardStats(data);
                    resolve(data);
                })
                .catch(error => {
                    console.error(`Error loading dashboard stats (attempt ${retryCount + 1}):`, error);
                    
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Retrying... (${retryCount}/${maxRetries})`);
                        setTimeout(attemptLoad, 1000); // Wait 1 second before retry
                    } else {
                        showNotification('Failed to load dashboard statistics', 'error');
                        // Resolve with default values instead of rejecting to continue execution flow
                        resolve({
                            totalUsers: 0,
                            activeJobs: 0,
                            totalApplications: 0,
                            employeeCount: 0,
                            employerCount: 0,
                            growth: {}
                        });
                    }
                });
        }
        
        // Start the first attempt
        attemptLoad();
    });
}

// New function to update dashboard stats in UI
function updateDashboardStats(data) {
    // Update header stats - ensure values are displayed even if zero
    const totalUsersEl = document.getElementById('total-users');
    const totalJobsEl = document.getElementById('total-jobs');
    const totalAppsEl = document.getElementById('total-applications');
    
    if (totalUsersEl) totalUsersEl.textContent = data.totalUsers !== undefined ? data.totalUsers : 0;
    if (totalJobsEl) totalJobsEl.textContent = data.activeJobs !== undefined ? data.activeJobs : 0;
    if (totalAppsEl) totalAppsEl.textContent = data.totalApplications !== undefined ? data.totalApplications : 0;
    
    // Update metric cards in reports section
    const metricUsersEl = document.getElementById('metric-total-users');
    const metricJobsEl = document.getElementById('metric-new-jobs');
    const metricAppsEl = document.getElementById('metric-applications');
    const metricActiveUsersEl = document.getElementById('metric-active-users');
    
    if (metricUsersEl) metricUsersEl.textContent = data.totalUsers !== undefined ? data.totalUsers : 0;
    if (metricJobsEl) metricJobsEl.textContent = data.newJobs !== undefined ? data.newJobs : 0;
    if (metricAppsEl) metricAppsEl.textContent = data.totalApplications !== undefined ? data.totalApplications : 0;
    if (metricActiveUsersEl) metricActiveUsersEl.textContent = data.activeUsers !== undefined ? data.activeUsers : 0;
    
    // Update growth indicators
    updateGrowthIndicators(data.growth || {});
}

// Update loadUsers to be more robust
function loadUsers() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) {
        console.log("Users table body not found in DOM");
        return Promise.resolve({ users: [] });
    }
    
    console.log(`Loading users data (page ${userState.currentPage}, role=${userState.roleFilter}, search='${userState.searchTerm}')...`);
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <div style="padding: 2px;">Loading user data...</div>
            </td>
        </tr>
    `;
    
    // use current state instead of resetting
    const params = new URLSearchParams({
        page: userState.currentPage,
        per_page: 10,
        role: userState.roleFilter,
        search: userState.searchTerm
    });
    
    return fetch(`/admin/users?${params.toString()}`, {
        credentials: 'include',
        headers: { 'Accept':'application/json','Cache-Control':'no-cache' }
    })
    .then(response => {
        if (!response.ok) throw new Error(`Server ${response.status}`);
        return response.json();
    })
    .then(data => {
        if (data.users.length) {
            renderUsers(data.users);
            userState.totalPages = data.totalPages || 1;
            updateUserPagination();
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" class="text-center">No users found</td></tr>`;
        }
        return data;
    })
    .catch(error => {
        console.error('Error loading users:', error);
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center">Error: ${error.message}</td></tr>`;
        throw error;
    });
}

// Modified loadJobs to return a Promise
function loadJobs() {
    return new Promise((resolve, reject) => {
        const tableBody = document.getElementById('jobs-table-body');
        if (!tableBody) {
            console.log("Jobs table body not found in DOM");
            resolve(null); // Not an error, just not on the jobs page
            return;
        }
        
        tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading jobs...</td></tr>';
        
        const params = new URLSearchParams({
            page: jobState.currentPage,
            search: jobState.searchTerm,
            status: jobState.statusFilter,
            category: jobState.categoryFilter
        });
        
        fetch(`/admin/jobs?${params}`, {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.jobs && data.jobs.length > 0) {
                    renderJobs(data.jobs);
                    jobState.totalPages = data.totalPages || 1;
                    updateJobPagination();
                    resolve(data);
                } else {
                    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No jobs found</td></tr>';
                    resolve({jobs: []});
                }
            })
            .catch(error => {
                console.error('Error loading jobs:', error);
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading jobs</td></tr>';
                showNotification('Failed to load jobs', 'error');
                reject(error);
            });
    });
}

// Modified loadJobCategories to return a Promise
function loadJobCategories() {
    return new Promise((resolve, reject) => {
        fetch('/admin/job-categories', {
            credentials: 'include',
            headers: {
                'Cache-Control': 'no-cache'
            }
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.categories && data.categories.length > 0) {
                    populateCategories(data.categories);
                }
                resolve(data);
            })
            .catch(error => {
                console.error('Error loading job categories:', error);
                reject(error);
            });
    });
}

// Enhanced deleteUser function to refresh dashboard stats
function deleteUser(userId) {
    // Show loading notification
    showNotification('Deleting user...', 'info');
    
    fetch(`/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`Server returned ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            showNotification('User deleted successfully', 'success');
            
            // Reload critical data
            Promise.all([
                loadDashboardStats(),
                loadUsers()
            ])
            .then(() => {
                console.log("Data refreshed after user deletion");
            })
            .catch(err => {
                console.error("Error refreshing data after user deletion:", err);
            });
        } else {
            throw new Error(data.message || 'Failed to delete user');
        }
    })
    .catch(error => {
        console.error('Error deleting user:', error);
        showNotification('Failed to delete user: ' + error.message, 'error');
    });
}

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

function setupEventListeners() {
    // Logout button
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // User management
    document.getElementById('user-search').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });
    document.getElementById('search-users-btn').addEventListener('click', searchUsers);
    document.getElementById('user-role-filter').addEventListener('change', filterUsers);
    document.getElementById('prev-page-users').addEventListener('click', () => navigateUserPage(-1));
    document.getElementById('next-page-users').addEventListener('click', () => navigateUserPage(1));
    
    // Job management
    document.getElementById('job-search').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchJobs();
        }
    });
    document.getElementById('search-jobs-btn').addEventListener('click', searchJobs);
    document.getElementById('job-status-filter').addEventListener('change', filterJobs);
    document.getElementById('job-category-filter').addEventListener('change', filterJobs);
    document.getElementById('prev-page-jobs').addEventListener('click', () => navigateJobPage(-1));
    document.getElementById('next-page-jobs').addEventListener('click', () => navigateJobPage(1));
    
    // Report generation
    document.getElementById('report-type').addEventListener('change', updateReportView);
    document.getElementById('generate-report-btn').addEventListener('click', generateReport);
    document.getElementById('export-report-btn').addEventListener('click', exportReport);
    
    // User report search
    document.getElementById('user-report-search').addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            searchUserForReport();
        }
    });
    document.getElementById('search-user-report-btn').addEventListener('click', searchUserForReport);
    document.getElementById('export-user-report').addEventListener('click', exportUserReport);
    
    // Modal event listeners
    setupModalListeners();
    
    // Form submissions
    document.getElementById('edit-user-form').addEventListener('submit', handleEditUserSubmit);
    document.getElementById('edit-job-form').addEventListener('submit', handleEditJobSubmit);
}

function setupModalListeners() {
    // Close buttons for all modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            modal.style.display = 'none';
        });
    });
    
    // Cancel buttons
    document.getElementById('cancel-edit-user').addEventListener('click', function() {
        document.getElementById('edit-user-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-edit-job').addEventListener('click', function() {
        document.getElementById('edit-job-modal').style.display = 'none';
    });
    
    document.getElementById('cancel-confirm').addEventListener('click', function() {
        document.getElementById('confirm-modal').style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        document.querySelectorAll('.modal').forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

function handleLogout() {
    fetch("/logout", { method: "POST" })
        .then(() => {
            localStorage.clear();
            window.location.href = "login.html";
        })
        .catch(err => {
            console.error("Error logging out:", err);
            localStorage.clear();
            window.location.href = "login.html";
        });
}

// Dashboard Stats
function updateGrowthIndicators(growth) {
    const elements = {
        users: document.querySelector('#metric-total-users + .metric-change'),
        jobs: document.querySelector('#metric-new-jobs + .metric-change'),
        applications: document.querySelector('#metric-applications + .metric-change'),
        activeUsers: document.querySelector('#metric-active-users + .metric-change')
    };
    
    if (growth.users) {
        const userChange = growth.users;
        elements.users.textContent = `${userChange > 0 ? '+' : ''}${userChange}% from last month`;
        elements.users.className = `metric-change ${userChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (growth.jobs) {
        const jobChange = growth.jobs;
        elements.jobs.textContent = `${jobChange > 0 ? '+' : ''}${jobChange}% from last month`;
        elements.jobs.className = `metric-change ${jobChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (growth.applications) {
        const appChange = growth.applications;
        elements.applications.textContent = `${appChange > 0 ? '+' : ''}${appChange}% from last month`;
        elements.applications.className = `metric-change ${appChange >= 0 ? 'positive' : 'negative'}`;
    }
    
    if (growth.activeUsers) {
        const activeChange = growth.activeUsers;
        elements.activeUsers.textContent = `${activeChange > 0 ? '+' : ''}${activeChange}% from last month`;
        elements.activeUsers.className = `metric-change ${activeChange >= 0 ? 'positive' : 'negative'}`;
    }
}

// User Management
let userState = {
    currentPage: 1,
    totalPages: 1,
    searchTerm: '',
    roleFilter: 'all'
};

function renderUsers(users) {
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        
        // Format name based on role - ensuring we properly combine first_name and last_name
        let nameOrCompany = user.company_name || '-';
        if (user.role === 'employee') {
            const firstName = user.first_name || '';
            const lastName = user.last_name || '';
            nameOrCompany = `${firstName} ${lastName}`.trim() || '-';
        }
        
        // Format date
        const dateJoined = formatDate(user.created_at) || '-';
        
        // Determine role badge class
        const roleBadgeClass = `status-badge status-${user.role || 'employee'}`;
        
        row.innerHTML = `
            <td>${user.id || '-'}</td>
            <td>${nameOrCompany}</td>
            <td>${user.email || '-'}</td>
            <td><span class="${roleBadgeClass}">${user.role || 'unknown'}</span></td>
            <td>${dateJoined}</td>
            <td>
                <div class="action-buttons">              
                    <button class="action-btn delete-action" onclick="confirmDeleteUser(${user.id}, '${user.email}')">
                        <img src="../public/images/trash_icon.png" alt="Delete"> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// Format date helper function
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function searchUsers() {
    userState.searchTerm = document.getElementById('user-search').value.trim();
    userState.currentPage = 1;  // Reset to first page
    
    // Show searching indicator
    const tableBody = document.getElementById('users-table-body');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <div style="padding: 20px;">
                    <div style="font-size: 24px; margin-bottom: 10px;">🔍</div>
                    <div>Searching for users...</div>
                </div>
            </td>
        </tr>
    `;
    
    // Load users with search term
    loadUsers();
}

function filterUsers() {
    userState.roleFilter = document.getElementById('user-role-filter').value;
    userState.currentPage = 1;  // Reset to first page
    loadUsers();
}

function navigateUserPage(direction) {
    const newPage = userState.currentPage + direction;
    if (newPage >= 1 && newPage <= userState.totalPages) {
        userState.currentPage = newPage;
        loadUsers();
    }
}

function updateUserPagination() {
    const prevBtn = document.getElementById('prev-page-users');
    const nextBtn = document.getElementById('next-page-users');
    const pageInfo = document.getElementById('page-info-users');
    
    prevBtn.disabled = userState.currentPage === 1;
    nextBtn.disabled = userState.currentPage === userState.totalPages;
    
    pageInfo.textContent = `Page ${userState.currentPage} of ${userState.totalPages}`;
}

// Global function for confirmation dialog
window.confirmDeleteUser = function(userId, userEmail) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmButton = document.getElementById('confirm-action');
    
    confirmTitle.textContent = 'Delete User';
    confirmMessage.textContent = `Are you sure you want to delete user "${userEmail}"? This action cannot be undone.`;
    
    // Setup confirm button action
    confirmButton.onclick = function() {
        deleteUser(userId);
        confirmModal.style.display = 'none';
    };
    
    // Show the modal
    confirmModal.style.display = 'block';
};

// Global function to view user details
window.viewUserDetails = function(userId) {
    // Navigate to user report section and search for this user
    const reportTab = document.querySelector('[data-tab="reports-tab"]');
    if (reportTab) {
        // Switch to reports tab
        reportTab.click();
        
        // Generate user report
        generateUserReport(userId);
        
        // Scroll to the user report section
        document.getElementById('user-report-container').scrollIntoView({
            behavior: 'smooth'
        });
    }
};

// Job Management
let jobState = {
    currentPage: 1,
    totalPages: 1,
    searchTerm: '',
    statusFilter: 'all',
    categoryFilter: 'all'
};

function loadJobs() {
    const tableBody = document.getElementById('jobs-table-body');
    tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Loading jobs...</td></tr>';
    
    const params = new URLSearchParams({
        page: jobState.currentPage,
        search: jobState.searchTerm,
        status: jobState.statusFilter,
        category: jobState.categoryFilter
    });
    
    fetch(`/admin/jobs?${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.jobs && data.jobs.length > 0) {
                renderJobs(data.jobs);
                jobState.totalPages = data.totalPages || 1;
                updateJobPagination();
            } else {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center">No jobs found</td></tr>';
            }
        })
        .catch(error => {
            console.error('Error loading jobs:', error);
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center">Error loading jobs</td></tr>';
            showNotification('Failed to load jobs', 'error');
        });
}

function loadJobCategories() {
    fetch('/admin/job-categories')
        .then(response => response.json())
        .then(data => {
            if (data.categories && data.categories.length > 0) {
                populateCategories(data.categories);
            }
        })
        .catch(error => {
            console.error('Error loading job categories:', error);
        });
}

function populateCategories(categories) {
    const filterSelect = document.getElementById('job-category-filter');
    const editSelect = document.getElementById('edit-job-category');
    
    // Clear existing options except first one
    while (filterSelect.options.length > 1) filterSelect.remove(1);
    while (editSelect.options.length > 0) editSelect.remove(0);
    
    // Add categories to filter dropdown
    categories.forEach(category => {
        const filterOption = document.createElement('option');
        filterOption.value = category.id;
        filterOption.textContent = category.name;
        filterSelect.appendChild(filterOption);
        
        const editOption = document.createElement('option');
        editOption.value = category.id;
        editOption.textContent = category.name;
        editSelect.appendChild(editOption);
    });
}

function renderJobs(jobs) {
    const tableBody = document.getElementById('jobs-table-body');
    tableBody.innerHTML = '';
    
    jobs.forEach(job => {
        const row = document.createElement('tr');
        
        // Format date
        const postedDate = new Date(job.created_at).toLocaleDateString();
        
        // Create status badge
        const statusClass = job.is_open ? 'status-open' : 'status-closed';
        const statusText = job.is_open ? 'Open' : 'Closed';
        
        row.innerHTML = `
            <td>${job.id}</td>
            <td>${job.title || '-'}</td>
            <td>${job.company_name || '-'}</td>
            <td>${job.category || '-'}</td>
            <td>${job.location || '-'}</td>
            <td><span class="status-badge ${statusClass}">${statusText}</span></td>
            <td>${postedDate || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn edit-action" onclick="openEditJobModal(${job.id})">
                        <img src="../public/images/pen_icon.png" alt="Edit"> Edit
                    </button>
                    <button class="action-btn preview-action" onclick="openAdminJobModal(${job.id})">
                        <img src="../public/images/eye_icon.png" alt="Preview"> View
                    </button>
                    <button class="action-btn delete-action" onclick="confirmDeleteJob(${job.id})">
                        <img src="../public/images/trash_icon.png" alt="Delete"> Delete
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

// open detail modal with full job info
function openAdminJobModal(jobId) {
    fetch(`/admin/jobs/${jobId}`)
      .then(res => res.json())
      .then(job => {
        document.getElementById('job-detail-title').textContent = job.title;
        document.getElementById('job-detail-company').textContent = job.company_name;
        document.getElementById('job-detail-category').textContent = job.category;
        document.getElementById('job-detail-location').textContent = job.location;
        document.getElementById('job-detail-deadline').textContent = job.deadline || 'None';
        document.getElementById('job-detail-created').textContent = job.created_at;
        document.getElementById('job-detail-description').textContent = job.description;
        document.getElementById('job-detail-delete').onclick = () => {
          deleteJob(jobId);
          closeAdminJobModal();
        };
        document.getElementById('job-detail-modal').style.display = 'block';
      })
      .catch(console.error);
}

function closeAdminJobModal() {
    document.getElementById('job-detail-modal').style.display = 'none';
}

function searchJobs() {
    jobState.searchTerm = document.getElementById('job-search').value.trim();
    jobState.currentPage = 1;
    loadJobs();
}

function filterJobs() {
    jobState.statusFilter = document.getElementById('job-status-filter').value;
    jobState.categoryFilter = document.getElementById('job-category-filter').value;
    jobState.currentPage = 1;
    loadJobs();
}

function navigateJobPage(direction) {
    const newPage = jobState.currentPage + direction;
    if (newPage >= 1 && newPage <= jobState.totalPages) {
        jobState.currentPage = newPage;
        loadJobs();
    }
}

function updateJobPagination() {
    const prevBtn = document.getElementById('prev-page-jobs');
    const nextBtn = document.getElementById('next-page-jobs');
    const pageInfo = document.getElementById('page-info-jobs');
    
    prevBtn.disabled = jobState.currentPage === 1;
    nextBtn.disabled = jobState.currentPage === jobState.totalPages;
    pageInfo.textContent = `Page ${jobState.currentPage} of ${jobState.totalPages}`;
}

window.openEditJobModal = function(jobId) {
    fetch(`/admin/jobs/${jobId}`)
        .then(response => response.json())
        .then(job => {
            // Fill form with job data
            document.getElementById('edit-job-id').value = job.id;
            document.getElementById('edit-job-title').value = job.title || '';
            document.getElementById('edit-job-category').value = job.category_id || '';
            document.getElementById('edit-job-type').value = job.job_type || 'Full-time';
            document.getElementById('edit-job-location').value = job.location || '';
            document.getElementById('edit-job-status').value = job.is_open ? '1' : '0';
            document.getElementById('edit-job-description').value = job.description || '';
            
            // Show the modal
            document.getElementById('edit-job-modal').style.display = 'block';
        })
        .catch(error => {
            console.error('Error fetching job details:', error);
            showNotification('Failed to load job details', 'error');
        });
};

window.viewJobDetails = function(jobId) {
    window.open(`/admin/jobs/${jobId}/view`, '_blank');
};

window.confirmDeleteJob = function(jobId) {
    const confirmModal = document.getElementById('confirm-modal');
    const confirmTitle = document.getElementById('confirm-title');
    const confirmMessage = document.getElementById('confirm-message');
    const confirmButton = document.getElementById('confirm-action');
    
    confirmTitle.textContent = 'Delete Job Listing';
    confirmMessage.textContent = 'Are you sure you want to delete this job listing? This action cannot be undone.';
    
    // Setup confirm button action
    confirmButton.onclick = function() {
        deleteJob(jobId);
        confirmModal.style.display = 'none';
    };
    
    // Show the modal
    confirmModal.style.display = 'block';
};

function deleteJob(jobId) {
    fetch(`/admin/jobs/${jobId}`, {
        method: 'DELETE'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Job deleted successfully', 'success');
                loadJobs(); // Reload the job list
                loadDashboardStats(); // Update stats
            } else {
                throw new Error(data.message || 'Failed to delete job');
            }
        })
        .catch(error => {
            console.error('Error deleting job:', error);
            showNotification('Failed to delete job: ' + error.message, 'error');
        });
}

function handleEditJobSubmit(event) {
    event.preventDefault();
    
    const jobId = document.getElementById('edit-job-id').value;
    const jobData = {
        title: document.getElementById('edit-job-title').value,
        category_id: document.getElementById('edit-job-category').value,
        job_type: document.getElementById('edit-job-type').value,
        location: document.getElementById('edit-job-location').value,
        is_open: document.getElementById('edit-job-status').value === '1',
        description: document.getElementById('edit-job-description').value
    };
    
    fetch(`/admin/jobs/${jobId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(jobData)
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('Job updated successfully', 'success');
                document.getElementById('edit-job-modal').style.display = 'none';
                loadJobs(); // Reload the job list
            } else {
                throw new Error(data.message || 'Failed to update job');
            }
        })
        .catch(error => {
            console.error('Error updating job:', error);
            showNotification('Failed to update job: ' + error.message, 'error');
        });
}

// Reports & Analytics
let charts = {
    mainChart: null,
    userDistributionChart: null,
    jobCategoriesChart: null,
    userActivityChart: null
};

function initializeCharts() {
    // Initialize main chart
    const mainChartCtx = document.getElementById('main-chart').getContext('2d');
    charts.mainChart = new Chart(mainChartCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'User Growth',
                data: [0, 0, 0, 0, 0, 0],
                borderColor: '#4285f4',
                backgroundColor: 'rgba(66, 133, 244, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Month'
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: 'Value'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // Initialize user distribution chart
    const userDistributionCtx = document.getElementById('user-distribution-chart').getContext('2d');
    charts.userDistributionChart = new Chart(userDistributionCtx, {
        type: 'doughnut',
        data: {
            labels: ['Employees', 'Employers'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#4285f4', '#34a853'],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Initialize job categories chart
    const jobCategoriesCtx = document.getElementById('job-categories-chart').getContext('2d');
    charts.jobCategoriesChart = new Chart(jobCategoriesCtx, {
        type: 'bar',
        data: {
            labels: ['Category 1', 'Category 2', 'Category 3', 'Category 4', 'Category 5'],
            datasets: [{
                label: 'Jobs per Category',
                data: [0, 0, 0, 0, 0],
                backgroundColor: [
                    'rgba(66, 133, 244, 0.7)',
                    'rgba(52, 168, 83, 0.7)',
                    'rgba(251, 188, 5, 0.7)',
                    'rgba(234, 67, 53, 0.7)',
                    'rgba(128, 0, 128, 0.7)'
                ],
                borderColor: [
                    'rgba(66, 133, 244, 1)',
                    'rgba(52, 168, 83, 1)',
                    'rgba(251, 188, 5, 1)',
                    'rgba(234, 67, 53, 1)',
                    'rgba(128, 0, 128, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function updateReportView() {
    const reportType = document.getElementById('report-type').value;
    document.getElementById('chart-title').textContent = getReportTitle(reportType);
    
    // Load appropriate data based on report type
    switch(reportType) {
        case 'user-growth':
            loadUserGrowthData();
            break;
        case 'job-postings':
            loadJobPostingsData();
            break;
        case 'application-stats':
            loadApplicationStatsData();
            break;
        case 'user-activity':
            loadUserActivityData();
            break;
    }
}

function getReportTitle(reportType) {
    switch(reportType) {
        case 'user-growth':
            return 'User Growth Over Time';
        case 'job-postings':
            return 'Job Postings Over Time';
        case 'application-stats':
            return 'Application Statistics';
        case 'user-activity':
            return 'User Activity Metrics';
        default:
            return 'Report';
    }
}

function loadUserGrowthData() {
    fetch('/admin/reports/user-growth')
        .then(response => response.json())
        .then(data => {
            updateMainChart(data.labels, data.datasets, 'User Growth');
            updateDistributionChart(data.userDistribution);
            updateMetrics(data.metrics);
        })
        .catch(error => {
            console.error('Error loading user growth data:', error);
            showNotification('Failed to load report data', 'error');
        });
}

function loadJobPostingsData() {
    fetch('/admin/reports/job-postings')
        .then(response => response.json())
        .then(data => {
            updateMainChart(data.labels, data.datasets, 'Job Postings');
            updateJobCategoriesChart(data.jobCategories);
            updateMetrics(data.metrics);
        })
        .catch(error => {
            console.error('Error loading job postings data:', error);
            showNotification('Failed to load report data', 'error');
        });
}

function loadApplicationStatsData() {
    fetch('/admin/reports/application-stats')
        .then(response => response.json())
        .then(data => {
            updateMainChart(data.labels, data.datasets, 'Applications');
            updateApplicationStatusChart(data.statusDistribution);
            updateMetrics(data.metrics);
        })
        .catch(error => {
            console.error('Error loading application stats data:', error);
            showNotification('Failed to load report data', 'error');
        });
}

function loadUserActivityData() {
    fetch('/admin/reports/user-activity')
        .then(response => response.json())
        .then(data => {
            updateMainChart(data.labels, data.datasets, 'User Activity');
            updateActivityTypeChart(data.activityTypes);
            updateMetrics(data.metrics);
        })
        .catch(error => {
            console.error('Error loading user activity data:', error);
            showNotification('Failed to load report data', 'error');
        });
}

function updateMainChart(labels, datasets, label) {
    const chart = charts.mainChart;
    chart.data.labels = labels;
    chart.data.datasets[0].label = label;
    chart.data.datasets[0].data = datasets;
    chart.update();
}

function updateDistributionChart(distribution) {
    const chart = charts.userDistributionChart;
    chart.data.datasets[0].data = [distribution.employees || 0, distribution.employers || 0];
    chart.update();
}

function updateJobCategoriesChart(categories) {
    const chart = charts.jobCategoriesChart;
    chart.data.labels = categories.map(cat => cat.name);
    chart.data.datasets[0].data = categories.map(cat => cat.count);
    chart.update();
}

function updateApplicationStatusChart(statusData) {
    const chart = charts.userDistributionChart;
    chart.data.labels = Object.keys(statusData);
    chart.data.datasets[0].data = Object.values(statusData);
    chart.data.datasets[0].backgroundColor = [
        '#FBC02D', // Pending
        '#2196F3', // Under Review
        '#4CAF50', // Accepted
        '#F44336'  // Rejected
    ];
    chart.update();
}

function updateActivityTypeChart(activityData) {
    const chart = charts.userDistributionChart;
    chart.data.labels = Object.keys(activityData);
    chart.data.datasets[0].data = Object.values(activityData);
    chart.data.datasets[0].backgroundColor = [
        '#4285f4', // Logins
        '#34a853', // Applications
        '#fbbc05', // Profile Updates
        '#ea4335'  // Other
    ];
    chart.update();
}

function updateMetrics(metrics) {
    if (metrics.totalUsers !== undefined) {
        document.getElementById('metric-total-users').textContent = metrics.totalUsers;
    }
    if (metrics.newJobs !== undefined) {
        document.getElementById('metric-new-jobs').textContent = metrics.newJobs;
    }
    if (metrics.applications !== undefined) {
        document.getElementById('metric-applications').textContent = metrics.applications;
    }
    if (metrics.activeUsers !== undefined) {
        document.getElementById('metric-active-users').textContent = metrics.activeUsers;
    }
}

function generateReport() {
    const reportType = document.getElementById('report-type').value;
    
    // Show loading state
    document.getElementById('generate-report-btn').textContent = 'Generating...';
    document.getElementById('generate-report-btn').disabled = true;
    
    fetch(`/admin/reports/generate?type=${reportType}`)
        .then(response => response.json())
        .then(data => {
            // Update charts with new data
            updateReportView();
            showNotification('Report generated successfully', 'success');
        })
        .catch(error => {
            console.error('Error generating report:', error);
            showNotification('Failed to generate report', 'error');
        })
        .finally(() => {
            // Reset button state
            document.getElementById('generate-report-btn').textContent = 'Generate Report';
            document.getElementById('generate-report-btn').disabled = false;
        });
}

function exportReport() {
    const reportType = document.getElementById('report-type').value;
    window.open(`/admin/reports/export?type=${reportType}`, '_blank');
}

// User Reports
function searchUserForReport() {
    const searchTerm = document.getElementById('user-report-search').value.trim();
    if (!searchTerm) {
        showNotification('Please enter a search term', 'error');
        return;
    }
    
    fetch(`/admin/users/search?term=${encodeURIComponent(searchTerm)}`)
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                generateUserReport(data.user.id);
            } else {
                document.getElementById('user-report-container').classList.add('hidden');
                document.getElementById('user-report-placeholder').classList.remove('hidden');
                showNotification('No user found matching that search term', 'error');
            }
        })
        .catch(error => {
            console.error('Error searching for user:', error);
            showNotification('Failed to search for user', 'error');
        });
}

function generateUserReport(userId) {
    fetch(`/admin/users/${userId}/report`)
        .then(response => response.json())
        .then(data => {
            if (data.user) {
                renderUserReport(data);
                document.getElementById('user-report-container').classList.remove('hidden');
                document.getElementById('user-report-placeholder').classList.add('hidden');
            } else {
                throw new Error('No user data received');
            }
        })
        .catch(error => {
            console.error('Error generating user report:', error);
            showNotification('Failed to generate user report', 'error');
        });
}

function renderUserReport(data) {
    const user = data.user;
    
    // Set user identity
    document.getElementById('report-user-name').textContent = getUserDisplayName(user);
    document.getElementById('report-user-email').textContent = user.email;
    document.getElementById('report-user-role').textContent = capitalizeFirstLetter(user.role);
    document.getElementById('report-user-role').className = `status-badge status-${user.role}`;
    
    // Set user stats
    document.getElementById('user-account-age').textContent = data.accountAge;
    document.getElementById('user-last-active').textContent = data.lastActive || 'Never';
    document.getElementById('user-total-logins').textContent = data.totalLogins || 0;
    document.getElementById('user-total-applications').textContent = data.totalApplications || 0;
    
    // Show role-specific sections
    if (user.role === 'employee') {
        document.getElementById('employee-specific-section').classList.remove('hidden');
        document.getElementById('employer-specific-section').classList.add('hidden');
        renderEmployeeApplications(data.applications || []);
    } else if (user.role === 'employer') {
        document.getElementById('employee-specific-section').classList.add('hidden');
        document.getElementById('employer-specific-section').classList.remove('hidden');
        renderEmployerJobs(data.jobs || []);
    }
    
    // Update activity chart
    updateUserActivityChart(data.activityData || {});
}

function getUserDisplayName(user) {
    if (user.role === 'employee') {
        return `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown User';
    } else if (user.role === 'employer') {
        return user.company_name || 'Unknown Company';
    }
    return 'Unknown User';
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function renderEmployeeApplications(applications) {
    const tableBody = document.getElementById('employee-applications-table');
    tableBody.innerHTML = '';
    
    if (applications.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No applications found</td>';
        tableBody.appendChild(row);
        return;
    }
    
    applications.forEach(app => {
        const row = document.createElement('tr');
        
        const statusClass = getStatusClass(app.status);
        
        row.innerHTML = `
            <td>${app.job_title || '-'}</td>
            <td>${app.company || '-'}</td>
            <td>${formatDate(app.applied_date) || '-'}</td>
            <td><span class="status-badge-small ${statusClass}">${app.status || 'Unknown'}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

function renderEmployerJobs(jobs) {
    const tableBody = document.getElementById('employer-jobs-table');
    tableBody.innerHTML = '';
    
    if (jobs.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = '<td colspan="4" class="text-center">No jobs posted</td>';
        tableBody.appendChild(row);
        return;
    }
    
    jobs.forEach(job => {
        const row = document.createElement('tr');
        
        const statusClass = job.is_open ? 'status-open' : 'status-closed';
        const statusText = job.is_open ? 'Open' : 'Closed';
        
        row.innerHTML = `
            <td>${job.title || '-'}</td>
            <td>${formatDate(job.posted_date) || '-'}</td>
            <td>${job.applications_count || 0}</td>
            <td><span class="status-badge-small ${statusClass}">${statusText}</span></td>
        `;
        
        tableBody.appendChild(row);
    });
}

function updateUserActivityChart(activityData) {
    // Initialize user activity chart if not exists
    if (!charts.userActivityChart) {
        const ctx = document.getElementById('user-activity-chart').getContext('2d');
        charts.userActivityChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Activity Level',
                    data: [],
                    borderColor: '#4285f4',
                    backgroundColor: 'rgba(66, 133, 244, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Update chart with activity data
    charts.userActivityChart.data.labels = activityData.labels || [];
    charts.userActivityChart.data.datasets[0].data = activityData.data || [];
    charts.userActivityChart.update();
}

function exportUserReport() {
    const userEmail = document.getElementById('report-user-email').textContent;
    if (!userEmail) {
        showNotification('No user report to export', 'error');
        return;
    }
    
    window.open(`/admin/users/report/export?email=${encodeURIComponent(userEmail)}`, '_blank');
}

function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('pending')) return 'status-pending';
    if (statusLower.includes('review')) return 'status-under-review';
    if (statusLower.includes('accept')) return 'status-accepted';
    if (statusLower.includes('reject')) return 'status-rejected';
    
    return '';
}

function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
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

// Add window global for direct HTML access
window.viewUserReport = generateUserReport;
