/* ── Event list with caching + skeleton loading ── */
const _evCache = { data: null, ts: 0, TTL: 60000 };

function evSkeleton(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = [1,2].map(() =>
        '<div class="skeleton sk-block" style="margin-bottom:.75rem;height:110px"></div>'
    ).join('');
}

async function loadEvents() {
    ['activeEventsContainer','pastEventsContainer','userRegisteredEventsContainer'].forEach(evSkeleton);
    try {
        let data;
        if (_evCache.data && (Date.now() - _evCache.ts) < _evCache.TTL) {
            data = _evCache.data;
        } else {
            const res = await fetch('/api/events', { headers: { 'Content-Type': 'application/json' } });
            data = await res.json();
            if (data.success) { _evCache.data = data; _evCache.ts = Date.now(); }
        }
        if (!data.success) { showEvError('Failed to load events'); return; }
        renderEvents(data.activeEvents,         'activeEventsContainer',        'Upcoming');
        renderEvents(data.pastEvents,           'pastEventsContainer',          'Past');
        renderEvents(data.userRegisteredEvents, 'userRegisteredEventsContainer','Registered');
    } catch (err) {
        console.error('Error loading events:', err);
        showEvError('Error loading events');
    }
}

function renderEvents(events, containerId, type) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!events || !events.length) {
        container.innerHTML = '<div style="text-align:center;padding:2rem 1rem;color:var(--text-3,#5A7A56);font-size:.875rem"><i class="fas fa-calendar-xmark" style="display:block;font-size:1.5rem;margin-bottom:.5rem"></i>No ' + type.toLowerCase() + ' events found.</div>';
        return;
    }
    container.innerHTML = events.map(ev => {
        const date = new Date(ev.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        const desc = ev.description ? ev.description.substring(0,110)+(ev.description.length>110?'...':'') : 'No description';
        return `<div style="background:rgba(94,194,19,.05);border:1px solid rgba(94,194,19,.18);padding:1.25rem;border-radius:14px;margin-bottom:.875rem;transition:border-color .25s"
            onmouseenter="this.style.borderColor='rgba(94,194,19,.35)'" onmouseleave="this.style.borderColor='rgba(94,194,19,.18)'">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap">
                <div style="flex:1;min-width:0">
                    <h3 style="font-size:1rem;font-weight:800;color:var(--text,#E8F5E2);margin-bottom:.35rem">${ev.title}</h3>
                    <p style="color:var(--text-2,#8AAF85);font-size:.8375rem;line-height:1.6;margin-bottom:.5rem">${desc}</p>
                    <div style="display:flex;gap:.75rem;flex-wrap:wrap;font-size:.75rem;color:var(--text-3,#5A7A56)">
                        <span><i class="fas fa-calendar-alt" style="color:var(--green,#5EC213);margin-right:.3rem"></i>${date}</span>
                        <span><i class="fas fa-tag" style="color:var(--green,#5EC213);margin-right:.3rem"></i>${ev.eventType||'Online'}</span>
                        ${ev.location?`<span><i class="fas fa-map-pin" style="color:var(--green,#5EC213);margin-right:.3rem"></i>${ev.location}</span>`:''}
                    </div>
                </div>
                <a href="/dashboard/events/${ev._id}" style="display:inline-flex;align-items:center;gap:.4rem;padding:.55rem 1.1rem;background:linear-gradient(135deg,#5EC213,#45960E);color:#000;border-radius:10px;text-decoration:none;font-weight:800;font-size:.8125rem;white-space:nowrap;flex-shrink:0">
                    View <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>`;
    }).join('');
}

function showEvError(msg) {
    ['activeEventsContainer','pastEventsContainer','userRegisteredEventsContainer'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="text-align:center;padding:2rem;color:#f87171;font-size:.875rem"><i class="fas fa-circle-xmark" style="display:block;font-size:1.25rem;margin-bottom:.5rem"></i>' + msg + '</div>';
    });
}

document.addEventListener('DOMContentLoaded', loadEvents);
