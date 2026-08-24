// Event Details Page JavaScript

let currentEvent = null;
let isRegistered = false;
let isPastEvent = false;

// Get event ID from URL
function getEventIdFromUrl() {
  const pathParts = window.location.pathname.split('/');
  return pathParts[pathParts.length - 1];
}

// Load event details
async function loadEventDetails() {
  const eventId = getEventIdFromUrl();
  
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      currentEvent = data.event;
      isRegistered = data.isRegistered;
      isPastEvent = data.isPast;
      
      displayEventDetails();
    } else {
      showError('Event not found');
    }
  } catch (error) {
    console.error('Load event error:', error);
    showError('Failed to load event details');
  }
}

// Display event details
function displayEventDetails() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('eventDetailsContent').style.display = 'block';

  // Title
  document.getElementById('eventTitle').textContent = currentEvent.title;
  document.getElementById('eventTitleMain').textContent = currentEvent.title;
  
  // Description
  document.getElementById('eventDescription').textContent = currentEvent.description;

  // Date and Time
  const startDate = new Date(currentEvent.startDate);
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  document.getElementById('eventDate').textContent = formattedDate;
  document.getElementById('eventTime').textContent = `${currentEvent.startTime} - ${currentEvent.endTime} ${currentEvent.timezone}`;

  // Venue (if physical or hybrid)
  if (currentEvent.eventType === 'physical' || currentEvent.eventType === 'hybrid') {
    document.getElementById('venueCard').style.display = 'block';
    document.getElementById('eventVenue').textContent = currentEvent.venue;
  }

  // Virtual Link (if virtual or hybrid)
  if ((currentEvent.eventType === 'virtual' || currentEvent.eventType === 'hybrid') && currentEvent.virtualLink) {
    const virtualCard = document.getElementById('virtualLinkCard');
    virtualCard.style.display = 'block';
    document.getElementById('virtualLink').href = currentEvent.virtualLink;
  }

  // Registrations
  document.getElementById('eventRegistrations').textContent = `${currentEvent.totalRegistrations} attendees`;

  // Badges
  document.getElementById('eventTypeBadge').textContent = currentEvent.eventType.charAt(0).toUpperCase() + currentEvent.eventType.slice(1);
  document.getElementById('eventCategoryBadge').textContent = currentEvent.category.charAt(0).toUpperCase() + currentEvent.category.slice(1);
  
  const statusBadge = document.getElementById('eventStatusBadge');
  if (isPastEvent) {
    statusBadge.textContent = 'Completed';
    statusBadge.style.background = 'rgba(100,100,100,0.2)';
    statusBadge.style.color = '#888';
  } else {
    statusBadge.textContent = currentEvent.status.charAt(0).toUpperCase() + currentEvent.status.slice(1);
    statusBadge.style.background = 'rgba(57,255,20,0.2)';
    statusBadge.style.color = '#39FF14';
  }

  // Prize Pool
  if (currentEvent.prizePool) {
    document.getElementById('prizePoolCard').style.display = 'block';
    document.getElementById('prizePool').textContent = currentEvent.prizePool;
  }

  // Requirements
  if (currentEvent.requirements && currentEvent.requirements.length > 0) {
    document.getElementById('requirementsCard').style.display = 'block';
    const requirementsList = document.getElementById('requirementsList');
    requirementsList.innerHTML = currentEvent.requirements.map(req => `<li>${req}</li>`).join('');
  }

  // Agenda
  if (currentEvent.agenda && currentEvent.agenda.length > 0) {
    document.getElementById('agendaCard').style.display = 'block';
    const agendaList = document.getElementById('agendaList');
    agendaList.innerHTML = currentEvent.agenda.map(item => `
      <div style="display: flex; gap: 1rem; padding: 1rem; background: rgba(57,255,20,0.05); border-radius: 8px; margin-bottom: 0.8rem;">
        <div style="min-width: 100px; color: #39FF14; font-weight: 600;">${item.time}</div>
        <div style="color: #ccc;">${item.activity}</div>
      </div>
    `).join('');
  }

  // Speakers
  if (currentEvent.speakers && currentEvent.speakers.length > 0) {
    document.getElementById('speakersCard').style.display = 'block';
    const speakersList = document.getElementById('speakersList');
    speakersList.innerHTML = currentEvent.speakers.map(speaker => `
      <div style="background: rgba(57,255,20,0.05); padding: 1.5rem; border-radius: 12px; border: 1px solid rgba(57,255,20,0.2);">
        ${speaker.image ? `<img src="${speaker.image}" alt="${speaker.name}" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; margin-bottom: 1rem;">` : ''}
        <h4 style="color: #39FF14; margin: 0 0 0.3rem 0;">${speaker.name}</h4>
        <p style="color: #888; font-size: 0.9rem; margin: 0 0 0.8rem 0;">${speaker.title}</p>
        <p style="color: #ccc; font-size: 0.85rem; line-height: 1.5;">${speaker.bio}</p>
      </div>
    `).join('');
  }

  // Action Buttons
  displayActionButtons();

  // Attendees
  displayAttendees();
}

// Display action buttons
function displayActionButtons() {
  const actionButtons = document.getElementById('actionButtons');
  
  if (isPastEvent) {
    actionButtons.innerHTML = `
      <button disabled style="background: rgba(100,100,100,0.2); color: #888; border: 1px solid #888; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: not-allowed;">
        <i class="fas fa-calendar-check"></i> Event Ended
      </button>
    `;
  } else if (isRegistered) {
    actionButtons.innerHTML = `
      <button style="background: rgba(57,255,20,0.2); color: #39FF14; border: 1px solid #39FF14; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: default;">
        <i class="fas fa-check-circle"></i> Registered
      </button>
      <button onclick="cancelRegistration()" style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 0.8rem 2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
        <i class="fas fa-times"></i> Cancel Registration
      </button>
    `;
  } else {
    actionButtons.innerHTML = `
      <button onclick="registerForEvent()" style="background: #39FF14; color: #0a0a0a; border: none; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;">
        <i class="fas fa-ticket-alt"></i> Register Now
      </button>
    `;
  }
}

// Display attendees
function displayAttendees() {
  const attendeesList = document.getElementById('attendeesList');
  const attendeeCount = document.getElementById('attendeeCount');
  
  attendeeCount.textContent = currentEvent.totalRegistrations;

  if (currentEvent.registrations.length === 0) {
    attendeesList.innerHTML = '<p style="color: #888; text-align: center; padding: 2rem;">No registrations yet. Be the first to register!</p>';
    return;
  }

  attendeesList.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;">
      ${currentEvent.registrations.map(reg => `
        <div style="background: rgba(57,255,20,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(57,255,20,0.2);">
          <div style="display: flex; align-items: center; gap: 0.8rem;">
            <div style="width: 40px; height: 40px; background: #39FF14; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #0a0a0a; font-weight: 700; font-size: 1.2rem;">
              ${reg.username.charAt(0).toUpperCase()}
            </div>
            <div style="flex: 1;">
              <p style="color: #fff; margin: 0; font-weight: 600;">${reg.username}</p>
              ${reg.checkedIn ? '<p style="color: #39FF14; margin: 0.2rem 0 0 0; font-size: 0.8rem;"><i class="fas fa-check-circle"></i> Checked In</p>' : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// Register for event
async function registerForEvent() {
  const eventId = getEventIdFromUrl();
  
  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Successfully registered! Check your email for confirmation.', 'success');
      isRegistered = true;
      currentEvent = data.event;
      displayActionButtons();
      displayAttendees();
    } else {
      showNotification(data.message || 'Failed to register', 'error');
    }
  } catch (error) {
    console.error('Registration error:', error);
    showNotification('Error registering for event', 'error');
  }
}

// Cancel registration
async function cancelRegistration() {
  if (!confirm('Are you sure you want to cancel your registration?')) {
    return;
  }

  const eventId = getEventIdFromUrl();
  
  try {
    const response = await fetch(`/api/events/${eventId}/cancel`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (data.success) {
      showNotification('Registration cancelled successfully', 'success');
      // Reload page to update
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      showNotification(data.message || 'Failed to cancel registration', 'error');
    }
  } catch (error) {
    console.error('Cancel error:', error);
    showNotification('Error cancelling registration', 'error');
  }
}

// Show error message
function showError(message) {
  document.getElementById('loadingState').innerHTML = `
    <div style="text-align: center; padding: 3rem;">
      <i class="fas fa-exclamation-circle" style="font-size: 3rem; color: #ff5555;"></i>
      <p style="color: #ff5555; margin-top: 1rem; font-size: 1.2rem;">${message}</p>
      <a href="events.html" style="display: inline-block; margin-top: 1rem; background: #39FF14; color: #0a0a0a; padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Back to Events
      </a>
    </div>
  `;
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
function handleLogout(event) {
  event.preventDefault();
  if (confirm('Are you sure you want to logout?')) {
    window.location.href = '/auth/logout';
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
`;
document.head.appendChild(style);

// Initialize on page load
window.addEventListener('load', loadEventDetails);