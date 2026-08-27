// Event Details Page JavaScript

let currentEvent = null;
let isRegistered = false;
let isPastEvent = false;
let userRegistration = null;

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
      userRegistration = data.userRegistration;

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

  // Banner (only on public page)
  const bannerTitle = document.getElementById('eventTitleBanner');
  if (bannerTitle) {
    bannerTitle.textContent = currentEvent.title;
  }

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

  // Banner date (only on public page)
  const bannerDate = document.getElementById('eventDateBanner');
  if (bannerDate) {
    bannerDate.textContent = `📅 ${formattedDate} • ${currentEvent.startTime}`;
  }

  // Banner image (only on public page)
  const bannerBgLayer = document.getElementById('bannerBgLayer');
  if (bannerBgLayer && currentEvent.bannerImage) {
    bannerBgLayer.style.backgroundImage = `url(${currentEvent.bannerImage})`;
    const overlay = document.getElementById('bannerOverlay');
    if (overlay) overlay.style.display = 'block';
    const decorCircle = document.getElementById('decorCircle1');
    if (decorCircle) decorCircle.style.display = 'none';
  }

  // Check if user is registered and approved (for privacy controls)
  const isApproved = userRegistration && userRegistration.status === 'approved';

  // Venue (if physical or hybrid) - Only show to APPROVED users
  if (currentEvent.eventType === 'physical' || currentEvent.eventType === 'hybrid') {
    const venueCard = document.getElementById('venueCard');
    venueCard.style.display = 'block';

    if (isApproved) {
      // User is approved - show venue
      document.getElementById('eventVenue').textContent = currentEvent.venue || 'TBA';
    } else if (isRegistered && !isApproved) {
      // User registered but not approved - show pending message
      document.getElementById('eventVenue').innerHTML = `
        <div style="background: rgba(255,193,7,0.1); border: 1px solid #FFC107; border-radius: 8px; padding: 1rem; margin-top: 0.5rem;">
          <p style="color: #FFC107; margin: 0; font-size: 0.9rem;"><i class="fas fa-lock"></i> Venue details will be available once your registration is approved.</p>
        </div>
      `;
    } else {
      // User not registered - show register message
      document.getElementById('eventVenue').innerHTML = `
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 1rem; margin-top: 0.5rem;">
          <p style="color: #888; margin: 0; font-size: 0.9rem;"><i class="fas fa-lock"></i> Register for this event to access venue details.</p>
        </div>
      `;
    }
  }

  // Virtual Link (if virtual or hybrid) - Only show to APPROVED users
  if ((currentEvent.eventType === 'virtual' || currentEvent.eventType === 'hybrid') && currentEvent.virtualLink) {
    const virtualCard = document.getElementById('virtualLinkCard');
    virtualCard.style.display = 'block';

    if (isApproved) {
      // User is approved - show virtual link
      document.getElementById('virtualLink').href = currentEvent.virtualLink;
    } else if (isRegistered && !isApproved) {
      // User is registered but not approved - show message
      virtualCard.innerHTML = `
        <h3 style="color: #39FF14; margin-top: 0;"><i class="fas fa-video"></i> Join Virtually</h3>
        <div style="background: rgba(255,193,7,0.1); border: 1px solid #FFC107; border-radius: 8px; padding: 1.5rem;">
          <p style="color: #FFC107; margin: 0;"><i class="fas fa-lock"></i> Virtual link will be available once your registration is approved.</p>
        </div>
      `;
    } else if (!isRegistered) {
      // User not registered - show message to register
      virtualCard.innerHTML = `
        <h3 style="color: #39FF14; margin-top: 0;"><i class="fas fa-video"></i> Join Virtually</h3>
        <div style="background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; padding: 1.5rem;">
          <p style="color: #888; margin: 0;"><i class="fas fa-lock"></i> Register for this event to access the virtual meeting link.</p>
        </div>
      `;
    }
  }

  // Registrations
  document.getElementById('eventRegistrations').textContent = `${currentEvent.totalRegistrations} attendees`;

  // Badges (guarded — elements may not exist on all page variants)
  const typeBadge = document.getElementById('eventTypeBadge');
  if (typeBadge) {
    typeBadge.textContent = currentEvent.eventType.charAt(0).toUpperCase() + currentEvent.eventType.slice(1);
    typeBadge.style.color = '#fff';
  }

  const categoryBadge = document.getElementById('eventCategoryBadge');
  if (categoryBadge) {
    categoryBadge.textContent = (currentEvent.category || '').charAt(0).toUpperCase() + (currentEvent.category || '').slice(1);
    categoryBadge.style.color = '#fff';
  }

  const statusBadge = document.getElementById('eventStatusBadge');
  if (statusBadge) {
    if (isPastEvent) {
      statusBadge.textContent = 'Completed';
      statusBadge.style.background = 'rgba(100,100,100,0.2)';
      statusBadge.style.color = '#fff';
    } else {
      statusBadge.textContent = (currentEvent.status || '').charAt(0).toUpperCase() + (currentEvent.status || '').slice(1);
      statusBadge.style.background = 'rgba(57,255,20,0.2)';
      statusBadge.style.color = '#fff';
    }
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
  } else if (isRegistered && userRegistration) {
    // User is registered - show status based on their registration
    const status = userRegistration.status || 'pending';

    if (status === 'pending') {
      actionButtons.innerHTML = `
        <button style="background: rgba(255,193,7,0.2); color: #FFC107; border: 1px solid #FFC107; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: default;">
          <i class="fas fa-clock"></i> Pending Approval
        </button>
        <button onclick="cancelRegistration()" style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 0.8rem 2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
          <i class="fas fa-times"></i> Cancel Registration
        </button>
      `;
    } else if (status === 'approved') {
      actionButtons.innerHTML = `
        <button style="background: rgba(57,255,20,0.2); color: #39FF14; border: 1px solid #39FF14; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: default;">
          <i class="fas fa-check-circle"></i> Approved
        </button>
        <button onclick="cancelRegistration()" style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 0.8rem 2rem; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
          <i class="fas fa-times"></i> Cancel Registration
        </button>
      `;
    } else if (status === 'rejected') {
      actionButtons.innerHTML = `
        <button disabled style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: not-allowed;">
          <i class="fas fa-times-circle"></i> Registration Rejected
        </button>
        <p style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">${userRegistration.rejectionReason || 'No reason provided'}</p>
      `;
    }
  } else {
    const isOpen = currentEvent.isRegistrationOpen ?? true;
    const isFull = currentEvent.maxAttendees && currentEvent.totalApproved >= currentEvent.maxAttendees;

    if (!isOpen || isFull) {
      actionButtons.innerHTML = `
        <button disabled style="background: rgba(255,0,0,0.2); color: #ff5555; border: 1px solid #ff5555; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; cursor: not-allowed;">
          <i class="fas fa-ban"></i> Registration Closed
        </button>
      `;
    } else {
      const approvalNote = currentEvent.approvalType === 'manual' ?
        '<p style="color: #888; font-size: 0.85rem; margin-top: 0.5rem;">* Requires manual approval</p>' : '';

      // Check if we're on the public page
      const isPublicPage = typeof IS_PUBLIC_PAGE !== 'undefined' && IS_PUBLIC_PAGE === true;

      if (isPublicPage) {
        // On public page - redirect to dashboard event page
        const eventId = getEventIdFromUrl();
        actionButtons.innerHTML = `
          <button onclick="window.location.href='/dashboard/events/${eventId}'" style="background: #39FF14; color: #0a0a0a; border: none; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;">
            <i class="fas fa-ticket-alt"></i> Register Now
          </button>
          ${approvalNote}
        `;
      } else {
        if (typeof IS_LOGGED_IN !== 'undefined' && !IS_LOGGED_IN) {
        // Guest — prompt login
        const redirectUrl = encodeURIComponent(window.location.pathname);
        actionButtons.innerHTML = `
          <a href="/auth?redirect=${redirectUrl}" style="display:inline-flex;align-items:center;gap:.5rem;background:#39FF14;color:#0a0a0a;border:none;padding:1rem 2rem;border-radius:8px;font-size:1rem;font-weight:700;cursor:pointer;text-decoration:none">
            <i class="fas fa-sign-in-alt"></i> Login to Register
          </a>
          <p style="color:#888;font-size:.82rem;margin:.5rem 0 0">Create a free account to register for this event.</p>
        `;
      } else {
        // On dashboard page - use API registration
        actionButtons.innerHTML = `
          <button onclick="registerForEvent()" style="background: #39FF14; color: #0a0a0a; border: none; padding: 1rem 2rem; border-radius: 8px; font-size: 1rem; font-weight: 700; cursor: pointer;">
            <i class="fas fa-ticket-alt"></i> Register Now
          </button>
          ${approvalNote}
        `;
      }
      }
    }
  }
}

// Display attendees
function displayAttendees() {
  const attendeesList = document.getElementById('attendeesList');
  const attendeeCount = document.getElementById('attendeeCount');

  // Use server-computed counts — don't re-filter client side
  const total = currentEvent.totalRegistrations || 0;
  const approved = currentEvent.totalApproved || 0;
  const displayCount = approved > 0 ? approved : total;
  if (attendeeCount) attendeeCount.textContent = displayCount;

  // Show all registrations that have a username (populated)
  const regs = (currentEvent.registrations || []).filter(r => r.username || (r.user && r.user.username));

  if (!regs.length) {
    if (total > 0) {
      attendeesList.innerHTML = '<p style="color:#888;text-align:center;padding:2rem">Attendee list not available.</p>';
    } else {
      attendeesList.innerHTML = '<p style="color:#888;text-align:center;padding:2rem">No registrations yet. Be the first!</p>';
    }
    return;
  }

  attendeesList.innerHTML =
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.75rem;margin-top:.25rem">' +
    regs.map(function(reg) {
      var name = reg.username || (reg.user && reg.user.username) || '?';
      var ini  = name.charAt(0).toUpperCase();
      var statusDot = reg.status === 'approved'
        ? '<span style="color:#5ec213;font-size:.72rem"><i class="fas fa-check-circle"></i> Approved</span>'
        : reg.status === 'pending'
          ? '<span style="color:#f59e0b;font-size:.72rem"><i class="fas fa-clock"></i> Pending</span>'
          : '';
      var checkedInTag = reg.checkedIn
        ? '<span style="color:#39FF14;font-size:.72rem;margin-left:.35rem"><i class="fas fa-qrcode"></i> Checked in</span>' : '';
      return '<div style="background:rgba(57,255,20,.05);padding:.875rem;border-radius:10px;border:1px solid rgba(57,255,20,.15);display:flex;align-items:center;gap:.75rem">' +
        '<div style="width:36px;height:36px;border-radius:50%;background:#39FF14;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:.95rem;color:#0a0a0a;flex-shrink:0">' + ini + '</div>' +
        '<div style="min-width:0">' +
          '<p style="color:#fff;margin:0;font-weight:600;font-size:.875rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">@' + name + '</p>' +
          '<div style="margin-top:.15rem">' + statusDot + checkedInTag + '</div>' +
        '</div></div>';
    }).join('') +
    '</div>';
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
      // Set user registration status
      userRegistration = {
        status: data.status,
        registeredAt: new Date(),
        approvedAt: data.status === 'approved' ? new Date() : null
      };
      displayActionButtons();
      displayAttendees();
    } else {
      // Check if user needs to login (401 Unauthorized)
      if (response.status === 401) {
        // Redirect to dashboard event page for authentication
        const eventId = getEventIdFromUrl();
        const redirectUrl = `/dashboard/events/${eventId}`;
        const message = data.message || 'Please login to register for this event';

        if (confirm(message + '\n\nWould you like to login or create an account now?')) {
          // Redirect to login/signup page with redirect parameter
          window.location.href = `/auth?redirect=${encodeURIComponent(redirectUrl)}`;
        }
      } else {
        showNotification(data.message || 'Failed to register', 'error');
      }
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
      <a href="/dashboard/events" style="display: inline-block; margin-top: 1rem; background: #39FF14; color: #0a0a0a; padding: 0.8rem 1.5rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
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