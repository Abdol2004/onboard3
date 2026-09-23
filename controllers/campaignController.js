const Campaign         = require('../models/Campaign');
const CampaignSubmission = require('../models/CampaignSubmission');
const User             = require('../models/User');

// ==================== USER-FACING ====================

// GET /dashboard/campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select('-password -recentActivity -notifications');
    if (!user) return res.redirect('/auth');

    const now = new Date();
    const campaigns = await Campaign.find({ status: 'active' })
      .sort({ createdAt: -1 })
      .lean();

    // For each campaign, get how many tasks the user has completed
    let completionMap = {};
    if (campaigns.length) {
      const campaignIds = campaigns.map(c => c._id);
      const subs = await CampaignSubmission.find({
        user: userId,
        campaign: { $in: campaignIds },
        status: { $in: ['approved', 'pending'] }
      }).select('campaign taskIndex status').lean();

      subs.forEach(s => {
        const cid = s.campaign.toString();
        if (!completionMap[cid]) completionMap[cid] = [];
        completionMap[cid].push(s.taskIndex);
      });
    }

    const campaignsWithProgress = campaigns.map(c => {
      const completed = completionMap[c._id.toString()] || [];
      return {
        ...c,
        completedTasks: completed.length,
        totalTasks: c.tasks.length,
        isEnded: c.endDate && new Date(c.endDate) < now,
      };
    });

    res.render('dashboard/campaigns', {
      title: 'Campaigns — ONBOARD3',
      user: user.toObject ? user.toObject() : user,
      campaigns: campaignsWithProgress,
      currentPage: 'campaigns'
    });
  } catch (err) {
    console.error('[getCampaigns]', err);
    res.redirect('/dashboard');
  }
};

// GET /dashboard/campaigns/:id
exports.getCampaignDetails = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select('-password -recentActivity -notifications');
    if (!user) return res.redirect('/auth');

    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.redirect('/dashboard/campaigns');

    // Get all submissions for this user + this campaign
    const subs = await CampaignSubmission.find({
      user: userId,
      campaign: campaign._id
    }).lean();

    const subMap = {};
    subs.forEach(s => { subMap[s.taskIndex] = s; });

    const tasksWithStatus = (campaign.tasks || []).map((t, i) => ({
      ...t,
      index: i,
      submission: subMap[i] || null,
      isCompleted: !!(subMap[i] && subMap[i].status === 'approved'),
      isPending:   !!(subMap[i] && subMap[i].status === 'pending'),
      isRejected:  !!(subMap[i] && subMap[i].status === 'rejected'),
    }));

    const completedCount = subs.filter(s => s.status === 'approved').length;
    const pendingCount   = subs.filter(s => s.status === 'pending').length;

    res.render('dashboard/campaign-details', {
      title: campaign.title + ' — ONBOARD3',
      user: user.toObject ? user.toObject() : user,
      campaign,
      tasks: tasksWithStatus,
      completedCount,
      pendingCount,
      totalTasks: campaign.tasks.length,
      currentPage: 'campaigns'
    });
  } catch (err) {
    console.error('[getCampaignDetails]', err);
    res.redirect('/dashboard/campaigns');
  }
};

// POST /dashboard/campaigns/:id/tasks/:taskIndex/submit
exports.submitTask = async (req, res) => {
  try {
    const userId    = req.session.userId;
    const { id, taskIndex } = req.params;
    const { proofHandle, proofUrl } = req.body;

    const idx = parseInt(taskIndex, 10);
    if (isNaN(idx)) return res.status(400).json({ success: false, message: 'Invalid task index.' });

    const campaign = await Campaign.findById(id);
    if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found.' });
    if (campaign.status !== 'active') return res.status(400).json({ success: false, message: 'Campaign is not active.' });
    if (campaign.endDate && new Date(campaign.endDate) < new Date()) {
      return res.status(400).json({ success: false, message: 'Campaign has ended.' });
    }
    if (idx < 0 || idx >= campaign.tasks.length) {
      return res.status(400).json({ success: false, message: 'Invalid task.' });
    }

    // Check if already submitted
    const existing = await CampaignSubmission.findOne({ campaign: id, user: userId, taskIndex: idx });
    if (existing) return res.status(400).json({ success: false, message: 'Task already submitted.' });

    const task     = campaign.tasks[idx];
    const autoApprove = !campaign.requiresReview;
    const status   = autoApprove ? 'approved' : 'pending';
    const xpAwarded = autoApprove ? (task.xpReward || 0) : 0;

    // Check if this is the user's first task in this campaign
    const prevSubs = await CampaignSubmission.countDocuments({ campaign: id, user: userId });
    const isFirstTask = prevSubs === 0;

    await CampaignSubmission.create({
      campaign:    id,
      user:        userId,
      taskIndex:   idx,
      taskType:    task.type,
      proofUrl:    proofUrl  || '',
      proofHandle: proofHandle || '',
      status,
      xpAwarded
    });

    if (autoApprove && xpAwarded > 0) {
      await User.findByIdAndUpdate(userId, { $inc: { xp: xpAwarded } });
    }

    if (isFirstTask) {
      await Campaign.findByIdAndUpdate(id, { $inc: { participantCount: 1 } });
    }

    return res.json({ success: true, xpAwarded, status });
  } catch (err) {
    console.error('[submitTask]', err);
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'Task already submitted.' });
    }
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ==================== ADMIN ====================

// GET /admin/campaigns
exports.adminListCampaigns = async (req, res) => {
  try {
    const campaigns = await Campaign.find().sort({ createdAt: -1 }).lean();
    res.render('admin/pages/campaigns', {
      user: req.user,
      campaigns,
      query: req.query,
      page: 'campaigns'
    });
  } catch (err) {
    console.error('[adminListCampaigns]', err);
    res.status(500).send('Error loading campaigns');
  }
};

// GET /admin/campaigns/new
exports.adminGetCampaignForm = async (req, res) => {
  try {
    let campaign = null;
    if (req.params.id) {
      campaign = await Campaign.findById(req.params.id).lean();
    }
    res.render('admin/pages/campaign-form', {
      user: req.user,
      campaign,
      page: 'campaigns'
    });
  } catch (err) {
    console.error('[adminGetCampaignForm]', err);
    res.redirect('/admin/campaigns');
  }
};

// POST /admin/campaigns/create
exports.adminCreateCampaign = async (req, res) => {
  try {
    const {
      title, description, coverImage, status, requiresReview,
      startDate, endDate, maxParticipants,
      sponsorName, sponsorLogo, sponsorWebsite, sponsorTwitter,
      taskTypes, taskTitles, taskDescriptions, taskUrls, taskXpRewards
    } = req.body;

    // Build tasks array from parallel arrays
    const tasks = [];
    const types = Array.isArray(taskTypes) ? taskTypes : (taskTypes ? [taskTypes] : []);
    types.forEach((type, i) => {
      if (!type) return;
      tasks.push({
        type,
        title:       (Array.isArray(taskTitles)        ? taskTitles[i]        : taskTitles)        || '',
        description: (Array.isArray(taskDescriptions)  ? taskDescriptions[i]  : taskDescriptions)  || '',
        url:         (Array.isArray(taskUrls)          ? taskUrls[i]          : taskUrls)          || '',
        xpReward:    parseInt((Array.isArray(taskXpRewards) ? taskXpRewards[i] : taskXpRewards) || '50', 10),
        order:       i
      });
    });

    await Campaign.create({
      title: title.trim(),
      description: description || '',
      coverImage:  coverImage  || '',
      sponsor: {
        name:    sponsorName    || '',
        logo:    sponsorLogo    || '',
        website: sponsorWebsite || '',
        twitter: sponsorTwitter || '',
      },
      tasks,
      status:         status || 'draft',
      requiresReview: !!requiresReview,
      startDate:      startDate ? new Date(startDate) : null,
      endDate:        endDate   ? new Date(endDate)   : null,
      maxParticipants: parseInt(maxParticipants || '0', 10),
    });

    res.redirect('/admin/campaigns?created=1');
  } catch (err) {
    console.error('[adminCreateCampaign]', err);
    res.redirect('/admin/campaigns?error=1');
  }
};

// POST /admin/campaigns/:id/update
exports.adminUpdateCampaign = async (req, res) => {
  try {
    const {
      title, description, coverImage, status, requiresReview,
      startDate, endDate, maxParticipants,
      sponsorName, sponsorLogo, sponsorWebsite, sponsorTwitter,
      taskTypes, taskTitles, taskDescriptions, taskUrls, taskXpRewards
    } = req.body;

    const tasks = [];
    const types = Array.isArray(taskTypes) ? taskTypes : (taskTypes ? [taskTypes] : []);
    types.forEach((type, i) => {
      if (!type) return;
      tasks.push({
        type,
        title:       (Array.isArray(taskTitles)       ? taskTitles[i]       : taskTitles)       || '',
        description: (Array.isArray(taskDescriptions) ? taskDescriptions[i] : taskDescriptions) || '',
        url:         (Array.isArray(taskUrls)         ? taskUrls[i]         : taskUrls)         || '',
        xpReward:    parseInt((Array.isArray(taskXpRewards) ? taskXpRewards[i] : taskXpRewards) || '50', 10),
        order:       i
      });
    });

    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.redirect('/admin/campaigns?error=not_found');

    campaign.title          = title.trim();
    campaign.description    = description || '';
    campaign.coverImage     = coverImage  || '';
    campaign.sponsor        = {
      name:    sponsorName    || '',
      logo:    sponsorLogo    || '',
      website: sponsorWebsite || '',
      twitter: sponsorTwitter || '',
    };
    campaign.tasks          = tasks;
    campaign.status         = status || 'draft';
    campaign.requiresReview = !!requiresReview;
    campaign.startDate      = startDate ? new Date(startDate) : null;
    campaign.endDate        = endDate   ? new Date(endDate)   : null;
    campaign.maxParticipants = parseInt(maxParticipants || '0', 10);

    await campaign.save();
    res.redirect('/admin/campaigns?updated=1');
  } catch (err) {
    console.error('[adminUpdateCampaign]', err);
    res.redirect('/admin/campaigns?error=1');
  }
};

// POST /admin/campaigns/:id/delete
exports.adminDeleteCampaign = async (req, res) => {
  try {
    await CampaignSubmission.deleteMany({ campaign: req.params.id });
    await Campaign.findByIdAndDelete(req.params.id);
    res.redirect('/admin/campaigns?deleted=1');
  } catch (err) {
    console.error('[adminDeleteCampaign]', err);
    res.redirect('/admin/campaigns?error=1');
  }
};

// GET /admin/campaigns/:id/submissions
exports.adminListSubmissions = async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id).lean();
    if (!campaign) return res.redirect('/admin/campaigns');

    const submissions = await CampaignSubmission.find({ campaign: req.params.id })
      .populate('user', 'username email profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    res.render('admin/pages/campaign-submissions', {
      user: req.user,
      campaign,
      submissions,
      page: 'campaigns'
    });
  } catch (err) {
    console.error('[adminListSubmissions]', err);
    res.redirect('/admin/campaigns');
  }
};

// POST /admin/campaigns/submissions/:subId/review
exports.adminReviewSubmission = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    if (!['approved','rejected'].includes(status)) {
      return res.json({ success: false, message: 'Invalid status.' });
    }

    const sub = await CampaignSubmission.findById(req.params.subId).populate('campaign');
    if (!sub) return res.json({ success: false, message: 'Submission not found.' });

    const wasApproved = sub.status === 'approved';
    sub.status     = status;
    sub.adminNotes = adminNotes || '';
    sub.reviewedAt = new Date();
    sub.reviewedBy = req.user._id;

    if (status === 'approved' && !wasApproved) {
      const campaign = sub.campaign;
      const task     = campaign && campaign.tasks && campaign.tasks[sub.taskIndex];
      const xp       = task ? (task.xpReward || 0) : 0;
      sub.xpAwarded  = xp;
      if (xp > 0) {
        await User.findByIdAndUpdate(sub.user, { $inc: { xp } });
      }
    } else if (status === 'rejected' && wasApproved && sub.xpAwarded > 0) {
      // Revoke XP if we're rejecting a previously approved submission
      await User.findByIdAndUpdate(sub.user, { $inc: { xp: -sub.xpAwarded } });
      sub.xpAwarded = 0;
    }

    await sub.save();
    res.json({ success: true, message: 'Submission updated.' });
  } catch (err) {
    console.error('[adminReviewSubmission]', err);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
};
