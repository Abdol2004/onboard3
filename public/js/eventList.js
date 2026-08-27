/* ── Event list — card grid with banner image + attendee count ── */
const _evCache = { data: null, ts: 0, TTL: 60000 };

function evSkeleton(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = [1,2,3].map(function() {
        return '<div class="ev-card-skeleton"><div class="ev-card-img-skeleton"></div><div style="padding:1rem"><div class="sk-line" style="width:65%;height:14px;margin-bottom:.6rem"></div><div class="sk-line" style="width:45%;height:11px;margin-bottom:.4rem"></div><div class="sk-line" style="width:35%;height:11px"></div></div></div>';
    }).join('');
}

async function loadEvents() {
    ['activeEventsContainer','pastEventsContainer','userRegisteredEventsContainer'].forEach(evSkeleton);
    try {
        var data;
        if (_evCache.data && (Date.now() - _evCache.ts) < _evCache.TTL) {
            data = _evCache.data;
        } else {
            var res = await fetch('/api/events', { headers: { 'Content-Type': 'application/json' } });
            data = await res.json();
            if (data.success) { _evCache.data = data; _evCache.ts = Date.now(); }
        }
        if (!data.success) { showEvError('Failed to load events'); return; }
        renderEvents(data.activeEvents,         'activeEventsContainer',        false);
        renderEvents(data.pastEvents,           'pastEventsContainer',          true);
        renderEvents(data.userRegisteredEvents, 'userRegisteredEventsContainer', false);
    } catch (err) {
        console.error('Error loading events:', err);
        showEvError('Error loading events');
    }
}

function renderEvents(events, containerId, isPast) {
    var container = document.getElementById(containerId);
    if (!container) return;
    if (!events || !events.length) {
        container.innerHTML = '<div style="text-align:center;padding:2.5rem 1rem;color:var(--text-3,#5A7A56);font-size:.875rem"><i class="fas fa-calendar-xmark" style="display:block;font-size:1.75rem;margin-bottom:.6rem;opacity:.5"></i>No events here yet.</div>';
        return;
    }

    /* Gradient fallbacks when no banner image */
    var gradients = [
        'linear-gradient(135deg,#0d2b0a 0%,#1a4a15 100%)',
        'linear-gradient(135deg,#0a1a2e 0%,#0d3060 100%)',
        'linear-gradient(135deg,#1a0a2e 0%,#3a0d60 100%)',
        'linear-gradient(135deg,#2e0a0a 0%,#601a0d 100%)',
        'linear-gradient(135deg,#0a2e2e 0%,#0d6060 100%)'
    ];

    container.innerHTML = events.map(function(ev, idx) {
        var date    = new Date(ev.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
        var time    = ev.startTime ? (ev.startTime + (ev.timezone ? ' ' + ev.timezone : '')) : '';
        var total   = ev.totalRegistrations || 0;
        var approved = ev.totalApproved || 0;
        var attendees = approved > 0 ? approved : total;

        var typeLabel = ev.eventType === 'virtual' ? 'Virtual' : ev.eventType === 'physical' ? 'In-Person' : ev.eventType === 'hybrid' ? 'Hybrid' : 'Event';
        var typeIcon  = ev.eventType === 'virtual' ? 'fa-video' : ev.eventType === 'physical' ? 'fa-map-marker-alt' : 'fa-layer-group';

        var location  = ev.venue || ev.city || null;

        var imgBg = ev.bannerImage
            ? 'background-image:url(' + ev.bannerImage + ');background-size:cover;background-position:center'
            : gradients[idx % gradients.length];

        var statusBadge = isPast
            ? '<span style="background:rgba(0,0,0,.5);color:#aaa;border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:.2rem .6rem;font-size:.65rem;font-weight:700;text-transform:uppercase">Ended</span>'
            : ev.status === 'ongoing'
                ? '<span style="background:rgba(57,255,20,.25);color:#5ec213;border:1px solid rgba(57,255,20,.4);border-radius:20px;padding:.2rem .6rem;font-size:.65rem;font-weight:700;text-transform:uppercase"><i class="fas fa-circle" style="font-size:.4rem;vertical-align:middle"></i> Live</span>'
                : '<span style="background:rgba(0,0,0,.4);color:#ccc;border:1px solid rgba(255,255,255,.15);border-radius:20px;padding:.2rem .6rem;font-size:.65rem;font-weight:700;text-transform:uppercase">Upcoming</span>';

        var approvalBadge = ev.approvalType === 'manual'
            ? '<span style="background:rgba(245,158,11,.15);color:#f59e0b;border:1px solid rgba(245,158,11,.3);border-radius:20px;padding:.2rem .55rem;font-size:.65rem;font-weight:700"><i class="fas fa-user-check"></i> Manual</span>'
            : '';

        return '<a href="/dashboard/events/' + ev._id + '" class="ev-card">' +
            /* Image */
            '<div class="ev-card-img" style="' + imgBg + '">' +
                (ev.bannerImage ? '<div class="ev-card-img-overlay"></div>' : '') +
                '<div class="ev-card-badges">' + statusBadge + '</div>' +
                '<div class="ev-card-type-badge"><i class="fas ' + typeIcon + '"></i> ' + typeLabel + '</div>' +
            '</div>' +
            /* Body */
            '<div class="ev-card-body">' +
                '<h3 class="ev-card-title">' + ev.title + '</h3>' +
                '<div class="ev-card-meta">' +
                    '<span><i class="fas fa-calendar-alt"></i> ' + date + (time ? ' · ' + time : '') + '</span>' +
                    (location ? '<span><i class="fas fa-map-marker-alt"></i> ' + location + '</span>' : '') +
                '</div>' +
                '<div class="ev-card-footer">' +
                    '<span class="ev-card-attendees"><i class="fas fa-users"></i> ' + attendees.toLocaleString() + ' registered</span>' +
                    '<span class="ev-card-cta">View <i class="fas fa-arrow-right"></i></span>' +
                '</div>' +
            '</div>' +
        '</a>';
    }).join('');
}

function showEvError(msg) {
    ['activeEventsContainer','pastEventsContainer','userRegisteredEventsContainer'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.innerHTML = '<div style="text-align:center;padding:2rem;color:#f87171;font-size:.875rem"><i class="fas fa-circle-xmark" style="display:block;font-size:1.25rem;margin-bottom:.5rem"></i>' + msg + '</div>';
    });
}

document.addEventListener('DOMContentLoaded', loadEvents);
