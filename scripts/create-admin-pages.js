const fs = require('fs');
const path = require('path');

const base = 'c:/Users/admin/Desktop/onboarder/views/admin/pages/';

const pageTemplate = (config) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
    <title>${config.title} — ONBOARD3 Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
<div class="a-bg"></div>
<%- include('../partials/nav', { page:'${config.page}', admin:user }) %>

<div class="a-main">
    <div class="a-content">
        <div class="a-page-header">
            <div>
                <h1><i class="fas ${config.icon}"></i> ${config.title}</h1>
                <p>${config.subtitle}</p>
            </div>
            ${config.action || ''}
        </div>

        <div class="a-card">
            <div class="a-table-wrap">
                <table class="at">
                    <thead><tr>${config.headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody id="${config.page}TableBody">
                        <% if (items && items.length > 0) { %>
                            ${config.rowTemplate}
                        <% } else { %>
                        <tr><td colspan="${config.headers.length}" style="text-align:center;padding:3rem;color:var(--text-3)">
                            <i class="fas ${config.icon}" style="display:block;font-size:1.5rem;margin-bottom:.5rem"></i>
                            No ${config.title.toLowerCase()} found
                        </td></tr>
                        <% } %>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
${config.modal || ''}
</body>
</html>`;

const pages = {
    'events.ejs': {
        title: 'Events', page: 'events', icon: 'fa-calendar-alt',
        subtitle: '<%= items.length %> total events',
        action: '<button onclick="document.getElementById(\'createEventModal\').classList.add(\'open\')" class="a-btn a-btn-primary"><i class="fas fa-plus"></i> Create Event</button>',
        headers: ['Event', 'Date', 'Type', 'Location', 'Registered', 'Status', 'Actions'],
        rowTemplate: `<% items.forEach(e => { %>
                        <tr>
                            <td style="font-weight:700;color:var(--text)"><%= e.title %></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= new Date(e.startDate).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) %></td>
                            <td><span class="a-badge a-badge-neutral" style="text-transform:capitalize"><%= e.eventType || 'Online' %></span></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= e.location || '—' %></td>
                            <td style="font-weight:700;color:var(--text)"><%= e.totalApproved || 0 %></td>
                            <td><span class="a-badge <%= e.isActive ? 'a-badge-success':'a-badge-neutral' %>"><%= e.isActive ? 'Active':'Ended' %></span></td>
                            <td><div style="display:flex;gap:.4rem">
                                <a href="/admin/events/<%= e._id %>" class="a-btn a-btn-secondary a-btn-sm"><i class="fas fa-eye"></i></a>
                                <form method="POST" action="/admin/events/<%= e._id %>/delete" onsubmit="return confirm('Delete this event?')"><button type="submit" class="a-btn a-btn-danger a-btn-sm"><i class="fas fa-trash"></i></button></form>
                            </div></td>
                        </tr>
                        <% }) %>`,
        modal: `<div class="a-modal-overlay" id="createEventModal">
    <div class="a-modal" style="max-width:640px">
        <div class="a-modal-header"><h3><i class="fas fa-plus" style="color:var(--green)"></i> Create Event</h3><button class="a-modal-close" onclick="document.getElementById('createEventModal').classList.remove('open')"><i class="fas fa-times"></i></button></div>
        <form method="POST" action="/admin/events/create">
            <div class="a-form-row"><div class="a-form-group"><label>Title *</label><input type="text" name="title" class="a-input" required></div><div class="a-form-group"><label>Event Type</label><select name="eventType" class="a-input"><option value="Online">Online</option><option value="In-Person">In-Person</option><option value="Hybrid">Hybrid</option></select></div></div>
            <div class="a-form-group"><label>Description *</label><textarea name="description" class="a-input" required></textarea></div>
            <div class="a-form-row"><div class="a-form-group"><label>Start Date *</label><input type="datetime-local" name="startDate" class="a-input" required></div><div class="a-form-group"><label>End Date</label><input type="datetime-local" name="endDate" class="a-input"></div></div>
            <div class="a-form-row"><div class="a-form-group"><label>Location</label><input type="text" name="location" class="a-input" placeholder="City, Venue or Online"></div><div class="a-form-group"><label>Max Attendees</label><input type="number" name="maxAttendees" class="a-input" placeholder="Leave blank for unlimited"></div></div>
            <div style="display:flex;gap:.75rem;justify-content:flex-end;margin-top:.5rem">
                <button type="button" onclick="document.getElementById('createEventModal').classList.remove('open')" class="a-btn a-btn-secondary">Cancel</button>
                <button type="submit" class="a-btn a-btn-primary"><i class="fas fa-calendar-plus"></i> Create Event</button>
            </div>
        </form>
    </div>
</div>
<script>document.querySelectorAll('.a-modal-overlay').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));</script>`
    },

    'applications.ejs': {
        title: 'Applications', page: 'applications', icon: 'fa-graduation-cap',
        subtitle: '<%= items.length %> applications',
        action: '',
        headers: ['Applicant', 'Course', 'Email', 'Applied', 'Status', 'Actions'],
        rowTemplate: `<% items.forEach(a => { %>
                        <tr>
                            <td style="font-weight:700;color:var(--text)"><%= a.name %></td>
                            <td style="color:var(--text-2)"><%= a.course %></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= a.email %></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= new Date(a.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) %></td>
                            <td><span class="a-badge <%= a.status==='approved'?'a-badge-success':a.status==='rejected'?'a-badge-danger':'a-badge-warning' %>"><%= a.status %></span></td>
                            <td><div style="display:flex;gap:.4rem">
                                <% if (a.status==='pending') { %>
                                <form method="POST" action="/admin/applications/<%= a._id %>/approve"><button type="submit" class="a-btn a-btn-primary a-btn-sm"><i class="fas fa-check"></i></button></form>
                                <form method="POST" action="/admin/applications/<%= a._id %>/reject" onsubmit="return confirm('Reject?')"><button type="submit" class="a-btn a-btn-danger a-btn-sm"><i class="fas fa-times"></i></button></form>
                                <% } %>
                                <a href="mailto:<%= a.email %>" class="a-btn a-btn-secondary a-btn-sm"><i class="fas fa-envelope"></i></a>
                            </div></td>
                        </tr>
                        <% }) %>`
    },

    'ambassadors.ejs': {
        title: 'Campus Ambassadors', page: 'ambassadors', icon: 'fa-building-columns',
        subtitle: '<%= items.length %> applications',
        action: '',
        headers: ['Applicant', 'Institution', 'City', 'Status', 'Applied', 'Actions'],
        rowTemplate: `<% items.forEach(a => { %>
                        <tr>
                            <td style="font-weight:700;color:var(--text)"><%= a.userId?.username || a.name %></td>
                            <td style="color:var(--text-2)"><%= a.institutionName || '—' %></td>
                            <td style="color:var(--text-3)"><%= a.city || '—' %></td>
                            <td><span class="a-badge <%= a.status==='approved'?'a-badge-success':a.status==='rejected'?'a-badge-danger':'a-badge-warning' %>"><%= a.status %></span></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= new Date(a.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) %></td>
                            <td><div style="display:flex;gap:.4rem">
                                <% if (a.status==='pending') { %>
                                <form method="POST" action="/admin/ambassadors/<%= a._id %>/approve"><button type="submit" class="a-btn a-btn-primary a-btn-sm"><i class="fas fa-check"></i></button></form>
                                <form method="POST" action="/admin/ambassadors/<%= a._id %>/reject" onsubmit="return confirm('Reject?')"><button type="submit" class="a-btn a-btn-danger a-btn-sm"><i class="fas fa-times"></i></button></form>
                                <% } %>
                            </div></td>
                        </tr>
                        <% }) %>`
    },

    'projects.ejs': {
        title: 'Project Submissions', page: 'projects', icon: 'fa-rocket',
        subtitle: '<%= items.length %> submissions',
        action: '',
        headers: ['Project', 'Submitted By', 'Category', 'Status', 'Submitted', 'Actions'],
        rowTemplate: `<% items.forEach(p => { %>
                        <tr>
                            <td style="font-weight:700;color:var(--text)"><%= p.title %></td>
                            <td style="color:var(--text-2)"><%= p.userId?.username || '—' %></td>
                            <td><span class="a-badge a-badge-neutral"><%= p.category || '—' %></span></td>
                            <td><span class="a-badge <%= p.status==='approved'?'a-badge-success':p.status==='rejected'?'a-badge-danger':'a-badge-warning' %>"><%= p.status %></span></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= new Date(p.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric'}) %></td>
                            <td><div style="display:flex;gap:.4rem">
                                <% if (p.status==='pending') { %>
                                <form method="POST" action="/admin/projects/<%= p._id %>/approve"><button type="submit" class="a-btn a-btn-primary a-btn-sm"><i class="fas fa-check"></i></button></form>
                                <form method="POST" action="/admin/projects/<%= p._id %>/reject" onsubmit="return confirm('Reject?')"><button type="submit" class="a-btn a-btn-danger a-btn-sm"><i class="fas fa-times"></i></button></form>
                                <% } %>
                                <% if (p.projectUrl) { %><a href="<%= p.projectUrl %>" target="_blank" class="a-btn a-btn-secondary a-btn-sm"><i class="fas fa-external-link-alt"></i></a><% } %>
                            </div></td>
                        </tr>
                        <% }) %>`
    },

    'banned.ejs': {
        title: 'Banned Users', page: 'banned', icon: 'fa-user-slash',
        subtitle: '<%= items.length %> banned users',
        action: '',
        headers: ['User', 'Email', 'Reason', 'Banned On', 'Actions'],
        rowTemplate: `<% items.forEach(u => { %>
                        <tr>
                            <td style="font-weight:700;color:var(--red)"><%= u.username %></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= u.email %></td>
                            <td style="color:var(--text-2);font-size:.8125rem"><%= u.banReason || 'No reason given' %></td>
                            <td style="color:var(--text-3);font-size:.8125rem"><%= u.bannedAt ? new Date(u.bannedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}) : '—' %></td>
                            <td><form method="POST" action="/admin/users/<%= u._id %>/unban" onsubmit="return confirm('Unban this user?')"><button type="submit" class="a-btn a-btn-secondary a-btn-sm"><i class="fas fa-unlock"></i> Unban</button></form></td>
                        </tr>
                        <% }) %>`
    }
};

Object.entries(pages).forEach(([filename, config]) => {
    const html = pageTemplate(config);
    fs.writeFileSync(path.join(base, filename), html, 'utf8');
    console.log('Created:', filename);
});

console.log('All pages created');
