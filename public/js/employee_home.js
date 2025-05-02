// Employee Home Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Get current user ID from localStorage
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        console.error('User not logged in');
        window.location.href = 'login.html';
        return;
    }
    
    // Fetch employee profile data
    fetchEmployeeProfile(userId);
    
    // Setup event listeners for other home page functionality
    setupEventListeners();
    
    // Fetch user's recent applications
    fetchRecentApplications();
});

/**
 * Fetch employee profile information and statistics from the server
 */
function fetchEmployeeProfile(userId) {
    fetch(`/dashboard/employee/profile/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch profile data');
            }
            return response.json();
        })
        .then(data => {
            updateProfileUI(data);
        })
        .catch(error => {
            console.error('Error:', error);
            showErrorMessage('Failed to load profile data. Please try again later.');
        });
}

/**
 * Update the UI with employee profile information
 */
function updateProfileUI(data) {
    // Update name and job title
    document.querySelector('#employee-name').textContent = 
        `${data.profile.first_name} ${data.profile.last_name}`;
    
    // Update categories/skills
    const categories = data.profile.categories.join(', ');
    document.querySelector('#employee-categories').textContent = categories || 'No categories specified';
    
    // Update statistics
    document.querySelector('#total-applications').textContent = data.stats.total_applications;
    document.querySelector('#interviews-count').textContent = data.stats.interviews;
    document.querySelector('#accepted-count').textContent = data.stats.accepted;
}

/**
 * Set up event listeners for home page interactions
 */
function setupEventListeners() {
    // Analytics button click handler
    const analyticsBtn = document.querySelector('#analytics-btn');
    if (analyticsBtn) {
        analyticsBtn.addEventListener('click', function() {
            window.location.href = 'employee_dashboard.html';
        });
    }
    
    // Add hover effects for job cards
    const jobCards = document.querySelectorAll('.job-match-card');
    
    jobCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.3)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.boxShadow = 'none';
        });
    });

    // Add click handlers for apply buttons
    const applyButtons = document.querySelectorAll('.apply-btn');
    
    applyButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get job title and company from closest job match card
            const jobCard = this.closest('.job-match-card');
            const jobTitle = jobCard.querySelector('h3').textContent;
            const companyName = jobCard.querySelector('.company-name').textContent;
            
            alert(`You are applying for: ${jobTitle} at ${companyName}`);
            // Here you would normally redirect to an application form or page
        });
    });

    // Add click handlers for save buttons
    const saveButtons = document.querySelectorAll('.save-btn');
    
    saveButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Toggle saved state
            if (this.textContent === 'Save') {
                this.textContent = 'Saved';
                this.style.backgroundColor = '#444';
            } else {
                this.textContent = 'Save';
                this.style.backgroundColor = '#2a2a2a';
            }
        });
    });
}

/**
 * Display an error message to the user
 */
function showErrorMessage(message) {
    // Simple implementation - you could enhance this with a toast or modal
    alert(message);
}

// Function to fetch recent applications for the current user
function fetchRecentApplications() {
    const container = document.getElementById('recent-applications-container');
    if (!container) return;
    
    const loadingElement = document.getElementById('applications-loading');
    
    // Get current user ID
    const userId = localStorage.getItem('user_id');
    if (!userId) {
        console.error('User not logged in');
        if (loadingElement) loadingElement.remove();
        container.innerHTML = '<tr><td colspan="5" class="error-message">Please log in to view your applications</td></tr>';
        return;
    }
    
    // Fetch from the dashboard API which contains application data
    fetch(`/dashboard/employee/${userId}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch application data');
            }
            return response.json();
        })
        .then(data => {
            // Remove loading indicator
            if (loadingElement) {
                loadingElement.remove();
            }
            
            // Get the applications from the response
            const applications = data.applications || [];
            
            // Check if there are applications
            if (applications.length === 0) {
                container.innerHTML = '<tr><td colspan="5" class="no-applications">You haven\'t submitted any applications yet.</td></tr>';
                return;
            }
            
            // Clear container
            container.innerHTML = '';
            
            // Get just the most recent 5 applications for this section
            const recentApps = applications.slice(0, 4);
            
            // Create HTML for each application
            recentApps.forEach(app => {
                // Extract job title from subject (usually starts with "Application for: ")
                let jobTitle = app.subject;
                if (jobTitle.toLowerCase().startsWith('application for:')) {
                    jobTitle = jobTitle.split(':', 2)[1].trim();
                }
                
                // Extract company name
                const companyName = app.job_company || app.recipient_email.split('@')[0];
                
                // Format date
                const appDate = new Date(app.created_at);
                const formattedDate = appDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
                
                // Determine status class
                const statusClass = getStatusClass(app.status);
                
                // Create the row element
                const tr = document.createElement('tr');
                tr.className = 'application-row';
                tr.innerHTML = `
                    <td class="position-cell">${jobTitle}</td>
                    <td class="company-cell">${companyName}</td>
                    <td class="date-cell">${formattedDate}</td>
                    <td class="status-cell">
                        <span class="status-badge ${statusClass}">${app.status || 'Pending'}</span>
                    </td>
                    <td class="actions-cell">
                        <button class="view-btn">View</button>
                    </td>
                `;
                
                // Add click event to view button
                const viewBtn = tr.querySelector('.view-btn');
                viewBtn.addEventListener('click', () => {
                    window.location.href = `employee_inbox.html?message_id=${app.id}`;
                });
                
                container.appendChild(tr);
            });
        })
        .catch(error => {
            console.error('Error:', error);
            if (loadingElement) loadingElement.remove();
            container.innerHTML = '<tr><td colspan="5" class="error-message">Failed to load applications. Please try again later.</td></tr>';
        });
}

// Helper function to get the CSS class for each status
function getStatusClass(status) {
    if (!status) return '';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('under review')) return 'status-under-review';
    if (statusLower.includes('accept') || statusLower.includes('interview')) return 'status-accepted';
    if (statusLower.includes('reject') || statusLower.includes('not selected')) return 'status-rejected';
    return ''; // Default (Pending)
}
