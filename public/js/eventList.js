async function loadEvents() {
  try {
    const response = await fetch('/api/events', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    if (!data.success) {
      showError('Failed to load events');
      return;
    }

    renderEvents(data.activeEvents, 'activeEventsContainer', 'Upcoming');
    renderEvents(data.pastEvents, 'pastEventsContainer', 'Past');
    renderEvents(data.userRegisteredEvents, 'userRegisteredEventsContainer', 'Registered');
  } catch (error) {
    console.error('Error loading events:', error);
    showError('Error loading events');
  }
}

// Render events into the specified container
function renderEvents(events, containerId, type) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  if (!events || events.length === 0) {
    container.innerHTML = `<p style="color:#888; text-align:center; padding:2rem;">No ${type.toLowerCase()} events found.</p>`;
    return;
  }

  const eventCards = events.map(event => `
    <div style="background:rgba(57,255,20,0.05); border:1px solid rgba(57,255,20,0.2); padding:1.5rem; border-radius:12px; margin-bottom:1rem;">
      <h3 style="color:#39FF14;">${event.title}</h3>
      <p style="color:#ccc;">${event.description || 'No description'}</p>
      <p style="color:#888; font-size:0.9rem;">
        <i class="fas fa-calendar"></i> ${new Date(event.startDate).toLocaleDateString()} 
        | ${event.eventType || 'Online'}
      </p>
      <a href="/dashboard/events/${event._id}" 
         style="display:inline-block; margin-top:0.5rem; background:#39FF14; color:#0a0a0a; padding:0.6rem 1.2rem; border-radius:8px; text-decoration:none; font-weight:600;">
         View Details
      </a>
    </div>
  `).join('');

  container.innerHTML = eventCards;
}

// Simple error display
function showError(message) {
  document.querySelectorAll('#userRegisteredEventsContainer, #activeEventsContainer, #pastEventsContainer')
    .forEach(c => c.innerHTML = `<p style="color:#ff5555; text-align:center; padding:2rem;">${message}</p>`);
}

// Initialize
window.addEventListener('DOMContentLoaded', loadEvents);
