const User = require("../models/User");
const crypto = require("crypto");

// Get Referral Page
exports.getReferralPage = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.redirect('/auth');
    }

    const user = await User.findById(req.session.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth');
    }

    // Generate referral code if user doesn't have one
    if (!user.referralCode) {
      user.referralCode = generateReferralCode(user.username);
      await user.save();
    }

    // Get VERIFIED referrals only ✅
    const referrals = await User.find({ 
      referredBy: user.referralCode,
      isVerified: true 
    })
      .select('username xp createdAt isVerified')
      .sort({ createdAt: -1 });

    // Get pending (unverified) referrals ✅
    const pendingReferrals = await User.find({
      referredBy: user.referralCode,
      isVerified: false
    })
      .select('username email createdAt')
      .sort({ createdAt: -1 });

    // Calculate stats
    const totalReferrals = referrals.length; // Only verified
    const activeReferrals = referrals.filter(r => r.xp > 0).length;
    const pendingCount = pendingReferrals.length;
    const totalEarned = user.referralStats?.totalEarned || 0;

    // Update user stats
    user.referralStats = {
      totalReferrals,
      activeReferrals,
      pendingReferrals: pendingCount, // ✅ ADD THIS
      totalEarned
    };
    await user.save();

    // Get top referrers
    const topReferrers = await User.find({ 'referralStats.totalReferrals': { $gt: 0 } })
      .select('username referralStats')
      .sort({ 'referralStats.totalReferrals': -1 })
      .limit(10);

    // Format referrals for display
    const formattedReferrals = referrals.map(ref => ({
      username: ref.username,
      xp: ref.xp || 0,
      createdAt: ref.createdAt,
      isActive: ref.xp > 0,
      isVerified: true
    }));

    // Format pending referrals ✅
    const formattedPending = pendingReferrals.map(ref => ({
      username: ref.username,
      email: ref.email,
      createdAt: ref.createdAt,
      isVerified: false
    }));

    // Generate referral link
    const referralLink = `${process.env.BASE_URL}/auth?ref=${user.referralCode}`;

    res.render('referral', { 
      title: 'Referral Program',
      user: user.toObject(),
      referrals: formattedReferrals,
      pendingReferrals: formattedPending, // ✅ ADD THIS
      referralLink,
      topReferrers: topReferrers.map(r => ({
        username: r.username,
        totalReferrals: r.referralStats?.totalReferrals || 0,
        totalEarned: r.referralStats?.totalEarned || 0
      }))
    });

  } catch (error) {
    console.error("Referral page error:", error);
    res.status(500).send("Error loading referral page");
  }
};

// Process Referral Reward - ONLY for additional events (quests, courses)
exports.processReferralReward = async (referralCode, eventType, referredUserId = null) => {
  try {
    const referrer = await User.findOne({ referralCode });
    
    if (!referrer) {
      return;
    }

    // Verify the referred user if ID provided
    if (referredUserId) {
      const referredUser = await User.findById(referredUserId);
      
      if (!referredUser || !referredUser.isVerified) {
        console.log('Referred user not verified');
        return;
      }
    }

    let xpReward = 0;
    let activityMessage = '';

    switch (eventType) {
      case 'first_quest':
        xpReward = 100;
        activityMessage = 'Earned 100 XP from referral first quest 🏆';
        break;
      case 'course_admission':
        xpReward = 200;
        activityMessage = 'Earned 200 XP from referral course admission 🎓';
        break;
      default:
        return;
    }

    // Add XP to referrer
    referrer.xp += xpReward;
    
    // Update referral stats
    if (!referrer.referralStats) {
      referrer.referralStats = { totalEarned: 0 };
    }
    referrer.referralStats.totalEarned += xpReward;

    // Add activity
    referrer.recentActivity.unshift({
      action: activityMessage,
      timestamp: new Date()
    });

    if (referrer.recentActivity.length > 10) {
      referrer.recentActivity = referrer.recentActivity.slice(0, 10);
    }

    await referrer.save();

  } catch (error) {
    console.error("Process referral reward error:", error);
  }
};

// Generate referral code
function generateReferralCode(username) {
  const cleanUsername = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 6);
  const randomPart = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${cleanUsername}${randomPart}`;
}

module.exports.generateReferralCode = generateReferralCode;