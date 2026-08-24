// ==================== GLOBAL VARIABLES ====================
let taskCounter = 0;
let editTaskCounter = 0;
var currentQuestTasks = [];
var currentManagingEventId = null;
var currentManagingEvent = null;
var currentManagingRegistrations = [];

// ==================== UTILITY FUNCTIONS ====================

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

function showAlert(message, type = 'success') {
    const alertEl = document.getElementById('overviewAlert');
    if (alertEl) {
        alertEl.textContent = message;
        alertEl.className = `alert alert-${type} active`;
        setTimeout(() => alertEl.classList.remove('active'), 5000);
    }
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ==================== MOBILE NAVIGATION ====================

function toggleMobileNav() {
    const dropdown = document.getElementById('mobileDropdown');
    dropdown.classList.toggle('active');
}

function closeMobileNav() {
    const dropdown = document.getElementById('mobileDropdown');
    dropdown.classList.remove('active');
}

// Close mobile dropdown when clicking on a menu item
function setupMobileNavClose() {
    const mobileItems = document.querySelectorAll('.mobile-dropdown .menu-item');
    mobileItems.forEach(item => {
        item.addEventListener('click', function() {
            closeMobileNav();
        });
    });
}

// ==================== TAB NAVIGATION ====================

/* Bulletproof tab switcher — called by onclick on every nav item */
function switchTab(tabId, clickedEl) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    // Show target
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    // Update all menu items (both sidebar + mobile)
    document.querySelectorAll('.menu-item[data-tab]').forEach(el => el.classList.remove('active'));
    // Mark all items matching this tab as active
    document.querySelectorAll('.menu-item[data-tab="' + tabId + '"]').forEach(el => el.classList.add('active'));
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Load section data
    if (typeof loadSectionData === 'function') loadSectionData(tabId);
}

document.addEventListener('DOMContentLoaded', function() {
    // Setup mobile nav close functionality
    setupMobileNavClose();
    // Load pathway config
    if (typeof loadPathwayConfigs === 'function') loadPathwayConfigs();


    const menuItems = document.querySelectorAll('.menu-item[data-tab]');

    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const tab = this.getAttribute('data-tab');

            menuItems.forEach(mi => mi.classList.remove('active'));
            this.classList.add('active');

            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(tab).classList.add('active');

            // Scroll main content to top
            const mainContent = document.querySelector('.main-content');
            if (mainContent) {
                mainContent.scrollTo({ top: 0, behavior: 'smooth' });
            }

            loadSectionData(tab);
        });
    });
    
    loadSectionData('overview');
});

// Update your loadSectionData function to include withdrawals
// Update loadSectionData to include banned-users
function loadSectionData(section) {
    console.log('Loading section:', section);
    
    switch(section) {
        case 'overview':
            loadOverviewData();
            break;
        case 'quests':
            loadQuests();
            break;
        case 'events':
            loadEvents();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'users':
            loadUsers();
            break;
        case 'withdrawals':
            loadWithdrawals();
            loadWithdrawalStats();
            break;
        case 'projects':
            loadProjectSubmissions();
            loadProjectStats();
            break;
        case 'ambassadors':
            loadAmbassadorApplications();
            loadAmbassadorStats();
            break;
        case 'banned-users':  // ADD THIS
            loadBannedUsers();
            break;
             case 'quiz':  // ✅ ADD THIS
            loadQuizStats();
            break;
    }
}

// ==================== OVERVIEW ====================

async function loadOverviewData() {
    try {
        console.log('📊 Loading overview data...');

        const [users, quests, events, apps, statistics] = await Promise.all([
            fetch('/admin/api/users/count').then(r => r.json()).catch(() => ({count: 0})),
            fetch('/admin/api/quests/stats').then(r => r.json()).catch(() => ({active: 0})),
            fetch('/admin/api/events/stats').then(r => r.json()).catch(() => ({upcoming: 0})),
            fetch('/admin/api/applications/stats').then(r => r.json()).catch(() => ({pending: 0})),
            fetch('/admin/api/statistics').then(r => r.json()).catch(() => ({stats: {apiUsage: {today: 0, last30Days: 0}}}))
        ]);

        document.getElementById('totalUsers').textContent = users.count || 0;
        document.getElementById('activeQuests').textContent = quests.active || 0;
        document.getElementById('upcomingEvents').textContent = events.upcoming || 0;
        document.getElementById('pendingApplications').textContent = apps.pending || 0;

        // Display Twitter API usage
        if (statistics.success && statistics.stats.apiUsage) {
            const apiUsage = statistics.stats.apiUsage;
            document.getElementById('twitterApiCalls').textContent = apiUsage.last30Days || 0;

            // Assume 500 req/month on free tier (update based on your plan)
            // Get from RapidAPI dashboard: https://rapidapi.com/UnlimitedAPI/api/twitter-v23
            const monthlyQuota = 500; // UPDATE THIS based on your RapidAPI plan
            const usagePercent = Math.min(100, Math.round((apiUsage.last30Days / monthlyQuota) * 100));

            const percentElem = document.getElementById('apiUsagePercent');
            percentElem.textContent = usagePercent + '%';

            // Color coding based on usage
            if (usagePercent >= 90) {
                percentElem.style.color = '#FF4444'; // Red - almost at limit
            } else if (usagePercent >= 70) {
                percentElem.style.color = '#FFC107'; // Yellow - warning
            } else {
                percentElem.style.color = 'var(--green)'; // Green - good
            }
        }

        // Load Twitter setting
        loadTwitterSetting();
        // Load Email settings
        loadEmailSettings();

        console.log('✅ Overview data loaded');
    } catch (error) {
        console.error('❌ Error loading overview:', error);
        showAlert('Error loading overview data', 'error');
    }
}

async function loadTwitterSetting() {
    try {
        const res = await fetch('/admin/api/settings');
        const data = await res.json();
        if (!data.success) return;
        const enabled = data.settings.twitterRequired;
        const checkbox = document.getElementById('twitterRequiredToggle');
        const slider = document.getElementById('twitterToggleSlider');
        const dot = document.getElementById('twitterToggleDot');
        if (checkbox) checkbox.checked = enabled;
        if (slider) slider.style.background = enabled ? 'var(--green)' : '#333';
        if (dot) dot.style.transform = enabled ? 'translateX(28px)' : 'translateX(0)';
    } catch (e) {
        console.error('Failed to load Twitter setting:', e);
    }
}

async function toggleTwitterRequired(enabled) {
    const msg = document.getElementById('twitterSettingMsg');
    const slider = document.getElementById('twitterToggleSlider');
    const dot = document.getElementById('twitterToggleDot');
    try {
        slider.style.background = enabled ? 'var(--green)' : '#333';
        dot.style.transform = enabled ? 'translateX(28px)' : 'translateX(0)';
        const res = await fetch('/admin/api/settings/twitter-required', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });
        const data = await res.json();
        if (data.success) {
            msg.style.display = 'block';
            msg.style.color = 'var(--green)';
            msg.textContent = enabled ? '✅ X connection required for quests' : '✅ X connection disabled — users can access quests freely';
            setTimeout(() => { msg.style.display = 'none'; }, 3000);
        } else {
            msg.style.display = 'block';
            msg.style.color = '#ff4444';
            msg.textContent = '❌ Failed to update setting';
        }
    } catch (e) {
        msg.style.display = 'block';
        msg.style.color = '#ff4444';
        msg.textContent = '❌ Error: ' + e.message;
    }
}

// ==================== EMAIL SETTINGS ====================

function setToggleUI(sliderId, dotId, enabled) {
    const slider = document.getElementById(sliderId);
    const dot = document.getElementById(dotId);
    if (slider) slider.style.background = enabled ? 'var(--green)' : '#333';
    if (dot) dot.style.transform = enabled ? 'translateX(28px)' : 'translateX(0)';
}

function showEmailMsg(text, ok) {
    const msg = document.getElementById('emailSettingMsg');
    msg.style.display = 'inline';
    msg.style.color = ok ? 'var(--green)' : '#ff4444';
    msg.textContent = text;
    setTimeout(() => { msg.style.display = 'none'; }, 3500);
}


/* ── Pathway community config ── */
async function savePathwayConfigs() {
    const pathways = ['web3_jobs', 'ai', 'building'];
    let saved = 0;
    for (const pw of pathways) {
        const groupLink = (document.getElementById('pw-group-' + pw) || {}).value || null;
        const xLink     = (document.getElementById('pw-x-' + pw) || {}).value || null;
        if (!groupLink && !xLink) continue;
        try {
            const r = await fetch('/onboarding/admin/pathway-config', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pathway: pw, groupLink: groupLink || null, xLink: xLink || null })
            });
            const d = await r.json();
            if (d.success) saved++;
        } catch(_) {}
    }
    const msg = document.getElementById('pathwaySaveMsg');
    if (msg) { msg.style.display='inline'; msg.textContent=saved+' link(s) saved!'; setTimeout(()=>msg.style.display='none',3000); }
}

async function loadPathwayConfigs() {
    try {
        const r = await fetch('/onboarding/admin/pathway-config');
        const d = await r.json();
        (d.configs || []).forEach(c => {
            const g = document.getElementById('pw-group-'+c.pathway);
            const x = document.getElementById('pw-x-'+c.pathway);
            if (g && c.groupLink) g.value = c.groupLink;
            if (x && c.xLink)     x.value = c.xLink;
        });
    } catch(_) {}
}

async function loadEmailSettings() {
    try {
        const res = await fetch('/admin/api/settings');
        const data = await res.json();
        if (!data.success) return;
        const s = data.settings;

        // Provider buttons
        ['resend','gmail'].forEach(p => {
            const btn = document.getElementById('provider' + p.charAt(0).toUpperCase() + p.slice(1));
            if (!btn) return;
            const active = (s.emailProvider || 'resend') === p;
            btn.style.borderColor = active ? 'var(--green)' : '#333';
            btn.style.color = active ? 'var(--green)' : '#888';
            btn.style.background = active ? 'rgba(94,194,19,0.08)' : '#111';
        });

        // Verification toggle
        const verif = !!s.emailVerificationRequired;
        const vc = document.getElementById('emailVerifToggle');
        if (vc) vc.checked = verif;
        setToggleUI('emailVerifSlider', 'emailVerifDot', verif);

        // Stats
        const stats = s.emailStats || {};
        const sent = stats.totalSent || 0;
        const failed = stats.totalFailed || 0;
        const total = sent + failed;
        const rate = total > 0 ? Math.round((sent / total) * 100) : null;

        document.getElementById('emailTotalSent').textContent = sent;
        document.getElementById('emailTotalFailed').textContent = failed;
        document.getElementById('emailDeliveryRate').textContent = rate !== null ? rate + '%' : '—';

        // Last sent
        if (stats.lastSentAt) {
            const d = new Date(stats.lastSentAt);
            document.getElementById('emailLastSent').textContent = d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
        } else {
            document.getElementById('emailLastSent').textContent = 'Never';
        }

        // Status badge
        const dot = document.getElementById('emailStatusDot');
        const txt = document.getElementById('emailStatusText');
        if (stats.lastStatus === 'success') {
            dot.style.background = 'var(--green)';
            txt.style.color = 'var(--green)';
            txt.textContent = 'Working';
        } else if (stats.lastStatus === 'failed') {
            dot.style.background = '#ff4444';
            txt.style.color = '#ff4444';
            txt.textContent = 'Last send failed';
        } else {
            dot.style.background = '#888';
            txt.style.color = '#888';
            txt.textContent = 'No data yet';
        }
    } catch (e) {
        console.error('Failed to load email settings:', e);
    }
}

async function setEmailProvider(provider) {
    try {
        const res = await fetch('/admin/api/settings/email-provider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider })
        });
        const data = await res.json();
        if (data.success) {
            await loadEmailSettings();
            showEmailMsg('✅ Provider switched to ' + (provider === 'resend' ? 'Resend API' : 'Gmail SMTP'), true);
        } else {
            showEmailMsg('❌ ' + (data.message || 'Failed'), false);
        }
    } catch (e) {
        showEmailMsg('❌ Error: ' + e.message, false);
    }
}

async function toggleEmailVerification(required) {
    setToggleUI('emailVerifSlider', 'emailVerifDot', required);
    try {
        const res = await fetch('/admin/api/settings/email-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ required })
        });
        const data = await res.json();
        if (data.success) {
            showEmailMsg(required ? '✅ Verification required on signup' : '✅ Auto-verify enabled — no emails on signup', true);
        } else {
            showEmailMsg('❌ Failed to update', false);
        }
    } catch (e) {
        showEmailMsg('❌ Error: ' + e.message, false);
    }
}

async function sendTestEmail() {
    showEmailMsg('⏳ Sending test email...', true);
    try {
        const res = await fetch('/admin/api/settings/test-email', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            showEmailMsg('✅ Test email sent to ' + data.sentTo, true);
            await loadEmailSettings(); // refresh stats
        } else {
            showEmailMsg('❌ Failed: ' + (data.error || data.message || 'Unknown error'), false);
            await loadEmailSettings();
        }
    } catch (e) {
        showEmailMsg('❌ Error: ' + e.message, false);
    }
}

// ==================== USERS ====================

async function loadUsers() {
    try {
        console.log('👥 Loading users...');
        const response = await fetch('/admin/api/users');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Users data:', data);

        if (data.success && data.users) {
            const tbody = document.getElementById('usersTableBody');
            if (data.users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #888;">No users found</td></tr>';
            } else {
                tbody.innerHTML = data.users.map(user => `
                    <tr>
                        <td><strong>${user.username || 'N/A'}</strong></td>
                        <td>${user.email || 'N/A'}</td>
                        <td>${user.xp || 0} XP</td>
                        <td>${user.usdcBalance || 0}</td>
                        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
                        <td><span class="badge badge-${user.isVerified ? 'approved' : 'pending'}">${user.isVerified ? 'Verified' : 'Unverified'}</span></td>
                        <td>
                            <div class="action-buttons">
                                ${!user.isAdmin ? `
                                <button class="btn btn-secondary btn-sm" onclick="loginAsUser('${user._id}', '${user.username}')" title="Login as this user">
                                    <i class="fas fa-sign-in-alt"></i> Login
                                </button>
                                ` : '<span style="color: #888; font-size: 0.85rem;">Admin</span>'}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load users');
        }
    } catch (error) {
        console.error('❌ Error loading users:', error);
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #ff5252;">Error: ${error.message}</td></tr>`;
        showAlert('Error loading users: ' + error.message, 'error');
    }
}

// Login as User (Admin Impersonation)
async function loginAsUser(userId, username) {
    if (!confirm(`Are you sure you want to login as "${username}"?\n\nThis will end your current admin session and log you in as this user.`)) {
        return;
    }

    try {
        const response = await fetch(`/admin/api/users/${userId}/login-as`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`Logging in as ${username}...`, 'success');
            setTimeout(() => {
                window.location.href = data.redirectUrl || '/dashboard';
            }, 1000);
        } else {
            showAlert(data.message || 'Failed to login as user', 'error');
        }
    } catch (error) {
        console.error('Error logging in as user:', error);
        showAlert('Error logging in as user: ' + error.message, 'error');
    }
}

// ==================== EVENTS ====================

async function loadEvents() {
    try {
        console.log('📅 Loading events...');
        const response = await fetch('/admin/api/events');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Events data:', data);
        
        if (data.success && data.events) {
            const tbody = document.getElementById('eventsTableBody');
            
            if (data.events.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #888;">No events found</td></tr>';
            } else {
                tbody.innerHTML = data.events.map(e => `
                    <tr>
                        <td><strong>${e.title}</strong></td>
                        <td><span class="badge badge-${e.eventType === 'virtual' ? 'active' : 'pending'}">${e.eventType}</span></td>
                        <td>${new Date(e.startDate).toLocaleDateString()}</td>
                        <td>
                            ${e.totalRegistrations || 0}
                            ${e.approvalType === 'manual' ? `<span class="badge badge-pending" style="font-size: 10px; margin-left: 5px;">${e.totalApproved || 0} approved</span>` : ''}
                        </td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-icon btn-sm" onclick="manageEventRegistrations('${e._id}')" title="Manage Registrations">
                                    <i class="fas fa-users"></i>
                                </button>
                                <button class="btn btn-success btn-icon btn-sm" onclick="openEditEventModal('${e._id}')" title="Edit">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="viewEvent('${e._id}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-danger btn-icon btn-sm" onclick="deleteEvent('${e._id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load events');
        }
    } catch (error) {
        console.error('❌ Error loading events:', error);
        const tbody = document.getElementById('eventsTableBody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #ff5252;">Error: ${error.message}</td></tr>`;
        showAlert('Error loading events: ' + error.message, 'error');
    }
}

function openCreateEventModal() {
    document.getElementById('createEventForm').reset();
    toggleEventFields();
    openModal('createEventModal');
}

function toggleEventFields() {
    const eventType = document.getElementById('eventType').value;
    const venueGroup = document.getElementById('venueGroup');
    const linkGroup = document.getElementById('linkGroup');
    const cityGroup = document.getElementById('cityGroup');
    const countryGroup = document.getElementById('countryGroup');
    const googleMapsGroup = document.getElementById('googleMapsGroup');
    const venueInput = document.getElementById('eventVenue');
    const linkInput = document.getElementById('eventLink');
    const venueRequired = document.getElementById('venueRequired');
    const linkRequired = document.getElementById('linkRequired');

    if (eventType === 'virtual') {
        venueGroup.style.display = 'none';
        linkGroup.style.display = 'block';
        cityGroup.style.display = 'none';
        countryGroup.style.display = 'none';
        googleMapsGroup.style.display = 'none';
        venueInput.removeAttribute('required');
        linkInput.setAttribute('required', 'required');
        venueRequired.style.display = 'none';
        linkRequired.style.display = 'inline';
    } else if (eventType === 'physical') {
        venueGroup.style.display = 'block';
        linkGroup.style.display = 'none';
        cityGroup.style.display = 'block';
        countryGroup.style.display = 'block';
        googleMapsGroup.style.display = 'block';
        venueInput.setAttribute('required', 'required');
        linkInput.removeAttribute('required');
        venueRequired.style.display = 'inline';
        linkRequired.style.display = 'none';
    } else {
        venueGroup.style.display = 'block';
        linkGroup.style.display = 'block';
        cityGroup.style.display = 'block';
        countryGroup.style.display = 'block';
        googleMapsGroup.style.display = 'block';
        venueInput.setAttribute('required', 'required');
        linkInput.setAttribute('required', 'required');
        venueRequired.style.display = 'inline';
        linkRequired.style.display = 'inline';
    }
}

async function createNewEvent(e) {
    e.preventDefault();

    try {
        const eventType = document.getElementById('eventType').value;
        const venue = document.getElementById('eventVenue').value.trim();
        const virtualLink = document.getElementById('eventLink').value.trim();
        const title = document.getElementById('eventTitle').value.trim();
        const description = document.getElementById('eventDescription').value.trim();
        const startDate = document.getElementById('eventStartDate').value;
        const endDate = document.getElementById('eventEndDate').value;
        const startTime = document.getElementById('eventStartTime').value;
        const endTime = document.getElementById('eventEndTime').value;
        const category = document.getElementById('eventCategory').value;
        const city = document.getElementById('eventCity').value.trim();
        const country = document.getElementById('eventCountry').value.trim();
        const googleMapsUrl = document.getElementById('eventGoogleMaps').value.trim();
        const approvalType = document.getElementById('eventApprovalType').value;
        const maxAttendees = document.getElementById('eventMaxAttendees').value;
        const bannerImage = document.getElementById('eventBanner').value.trim();
        const prizePool = document.getElementById('eventPrizePool').value.trim();

        console.log('🔍 Form values:', {
            title,
            description,
            eventType,
            category,
            venue,
            virtualLink,
            startDate,
            endDate,
            startTime,
            endTime,
            approvalType
        });

        // Basic validation
        if (!title || !description) {
            showAlert('Title and description are required', 'error');
            return;
        }

        if (!startDate || !endDate) {
            showAlert('Start and end dates are required', 'error');
            return;
        }

        if (!eventType) {
            showAlert('Event type is required', 'error');
            return;
        }

        // Type-specific validation
        if (eventType === 'physical' || eventType === 'hybrid') {
            if (!venue || venue.length === 0) {
                showAlert('Venue is required for physical and hybrid events', 'error');
                return;
            }
        }

        if (eventType === 'virtual' || eventType === 'hybrid') {
            if (!virtualLink || virtualLink.length === 0) {
                showAlert('Virtual link is required for virtual and hybrid events', 'error');
                return;
            }
        }

        // Build form data
        const formData = {
            title,
            description,
            eventType,
            category: category || 'other',
            startDate,
            endDate,
            startTime: startTime || '10:00',
            endTime: endTime || '17:00',
            timezone: 'WAT',
            approvalType: approvalType || 'auto'
        };

        // Only add venue/virtualLink if they have values
        if (venue && venue.length > 0) {
            formData.venue = venue;
        }

        if (virtualLink && virtualLink.length > 0) {
            formData.virtualLink = virtualLink;
        }

        // Add optional location fields
        if (city && city.length > 0) {
            formData.city = city;
        }

        if (country && country.length > 0) {
            formData.country = country;
        }

        if (googleMapsUrl && googleMapsUrl.length > 0) {
            formData.googleMapsUrl = googleMapsUrl;
        }

        // Add other optional fields
        if (maxAttendees && parseInt(maxAttendees) > 0) {
            formData.maxAttendees = parseInt(maxAttendees);
        }

        if (bannerImage && bannerImage.length > 0) {
            formData.bannerImage = bannerImage;
        }

        if (prizePool && prizePool.length > 0) {
            formData.prizePool = prizePool;
        }

        console.log('📤 Sending event data:', formData);

        const response = await fetch('/admin/api/events', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status);
        
        const data = await response.json();
        console.log('📥 Response data:', data);
        
        if (data.success) {
            showAlert('Event created successfully! ✅');
            closeModal('createEventModal');
            document.getElementById('createEventForm').reset();
            loadEvents();
        } else {
            showAlert(data.message || 'Error creating event', 'error');
            console.error('Server error details:', data);
        }
    } catch (error) {
        console.error('❌ Error creating event:', error);
        showAlert('Error creating event: ' + error.message, 'error');
    }
}

async function deleteEvent(eventId) {
    if (!eventId || eventId === 'undefined') {
        showAlert('Invalid event ID', 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this event?')) {
        return;
    }

    try {
        console.log('Deleting event:', eventId);
        
        const response = await fetch(`/admin/api/events/${eventId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        console.log('Delete event response:', data);
        
        if (data.success) {
            showAlert('Event deleted successfully!');
            loadEvents();
        } else {
            showAlert(data.message || 'Error deleting event', 'error');
        }
    } catch (error) {
        console.error('❌ Error deleting event:', error);
        showAlert('Error deleting event: ' + error.message, 'error');
    }
}

function viewEvent(eventId) {
    window.open(`/dashboard/events/${eventId}`, '_blank');
}

async function openEditEventModal(eventId) {
    try {
        console.log('📝 Loading event for editing:', eventId);
        const response = await fetch(`/admin/api/events/${eventId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Event data:', data);

        if (data.success && data.event) {
            const event = data.event;

            // Populate form fields
            document.getElementById('editEventId').value = event._id;
            document.getElementById('editEventTitle').value = event.title || '';
            document.getElementById('editEventDescription').value = event.description || '';
            document.getElementById('editEventType').value = event.eventType || 'virtual';
            document.getElementById('editEventCategory').value = event.category || 'meetup';

            // Format dates for input fields (YYYY-MM-DD)
            const startDate = new Date(event.startDate);
            const endDate = new Date(event.endDate);
            document.getElementById('editEventStartDate').value = startDate.toISOString().split('T')[0];
            document.getElementById('editEventEndDate').value = endDate.toISOString().split('T')[0];

            document.getElementById('editEventStartTime').value = event.startTime || '10:00';
            document.getElementById('editEventEndTime').value = event.endTime || '17:00';
            document.getElementById('editEventVenue').value = event.venue || '';
            document.getElementById('editEventCity').value = event.city || '';
            document.getElementById('editEventCountry').value = event.country || '';
            document.getElementById('editEventGoogleMaps').value = event.googleMapsUrl || '';
            document.getElementById('editEventLink').value = event.virtualLink || '';
            document.getElementById('editEventApprovalType').value = event.approvalType || 'auto';
            document.getElementById('editEventMaxAttendees').value = event.maxAttendees || '';
            document.getElementById('editEventBanner').value = event.bannerImage || '';
            document.getElementById('editEventPrizePool').value = event.prizePool || '';

            // Show/hide fields based on event type
            toggleEditEventFields();

            // Open modal
            openModal('editEventModal');
        } else {
            throw new Error(data.message || 'Failed to load event');
        }
    } catch (error) {
        console.error('❌ Error loading event for editing:', error);
        showAlert('Error loading event: ' + error.message, 'error');
    }
}

function toggleEditEventFields() {
    const eventType = document.getElementById('editEventType').value;
    const venueGroup = document.getElementById('editVenueGroup');
    const linkGroup = document.getElementById('editLinkGroup');
    const cityGroup = document.getElementById('editCityGroup');
    const countryGroup = document.getElementById('editCountryGroup');
    const googleMapsGroup = document.getElementById('editGoogleMapsGroup');
    const venueInput = document.getElementById('editEventVenue');
    const linkInput = document.getElementById('editEventLink');
    const venueRequired = document.getElementById('editVenueRequired');
    const linkRequired = document.getElementById('editLinkRequired');

    if (eventType === 'virtual') {
        venueGroup.style.display = 'none';
        linkGroup.style.display = 'block';
        cityGroup.style.display = 'none';
        countryGroup.style.display = 'none';
        googleMapsGroup.style.display = 'none';
        venueInput.removeAttribute('required');
        linkInput.setAttribute('required', 'required');
        venueRequired.style.display = 'none';
        linkRequired.style.display = 'inline';
    } else if (eventType === 'physical') {
        venueGroup.style.display = 'block';
        linkGroup.style.display = 'none';
        cityGroup.style.display = 'block';
        countryGroup.style.display = 'block';
        googleMapsGroup.style.display = 'block';
        venueInput.setAttribute('required', 'required');
        linkInput.removeAttribute('required');
        venueRequired.style.display = 'inline';
        linkRequired.style.display = 'none';
    } else {
        venueGroup.style.display = 'block';
        linkGroup.style.display = 'block';
        cityGroup.style.display = 'block';
        countryGroup.style.display = 'block';
        googleMapsGroup.style.display = 'block';
        venueInput.setAttribute('required', 'required');
        linkInput.setAttribute('required', 'required');
        venueRequired.style.display = 'inline';
        linkRequired.style.display = 'inline';
    }
}

async function updateEvent(e) {
    e.preventDefault();

    try {
        const eventId = document.getElementById('editEventId').value;
        const eventType = document.getElementById('editEventType').value;
        const venue = document.getElementById('editEventVenue').value.trim();
        const virtualLink = document.getElementById('editEventLink').value.trim();
        const title = document.getElementById('editEventTitle').value.trim();
        const description = document.getElementById('editEventDescription').value.trim();
        const startDate = document.getElementById('editEventStartDate').value;
        const endDate = document.getElementById('editEventEndDate').value;
        const startTime = document.getElementById('editEventStartTime').value;
        const endTime = document.getElementById('editEventEndTime').value;
        const category = document.getElementById('editEventCategory').value;
        const city = document.getElementById('editEventCity').value.trim();
        const country = document.getElementById('editEventCountry').value.trim();
        const googleMapsUrl = document.getElementById('editEventGoogleMaps').value.trim();
        const approvalType = document.getElementById('editEventApprovalType').value;
        const maxAttendees = document.getElementById('editEventMaxAttendees').value;
        const bannerImage = document.getElementById('editEventBanner').value.trim();
        const prizePool = document.getElementById('editEventPrizePool').value.trim();

        // Build update object
        const formData = {
            title,
            description,
            eventType,
            category,
            startDate,
            endDate,
            startTime: startTime || '10:00',
            endTime: endTime || '17:00',
            timezone: 'WAT',
            approvalType: approvalType || 'auto'
        };

        // Only add venue/virtualLink if they have values
        if (venue && venue.length > 0) {
            formData.venue = venue;
        }

        if (virtualLink && virtualLink.length > 0) {
            formData.virtualLink = virtualLink;
        }

        // Add optional location fields
        if (city && city.length > 0) {
            formData.city = city;
        }

        if (country && country.length > 0) {
            formData.country = country;
        }

        if (googleMapsUrl && googleMapsUrl.length > 0) {
            formData.googleMapsUrl = googleMapsUrl;
        }

        // Add other optional fields
        if (maxAttendees && parseInt(maxAttendees) > 0) {
            formData.maxAttendees = parseInt(maxAttendees);
        }

        if (bannerImage && bannerImage.length > 0) {
            formData.bannerImage = bannerImage;
        }

        if (prizePool && prizePool.length > 0) {
            formData.prizePool = prizePool;
        }

        console.log('📤 Updating event:', eventId, formData);

        const response = await fetch(`/admin/api/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        console.log('📥 Response status:', response.status);

        const data = await response.json();
        console.log('📥 Response data:', data);

        if (data.success) {
            showAlert('Event updated successfully! ✅');
            closeModal('editEventModal');
            document.getElementById('editEventForm').reset();
            loadEvents();
        } else {
            showAlert(data.message || 'Error updating event', 'error');
            console.error('Server error details:', data);
        }
    } catch (error) {
        console.error('❌ Error updating event:', error);
        showAlert('Error updating event: ' + error.message, 'error');
    }
}

function renderRegistrations(regs, event) {
    const tbody = document.getElementById('registrationsTableBody');
    if (regs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">No registrations found</td></tr>';
        return;
    }
    tbody.innerHTML = regs.map(reg => {
        const statusBadgeClass = reg.status === 'approved' ? 'badge-active' : reg.status === 'pending' ? 'badge-pending' : 'badge-cancelled';
        const actionButtons = [];
        const uid = (reg.user && reg.user._id) ? reg.user._id : reg.user;
        if (reg.status === 'pending') {
            actionButtons.push(`<button class="btn btn-success btn-icon btn-sm" onclick="approveEventRegistration('${uid}')" title="Approve"><i class="fas fa-check"></i></button>`);
            actionButtons.push(`<button class="btn btn-danger btn-icon btn-sm" onclick="rejectEventRegistration('${uid}')" title="Reject"><i class="fas fa-times"></i></button>`);
        } else if (reg.status === 'approved' && !reg.checkedIn) {
            if (event.eventType === 'physical' || event.eventType === 'hybrid') {
                actionButtons.push(`<button class="btn btn-primary btn-icon btn-sm" onclick="checkInEventAttendee('${uid}')" title="Check In"><i class="fas fa-clipboard-check"></i></button>`);
            }
        } else if (reg.checkedIn) {
            actionButtons.push(`<span class="badge badge-active"><i class="fas fa-check-circle"></i> Checked In</span>`);
        }
        return `<tr>
            <td><strong>${reg.username || 'Unknown'}</strong></td>
            <td>${reg.email || 'N/A'}</td>
            <td>${new Date(reg.registeredAt).toLocaleDateString()}</td>
            <td><span class="badge ${statusBadgeClass}">${reg.status}</span></td>
            <td>${reg.isWalkIn ? '<span class="badge badge-pending">Yes</span>' : '<span style="color:#888;">No</span>'}</td>
            <td><div class="action-buttons">${actionButtons.join('')}</div></td>
        </tr>`;
    }).join('');
}

function filterRegistrations() {
    const q = (document.getElementById('regSearchInput').value || '').toLowerCase().trim();
    if (!q) {
        renderRegistrations(currentManagingRegistrations, currentManagingEvent);
        return;
    }
    const filtered = currentManagingRegistrations.filter(r =>
        (r.username || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q)
    );
    renderRegistrations(filtered, currentManagingEvent);
}

async function manageEventRegistrations(eventId) {
    currentManagingEventId = eventId;
    // Clear search on open
    const searchInput = document.getElementById('regSearchInput');
    if (searchInput) searchInput.value = '';
    try {
        console.log('📋 Loading event registrations:', eventId);
        const response = await fetch(`/admin/api/events/${eventId}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Event data:', data);

        if (data.success && data.event) {
            const event = data.event;
            currentManagingEvent = event;
            currentManagingRegistrations = event.registrations;

            // Update modal title
            document.getElementById('manageEventTitle').textContent = event.title;
            document.getElementById('manageEventDetails').textContent = event.eventType + ' event · ' + new Date(event.startDate).toLocaleDateString() + ' · ' + (event.approvalType === 'auto' ? 'Auto-Approve' : 'Manual Approval');

            // Calculate stats
            const pending = event.registrations.filter(r => r.status === 'pending').length;
            const approved = event.registrations.filter(r => r.status === 'approved').length;
            const checkedIn = event.registrations.filter(r => r.checkedIn).length;

            document.getElementById('statsTotal').textContent = event.registrations.length;
            document.getElementById('statsPending').textContent = pending;
            document.getElementById('statsApproved').textContent = approved;
            document.getElementById('statsCheckedIn').textContent = checkedIn;

            renderRegistrations(event.registrations, event);
            openModal('manageEventModal');
        } else {
            throw new Error(data.message || 'Failed to load event');
        }
    } catch (error) {
        console.error('❌ Error loading event:', error);
        showAlert('Error loading event: ' + error.message, 'error');
    }
}

async function approveEventRegistration(userId) {
    if (!currentManagingEventId) return;

    try {
        const response = await fetch(`/api/events/${currentManagingEventId}/approve/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Registration approved! Email sent to user.');
            manageEventRegistrations(currentManagingEventId);
        } else {
            showAlert(data.message || 'Error approving registration', 'error');
        }
    } catch (error) {
        console.error('❌ Error approving registration:', error);
        showAlert('Error approving registration: ' + error.message, 'error');
    }
}

async function rejectEventRegistration(userId) {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    if (!currentManagingEventId) return;

    try {
        const response = await fetch(`/api/events/${currentManagingEventId}/reject/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Registration rejected. Email sent to user.');
            manageEventRegistrations(currentManagingEventId);
        } else {
            showAlert(data.message || 'Error rejecting registration', 'error');
        }
    } catch (error) {
        console.error('❌ Error rejecting registration:', error);
        showAlert('Error rejecting registration: ' + error.message, 'error');
    }
}

async function checkInEventAttendee(userId) {
    if (!currentManagingEventId) return;

    try {
        const response = await fetch(`/api/events/${currentManagingEventId}/checkin/${userId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Attendee checked in successfully!');
            manageEventRegistrations(currentManagingEventId);
        } else {
            showAlert(data.message || 'Error checking in attendee', 'error');
        }
    } catch (error) {
        console.error('❌ Error checking in attendee:', error);
        showAlert('Error checking in attendee: ' + error.message, 'error');
    }
}

function openAddWalkInModal() {
    document.getElementById('addWalkInForm').reset();
    openModal('addWalkInModal');
}

async function submitWalkIn(e) {
    e.preventDefault();

    if (!currentManagingEventId) return;

    try {
        const email = document.getElementById('walkInEmail').value.trim();
        const username = document.getElementById('walkInUsername').value.trim();

        const response = await fetch(`/api/events/${currentManagingEventId}/walk-in`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, username })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Walk-in attendee added successfully!');
            closeModal('addWalkInModal');
            manageEventRegistrations(currentManagingEventId);
        } else {
            showAlert(data.message || 'Error adding walk-in', 'error');
        }
    } catch (error) {
        console.error('❌ Error adding walk-in:', error);
        showAlert('Error adding walk-in: ' + error.message, 'error');
    }
}

async function sendEventReminders() {
    if (!currentManagingEventId) return;

    if (!confirm('Send event reminders to all approved attendees?')) return;

    try {
        const response = await fetch(`/api/events/${currentManagingEventId}/send-reminders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.success) {
            showAlert(`Reminders sent! Success: ${data.successCount}, Failed: ${data.failCount}`);
        } else {
            showAlert(data.message || 'Error sending reminders', 'error');
        }
    } catch (error) {
        console.error('❌ Error sending reminders:', error);
        showAlert('Error sending reminders: ' + error.message, 'error');
    }
}

// ==================== APPLICATIONS ====================

async function loadApplications() {
    try {
        console.log('📝 Loading applications...');
        const response = await fetch('/admin/api/applications');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Applications data:', data);
        
        if (data.success && data.applications) {
            const tbody = document.getElementById('applicationsTableBody');
            
            if (data.applications.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">No applications found</td></tr>';
            } else {
                tbody.innerHTML = data.applications.map(app => `
                    <tr>
                        <td><strong>${app.fullName}</strong></td>
                        <td>${app.course}</td>
                        <td>${app.email}</td>
                        <td>${new Date(app.appliedAt).toLocaleDateString()}</td>
                        <td><span class="badge badge-${app.status}">${app.status}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="viewApplication('${app._id}')" title="View">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${app.status === 'pending' ? `
                                    <button class="btn btn-secondary btn-icon btn-sm" onclick="openApproveModal('${app._id}')" title="Approve" style="color:var(--green);">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-icon btn-sm" onclick="openRejectModal('${app._id}')" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load applications');
        }
    } catch (error) {
        console.error('❌ Error loading applications:', error);
        const tbody = document.getElementById('applicationsTableBody');
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #ff5252;">Error: ${error.message}</td></tr>`;
        showAlert('Error loading applications: ' + error.message, 'error');
    }
}

async function viewApplication(appId) {
    try {
        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        console.log('Viewing application:', appId);
        
        const response = await fetch(`/admin/api/applications/${appId}`);
        const data = await response.json();
        
        if (data.success) {
            const app = data.application;
            document.getElementById('applicationDetails').innerHTML = `
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>Full Name</label>
                        <p>${app.fullName}</p>
                    </div>
                    <div class="detail-item">
                        <label>Email</label>
                        <p>${app.email}</p>
                    </div>
                    <div class="detail-item">
                        <label>Course</label>
                        <p>${app.course}</p>
                    </div>
                    <div class="detail-item">
                        <label>Twitter Handle</label>
                        <p>${app.twitterHandle || 'Not provided'}</p>
                    </div>
                    <div class="detail-item">
                        <label>Status</label>
                        <p><span class="badge badge-${app.status}">${app.status}</span></p>
                    </div>
                    <div class="detail-item">
                        <label>Applied Date</label>
                        <p>${new Date(app.appliedAt).toLocaleString()}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Motivation</label>
                    <p style="color: #fff; padding: 1rem; background: rgba(94,194,19, 0.05); border-radius: 8px;">${app.motivation}</p>
                </div>
                ${app.experience ? `
                <div class="form-group">
                    <label>Experience</label>
                    <p style="color: #fff; padding: 1rem; background: rgba(94,194,19, 0.05); border-radius: 8px;">${app.experience}</p>
                </div>
                ` : ''}
            `;
            openModal('viewApplicationModal');
        } else {
            showAlert(data.message || 'Error loading application', 'error');
        }
    } catch (error) {
        console.error('❌ Error viewing application:', error);
        showAlert('Error loading application: ' + error.message, 'error');
    }
}

function openApproveModal(appId) {
    document.getElementById('approveAppId').value = appId;
    openModal('approveApplicationModal');
}

function openRejectModal(appId) {
    document.getElementById('rejectAppId').value = appId;
    openModal('rejectApplicationModal');
}

async function approveApplicationSubmit(e) {
    e.preventDefault();
    
    try {
        const appId = document.getElementById('approveAppId').value;
        const courseStartDate = document.getElementById('courseStartDate').value;
        const courseEndDate = document.getElementById('courseEndDate').value;
        const courseLink = document.getElementById('courseLink').value;
        const notes = document.getElementById('approveNotes').value;

        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        if (!courseStartDate || !courseEndDate || !courseLink) {
            showAlert('All course details are required', 'error');
            return;
        }

        const formData = {
            courseStartDate,
            courseEndDate,
            courseLink,
            notes
        };

        console.log('Approving application:', appId, formData);

        const response = await fetch(`/admin/api/applications/${appId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Approve response:', data);
        
        if (data.success) {
            showAlert('Application approved successfully! Email sent to applicant.');
            closeModal('approveApplicationModal');
            document.getElementById('approveApplicationForm').reset();
            loadApplications();
        } else {
            showAlert(data.message || 'Error approving application', 'error');
        }
    } catch (error) {
        console.error('❌ Error approving application:', error);
        showAlert('Error approving application: ' + error.message, 'error');
    }
}


async function rejectApplicationSubmit(e) {
    e.preventDefault();
    
    try {
        const appId = document.getElementById('rejectAppId').value;
        const notes = document.getElementById('rejectNotes').value.trim();

        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        if (!notes) {
            showAlert('Rejection reason is required', 'error');
            return;
        }

        const formData = { notes };

        console.log('Rejecting application:', appId, formData);

        const response = await fetch(`/admin/api/applications/${appId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Reject response:', data);
        
        if (data.success) {
            showAlert('Application rejected. Email sent to applicant.');
            closeModal('rejectApplicationModal');
            document.getElementById('rejectApplicationForm').reset();
            loadApplications();
        } else {
            showAlert(data.message || 'Error rejecting application', 'error');
        }
    } catch (error) {
        console.error('❌ Error rejecting application:', error);
        showAlert('Error rejecting application: ' + error.message, 'error');
    }
}


// ==================== QUESTS ====================

async function loadQuests() {
    try {
        const response = await fetch('/admin/api/quests');
        const data = await response.json();
        
        if (data.success && data.quests) {
            const tbody = document.getElementById('questsTableBody');
            if (data.quests.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">No quests found</td></tr>';
            } else {
                tbody.innerHTML = data.quests.map(q => `
                    <tr>
                        <td>
                            <strong>${q.title}</strong>
                            <br>
                            <small style="color: #888;">
                                ${q.questType === 'referral_boost' ? '🎁 Referral Boost' : ''}
                                ${q.questType === 'fcfs' ? '⚡ FCFS' : ''}
                                ${q.questType === 'competition' ? '🏆 Competition' : ''}
                                ${q.questType === 'standard' ? '📋 Standard' : ''}
                            </small>
                        </td>
                        <td>${q.category}</td>
                        <td><span class="badge badge-${q.difficulty}">${q.difficulty}</span></td>
                        <td>
                            ${q.baseXpReward || q.xpReward || 0} XP
                            ${q.usdcReward ? `<br><small>+ ${q.usdcReward} USDC</small>` : ''}
                        </td>
                        <td><span class="badge badge-${q.isActive ? 'active' : 'inactive'}">${q.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-primary btn-icon btn-sm" onclick="openEditQuestModal('${q._id}')" title="Edit Quest">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="viewQuestLeaderboard('${q._id}')" title="View Leaderboard">
                                    <i class="fas fa-chart-bar"></i>
                                </button>
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="toggleQuestStatus('${q._id}', ${!q.isActive})" title="${q.isActive ? 'Deactivate' : 'Activate'}">
                                    <i class="fas fa-power-off"></i>
                                </button>
                                <button class="btn btn-danger btn-icon btn-sm" onclick="deleteQuest('${q._id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading quests:', error);
        showAlert('Error loading quests', 'error');
    }
}

function openCreateQuestModal() {
    document.getElementById('createQuestForm').reset();
    document.getElementById('tasksList').innerHTML = '';
    taskCounter = 0;
    addTask();
    openModal('createQuestModal');
}
async function createQuest(e) {
    e.preventDefault();
    
    try {
        const taskElements = document.querySelectorAll('.task-item');
        const tasks = [];

        taskElements.forEach((task, index) => {
            const title = task.querySelector('.task-title')?.value.trim();
            const description = task.querySelector('.task-description')?.value.trim();
            const xpReward = parseInt(task.querySelector('.task-xpReward')?.value) || 0;
            
            if (!title || !description) {
                throw new Error(`Task ${index + 1} is missing required fields`);
            }
            
            const taskObj = {
                title: title,
                description: description,
                taskType: task.querySelector('.task-type').value,
                xpReward: xpReward
            };

            const buttonText = task.querySelector('.task-buttonText')?.value.trim();
            const buttonLink = task.querySelector('.task-buttonLink')?.value.trim();
            const inputLabel = task.querySelector('.task-inputLabel')?.value.trim();
            const inputName = task.querySelector('.task-inputName')?.value.trim();
            
            if (buttonText) taskObj.buttonText = buttonText;
            if (buttonLink) taskObj.buttonLink = buttonLink;
            if (inputLabel) taskObj.inputLabel = inputLabel;
            if (inputName) taskObj.inputName = inputName;

            tasks.push(taskObj);
        });

        if (tasks.length === 0) {
            alert('Please add at least one task');
            return;
        }
        
        const formData = {
            title: document.getElementById('questTitle').value,
            shortDescription: document.getElementById('questShortDesc').value,
            description: document.getElementById('questDescription').value,
            category: document.getElementById('questCategory').value,
            difficulty: document.getElementById('questDifficulty').value,
            questType: document.getElementById('questType').value,
            image: (document.getElementById('questImage') || {}).value || null,
            
            baseXpReward: parseInt(document.getElementById('baseXpReward').value) || 0,
            usdcReward: parseFloat(document.getElementById('questUSDC').value) || 0,
            
            startDate: document.getElementById('questStartDate').value || null,
            endDate: document.getElementById('questEndDate').value || null,
            maxParticipants: parseInt(document.getElementById('maxParticipants').value) || null,
            
            referralEnabled: document.getElementById('referralEnabled')?.checked || false,
            xpPerReferralJoin: parseInt(document.getElementById('xpPerReferralJoin')?.value) || 0,
            xpPerReferralComplete: parseInt(document.getElementById('xpPerReferralComplete')?.value) || 0,
            
            competitionEnabled: document.getElementById('competitionEnabled')?.checked || false,
            topWinnersCount: parseInt(document.getElementById('topWinnersCount')?.value) || 10,
            winnerBonusXP: parseInt(document.getElementById('winnerBonusXP')?.value) || 0,
            
            tasks: tasks
        };

        console.log('Creating quest with data:', formData);

        const response = await fetch('/admin/api/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('Quest created successfully!');
            closeModal('createQuestModal');
            document.getElementById('createQuestForm').reset();
            loadQuests();
        } else {
            alert(data.message || 'Error creating quest');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating quest: ' + error.message);
    }
}

function toggleQuestTypeSettings() {
    const questType = document.getElementById('questType').value;
    const referralSettings = document.getElementById('referralSettings');
    const competitionSettings = document.getElementById('competitionSettings');
    
    if (questType === 'referral_boost') {
        referralSettings.style.display = 'block';
        competitionSettings.style.display = 'none';
        // Auto-enable referral when referral_boost is selected
        document.getElementById('referralEnabled').checked = true;
        document.getElementById('referralFields').style.display = 'block';
    } else if (questType === 'fcfs' || questType === 'competition') {
        competitionSettings.style.display = 'block';
        referralSettings.style.display = questType === 'competition' ? 'block' : 'none';
    } else {
        referralSettings.style.display = 'none';
        competitionSettings.style.display = 'none';
    }
}

function toggleReferralFields() {
    const enabled = document.getElementById('referralEnabled').checked;
    document.getElementById('referralFields').style.display = enabled ? 'block' : 'none';
}

function toggleCompetitionFields() {
    const enabled = document.getElementById('competitionEnabled').checked;
    document.getElementById('competitionFields').style.display = enabled ? 'block' : 'none';
}

function addTask() {
    taskCounter++;
    const tasksList = document.getElementById('tasksList');

    const taskItem = document.createElement('div');
    taskItem.className = 'task-item';
    taskItem.id = `task-${taskCounter}`;
    taskItem.innerHTML = `
        <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2); display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fas fa-tasks"></i> Task ${taskCounter}</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeTask('task-${taskCounter}')" style="padding: 0.3rem 0.8rem;">
                <i class="fas fa-times"></i> Remove
            </button>
        </h4>
        
        <div class="form-group">
            <label>Task Title *</label>
            <input type="text" class="task-title" placeholder="e.g., Follow us on Twitter" required>
        </div>
        
        <div class="form-group">
            <label>Task Description *</label>
            <textarea class="task-description" placeholder="Describe what the user needs to do..." required></textarea>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
                <label>Task Type *</label>
                <select class="task-type">
                    <option value="submission">Submission</option>
                    <option value="social">Social Media</option>
                    <option value="verification">Verification</option>
                    <option value="quiz">Quiz</option>
                    <option value="external">External Link</option>
                </select>
            </div>
            
            <div class="form-group">
                <label>XP Reward for This Task</label>
                <input type="number" class="task-xpReward" min="0" value="0" placeholder="0">
                <small style="color: #888; font-size: 0.75rem; display: block; margin-top: 0.3rem;">XP earned when completing this specific task</small>
            </div>
        </div>

        <div style="background: rgba(94,194,19,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(94,194,19,0.1); margin-bottom: 1rem;">
            <h5 style="color:var(--green); font-size: 0.9rem; margin-bottom: 0.8rem;">
                <i class="fas fa-link"></i> Action Button (Optional)
            </h5>
            
            <div class="form-group">
                <label>Button Text</label>
                <input type="text" class="task-buttonText" placeholder="e.g., Follow on Twitter">
            </div>
            
            <div class="form-group">
                <label>Button Link (URL)</label>
                <input type="url" class="task-buttonLink" placeholder="https://twitter.com/...">
            </div>
        </div>

        <div style="background: rgba(255,193,7,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,193,7,0.1);">
            <h5 style="color: #FFC107; font-size: 0.9rem; margin-bottom: 0.8rem;">
                <i class="fas fa-keyboard"></i> User Input Field (Optional)
            </h5>

            <div class="form-group">
                <label>Input Label</label>
                <input type="text" class="task-inputLabel" placeholder="e.g., Enter your Twitter username">
            </div>

            <div class="form-group">
                <label>Input Name (Technical ID)</label>
                <input type="text" class="task-inputName" placeholder="e.g., twitterUsername">
            </div>
        </div>

        <!-- Auto Twitter/X Follow Verification Info -->
        <div class="twitter-auto-info" style="background: rgba(29,161,242,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(29,161,242,0.2); margin-top: 1rem; display: none;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <i class="fab fa-x-twitter" style="color: #1DA1F2; font-size: 1.2rem;"></i>
                <h5 style="color: #1DA1F2; font-size: 0.9rem; margin: 0;">
                    Automatic X/Twitter Follow Verification
                </h5>
            </div>
            <p style="color:var(--green); font-size: 0.85rem; margin: 0.5rem 0; font-weight: 600;">
                ✅ Follow verification will be automatically enabled!
            </p>
            <p style="color: #ccc; font-size: 0.8rem; margin: 0; line-height: 1.5;">
                If your button link contains an X/Twitter URL, the system will automatically extract the username and verify that users follow the account before completing this task. No extra fields needed!
            </p>
            <p style="color: #888; font-size: 0.75rem; margin: 0.5rem 0 0 0; font-style: italic;">
                Other social media (Telegram, Discord, etc.) will not have follow verification.
            </p>
        </div>
    `;
    tasksList.appendChild(taskItem);

    // Add event listener for task type changes to show/hide Twitter auto-info
    const taskTypeSelect = taskItem.querySelector('.task-type');
    const twitterAutoInfo = taskItem.querySelector('.twitter-auto-info');

    // Function to toggle Twitter info visibility
    function toggleTwitterInfo() {
        if (taskTypeSelect.value === 'social') {
            twitterAutoInfo.style.display = 'block';
        } else {
            twitterAutoInfo.style.display = 'none';
        }
    }

    // Check initial value on task creation
    toggleTwitterInfo();

    // Listen for changes
    taskTypeSelect.addEventListener('change', toggleTwitterInfo);
}

function removeTask(taskId) {
    const task = document.getElementById(taskId);
    if (task) {
        task.remove();
    }
}

function clearQuestDates() {
    document.getElementById('questStartDate').value = '';
    document.getElementById('questEndDate').value = '';
    alert('✅ Dates cleared! Quest will be available immediately after creation.');
}

async function createNewQuest(e) {
    e.preventDefault();
    
    try {
        const taskElements = document.querySelectorAll('.task-item');
        const tasks = [];

        taskElements.forEach((task, index) => {
            const title = task.querySelector('.task-title').value.trim();
            const description = task.querySelector('.task-description').value.trim();
            const xpReward = parseInt(task.querySelector('.task-xpReward').value) || 0;
            
            if (!title || !description) {
                alert(`Task ${index + 1} is missing required fields`);
                return;
            }
            
            const taskObj = {
                title: title,
                description: description,
                taskType: task.querySelector('.task-type').value,
                xpReward: xpReward
            };

            const buttonText = task.querySelector('.task-buttonText')?.value.trim() || '';
            const buttonLink = task.querySelector('.task-buttonLink')?.value.trim() || '';
            const inputLabel = task.querySelector('.task-inputLabel')?.value.trim() || '';
            const inputName = task.querySelector('.task-inputName')?.value.trim() || '';

            // For social tasks with X/Twitter links, the backend will auto-extract the username
            console.log(`📝 Task ${index + 1}:`, {
                title,
                taskType: taskObj.taskType,
                buttonLink,
                note: taskObj.taskType === 'social' && buttonLink?.includes('x.com' || 'twitter.com')
                    ? '✅ Twitter verification will be auto-enabled'
                    : ''
            });

            if (buttonText) taskObj.buttonText = buttonText;
            if (buttonLink) taskObj.buttonLink = buttonLink;
            if (inputLabel) taskObj.inputLabel = inputLabel;
            if (inputName) taskObj.inputName = inputName;
            // twitterFollowTarget will be auto-extracted by backend from buttonLink

            tasks.push(taskObj);
        });

        if (tasks.length === 0) {
            alert('Please add at least one task');
            return;
        }
        
        const formData = {
            title: document.getElementById('questTitle').value,
            shortDescription: document.getElementById('questShortDesc').value,
            description: document.getElementById('questDescription').value,
            category: document.getElementById('questCategory').value,
            difficulty: document.getElementById('questDifficulty').value,
            questType: document.getElementById('questType').value,
            
            baseXpReward: parseInt(document.getElementById('baseXpReward').value) || 0,
            usdcReward: parseFloat(document.getElementById('questUSDC').value) || 0,
            
            startDate: document.getElementById('questStartDate').value || null,
            endDate: document.getElementById('questEndDate').value || null,
            maxParticipants: parseInt(document.getElementById('maxParticipants').value) || null,
            
            referralEnabled: document.getElementById('referralEnabled')?.checked || false,
            xpPerReferralJoin: parseInt(document.getElementById('xpPerReferralJoin')?.value) || 0,
            xpPerReferralComplete: parseInt(document.getElementById('xpPerReferralComplete')?.value) || 0,
            
            competitionEnabled: document.getElementById('competitionEnabled')?.checked || false,
            topWinnersCount: parseInt(document.getElementById('topWinnersCount')?.value) || 10,
            winnerBonusXP: parseInt(document.getElementById('winnerBonusXP')?.value) || 0,
            
            tasks: tasks
        };

        console.log('Creating quest with data:', formData);

        const response = await fetch('/admin/api/quests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('Quest created successfully!');
            closeModal('createQuestModal');
            document.getElementById('createQuestForm').reset();
            loadQuests();
        } else {
            alert(data.message || 'Error creating quest');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error creating quest: ' + error.message);
    }
}

async function toggleQuestStatus(questId, newStatus) {
    if (confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} this quest?`)) {
        try {
            const response = await fetch(`/admin/api/quests/${questId}/toggle`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: newStatus })
            });

            const data = await response.json();
            
            if (data.success) {
                showAlert(`Quest ${newStatus ? 'activated' : 'deactivated'} successfully!`);
                loadQuests();
            } else {
                alert(data.message || 'Error updating quest');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error updating quest');
        }
    }
}

async function deleteQuest(questId) {
    if (confirm('Are you sure you want to delete this quest? This action cannot be undone.')) {
        try {
            const response = await fetch(`/admin/api/quests/${questId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                showAlert('Quest deleted successfully!');
                loadQuests();
            } else {
                alert(data.message || 'Error deleting quest');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error deleting quest');
        }
    }
}

// ==================== EDIT QUEST FUNCTIONS ====================

async function openEditQuestModal(questId) {
    try {
        const response = await fetch(`/admin/api/quests/${questId}`);
        const data = await response.json();

        if (!data.success) {
            alert(data.message || 'Error loading quest');
            return;
        }

        const quest = data.quest;

        // Populate form fields
        document.getElementById('editQuestId').value = quest._id;
        document.getElementById('editQuestTitle').value = quest.title || '';
        document.getElementById('editQuestShortDesc').value = quest.shortDescription || '';
        document.getElementById('editQuestDescription').value = quest.description || '';
        document.getElementById('editQuestCategory').value = quest.category || 'learning';
        document.getElementById('editQuestDifficulty').value = quest.difficulty || 'beginner';
        document.getElementById('editQuestType').value = quest.questType || 'standard';
        document.getElementById('editBaseXpReward').value = quest.baseXpReward || 0;
        document.getElementById('editQuestUSDC').value = quest.usdcReward || 0;

        // Clear and populate tasks
        const tasksList = document.getElementById('editTasksList');
        tasksList.innerHTML = '';
        editTaskCounter = 0;

        if (quest.tasks && quest.tasks.length > 0) {
            quest.tasks.forEach(task => {
                addEditTask(task);
            });
        }

        openModal('editQuestModal');
    } catch (error) {
        console.error('Error loading quest:', error);
        alert('Error loading quest: ' + error.message);
    }
}

function addEditTask(existingTask = null) {
    editTaskCounter++;
    const tasksList = document.getElementById('editTasksList');

    const taskItem = document.createElement('div');
    taskItem.className = 'edit-task-item';
    taskItem.id = `edit-task-${editTaskCounter}`;
    taskItem.innerHTML = `
        <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2); display: flex; justify-content: space-between; align-items: center;">
            <span><i class="fas fa-tasks"></i> Task ${editTaskCounter}</span>
            <button type="button" class="btn btn-danger btn-sm" onclick="removeEditTask('edit-task-${editTaskCounter}')" style="padding: 0.3rem 0.8rem;">
                <i class="fas fa-times"></i> Remove
            </button>
        </h4>

        <div class="form-group">
            <label>Task Title *</label>
            <input type="text" class="edit-task-title" placeholder="e.g., Follow us on Twitter" value="${existingTask?.title || ''}" required>
        </div>

        <div class="form-group">
            <label>Task Description *</label>
            <textarea class="edit-task-description" placeholder="Describe what the user needs to do..." required>${existingTask?.description || ''}</textarea>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
            <div class="form-group">
                <label>Task Type *</label>
                <select class="edit-task-type">
                    <option value="submission" ${existingTask?.taskType === 'submission' ? 'selected' : ''}>Submission</option>
                    <option value="social" ${existingTask?.taskType === 'social' ? 'selected' : ''}>Social Media</option>
                    <option value="verification" ${existingTask?.taskType === 'verification' ? 'selected' : ''}>Verification</option>
                    <option value="quiz" ${existingTask?.taskType === 'quiz' ? 'selected' : ''}>Quiz</option>
                    <option value="external" ${existingTask?.taskType === 'external' ? 'selected' : ''}>External Link</option>
                    <option value="daily" ${existingTask?.taskType === 'daily' ? 'selected' : ''}>Daily</option>
                </select>
            </div>

            <div class="form-group">
                <label>XP Reward for This Task</label>
                <input type="number" class="edit-task-xpReward" min="0" value="${existingTask?.xpReward || 0}" placeholder="0">
            </div>
        </div>

        <div style="background: rgba(94,194,19,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(94,194,19,0.1); margin-bottom: 1rem;">
            <h5 style="color:var(--green); font-size: 0.9rem; margin-bottom: 0.8rem;">
                <i class="fas fa-link"></i> Action Button (Optional)
            </h5>

            <div class="form-group">
                <label>Button Text</label>
                <input type="text" class="edit-task-buttonText" placeholder="e.g., Follow on Twitter" value="${existingTask?.buttonText || ''}">
            </div>

            <div class="form-group">
                <label>Button Link (URL)</label>
                <input type="url" class="edit-task-buttonLink" placeholder="https://twitter.com/..." value="${existingTask?.buttonLink || ''}">
            </div>
        </div>

        <div style="background: rgba(255,193,7,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,193,7,0.1);">
            <h5 style="color: #FFC107; font-size: 0.9rem; margin-bottom: 0.8rem;">
                <i class="fas fa-keyboard"></i> User Input Field (Optional)
            </h5>

            <div class="form-group">
                <label>Input Label</label>
                <input type="text" class="edit-task-inputLabel" placeholder="e.g., Enter your Twitter username" value="${existingTask?.inputLabel || ''}">
            </div>

            <div class="form-group">
                <label>Input Name (Technical ID)</label>
                <input type="text" class="edit-task-inputName" placeholder="e.g., twitterUsername" value="${existingTask?.inputName || ''}">
            </div>
        </div>
    `;
    tasksList.appendChild(taskItem);
}

function removeEditTask(taskId) {
    const task = document.getElementById(taskId);
    if (task) {
        task.remove();
    }
}

async function updateQuest(e) {
    e.preventDefault();

    try {
        const questId = document.getElementById('editQuestId').value;
        const taskElements = document.querySelectorAll('.edit-task-item');
        const tasks = [];

        taskElements.forEach((task, index) => {
            const title = task.querySelector('.edit-task-title')?.value.trim();
            const description = task.querySelector('.edit-task-description')?.value.trim();
            const xpReward = parseInt(task.querySelector('.edit-task-xpReward')?.value) || 0;

            if (!title || !description) {
                throw new Error(`Task ${index + 1} is missing required fields`);
            }

            const taskObj = {
                title: title,
                description: description,
                taskType: task.querySelector('.edit-task-type').value,
                xpReward: xpReward
            };

            const buttonText = task.querySelector('.edit-task-buttonText')?.value.trim();
            const buttonLink = task.querySelector('.edit-task-buttonLink')?.value.trim();
            const inputLabel = task.querySelector('.edit-task-inputLabel')?.value.trim();
            const inputName = task.querySelector('.edit-task-inputName')?.value.trim();

            if (buttonText) taskObj.buttonText = buttonText;
            if (buttonLink) taskObj.buttonLink = buttonLink;
            if (inputLabel) taskObj.inputLabel = inputLabel;
            if (inputName) taskObj.inputName = inputName;

            tasks.push(taskObj);
        });

        if (tasks.length === 0) {
            alert('Please add at least one task');
            return;
        }

        const formData = {
            title: document.getElementById('editQuestTitle').value,
            shortDescription: document.getElementById('editQuestShortDesc').value,
            description: document.getElementById('editQuestDescription').value,
            category: document.getElementById('editQuestCategory').value,
            difficulty: document.getElementById('editQuestDifficulty').value,
            questType: document.getElementById('editQuestType').value,
            baseXpReward: parseInt(document.getElementById('editBaseXpReward').value) || 0,
            usdcReward: parseFloat(document.getElementById('editQuestUSDC').value) || 0,
            tasks: tasks
        };

        console.log('Updating quest with data:', formData);

        const response = await fetch(`/admin/api/quests/${questId}/settings`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Quest updated successfully!');
            closeModal('editQuestModal');
            loadQuests();
        } else {
            alert(data.message || 'Error updating quest');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error updating quest: ' + error.message);
    }
}

async function viewQuestLeaderboard(questId) {
    // Show immediate loading feedback
    showAlert('Loading leaderboard...', 'success');

    try {
        questId = String(questId).trim();

        if (!questId || questId === 'undefined' || questId === 'null' || questId.length === 0) {
            showAlert('Invalid quest ID', 'error');
            return;
        }

        // Remove any existing leaderboard modal first
        const existingModal = document.getElementById('leaderboardModal');
        if (existingModal) existingModal.remove();

        const response = await fetch('/admin/api/quests/' + questId + '/leaderboard');

        if (!response.ok) {
            const errorText = await response.text();
            showAlert('Error loading leaderboard: HTTP ' + response.status, 'error');
            console.error('Leaderboard error:', errorText);
            return;
        }

        const data = await response.json();

        if (data.success) {
            if (!data.quest.id && !data.quest._id) {
                data.quest.id = questId;
                data.quest._id = questId;
            }
            try {
                showLeaderboardModal(data, questId);
            } catch (modalError) {
                console.error('Error rendering leaderboard modal:', modalError);
                showAlert('Error rendering modal: ' + modalError.message, 'error');
            }
        } else {
            showAlert(data.message || 'Error loading leaderboard', 'error');
        }
    } catch (error) {
        console.error('Error loading leaderboard:', error);
        showAlert('Error: ' + error.message, 'error');
    }
}

function showLeaderboardModal(data, questId) {
    // Remove any existing modal
    const existing = document.getElementById('leaderboardModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'leaderboardModal';

    // Store quest tasks for export
    currentQuestTasks = (data.quest && data.quest.tasks) ? data.quest.tasks : [];

    // Ensure we have a valid questId
    const finalQuestId = questId || (data.quest && data.quest.id) || (data.quest && data.quest._id) || '';

    // Store questId in the modal for later use
    modal.setAttribute('data-quest-id', finalQuestId);

    // Build rows separately to avoid nested template literal issues
    var rows = '';
    var entries = data.leaderboard || [];
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var uid = (entry.userId && entry.userId._id) ? entry.userId._id : (entry.userId || entry._id || '');
        var uname = entry.username || (entry.userId && entry.userId.username) || 'Unknown';
        var uemail = entry.email || (entry.userId && entry.userId.email) || '';
        var rankColor = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : '#888';
        var rankLabel = i === 0 ? '&#129351;' : i === 1 ? '&#129352;' : i === 2 ? '&#129353;' : String(entry.rank || i + 1);
        var winnerMark = entry.isWinner ? ' <span style="color:var(--green);">&#10003;</span>' : '';
        var bgStyle = entry.isWinner ? 'background: rgba(94,194,19,0.05);' : '';
        var completedDate = entry.completedAt ? new Date(entry.completedAt).toLocaleDateString() : 'N/A';

        rows += '<tr style="' + bgStyle + '">'
            + '<td><strong style="color: ' + rankColor + ';">' + rankLabel + '</strong>' + winnerMark + '</td>'
            + '<td><strong>' + uname + '</strong><br><small style="color: #666;">' + uemail + '</small></td>'
            + '<td><strong style="color:var(--green);">' + (entry.totalXp || 0) + '</strong></td>'
            + '<td>' + (entry.taskXp || 0) + '</td>'
            + '<td>' + (entry.baseXp || 0) + '</td>'
            + '<td>' + (entry.referralJoinBonus || 0) + '</td>'
            + '<td>' + (entry.winnerBonus || 0) + '</td>'
            + '<td>' + (entry.timeSpent || 0) + 'm</td>'
            + '<td><small style="color: #888;">' + completedDate + '</small></td>'
            + '<td><button class="btn btn-danger btn-icon btn-sm" onclick="banUserFromLeaderboard(\'' + uid + '\', \'' + uname.replace(/'/g, "\\'") + '\', \'' + finalQuestId + '\')" title="Ban User"><i class="fas fa-user-slash"></i></button></td>'
            + '</tr>';
    }

    var questTitle = (data.quest && data.quest.title) || 'Quest';
    var questType = (data.quest && data.quest.questType) || '';

    modal.innerHTML = '<div class="modal-content" style="max-width: 1200px; max-height: 90vh; overflow-y: auto;">'
        + '<div class="modal-header"><div>'
        + '<h3>' + questTitle + ' - Leaderboard</h3>'
        + '<p style="color: #888; font-size: 0.9rem; margin-top: 0.5rem;">Type: ' + questType + ' | Participants: ' + (data.totalParticipants || 0) + ' | Completions: ' + (data.totalCompletions || 0) + '</p>'
        + '</div><button class="close-btn" onclick="closeLeaderboardModal()">&times;</button></div>'
        + '<div style="margin-bottom: 1rem; display: flex; gap: 1rem; flex-wrap: wrap;">'
        + '<button class="btn btn-primary btn-sm" onclick="openRewardDistributionFromLeaderboard()"><i class="fas fa-gift"></i> Distribute Rewards</button>'
        + '<button class="btn btn-secondary btn-sm" onclick="exportLeaderboard(\'' + finalQuestId + '\')"><i class="fas fa-download"></i> Export CSV</button>'
        + '<button class="btn btn-secondary btn-sm" style="background: rgba(29,161,242,0.1); border-color: #1DA1F2; color: #1DA1F2;" onclick="openTaskExportModal(\'' + finalQuestId + '\')"><i class="fas fa-tasks"></i> Export with Tasks</button>'
        + '</div>'
        + '<div class="table-container"><table>'
        + '<thead><tr><th>Rank</th><th>Username</th><th>Total XP</th><th>Task XP</th><th>Base XP</th><th>Referral Join</th><th>Winner Bonus</th><th>Time</th><th>Completed</th><th>Actions</th></tr></thead>'
        + '<tbody>' + rows + '</tbody>'
        + '</table></div></div>';

    document.body.appendChild(modal);
}


function closeLeaderboardModal() {
    const modal = document.getElementById('leaderboardModal');
    if (modal) {
        modal.remove();
    }
}

function exportLeaderboard(questId) {
    window.open(`/admin/api/quests/${questId}/export`, '_blank');
}

function openTaskExportModal(questId) {
    // Get tasks from the leaderboard modal data attribute
    const leaderboardModal = document.getElementById('leaderboardModal');
    const tasks = currentQuestTasks;

    if (!tasks || tasks.length === 0) {
        showAlert('No tasks found for this quest', 'error');
        return;
    }

    const taskExportModal = document.createElement('div');
    taskExportModal.className = 'modal active';
    taskExportModal.id = 'taskExportModal';
    taskExportModal.style.zIndex = '10001';

    var taskRows = '';
    for (var t = 0; t < tasks.length; t++) {
        var task = tasks[t];
        taskRows += '<label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; cursor: pointer; padding: 0.4rem 0.5rem; border-radius: 4px;">'
            + '<input type="checkbox" class="task-export-checkbox" value="' + (task._id || '') + '" checked style="width: 16px; height: 16px;">'
            + '<span>' + (task.title || 'Task') + ' <small style="color: #888;">(' + (task.xp || 0) + ' XP)</small></span>'
            + '</label>';
    }

    taskExportModal.innerHTML = '<div class="modal-content" style="max-width: 500px;">'
        + '<div class="modal-header"><h3>Export with Task Breakdown</h3>'
        + '<button class="close-btn" onclick="document.getElementById(\'taskExportModal\').remove()">&times;</button></div>'
        + '<p style="color: #888; margin-bottom: 1rem;">Select which tasks to include in the CSV export:</p>'
        + '<div style="margin-bottom: 1rem;">'
        + '<label style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; cursor: pointer; padding: 0.5rem; border-radius: 6px; background: rgba(94,194,19,0.05);">'
        + '<input type="checkbox" id="selectAllTasks" checked onchange="toggleAllTasks(this.checked)" style="width: 18px; height: 18px;">'
        + '<strong>Select All Tasks</strong></label>'
        + '<hr style="border-color: #333; margin: 0.5rem 0;">'
        + taskRows
        + '</div>'
        + '<div style="display: flex; gap: 1rem; justify-content: flex-end;">'
        + '<button class="btn btn-secondary btn-sm" onclick="document.getElementById(\'taskExportModal\').remove()">Cancel</button>'
        + '<button class="btn btn-primary btn-sm" onclick="exportWithTasks(\'' + questId + '\')"><i class="fas fa-download"></i> Export CSV</button>'
        + '</div></div>';

    document.body.appendChild(taskExportModal);
}

function toggleAllTasks(checked) {
    document.querySelectorAll('.task-export-checkbox').forEach(cb => cb.checked = checked);
}

function exportWithTasks(questId) {
    const selectedTasks = Array.from(document.querySelectorAll('.task-export-checkbox:checked')).map(cb => cb.value);

    if (selectedTasks.length === 0) {
        showAlert('Please select at least one task', 'error');
        return;
    }

    const taskIds = selectedTasks.join(',');
    window.open(`/admin/api/quests/${questId}/export-tasks?taskIds=${taskIds}`, '_blank');
    document.getElementById('taskExportModal').remove();
}

async function openRewardDistribution(questId) {
    try {
        // Clean and validate questId
        questId = String(questId).trim();
        
        console.log('🎁 Opening reward distribution');
        console.log('Quest ID received:', questId);
        console.log('Quest ID type:', typeof questId);
        console.log('Quest ID length:', questId.length);
        
        if (!questId || questId === 'undefined' || questId === 'null' || questId.length === 0) {
            showAlert('Invalid quest ID', 'error');
            console.error('Invalid questId:', questId);
            return;
        }
        
        // Prompt for number of winners
        const topCount = prompt('How many top performers to reward? (e.g., 10, 50, 100)', '10');
        
        if (!topCount) {
            console.log('User cancelled the prompt');
            return;
        }
        
        const count = parseInt(topCount);
        if (isNaN(count) || count < 1) {
            showAlert('Please enter a valid number', 'error');
            return;
        }

        console.log(`📊 Fetching top ${count} winners for quest ${questId}...`);

        // Show modal with loading state
        openModal('rewardDistributionModal');
        document.getElementById('rewardDistributionContent').innerHTML = `
            <div style="text-align: center; padding: 3rem; color: #888;">
                <i class="fas fa-spinner fa-spin" style="font-size: 3rem; color:var(--green);"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem;">Loading top ${count} performers...</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: #555;">Quest ID: ${questId}</p>
            </div>
        `;

        const url = `/admin/api/quests/${questId}/winners?topCount=${count}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response OK:', response.ok);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('✅ Winners data received:', data);

        if (data.success) {
            if (!data.winners || data.winners.length === 0) {
                document.getElementById('rewardDistributionContent').innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #888;">
                        <i class="fas fa-user-slash" style="font-size: 3rem; color: #888;"></i>
                        <p style="margin-top: 1rem; font-size: 1.1rem;">No completed participants found for this quest.</p>
                        <button class="btn btn-secondary" onclick="closeModal('rewardDistributionModal')" style="margin-top: 1rem;">Close</button>
                    </div>
                `;
            } else {
                console.log(`🎉 Rendering ${data.winners.length} winners`);
                renderRewardDistribution(data, questId);
            }
        } else {
            throw new Error(data.message || 'Failed to load winners');
        }
    } catch (error) {
        console.error('❌ Error opening reward distribution:', error);
        
        // Show error in modal
        document.getElementById('rewardDistributionContent').innerHTML = `
            <div style="text-align: center; padding: 3rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #ff5252;"></i>
                <p style="margin-top: 1rem; font-size: 1.1rem; color: #ff5252;">Error loading winners</p>
                <p style="color: #888; margin-top: 0.5rem;">${error.message}</p>
                <button class="btn btn-secondary" onclick="closeModal('rewardDistributionModal')" style="margin-top: 1rem;">Close</button>
            </div>
        `;
        
        showAlert('Error loading winners: ' + error.message, 'error');
    }
}
function openRewardDistributionFromLeaderboard() {
    const modal = document.getElementById('leaderboardModal');
    const questId = modal.getAttribute('data-quest-id');
    
    console.log('📊 Opening reward distribution from leaderboard');
    console.log('Quest ID from modal:', questId);
    console.log('Quest ID type:', typeof questId);
    
    if (!questId || questId === 'undefined' || questId === 'null') {
        showAlert('Quest ID not found. Please close and reopen the leaderboard.', 'error');
        console.error('No questId in modal. Modal attributes:', modal.getAttributeNames());
        return;
    }
    
    closeLeaderboardModal();
    setTimeout(() => {
        openRewardDistribution(questId);
    }, 300);
}


function renderRewardDistribution(data, questId) {
    console.log('🎨 Rendering reward distribution UI...');
    console.log('Quest ID:', questId);
    console.log('Winners count:', data.winners.length);
    
    const content = document.getElementById('rewardDistributionContent');
    
    if (!content) {
        console.error('❌ rewardDistributionContent element not found!');
        showAlert('Error: Modal content element not found', 'error');
        return;
    }
    
    // Store questId in the modal
    const modal = document.getElementById('rewardDistributionModal');
    modal.setAttribute('data-quest-id', questId);
    
    let html = `
        <div style="margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 2px solid rgba(94,194,19,0.2);">
            <h4 style="color:var(--green); margin-bottom: 0.5rem;">${data.quest.title}</h4>
            <p style="color: #888;">Top ${data.winners.length} performers - Edit reward amounts before distributing</p>
        </div>
        
        <div style="margin-bottom: 1rem;">
            <button class="btn btn-secondary btn-sm" onclick="autoFillRewards()">
                <i class="fas fa-magic"></i> Auto-fill Suggested Rewards
            </button>
        </div>

        <div class="table-container" style="max-height: 400px; overflow-y: auto;">
            <table>
                <thead style="position: sticky; top: 0; background:var(--bg-card);">
                    <tr>
                        <th>Rank</th>
                        <th>Username</th>
                        <th>Total XP</th>
                        <th>Current Balance</th>
                        <th>Reward Amount ($)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.winners.map((winner, idx) => `
                        <tr>
                            <td>
                                <strong style="color: ${idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#888'};">
                                    ${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : winner.rank}
                                </strong>
                            </td>
                            <td><strong>${winner.username}</strong></td>
                            <td>${winner.totalXp}</td>
                            <td>$${winner.currentBalance}</td>
                            <td>
                                <input 
                                    type="number" 
                                    class="reward-input" 
                                    data-user-id="${winner.userId}"
                                    data-suggested="${winner.suggestedReward}"
                                    value="${winner.suggestedReward}"
                                    min="0" 
                                    step="0.01"
                                    style="width: 100px; padding: 0.5rem; background:var(--bg-card); border: 1px solid rgba(94,194,19,0.2); color: #fff; border-radius: 8px;"
                                >
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 2px solid rgba(94,194,19,0.2); display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong style="color:var(--green); font-size: 1.2rem;">Total: $<span id="totalRewardAmount">0.00</span></strong>
            </div>
            <div style="display: flex; gap: 1rem;">
                <button class="btn btn-secondary" onclick="closeModal('rewardDistributionModal')">Cancel</button>
                <button class="btn btn-primary" onclick="distributeRewardsFromModal()">
                    <i class="fas fa-paper-plane"></i> Distribute Rewards
                </button>
            </div>
        </div>
    `;
    
    content.innerHTML = html;
    
    // Add event listeners to calculate total
    document.querySelectorAll('.reward-input').forEach(input => {
        input.addEventListener('input', calculateTotalReward);
    });
    
    calculateTotalReward();
}

function autoFillRewards() {
    document.querySelectorAll('.reward-input').forEach(input => {
        input.value = input.getAttribute('data-suggested');
    });
    calculateTotalReward();
}

function calculateTotalReward() {
    let total = 0;
    document.querySelectorAll('.reward-input').forEach(input => {
        total += parseFloat(input.value) || 0;
    });
    document.getElementById('totalRewardAmount').textContent = total.toFixed(2);
}

function distributeRewardsFromModal() {
    const modal = document.getElementById('rewardDistributionModal');
    const questId = modal.getAttribute('data-quest-id');
    distributeRewards(questId);
}

async function distributeRewards(questId) {
    if (!questId) {
        showAlert('Quest ID is missing', 'error');
        return;
    }

    const inputs = document.querySelectorAll('.reward-input');
    const rewards = [];
    
    inputs.forEach((input, index) => {
        const amount = parseFloat(input.value);
        if (amount > 0) {
            rewards.push({
                userId: input.getAttribute('data-user-id'),
                amount: amount,
                position: index + 1
            });
        }
    });
    
    if (rewards.length === 0) {
        showAlert('Please set reward amounts for at least one user', 'error');
        return;
    }
    
    const total = rewards.reduce((sum, r) => sum + r.amount, 0);
    
    if (!confirm(`Distribute total of $${total.toFixed(2)} to ${rewards.length} users?\n\nThis will add USDC to their balances immediately.`)) {
        return;
    }
    
    try {
        console.log('Distributing rewards:', { questId, rewards });
        
        const response = await fetch('/admin/api/quests/distribute-rewards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questId, rewards })
        });
        
        const data = await response.json();
        console.log('Distribution response:', data);
        
        if (data.success) {
            showAlert(`✅ Successfully distributed $${data.totalDistributed.toFixed(2)} to ${data.results.filter(r => r.success).length} users!`);
            closeModal('rewardDistributionModal');
            
            // Show detailed results
            const failed = data.results.filter(r => !r.success);
            if (failed.length > 0) {
                console.warn('Failed distributions:', failed);
                showAlert(`⚠️ ${failed.length} distributions failed. Check console for details.`, 'error');
            }
        } else {
            showAlert(data.message || 'Error distributing rewards', 'error');
        }
    } catch (error) {
        console.error('Error distributing rewards:', error);
        showAlert('Error distributing rewards: ' + error.message, 'error');
    }
}

// ==================== WITHDRAWAL MANAGEMENT ====================

async function loadWithdrawals() {
    try {
        const status = document.getElementById('withdrawalStatusFilter')?.value || 'pending';
        console.log('💰 Loading withdrawals with status:', status);
        
        const response = await fetch(`/admin/api/withdrawals?status=${status}`);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Withdrawals data:', data);
        
        if (data.success && data.withdrawals) {
            const tbody = document.getElementById('withdrawalsTableBody');
            
            if (!tbody) {
                console.error('Withdrawals table body not found!');
                return;
            }
            
            if (data.withdrawals.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #888;">No ${status} withdrawal requests found</td></tr>`;
            } else {
                tbody.innerHTML = data.withdrawals.map(w => `
                    <tr>
                        <td>
                            <strong>${w.user?.username || 'Unknown'}</strong>
                            <br>
                            <small style="color: #888;">${w.user?.email || ''}</small>
                        </td>
                        <td><strong style="color:var(--green);">$${parseFloat(w.amount).toFixed(2)}</strong></td>
                        <td>
                            <small style="color: #888; font-family: monospace; word-break: break-all;">
                                ${w.walletAddress ? w.walletAddress.substring(0, 10) + '...' + w.walletAddress.substring(w.walletAddress.length - 6) : 'N/A'}
                            </small>
                        </td>
                        <td><small style="color: #888;">${new Date(w.createdAt).toLocaleString()}</small></td>
                        <td><span class="badge badge-${w.status}">${w.status}</span></td>
                        <td>
                            <div class="action-buttons">
                                ${w.status === 'pending' ? `
                                    <button class="btn btn-secondary btn-icon btn-sm" onclick="openApproveWithdrawal('${w._id}', '${w.user?.username || 'Unknown'}', ${w.amount}, '${w.walletAddress || ''}')" title="Approve" style="color:var(--green);">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-icon btn-sm" onclick="openRejectWithdrawal('${w._id}', '${w.user?.username || 'Unknown'}', ${w.amount})" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : `
                                    <small style="color: #888;">
                                        ${w.processedAt ? 'Processed ' + new Date(w.processedAt).toLocaleDateString() : 'Completed'}
                                        ${w.txHash ? '<br>TX: ' + w.txHash.substring(0, 10) + '...' : ''}
                                    </small>
                                `}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load withdrawals');
        }
    } catch (error) {
        console.error('❌ Error loading withdrawals:', error);
        const tbody = document.getElementById('withdrawalsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #ff5252;">Error loading withdrawals: ${error.message}</td></tr>`;
        }
        showAlert('Error loading withdrawals: ' + error.message, 'error');
    }
}

async function loadWithdrawalStats() {
    try {
        const response = await fetch('/admin/api/withdrawals/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('pendingWithdrawals').textContent = data.pending || 0;
            document.getElementById('completedWithdrawals').textContent = data.completed || 0;
        }
    } catch (error) {
        console.error('Error loading withdrawal stats:', error);
    }
}

function openApproveWithdrawal(txId, username, amount, wallet) {
    document.getElementById('approveWithdrawalId').value = txId;
    document.getElementById('withdrawalApproveDetails').innerHTML = `
        <div style="background: rgba(94,194,19,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(94,194,19,0.1); margin-bottom: 1rem;">
            <p style="margin-bottom: 0.5rem;"><strong>User:</strong> ${username}</p>
            <p style="margin-bottom: 0.5rem;"><strong>Amount:</strong> $${amount}</p>
            <p style="margin-bottom: 0;"><strong>Wallet:</strong> <small style="font-family: monospace;">${wallet}</small></p>
        </div>
        <div style="background: rgba(255,193,7,0.1); padding: 1rem; border-radius: 8px; border: 1px solid #ffc107; margin-bottom: 1rem;">
            <p style="color: #ffc107; margin: 0;">
                <i class="fas fa-exclamation-triangle"></i> Make sure you've sent the payment on-chain before approving!
            </p>
        </div>
    `;
    openModal('approveWithdrawalModal');
}

function openRejectWithdrawal(txId, username, amount) {
    document.getElementById('rejectWithdrawalId').value = txId;
    document.getElementById('withdrawalRejectDetails').innerHTML = `
        <div style="background: rgba(255,82,82,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,82,82,0.2); margin-bottom: 1rem;">
            <p style="margin-bottom: 0.5rem;"><strong>User:</strong> ${username}</p>
            <p style="margin-bottom: 0;"><strong>Amount:</strong> $${amount}</p>
        </div>
        <p style="color: #888; font-size: 0.9rem; margin-bottom: 1rem;">The amount will be restored to the user's balance.</p>
    `;
    openModal('rejectWithdrawalModal');
}

async function approveWithdrawalSubmit(e) {
    e.preventDefault();
    
    try {
        const txId = document.getElementById('approveWithdrawalId').value;
        const txHash = document.getElementById('txHash').value;
        const notes = document.getElementById('approveWithdrawalNotes').value;

        const response = await fetch(`/admin/api/withdrawals/${txId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ txHash, notes })
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('Withdrawal approved successfully!');
            closeModal('approveWithdrawalModal');
            document.getElementById('approveWithdrawalForm').reset();
            loadWithdrawals();
            loadWithdrawalStats();
        } else {
            showAlert(data.message || 'Error approving withdrawal', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error approving withdrawal', 'error');
    }
}

async function rejectWithdrawalSubmit(e) {
    e.preventDefault();
    
    try {
        const txId = document.getElementById('rejectWithdrawalId').value;
        const notes = document.getElementById('rejectWithdrawalNotes').value;

        const response = await fetch(`/admin/api/withdrawals/${txId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes })
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert('Withdrawal rejected and balance restored');
            closeModal('rejectWithdrawalModal');
            document.getElementById('rejectWithdrawalForm').reset();
            loadWithdrawals();
            loadWithdrawalStats();
        } else {
            showAlert(data.message || 'Error rejecting withdrawal', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error rejecting withdrawal', 'error');
    }
}

// ==================== PROJECT SUBMISSIONS ====================

async function loadProjectSubmissions() {
    try {
        const status = document.getElementById('projectStatusFilter')?.value || 'pending';
        console.log('🚀 Loading project submissions with status:', status);

        const response = await fetch(`/admin/api/projects/submissions?status=${status}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Projects data:', data);

        if (data.success && data.data) {
            const tbody = document.getElementById('projectsTableBody');

            if (!tbody) {
                console.error('Projects table body not found!');
                return;
            }

            if (data.data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #888;">No ${status} project submissions found</td></tr>`;
            } else {
                tbody.innerHTML = data.data.map(p => `
                    <tr>
                        <td>${p.projectName || 'N/A'}</td>
                        <td><span style="padding: 0.25rem 0.75rem; background: rgba(94,194,19,0.1); border-radius: 8px; font-size: 0.85rem;">${p.category || 'N/A'}</span></td>
                        <td>${p.stage || 'N/A'}</td>
                        <td>${p.contactEmail || 'N/A'}</td>
                        <td>${new Date(p.submittedAt).toLocaleDateString()}</td>
                        <td>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 8px; font-size: 0.85rem; background: ${
                                p.status === 'pending' ? 'rgba(255,193,7,0.2); color: #FFC107' :
                                p.status === 'approved' ? 'rgba(94,194,19,0.2); color:var(--green)' :
                                'rgba(255,82,82,0.2); color: #ff5252'
                            };">
                                ${p.status.toUpperCase()}
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 0.5rem;">
                                <button class="btn btn-primary btn-icon btn-sm" onclick="viewProjectDetails('${p._id}')" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${p.status === 'pending' ? `
                                    <button class="btn btn-secondary btn-icon btn-sm" onclick="openApproveProject('${p._id}', '${p.projectName}')" title="Approve" style="color:var(--green);">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-icon btn-sm" onclick="openRejectProject('${p._id}', '${p.projectName}')" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load project submissions');
        }
    } catch (error) {
        console.error('❌ Error loading project submissions:', error);
        const tbody = document.getElementById('projectsTableBody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #ff5252;">Error loading projects: ${error.message}</td></tr>`;
        }
        showAlert('Error loading project submissions: ' + error.message, 'error');
    }
}

async function loadProjectStats() {
    try {
        const response = await fetch('/admin/api/projects/submissions?status=all');
        const data = await response.json();

        if (data.success) {
            const pending = data.data.filter(p => p.status === 'pending').length;
            const approved = data.data.filter(p => p.status === 'approved').length;

            document.getElementById('pendingProjects').textContent = pending || 0;
            document.getElementById('approvedProjects').textContent = approved || 0;
            document.getElementById('totalProjects').textContent = data.data.length || 0;
        }
    } catch (error) {
        console.error('Error loading project stats:', error);
    }
}

function viewProjectDetails(projectId) {
    fetch(`/admin/api/projects/submissions?status=all`)
        .then(res => res.json())
        .then(data => {
            const project = data.data.find(p => p._id === projectId);
            if (project) {
                document.getElementById('projectDetails').innerHTML = `
                    <div style="padding: 1.5rem;">
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Project Name</h4>
                            <p>${project.projectName}</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                            <div>
                                <h4 style="color:var(--green); margin-bottom: 0.5rem;">Category</h4>
                                <p>${project.category}</p>
                            </div>
                            <div>
                                <h4 style="color:var(--green); margin-bottom: 0.5rem;">Stage</h4>
                                <p>${project.stage}</p>
                            </div>
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Description</h4>
                            <p style="line-height: 1.6;">${project.description}</p>
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">
                            <div>
                                <h4 style="color:var(--green); margin-bottom: 0.5rem;">Team Size</h4>
                                <p>${project.teamSize}</p>
                            </div>
                            <div>
                                <h4 style="color:var(--green); margin-bottom: 0.5rem;">Skills Needed</h4>
                                <p>${project.skillsNeeded}</p>
                            </div>
                        </div>
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Contact Email</h4>
                            <p>${project.contactEmail}</p>
                        </div>
                        ${project.website ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Website</h4>
                            <p><a href="${project.website}" target="_blank" style="color:var(--green);">${project.website}</a></p>
                        </div>
                        ` : ''}
                        ${project.twitter ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Twitter</h4>
                            <p>${project.twitter}</p>
                        </div>
                        ` : ''}
                        ${project.additionalInfo ? `
                        <div style="margin-bottom: 1.5rem;">
                            <h4 style="color:var(--green); margin-bottom: 0.5rem;">Additional Information</h4>
                            <p style="line-height: 1.6;">${project.additionalInfo}</p>
                        </div>
                        ` : ''}
                        <div style="border-top: 1px solid rgba(94,194,19,0.2); padding-top: 1rem; margin-top: 1rem; font-size: 0.85rem; color: #888;">
                            Submitted: ${new Date(project.submittedAt).toLocaleString()}
                        </div>
                    </div>
                `;
                openModal('viewProjectModal');
            }
        })
        .catch(error => {
            console.error('Error loading project details:', error);
            showAlert('Error loading project details', 'error');
        });
}

function openApproveProject(projectId, projectName) {
    document.getElementById('approveProjectId').value = projectId;
    document.getElementById('projectApproveDetails').innerHTML = `
        <div style="padding: 1rem; background: rgba(94,194,19,0.1); border-radius: 8px; margin-bottom: 1rem;">
            <p style="margin-bottom: 0.5rem;"><strong>Project:</strong> ${projectName}</p>
            <p style="color: #888;">Approving this project will add it to the ecosystem page.</p>
        </div>
    `;
    openModal('approveProjectModal');
}

function openRejectProject(projectId, projectName) {
    document.getElementById('rejectProjectId').value = projectId;
    document.getElementById('projectRejectDetails').innerHTML = `
        <div style="padding: 1rem; background: rgba(255,82,82,0.1); border-radius: 8px; margin-bottom: 1rem;">
            <p style="margin-bottom: 0.5rem;"><strong>Project:</strong> ${projectName}</p>
            <p style="color: #888;">Please provide a reason for rejection.</p>
        </div>
    `;
    openModal('rejectProjectModal');
}

async function approveProjectSubmit(e) {
    e.preventDefault();

    try {
        const projectId = document.getElementById('approveProjectId').value;
        const notes = document.getElementById('approveProjectNotes').value;

        const response = await fetch(`/admin/api/projects/submissions/${projectId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved', reviewNotes: notes })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Project approved successfully!');
            closeModal('approveProjectModal');
            document.getElementById('approveProjectForm').reset();
            loadProjectSubmissions();
            loadProjectStats();
        } else {
            showAlert(data.message || 'Error approving project', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error approving project', 'error');
    }
}

async function rejectProjectSubmit(e) {
    e.preventDefault();

    try {
        const projectId = document.getElementById('rejectProjectId').value;
        const notes = document.getElementById('rejectProjectNotes').value;

        const response = await fetch(`/admin/api/projects/submissions/${projectId}/review`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'rejected', reviewNotes: notes })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('Project rejected successfully');
            closeModal('rejectProjectModal');
            document.getElementById('rejectProjectForm').reset();
            loadProjectSubmissions();
            loadProjectStats();
        } else {
            showAlert(data.message || 'Error rejecting project', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showAlert('Error rejecting project', 'error');
    }
}

// ==================== EVENT LISTENERS ====================

window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});
// Test the reward distribution flow
window.testRewardFlow = async function(questId) {
    console.log('🧪 Testing reward flow with questId:', questId);
    
    try {
        // Test 1: Can we fetch leaderboard?
        console.log('Test 1: Fetching leaderboard...');
        const lbResponse = await fetch(`/admin/api/quests/${questId}/leaderboard`);
        const lbData = await lbResponse.json();
        console.log('✅ Leaderboard data:', lbData);
        
        // Test 2: Can we fetch winners?
        console.log('Test 2: Fetching winners...');
        const winnersResponse = await fetch(`/admin/api/quests/${questId}/winners?topCount=10`);
        const winnersData = await winnersResponse.json();
        console.log('✅ Winners data:', winnersData);
        
        // Test 3: Open distribution modal
        console.log('Test 3: Opening distribution modal...');
        await openRewardDistribution(questId);
        console.log('✅ Modal opened');
        
        console.log('🎉 All tests passed! Reward flow is working.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

console.log('💡 Debug helper loaded. To test reward distribution:');
console.log('   window.testRewardFlow("YOUR_QUEST_ID_HERE")');
console.log('   You can get quest IDs from the quests table or console logs.');
// ==================== DEBUG HELPER ====================

window.adminDebug = {
    testUsers: () => fetch('/admin/api/users').then(r => r.json()).then(console.log),
    testEvents: () => fetch('/admin/api/events').then(r => r.json()).then(console.log),
    testApplications: () => fetch('/admin/api/applications').then(r => r.json()).then(console.log),
    testQuests: () => fetch('/admin/api/quests').then(r => r.json()).then(console.log),
    reload: (section) => loadSectionData(section)
};


console.log('🔧 Admin Debug Helper loaded. Use window.adminDebug in console.');
console.log('Example: window.adminDebug.testUsers()');
document.getElementById('approveApplicationForm').addEventListener('submit', approveApplicationSubmit);
document.getElementById('rejectApplicationForm').addEventListener('submit', rejectApplicationSubmit);

console.log('🔧 Admin Debug Helper loaded. Use window.adminDebug in console.');
console.log('Example: window.adminDebug.testUsers()');

// Application form listeners
document.getElementById('approveApplicationForm').addEventListener('submit', approveApplicationSubmit);
document.getElementById('rejectApplicationForm').addEventListener('submit', rejectApplicationSubmit);

// Withdrawal form listeners
document.getElementById('approveWithdrawalForm').addEventListener('submit', approveWithdrawalSubmit);
document.getElementById('rejectWithdrawalForm').addEventListener('submit', rejectWithdrawalSubmit);

// Project form listeners
document.getElementById('approveProjectForm').addEventListener('submit', approveProjectSubmit);
document.getElementById('rejectProjectForm').addEventListener('submit', rejectProjectSubmit);
async function loadAmbassadorApplications() {
    try {
        const status = document.getElementById('ambassadorStatusFilter')?.value || 'all';
        const search = document.getElementById('ambassadorSearch')?.value || '';
        
        console.log('🎓 Loading ambassador applications...', { status, search });
        
        let url = `/admin/api/ambassadors?status=${status}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Ambassador applications data:', data);
        
        if (data.success && data.applications) {
            const tbody = document.getElementById('ambassadorsTableBody');
            
            if (data.applications.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #888;">No applications found</td></tr>`;
            } else {
                tbody.innerHTML = data.applications.map(app => `
                    <tr>
                        <td>
                            <strong>${app.fullName}</strong>
                            <br>
                            <small style="color: #888;">${app.email}</small>
                        </td>
                        <td>
                            <strong>${app.institutionName}</strong>
                            <br>
                            <small style="color: #888;">${app.institutionType}</small>
                        </td>
                        <td>${app.state}</td>
                        <td>${app.currentLevel} Level</td>
                        <td><small style="color: #888;">${new Date(app.createdAt).toLocaleDateString()}</small></td>
                        <td><span class="badge badge-${app.status}">${app.status}</span></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="viewAmbassadorApplication('${app._id}')" title="View Details">
                                    <i class="fas fa-eye"></i>
                                </button>
                                ${app.status === 'pending' ? `
                                    <button class="btn btn-secondary btn-icon btn-sm" onclick="openApproveAmbassadorModal('${app._id}')" title="Approve" style="color:var(--green);">
                                        <i class="fas fa-check"></i>
                                    </button>
                                    <button class="btn btn-danger btn-icon btn-sm" onclick="openRejectAmbassadorModal('${app._id}')" title="Reject">
                                        <i class="fas fa-times"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load applications');
        }
    } catch (error) {
        console.error('❌ Error loading ambassador applications:', error);
        const tbody = document.getElementById('ambassadorsTableBody');
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: #ff5252;">Error: ${error.message}</td></tr>`;
        showAlert('Error loading ambassador applications: ' + error.message, 'error');
    }
}

async function loadAmbassadorStats() {
    try {
        const response = await fetch('/admin/api/ambassadors/stats');
        const data = await response.json();
        
        if (data.success) {
            document.getElementById('pendingAmbassadors').textContent = data.pending || 0;
            document.getElementById('approvedAmbassadors').textContent = data.approved || 0;
            document.getElementById('totalAmbassadorApps').textContent = data.total || 0;
            
            // Update overview card if it exists
            const overviewCard = document.getElementById('totalAmbassadors');
            if (overviewCard) {
                overviewCard.textContent = data.total || 0;
            }
        }
    } catch (error) {
        console.error('Error loading ambassador stats:', error);
    }
}

async function viewAmbassadorApplication(appId) {
    try {
        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        console.log('Viewing ambassador application:', appId);
        
        const response = await fetch(`/admin/api/ambassadors/${appId}`);
        const data = await response.json();
        
        if (data.success) {
            const app = data.application;
            document.getElementById('ambassadorDetails').innerHTML = `
                <!-- Personal Information -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2);">
                        <i class="fas fa-user"></i> Personal Information
                    </h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Full Name</label>
                            <p>${app.fullName}</p>
                        </div>
                        <div class="detail-item">
                            <label>Email</label>
                            <p>${app.email}</p>
                        </div>
                        <div class="detail-item">
                            <label>Phone</label>
                            <p>${app.phone}</p>
                        </div>
                        <div class="detail-item">
                            <label>Status</label>
                            <p><span class="badge badge-${app.status}">${app.status}</span></p>
                        </div>
                    </div>
                </div>

                <!-- Institution Information -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2);">
                        <i class="fas fa-school"></i> Institution Details
                    </h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>State</label>
                            <p>${app.state}</p>
                        </div>
                        <div class="detail-item">
                            <label>Institution Type</label>
                            <p>${app.institutionType}</p>
                        </div>
                        <div class="detail-item">
                            <label>Institution Name</label>
                            <p>${app.institutionName}</p>
                        </div>
                        <div class="detail-item">
                            <label>Course of Study</label>
                            <p>${app.courseOfStudy}</p>
                        </div>
                        <div class="detail-item">
                            <label>Current Level</label>
                            <p>${app.currentLevel} Level</p>
                        </div>
                        <div class="detail-item">
                            <label>Applied Date</label>
                            <p>${new Date(app.createdAt).toLocaleString()}</p>
                        </div>
                    </div>
                </div>

                <!-- Social Media -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2);">
                        <i class="fas fa-hashtag"></i> Social Media
                    </h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Twitter/X</label>
                            <p>${app.twitter}</p>
                        </div>
                        <div class="detail-item">
                            <label>Telegram</label>
                            <p>${app.telegram || 'Not provided'}</p>
                        </div>
                    </div>
                </div>

                <!-- Motivation & Plans -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2);">
                        <i class="fas fa-lightbulb"></i> Application Details
                    </h4>
                    
                    <div class="form-group">
                        <label>Why do they want to be a Campus Ambassador?</label>
                        <p style="color: #fff; padding: 1rem; background: rgba(94,194,19, 0.05); border-radius: 8px; white-space: pre-wrap;">${app.motivation}</p>
                    </div>

                    ${app.experience ? `
                    <div class="form-group">
                        <label>Previous Leadership Experience</label>
                        <p style="color: #fff; padding: 1rem; background: rgba(94,194,19, 0.05); border-radius: 8px; white-space: pre-wrap;">${app.experience}</p>
                    </div>
                    ` : ''}

                    <div class="form-group">
                        <label>How they plan to promote ONBOARD3</label>
                        <p style="color: #fff; padding: 1rem; background: rgba(94,194,19, 0.05); border-radius: 8px; white-space: pre-wrap;">${app.promotionPlan}</p>
                    </div>
                </div>

                ${app.status === 'approved' ? `
                <!-- Performance Metrics -->
                <div style="margin-bottom: 1.5rem;">
                    <h4 style="color:var(--green); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(94,194,19,0.2);">
                        <i class="fas fa-chart-line"></i> Performance Metrics
                    </h4>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Events Organized</label>
                            <p>${app.eventsOrganized || 0}</p>
                        </div>
                        <div class="detail-item">
                            <label>Students Referred</label>
                            <p>${app.studentsReferred || 0}</p>
                        </div>
                        <div class="detail-item">
                            <label>Content Created</label>
                            <p>${app.contentCreated || 0}</p>
                        </div>
                        <div class="detail-item">
                            <label>Approved Date</label>
                            <p>${app.approvedAt ? new Date(app.approvedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${app.adminNotes ? `
                <div style="background: rgba(255,193,7,0.1); padding: 1rem; border-radius: 8px; border: 1px solid #ffc107;">
                    <label style="color: #ffc107; font-weight: 600; margin-bottom: 0.5rem; display: block;">
                        <i class="fas fa-sticky-note"></i> Admin Notes
                    </label>
                    <p style="color: #fff; margin: 0; white-space: pre-wrap;">${app.adminNotes}</p>
                </div>
                ` : ''}
            `;
            openModal('viewAmbassadorModal');
        } else {
            showAlert(data.message || 'Error loading application', 'error');
        }
    } catch (error) {
        console.error('❌ Error viewing ambassador application:', error);
        showAlert('Error loading application: ' + error.message, 'error');
    }
}

function openApproveAmbassadorModal(appId) {
    document.getElementById('approveAmbassadorId').value = appId;
    
    // Optionally fetch and display basic info
    fetch(`/admin/api/ambassadors/${appId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const app = data.application;
                document.getElementById('ambassadorApproveDetails').innerHTML = `
                    <div style="background: rgba(94,194,19,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(94,194,19,0.1); margin-bottom: 1rem;">
                        <p style="margin-bottom: 0.5rem;"><strong>Name:</strong> ${app.fullName}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Institution:</strong> ${app.institutionName}</p>
                        <p style="margin-bottom: 0;"><strong>State:</strong> ${app.state}</p>
                    </div>
                `;
            }
        });
    
    openModal('approveAmbassadorModal');
}

function openRejectAmbassadorModal(appId) {
    document.getElementById('rejectAmbassadorId').value = appId;
    
    // Optionally fetch and display basic info
    fetch(`/admin/api/ambassadors/${appId}`)
        .then(r => r.json())
        .then(data => {
            if (data.success) {
                const app = data.application;
                document.getElementById('ambassadorRejectDetails').innerHTML = `
                    <div style="background: rgba(255,82,82,0.05); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,82,82,0.2); margin-bottom: 1rem;">
                        <p style="margin-bottom: 0.5rem;"><strong>Name:</strong> ${app.fullName}</p>
                        <p style="margin-bottom: 0.5rem;"><strong>Institution:</strong> ${app.institutionName}</p>
                        <p style="margin-bottom: 0;"><strong>Email:</strong> ${app.email}</p>
                    </div>
                `;
            }
        });
    
    openModal('rejectAmbassadorModal');
}

async function approveAmbassadorApplication(e) {
    e.preventDefault();
    
    try {
        const appId = document.getElementById('approveAmbassadorId').value;
        const adminNotes = document.getElementById('approveAmbassadorNotes').value;

        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        const formData = { adminNotes };

        console.log('Approving ambassador application:', appId, formData);

        const response = await fetch(`/admin/api/ambassadors/${appId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Approve response:', data);
        
        if (data.success) {
            showAlert('✅ Ambassador application approved successfully!');
            closeModal('approveAmbassadorModal');
            document.getElementById('approveAmbassadorForm').reset();
            loadAmbassadorApplications();
            loadAmbassadorStats();
        } else {
            showAlert(data.message || 'Error approving application', 'error');
        }
    } catch (error) {
        console.error('❌ Error approving ambassador application:', error);
        showAlert('Error approving application: ' + error.message, 'error');
    }
}

async function rejectAmbassadorApplication(e) {
    e.preventDefault();
    
    try {
        const appId = document.getElementById('rejectAmbassadorId').value;
        const adminNotes = document.getElementById('rejectAmbassadorNotes').value.trim();

        if (!appId || appId === 'undefined') {
            showAlert('Invalid application ID', 'error');
            return;
        }

        if (!adminNotes) {
            showAlert('Rejection reason is required', 'error');
            return;
        }

        const formData = { adminNotes };

        console.log('Rejecting ambassador application:', appId, formData);

        const response = await fetch(`/admin/api/ambassadors/${appId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        console.log('Reject response:', data);
        
        if (data.success) {
            showAlert('Ambassador application rejected.');
            closeModal('rejectAmbassadorModal');
            document.getElementById('rejectAmbassadorForm').reset();
            loadAmbassadorApplications();
            loadAmbassadorStats();
        } else {
            showAlert(data.message || 'Error rejecting application', 'error');
        }
    } catch (error) {
        console.error('❌ Error rejecting ambassador application:', error);
        showAlert('Error rejecting application: ' + error.message, 'error');
    }
}

function exportAmbassadorApplications() {
    window.open('/admin/api/ambassadors/export', '_blank');
}
