
// Load banned users
async function loadBannedUsers() {
    try {
        console.log('🚫 Loading banned users...');
        const response = await fetch('/admin/api/banned-users');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Banned users data:', data);
        
        if (data.success && data.bannedUsers) {
            const tbody = document.getElementById('bannedUsersTableBody');
            
            if (data.bannedUsers.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #888;">No banned users</td></tr>';
            } else {
                tbody.innerHTML = data.bannedUsers.map(user => `
                    <tr>
                        <td><strong>${user.username}</strong></td>
                        <td>${user.email}</td>
                        <td style="color: #ff5252;">${user.banReason || 'No reason provided'}</td>
                        <td><small style="color: #888;">${new Date(user.bannedAt).toLocaleString()}</small></td>
                        <td>
                            <div class="action-buttons">
                                <button class="btn btn-secondary btn-icon btn-sm" onclick="unbanUser('${user._id}', '${user.username}')" title="Unban User">
                                    <i class="fas fa-undo"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('');
            }
        } else {
            throw new Error(data.message || 'Failed to load banned users');
        }
    } catch (error) {
        console.error('❌ Error loading banned users:', error);
        const tbody = document.getElementById('bannedUsersTableBody');
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 2rem; color: #ff5252;">Error: ${error.message}</td></tr>`;
    }
}

// Ban user from quest leaderboard (called from leaderboard)
async function banUserFromLeaderboard(userId, username, questId) {
    if (!confirm(`⚠️ Ban ${username} from all quests?\n\nThis will:\n• Mark account as banned\n• Remove ALL quest progress\n• Remove from ALL leaderboards\n• Optionally remove XP/USDC\n\nThis action cannot be undone!`)) {
        return;
    }

    // Show options modal
    openBanUserModal(userId, username);
}

// Open ban user modal with options
function openBanUserModal(userId, username) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'banUserModal';
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h3 style="color: #ff5252;"><i class="fas fa-user-slash"></i> Ban User: ${username}</h3>
                <button class="close-btn" onclick="closeBanModal()">&times;</button>
            </div>
            
            <form id="banUserForm" onsubmit="submitBanUser(event, '${userId}', '${username}')">
                <div style="background: rgba(255,82,82,0.1); padding: 1rem; border-radius: 8px; border: 1px solid #ff5252; margin-bottom: 1.5rem;">
                    <p style="color: #ff5252; margin: 0;">
                        <i class="fas fa-exclamation-triangle"></i> This will permanently remove this user from ALL quest leaderboards and delete their progress.
                    </p>
                </div>

                <div class="form-group">
                    <label>Ban Reason *</label>
                    <textarea id="banReason" required placeholder="e.g., Fake referrals, multiple accounts, ToS violation..."></textarea>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="removeXP" checked>
                        Remove all XP
                    </label>
                </div>

                <div class="form-group">
                    <label style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="removeUSDC" checked>
                        Remove all USDC balance
                    </label>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeBanModal()">Cancel</button>
                    <button type="submit" class="btn btn-danger">
                        <i class="fas fa-ban"></i> Ban User
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

function closeBanModal() {
    const modal = document.getElementById('banUserModal');
    if (modal) {
        modal.remove();
    }
}

// REPLACE the submitBanUser function with this version:
async function submitBanUser(e, userId, username) {
    e.preventDefault();
    
    try {
        const reason = document.getElementById('banReason').value;
        const removeXP = document.getElementById('removeXP').checked;
        const removeUSDC = document.getElementById('removeUSDC').checked;

        console.log('🚫 Starting ban process...');
        console.log('User ID:', userId);
        console.log('Username:', username);
        console.log('Reason:', reason);
        console.log('Remove XP:', removeXP);
        console.log('Remove USDC:', removeUSDC);

        // Validate inputs
        if (!reason || reason.trim().length === 0) {
            showAlert('Please provide a ban reason', 'error');
            return;
        }

        if (!userId || userId === 'undefined') {
            showAlert('Invalid user ID', 'error');
            return;
        }

        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Banning...';
        submitBtn.disabled = true;

        const url = `/admin/api/users/${userId}/ban`;
        console.log('📤 Sending request to:', url);

        const payload = { 
            reason: reason.trim(), 
            removeXP, 
            removeUSDC 
        };
        console.log('📦 Payload:', payload);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('📥 Response status:', response.status);
        console.log('📥 Response OK:', response.ok);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Server error response:', errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('✅ Response data:', data);
        
        if (data.success) {
            showAlert(`✅ ${username} has been banned and removed from ${data.details?.questsRemoved || 0} quest leaderboards!`);
            closeBanModal();
            
            // Close any open leaderboard modals
            const leaderboardModal = document.getElementById('leaderboardModal');
            if (leaderboardModal) {
                leaderboardModal.remove();
            }
            
            // Reload current section
            const activeTab = document.querySelector('.menu-item.active')?.getAttribute('data-tab');
            console.log('Current active tab:', activeTab);
            
            if (activeTab) {
                setTimeout(() => {
                    loadSectionData(activeTab);
                }, 500);
            }
        } else {
            console.error('❌ Ban failed:', data.message);
            showAlert(data.message || 'Error banning user', 'error');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('❌ Ban error:', error);
        showAlert('Error banning user: ' + error.message, 'error');
        
        // Re-enable button
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-ban"></i> Ban User';
            submitBtn.disabled = false;
        }
    }
}
// Unban user
async function unbanUser(userId, username) {
    if (!confirm(`Unban ${username}?\n\nThis will restore account access, but their quest progress will NOT be restored.`)) {
        return;
    }

    try {
        console.log('Unbanning user:', userId);

        const response = await fetch(`/admin/api/users/${userId}/unban`, {
            method: 'POST'
        });

        const data = await response.json();
        
        if (data.success) {
            showAlert(`✅ ${username} has been unbanned!`);
            loadBannedUsers();
        } else {
            showAlert(data.message || 'Error unbanning user', 'error');
        }
    } catch (error) {
        console.error('Error unbanning user:', error);
        showAlert('Error unbanning user: ' + error.message, 'error');
    }
}

