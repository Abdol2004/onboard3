// Achievement Popup System
class AchievementPopup {
    constructor() {
        this.overlay = null;
        this.currentBadges = [];
        this.currentIndex = 0;
        this.init();
    }

    init() {
        // Create overlay if it doesn't exist
        if (!document.getElementById('achievementPopupOverlay')) {
            this.createOverlay();
        } else {
            this.overlay = document.getElementById('achievementPopupOverlay');
        }

        // Check for unclaimed badges on page load
        this.checkUnclaimedBadges();
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'achievementPopupOverlay';
        overlay.className = 'achievement-popup-overlay';
        overlay.innerHTML = `
            <div class="achievement-popup" id="achievementPopup">
                <button class="achievement-popup-close" onclick="achievementPopup.close()">
                    <i class="fas fa-times"></i>
                </button>
                <div id="achievementPopupContent"></div>
            </div>
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;

        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });
    }

    async checkUnclaimedBadges() {
        try {
            const response = await fetch('/dashboard/api/unclaimed-badges');
            const data = await response.json();

            if (data.success && data.badges && data.badges.length > 0) {
                // Show popup after a short delay
                setTimeout(() => {
                    this.show(data.badges);
                }, 1000);
            }
        } catch (error) {
            console.error('Error checking unclaimed badges:', error);
        }
    }

    show(badges) {
        if (!badges || badges.length === 0) return;

        this.currentBadges = badges;
        this.currentIndex = 0;

        if (badges.length === 1) {
            this.showSingleBadge(badges[0]);
        } else {
            this.showMultipleBadges(badges);
        }

        this.overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    showSingleBadge(badge) {
        const content = document.getElementById('achievementPopupContent');
        content.innerHTML = `
            <div class="achievement-popup-title">
                <i class="fas fa-trophy"></i> Achievement Unlocked!
            </div>
            <div class="achievement-popup-subtitle">
                You've earned a new badge!
            </div>

            <div class="achievement-badge-showcase">
                <div class="achievement-badge-icon" style="position: relative;">
                    <img
                        src="/images/badges/${badge.badgeType}.png"
                        alt="${badge.name}"
                        style="width: 100%; height: 100%; object-fit: contain;"
                        onerror="this.onerror=null; this.src='/images/badges/${badge.badgeType}.svg'; this.onerror=function(){ this.style.display='none'; this.nextElementSibling.style.display='flex'; };"
                    />
                    <div style="display: none; width: 100%; height: 100%; background: ${badge.color}22; color: ${badge.color}; position: absolute; top: 0; left: 0; align-items: center; justify-content: center; font-size: 4rem;">
                        <i class="${badge.icon}"></i>
                    </div>
                </div>
                <div class="achievement-badge-name">${badge.name}</div>
                ${badge.description ? `<div class="achievement-badge-description">${badge.description}</div>` : ''}
                <div class="achievement-xp-reward">
                    <i class="fas fa-star"></i> +${badge.xpReward} XP
                </div>
            </div>

            <div class="achievement-popup-actions">
                <button class="achievement-claim-btn" onclick="achievementPopup.claimBadge('${badge._id}')">
                    <i class="fas fa-gift"></i> Claim Reward
                </button>
                <button class="achievement-view-all-btn" onclick="window.location.href='/dashboard/activity'">
                    View All Badges
                </button>
            </div>
        `;
    }

    showMultipleBadges(badges) {
        const content = document.getElementById('achievementPopupContent');
        const totalXP = badges.reduce((sum, badge) => sum + badge.xpReward, 0);

        content.innerHTML = `
            <div class="achievement-popup-title" style="position: relative;">
                <i class="fas fa-trophy"></i> ${badges.length} Achievements Unlocked!
                <span class="achievement-counter">${badges.length}</span>
            </div>
            <div class="achievement-popup-subtitle">
                You've earned multiple badges! Claim them all for rewards.
            </div>

            <div class="achievement-badges-carousel">
                ${badges.map(badge => `
                    <div class="carousel-badge-item" data-badge-id="${badge._id}">
                        <div class="carousel-badge-icon" style="background: ${badge.color}22; position: relative; overflow: hidden;">
                            <img
                                src="/images/badges/${badge.badgeType}.png"
                                alt="${badge.name}"
                                style="width: 100%; height: 100%; object-fit: contain;"
                                onerror="this.onerror=null; this.src='/images/badges/${badge.badgeType}.svg'; this.onerror=function(){ this.style.display='none'; this.nextElementSibling.style.display='flex'; };"
                            />
                            <div style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; align-items: center; justify-content: center; color: ${badge.color}; font-size: 2.5rem;">
                                <i class="${badge.icon}"></i>
                            </div>
                        </div>
                        <div class="carousel-badge-name">${badge.name}</div>
                        <div class="carousel-badge-xp">+${badge.xpReward} XP</div>
                    </div>
                `).join('')}
            </div>

            <div class="achievement-xp-reward" style="margin-top: 1rem;">
                <i class="fas fa-star"></i> Total: +${totalXP} XP
            </div>

            <div class="achievement-popup-actions">
                <button class="achievement-claim-btn" onclick="achievementPopup.claimAllBadges()">
                    <i class="fas fa-gift"></i> Claim All Rewards
                </button>
                <button class="achievement-view-all-btn" onclick="window.location.href='/dashboard/activity'">
                    View Activity Page
                </button>
            </div>
        `;
    }

    async claimBadge(badgeId) {
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';

        try {
            const response = await fetch('/dashboard/api/claim-badge', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ badgeId })
            });

            const data = await response.json();

            if (data.success) {
                // Show success animation
                this.showSuccessAnimation(data.xpReward);

                // Close popup after animation
                setTimeout(() => {
                    this.close();

                    // Refresh page to update XP display
                    window.location.reload();
                }, 2000);
            } else {
                alert(data.message || 'Error claiming badge');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-gift"></i> Claim Reward';
            }
        } catch (error) {
            console.error('Error claiming badge:', error);
            alert('Error claiming badge. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gift"></i> Claim Reward';
        }
    }

    async claimAllBadges() {
        const btn = event.target.closest('button');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Claiming...';

        try {
            let totalXP = 0;
            const badgeIds = this.currentBadges.map(b => b._id);

            for (const badgeId of badgeIds) {
                const response = await fetch('/dashboard/api/claim-badge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ badgeId })
                });

                const data = await response.json();
                if (data.success) {
                    totalXP += data.xpReward;
                }
            }

            // Show success animation
            this.showSuccessAnimation(totalXP);

            // Close popup after animation
            setTimeout(() => {
                this.close();

                // Refresh page to update XP display
                window.location.reload();
            }, 2500);
        } catch (error) {
            console.error('Error claiming badges:', error);
            alert('Error claiming badges. Please try again.');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-gift"></i> Claim All Rewards';
        }
    }

    showSuccessAnimation(xp) {
        const content = document.getElementById('achievementPopupContent');
        content.innerHTML = `
            <div style="padding: 3rem 0;">
                <div style="font-size: 5rem; color: #39FF14; margin-bottom: 1rem; animation: pulse-glow 1s infinite;">
                    <i class="fas fa-check-circle"></i>
                </div>
                <div class="achievement-popup-title">
                    Claimed Successfully!
                </div>
                <div style="font-size: 2rem; color: #39FF14; font-weight: 900; margin-top: 1rem;">
                    +${xp} XP
                </div>
                <div style="color: #888; margin-top: 0.5rem;">
                    Your rewards have been added to your account
                </div>
            </div>
        `;
    }

    close() {
        this.overlay.classList.remove('active');
        document.body.style.overflow = '';
        this.currentBadges = [];
        this.currentIndex = 0;
    }
}

// Initialize on page load
let achievementPopup;
document.addEventListener('DOMContentLoaded', () => {
    achievementPopup = new AchievementPopup();
});

// Expose globally for onclick handlers
window.achievementPopup = achievementPopup;
