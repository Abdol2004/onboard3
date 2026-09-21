const AcademyCohort       = require('../models/AcademyCohort');
const AcademyApplication  = require('../models/AcademyApplication');
const AcademyEnrollment   = require('../models/AcademyEnrollment');
const AcademyCertificate  = require('../models/AcademyCertificate');
const User                = require('../models/User');
const { sendEmail }       = require('../utils/emailService');

// ─── helpers ───────────────────────────────────────────────────────────────

async function generateCertificateId() {
  const year = new Date().getFullYear();
  const count = await AcademyCertificate.countDocuments();
  const seq   = String(count + 1).padStart(3, '0');
  const id    = `OA-${year}-${seq}`;
  const exists = await AcademyCertificate.findOne({ certificateId: id });
  if (exists) {
    const rand = String(Math.floor(Math.random() * 900) + 100);
    return `OA-${year}-${rand}`;
  }
  return id;
}

function acceptanceEmail(user, cohort) {
  return `
<div style="font-family:'Outfit',sans-serif;background:#0a0f0a;color:#e8ede8;padding:2rem;border-radius:16px;max-width:560px">
  <div style="font-size:1.5rem;font-weight:900;color:#5EC213;margin-bottom:.5rem">🎓 You're In!</div>
  <div style="font-size:1rem;font-weight:700;margin-bottom:1.5rem;color:#e8ede8">ONBOARD3 Academy — ${cohort.title}</div>
  <p style="color:#a0a8a0;line-height:1.7">Congratulations <strong style="color:#e8ede8">@${user.username}</strong>! Your application has been <strong style="color:#5EC213">accepted</strong>.</p>
  <p style="color:#a0a8a0;line-height:1.7">The cohort starts on <strong style="color:#e8ede8">${cohort.startDate ? new Date(cohort.startDate).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}) : 'TBA'}</strong>. Your next step is to join the Telegram group:</p>
  ${cohort.telegramGroupLink ? `<a href="${cohort.telegramGroupLink}" style="display:inline-block;margin:1rem 0;padding:.875rem 1.5rem;background:#5EC213;color:#000;font-weight:900;border-radius:10px;text-decoration:none">Join Academy Telegram</a>` : '<p style="color:#a0a8a0">The Telegram link will be shared soon.</p>'}
  <p style="color:#a0a8a0;font-size:.85rem;margin-top:1.5rem">See you there. Let's get to work.</p>
  <p style="color:#a0a8a0;font-size:.85rem">— ONBOARD3 Team</p>
</div>`;
}

function rejectionEmail(user, cohort, note) {
  return `
<div style="font-family:'Outfit',sans-serif;background:#0a0f0a;color:#e8ede8;padding:2rem;border-radius:16px;max-width:560px">
  <div style="font-size:1.5rem;font-weight:900;color:#e8ede8;margin-bottom:.5rem">ONBOARD3 Academy</div>
  <div style="font-size:1rem;font-weight:700;margin-bottom:1.5rem;color:#a0a8a0">${cohort.title}</div>
  <p style="color:#a0a8a0;line-height:1.7">Hi <strong style="color:#e8ede8">@${user.username}</strong>, thank you for applying to this cohort.</p>
  <p style="color:#a0a8a0;line-height:1.7">After reviewing applications, we weren't able to offer you a seat in this cohort. ${note ? `<br><br><em style="color:#e8ede8">"${note}"</em>` : ''}</p>
  <p style="color:#a0a8a0;line-height:1.7">We run new cohorts regularly — keep an eye out for the next one and apply again.</p>
  <p style="color:#a0a8a0;font-size:.85rem;margin-top:1.5rem">— ONBOARD3 Team</p>
</div>`;
}

function waitlistEmail(user, cohort) {
  return `
<div style="font-family:'Outfit',sans-serif;background:#0a0f0a;color:#e8ede8;padding:2rem;border-radius:16px;max-width:560px">
  <div style="font-size:1.5rem;font-weight:900;color:#fbbf24;margin-bottom:.5rem">You're on the waitlist</div>
  <div style="font-size:1rem;font-weight:700;margin-bottom:1.5rem;color:#a0a8a0">${cohort.title}</div>
  <p style="color:#a0a8a0;line-height:1.7">Hi <strong style="color:#e8ede8">@${user.username}</strong>! Your application is strong — you've been added to the waitlist for this cohort.</p>
  <p style="color:#a0a8a0;line-height:1.7">If a seat opens up, you'll be the first to hear. We'll reach out before <strong style="color:#e8ede8">${cohort.startDate ? new Date(cohort.startDate).toLocaleDateString('en-US',{month:'long',day:'numeric'}) : 'the start date'}</strong>.</p>
  <p style="color:#a0a8a0;font-size:.85rem;margin-top:1.5rem">— ONBOARD3 Team</p>
</div>`;
}

function graduationEmail(user, cohort, certId) {
  const baseUrl = process.env.BASE_URL || 'https://onboard3.app';
  return `
<div style="font-family:'Outfit',sans-serif;background:#0a0f0a;color:#e8ede8;padding:2rem;border-radius:16px;max-width:560px">
  <div style="font-size:1.5rem;font-weight:900;color:#fbbf24;margin-bottom:.5rem">🎓 Congratulations, Graduate!</div>
  <div style="font-size:1rem;font-weight:700;margin-bottom:1.5rem;color:#a0a8a0">${cohort.title}</div>
  <p style="color:#a0a8a0;line-height:1.7">You've officially completed <strong style="color:#e8ede8">${cohort.title}</strong>. You are now an <strong style="color:#fbbf24">ONBOARD3 Academy Graduate</strong>.</p>
  <p style="color:#a0a8a0;line-height:1.7">Your certificate ID is: <strong style="color:#e8ede8">${certId}</strong></p>
  <a href="${baseUrl}/academy/verify/${certId}" style="display:inline-block;margin:1rem 0;padding:.875rem 1.5rem;background:#fbbf24;color:#000;font-weight:900;border-radius:10px;text-decoration:none">View Certificate</a>
  <p style="color:#a0a8a0;font-size:.85rem;margin-top:1.5rem">Share it on LinkedIn, Twitter, or anywhere you want to show your achievement.</p>
  <p style="color:#a0a8a0;font-size:.85rem">— ONBOARD3 Team</p>
</div>`;
}

// ─── Dashboard controllers ──────────────────────────────────────────────────

exports.getList = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user   = await User.findById(userId).select('-password');
    if (!user) return res.redirect('/auth');

    const [current, upcoming, past] = await Promise.all([
      AcademyCohort.find({ status: { $in: ['applications_open','applications_closed','active'] } }).sort({ startDate: 1 }),
      AcademyCohort.find({ status: 'draft', startDate: { $gt: new Date() } }).sort({ startDate: 1 }),
      AcademyCohort.find({ status: 'ended' }).sort({ endDate: -1 }).limit(10)
    ]);

    // Get user's application status for visible cohorts
    const allCohorts = [...current, ...upcoming, ...past];
    const myApps = await AcademyApplication.find({ userId, cohortId: { $in: allCohorts.map(c => c._id) } }).select('cohortId status');
    const appMap = {};
    myApps.forEach(a => { appMap[String(a.cohortId)] = a.status; });

    res.render('dashboard/academy', {
      title: 'ONBOARD3 Academy',
      user, currentPage: 'academy',
      current, upcoming, past, appMap
    });
  } catch (err) {
    console.error('[Academy] getList:', err);
    res.redirect('/dashboard');
  }
};

exports.getCohort = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user   = await User.findById(userId).select('-password');
    if (!user) return res.redirect('/auth');

    const cohort = await AcademyCohort.findOne({ slug: req.params.slug });
    if (!cohort) return res.redirect('/dashboard/academy');

    const [myApp, myEnrollment, enrolledCount] = await Promise.all([
      AcademyApplication.findOne({ cohortId: cohort._id, userId }),
      AcademyEnrollment.findOne({ cohortId: cohort._id, userId }),
      AcademyEnrollment.countDocuments({ cohortId: cohort._id })
    ]);

    res.render('dashboard/academy-cohort', {
      title: cohort.title + ' — ONBOARD3 Academy',
      user, currentPage: 'academy',
      cohort, myApp, myEnrollment, enrolledCount
    });
  } catch (err) {
    console.error('[Academy] getCohort:', err);
    res.redirect('/dashboard/academy');
  }
};

exports.getApplyForm = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user   = await User.findById(userId).select('-password');
    if (!user) return res.redirect('/auth');

    const cohort = await AcademyCohort.findOne({ slug: req.params.slug, status: 'applications_open' });
    if (!cohort) return res.redirect('/dashboard/academy/' + req.params.slug);

    const existing = await AcademyApplication.findOne({ cohortId: cohort._id, userId });
    if (existing) return res.redirect('/dashboard/academy/' + req.params.slug);

    const enrolledCount = await AcademyEnrollment.countDocuments({ cohortId: cohort._id });
    if (enrolledCount >= cohort.seats) return res.redirect('/dashboard/academy/' + req.params.slug);

    res.render('dashboard/academy-apply', {
      title: 'Apply — ' + cohort.title,
      user, currentPage: 'academy',
      cohort, error: null
    });
  } catch (err) {
    console.error('[Academy] getApplyForm:', err);
    res.redirect('/dashboard/academy');
  }
};

exports.submitApplication = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user   = await User.findById(userId).select('-password');
    if (!user) return res.redirect('/auth');

    const cohort = await AcademyCohort.findOne({ slug: req.params.slug, status: 'applications_open' });
    if (!cohort) return res.redirect('/dashboard/academy/' + req.params.slug);

    const existing = await AcademyApplication.findOne({ cohortId: cohort._id, userId });
    if (existing) return res.redirect('/dashboard/academy/' + req.params.slug);

    const { name, email, xUsername, telegramUsername, experienceLevel, motivation, goal, hoursPerWeek, willingToComplete, challengeAnswer } = req.body;

    if (!name || !email || !motivation || !goal) {
      return res.render('dashboard/academy-apply', {
        title: 'Apply — ' + cohort.title,
        user, currentPage: 'academy',
        cohort, error: 'Please fill in all required fields.'
      });
    }

    await AcademyApplication.create({
      cohortId: cohort._id, userId,
      name, email, xUsername, telegramUsername,
      experienceLevel, motivation, goal, hoursPerWeek,
      willingToComplete: willingToComplete === 'yes',
      challengeAnswer
    });

    res.redirect('/dashboard/academy/' + req.params.slug + '?applied=1');
  } catch (err) {
    console.error('[Academy] submitApplication:', err);
    res.redirect('/dashboard/academy/' + req.params.slug);
  }
};

exports.getClassroom = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user   = await User.findById(userId).select('-password');
    if (!user) return res.redirect('/auth');

    const cohort = await AcademyCohort.findOne({ slug: req.params.slug });
    if (!cohort) return res.redirect('/dashboard/academy');

    const enrollment = await AcademyEnrollment.findOne({ cohortId: cohort._id, userId, status: { $in: ['active','completed','graduated'] } });
    if (!enrollment) return res.redirect('/dashboard/academy/' + req.params.slug);

    res.render('dashboard/academy-classroom', {
      title: cohort.title + ' — Classroom',
      user, currentPage: 'academy',
      cohort, enrollment
    });
  } catch (err) {
    console.error('[Academy] getClassroom:', err);
    res.redirect('/dashboard/academy');
  }
};

exports.submitAssignment = async (req, res) => {
  try {
    const userId = req.session.userId;
    const week   = parseInt(req.params.week);
    const { submissionUrl } = req.body;

    const cohort = await AcademyCohort.findOne({ slug: req.params.slug });
    if (!cohort) return res.json({ success: false, message: 'Cohort not found' });

    const enrollment = await AcademyEnrollment.findOne({ cohortId: cohort._id, userId, status: 'active' });
    if (!enrollment) return res.json({ success: false, message: 'Not enrolled' });

    // Remove old submission for this week if exists
    enrollment.assignmentSubmissions = enrollment.assignmentSubmissions.filter(s => s.week !== week);
    enrollment.assignmentSubmissions.push({ week, submissionUrl, submittedAt: new Date() });

    // Recalculate completed count
    const weeklyWithAssignments = cohort.weeklySchedule.filter(w => w.assignment && w.assignment.title);
    const submittedWeeks = new Set(enrollment.assignmentSubmissions.map(s => s.week));
    enrollment.assignmentsCompleted = weeklyWithAssignments.filter(w => submittedWeeks.has(w.week)).length;

    await enrollment.save();
    res.json({ success: true, message: 'Assignment submitted!' });
  } catch (err) {
    console.error('[Academy] submitAssignment:', err);
    res.json({ success: false, message: 'Server error' });
  }
};

// ─── Public certificate verify ──────────────────────────────────────────────

exports.verifyCertificate = async (req, res) => {
  try {
    const cert = await AcademyCertificate.findOne({ certificateId: req.params.certId });
    res.render('academy-verify', {
      title: cert ? `Certificate — ${cert.username}` : 'Certificate Not Found',
      cert
    });
  } catch (err) {
    console.error('[Academy] verifyCertificate:', err);
    res.render('academy-verify', { title: 'Certificate Not Found', cert: null });
  }
};

// ─── Admin controllers ──────────────────────────────────────────────────────

exports.adminListCohorts = async (req, res) => {
  try {
    const cohorts = await AcademyCohort.find().sort({ createdAt: -1 });
    const counts  = await Promise.all(cohorts.map(c =>
      Promise.all([
        AcademyApplication.countDocuments({ cohortId: c._id }),
        AcademyEnrollment.countDocuments({ cohortId: c._id })
      ]).then(([apps, enrolled]) => ({ apps, enrolled }))
    ));
    const user = await User.findById(req.session.userId);
    res.render('admin/pages/academy-cohorts', {
      title: 'Academy Cohorts', page: 'academy-cohorts', user,
      cohorts, counts
    });
  } catch (err) {
    console.error('[Academy Admin] listCohorts:', err);
    res.redirect('/admin');
  }
};

exports.adminCohortForm = async (req, res) => {
  try {
    const user = await User.findById(req.session.userId);
    let cohort = null;
    if (req.params.id) cohort = await AcademyCohort.findById(req.params.id);
    res.render('admin/pages/academy-cohort-form', {
      title: cohort ? 'Edit Cohort' : 'New Cohort',
      page: 'academy-cohorts', user, cohort
    });
  } catch (err) {
    console.error('[Academy Admin] cohortForm:', err);
    res.redirect('/admin/academy/cohorts');
  }
};

exports.adminSaveCohort = async (req, res) => {
  try {
    const { title, slug, description, topic, duration, status, seats,
            requirements, admissionChallenge, telegramGroupLink, telegramChannelLink,
            startDate, endDate, applicationDeadline,
            whatYoullLearn, instructors, weeklySchedule } = req.body;

    const data = {
      title: title?.trim(),
      slug: slug?.trim().toLowerCase().replace(/\s+/g, '-'),
      description, topic, duration, status,
      seats: parseInt(seats) || 50,
      requirements, admissionChallenge,
      telegramGroupLink, telegramChannelLink,
      startDate: startDate || null,
      endDate:   endDate   || null,
      applicationDeadline: applicationDeadline || null,
      whatYoullLearn: Array.isArray(whatYoullLearn) ? whatYoullLearn.filter(Boolean) : (whatYoullLearn ? [whatYoullLearn] : []),
      instructors: [],
      weeklySchedule: []
    };

    // Parse instructors from JSON field
    if (instructors) {
      try { data.instructors = JSON.parse(instructors); } catch {}
    }

    // Parse weekly schedule from JSON field
    if (weeklySchedule) {
      try { data.weeklySchedule = JSON.parse(weeklySchedule); } catch {}
    }

    if (req.params.id) {
      await AcademyCohort.findByIdAndUpdate(req.params.id, { $set: data });
    } else {
      data.createdBy = req.session.userId;
      await AcademyCohort.create(data);
    }

    res.redirect('/admin/academy/cohorts');
  } catch (err) {
    console.error('[Academy Admin] saveCohort:', err);
    res.redirect('/admin/academy/cohorts');
  }
};

exports.adminDeleteCohort = async (req, res) => {
  try {
    await AcademyCohort.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
};

exports.adminListApplications = async (req, res) => {
  try {
    const user   = await User.findById(req.session.userId);
    const filter = req.query.filter || 'applied';
    const cohortId = req.query.cohort || null;

    const query = {};
    if (filter !== 'all') query.status = filter;
    if (cohortId) query.cohortId = cohortId;

    const [applications, cohorts] = await Promise.all([
      AcademyApplication.find(query).sort({ createdAt: -1 }).populate('cohortId', 'title slug').lean(),
      AcademyCohort.find().select('title slug').sort({ createdAt: -1 })
    ]);

    res.render('admin/pages/academy-applications', {
      title: 'Academy Applications', page: 'academy-cohorts', user,
      applications, cohorts, filter, cohortId
    });
  } catch (err) {
    console.error('[Academy Admin] listApplications:', err);
    res.redirect('/admin/academy/cohorts');
  }
};

exports.adminReviewApplication = async (req, res) => {
  try {
    const { status, reviewNote } = req.body;
    const app = await AcademyApplication.findById(req.params.id).populate('cohortId');
    if (!app) return res.json({ ok: false, error: 'Not found' });

    const user = await User.findById(app.userId);
    const cohort = app.cohortId;

    const oldStatus = app.status;
    app.status     = status;
    app.reviewNote = reviewNote || '';
    app.reviewedAt = new Date();
    app.reviewedBy = req.session.userId;
    await app.save();

    // Create enrollment if accepted
    if (status === 'accepted' && oldStatus !== 'accepted') {
      const existing = await AcademyEnrollment.findOne({ cohortId: cohort._id, userId: app.userId });
      if (!existing) {
        await AcademyEnrollment.create({ cohortId: cohort._id, userId: app.userId });
      }
    }

    // Send email
    if (user) {
      let html = '';
      if (status === 'accepted')  html = acceptanceEmail(user, cohort);
      if (status === 'rejected')  html = rejectionEmail(user, cohort, reviewNote);
      if (status === 'waitlisted') html = waitlistEmail(user, cohort);
      if (html) {
        try {
          await sendEmail({ to: user.email, subject: `ONBOARD3 Academy — ${cohort.title}`, html });
        } catch (e) { console.error('[Academy] email error:', e.message); }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[Academy Admin] reviewApplication:', err);
    res.json({ ok: false, error: 'Server error' });
  }
};

exports.adminStudents = async (req, res) => {
  try {
    const user   = await User.findById(req.session.userId);
    const cohort = await AcademyCohort.findById(req.params.id);
    if (!cohort) return res.redirect('/admin/academy/cohorts');

    const enrollments = await AcademyEnrollment.find({ cohortId: cohort._id })
      .populate('userId', 'username email profilePicture')
      .sort({ createdAt: 1 });

    const totalWeeks = cohort.weeklySchedule.length || 4;

    res.render('admin/pages/academy-students', {
      title: cohort.title + ' — Students', page: 'academy-cohorts', user,
      cohort, enrollments, totalWeeks
    });
  } catch (err) {
    console.error('[Academy Admin] students:', err);
    res.redirect('/admin/academy/cohorts');
  }
};

exports.adminUpdateAttendance = async (req, res) => {
  try {
    const { attendanceWeeks, status } = req.body;
    const weeks = Array.isArray(attendanceWeeks) ? attendanceWeeks.map(Number) : [];
    const update = { attendanceWeeks: weeks };
    if (status) update.status = status;
    await AcademyEnrollment.findByIdAndUpdate(req.params.id, { $set: update });
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
};

exports.adminGraduate = async (req, res) => {
  try {
    const enrollment = await AcademyEnrollment.findById(req.params.id)
      .populate('userId', 'username email')
      .populate('cohortId', 'title topic');

    if (!enrollment) return res.json({ ok: false, error: 'Not found' });

    const certId = await generateCertificateId();

    await AcademyCertificate.create({
      certificateId: certId,
      userId:        enrollment.userId._id,
      cohortId:      enrollment.cohortId._id,
      enrollmentId:  enrollment._id,
      username:      enrollment.userId.username,
      cohortTitle:   enrollment.cohortId.title,
      cohortTopic:   enrollment.cohortId.topic
    });

    enrollment.status        = 'graduated';
    enrollment.graduatedAt   = new Date();
    enrollment.certificateId = certId;
    await enrollment.save();

    // Send graduation email
    try {
      await sendEmail({
        to: enrollment.userId.email,
        subject: `🎓 Congratulations — You graduated from ${enrollment.cohortId.title}!`,
        html: graduationEmail(enrollment.userId, enrollment.cohortId, certId)
      });
    } catch (e) { console.error('[Academy] graduation email error:', e.message); }

    res.json({ ok: true, certificateId: certId });
  } catch (err) {
    console.error('[Academy Admin] graduate:', err);
    res.json({ ok: false, error: 'Server error' });
  }
};
