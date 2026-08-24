// Learn Page JavaScript

let userApplications = [];

// Load user applications on page load
async function loadUserApplications() {
  try {
    const response = await fetch('/api/learn/my-applications', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      userApplications = data.applications;
      displayUserApplications();
    } else {
      console.error('Failed to load applications');
    }
  } catch (error) {
    console.error('Error loading applications:', error);
  }
}

// Display user applications
function displayUserApplications() {
  const container = document.getElementById('myApplicationsContainer');
  
  if (!container) return;

  if (userApplications.length === 0) {
    container.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No applications yet. Apply for a course above!</p>';
    return;
  }

  container.innerHTML = userApplications.map(app => {
    const appliedDate = new Date(app.appliedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let statusBadge = '';
    let statusMessage = '';

    switch(app.status) {
      case 'approved':
        statusBadge = '<span class="status-badge status-approved">✓ Admitted</span>';
        statusMessage = '<p style="color: #39FF14; font-size: 0.9rem; margin-top: 1rem;">🎉 Congratulations! Check your email for course details.</p>';
        break;
      case 'pending':
        statusBadge = '<span class="status-badge status-pending">⏳ Pending</span>';
        statusMessage = '<p style="color: #888; font-size: 0.9rem; margin-top: 1rem;">Your application is being reviewed.</p>';
        break;
      case 'rejected':
        statusBadge = '<span class="status-badge" style="background: rgba(255,0,0,0.2); color: #ff5555;">✗ Not Accepted</span>';
        statusMessage = '<p style="color: #888; font-size: 0.9rem; margin-top: 1rem;">You can apply again in the future.</p>';
        break;
      case 'waitlisted':
        statusBadge = '<span class="status-badge" style="background: rgba(255,149,0,0.2); color: #ff9500;">⏰ Waitlisted</span>';
        statusMessage = '<p style="color: #ff9500; font-size: 0.9rem; margin-top: 1rem;">You\'re on the waitlist. We\'ll notify you if a spot opens.</p>';
        break;
    }

    return `
      <div class="bounty-item">
        <div class="bounty-header">
          <div>
            <div class="bounty-title">${app.course}</div>
            <p style="color: #888; font-size: 0.85rem; margin-top: 0.5rem;">Applied: ${appliedDate}</p>
          </div>
          ${statusBadge}
        </div>
        ${statusMessage}
        ${app.status === 'pending' ? `
          <button onclick="cancelApplication('${app._id}')" style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 0.5rem 1rem; border-radius: 6px; margin-top: 0.5rem; cursor: pointer; font-size: 0.85rem;">
            Cancel Application
          </button>
        ` : ''}
      </div>
    `;
  }).join('');
}

// Handle course application form submission
async function handleApplicationSubmit(event) {
  event.preventDefault();

  const formData = {
    course: document.getElementById('courseSelect').value,
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    twitterHandle: document.getElementById('twitter').value,
    motivation: document.getElementById('motivation').value,
    experience: document.getElementById('experience').value
  };

  // Validate
  if (!formData.course || !formData.fullName || !formData.email || !formData.motivation) {
    showNotification('Please fill all required fields', 'error');
    return;
  }

  try {
    const response = await fetch('/api/learn/apply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Application submitted successfully! Check your email for confirmation.', 'success');
      
      // Reset form
      document.getElementById('courseApplicationForm').reset();
      
      // Reload applications
      await loadUserApplications();
    } else {
      showNotification(data.message || 'Failed to submit application', 'error');
    }
  } catch (error) {
    console.error('Application error:', error);
    showNotification('Error submitting application', 'error');
  }
}

// Cancel application
async function cancelApplication(applicationId) {
  if (!confirm('Are you sure you want to cancel this application?')) {
    return;
  }

  try {
    const response = await fetch(`/api/learn/applications/${applicationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Application cancelled successfully', 'success');
      await loadUserApplications();
    } else {
      showNotification(data.message || 'Failed to cancel application', 'error');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    showNotification('Error cancelling application', 'error');
  }
}

// Show notification
function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? 'rgba(57,255,20,0.2)' : type === 'error' ? 'rgba(255,0,0,0.2)' : 'rgba(57,255,20,0.1)'};
    border: 1px solid ${type === 'success' ? '#39FF14' : type === 'error' ? '#ff5555' : '#39FF14'};
    color: ${type === 'success' ? '#39FF14' : type === 'error' ? '#ff5555' : '#ffffff'};
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 1000;
    animation: slideIn 0.3s ease;
    max-width: 400px;
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Handle logout
async function handleLogout(event) {
  event.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST'
      });
      if (response.ok) {
        window.location.href = '/auth';
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group label {
    display: block;
    color: #39FF14;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(57, 255, 20, 0.3);
    border-radius: 8px;
    color: #ffffff;
    font-family: 'Space Grotesk', sans-serif;
  }

  .form-group textarea {
    min-height: 120px;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #39FF14;
  }

  .btn-primary {
    background: #39FF14;
    color: #0a0a0a;
    border: none;
    padding: 1rem 2rem;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    font-size: 1rem;
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    background: #2dd10d;
    transform: translateY(-2px);
  }

  .btn-primary:active {
    transform: translateY(0);
  }
`;
document.head.appendChild(style);

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
  // Load user applications
  loadUserApplications();

  // Attach form submit handler
  const form = document.getElementById('courseApplicationForm');
  if (form) {
    form.addEventListener('submit', handleApplicationSubmit);
  }
});