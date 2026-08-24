const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');

const BusinessDeveloper  = require('../models/BusinessDeveloper');
const Business           = require('../models/Business');
const BDEarning          = require('../models/BDEarning');
const BusinessTransaction= require('../models/BusinessTransaction');
const bdAuth             = require('../middleware/bdAuth');

// ── Auth pages ────────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  if (req.session.bdId) return res.redirect('/business-developers/dashboard');
  res.redirect('/business-developers/login');
});

router.get('/login', (req, res) => {
  if (req.session.bdId) return res.redirect('/business-developers/dashboard');
  res.render('business-developers/login', { error: null, success: null });
});

router.get('/signup', (req, res) => {
  if (req.session.bdId) return res.redirect('/business-developers/dashboard');
  res.render('business-developers/signup', { error: null });
});

// ── Auth actions ──────────────────────────────────────────────────────────────

router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, phone, bio } = req.body;
    if (!name || !email || !password) {
      return res.render('business-developers/signup', { error: 'Name, email and password are required.' });
    }
    const exists = await BusinessDeveloper.findOne({ email: email.toLowerCase().trim() });
    if (exists) {
      return res.render('business-developers/signup', { error: 'An account with this email already exists.' });
    }
    await BusinessDeveloper.create({ name, email, password, phone, bio });
    res.render('business-developers/login', {
      error: null,
      success: 'Account created! Please wait for admin approval before logging in.'
    });
  } catch (err) {
    console.error('BD signup error:', err);
    res.render('business-developers/signup', { error: 'Something went wrong. Please try again.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const bd = await BusinessDeveloper.findOne({ email: email.toLowerCase().trim() });
    if (!bd || !(await bd.comparePassword(password))) {
      return res.render('business-developers/login', { error: 'Invalid email or password.', success: null });
    }
    if (bd.status === 'pending') {
      return res.render('business-developers/login', { error: 'Your account is pending admin approval.', success: null });
    }
    if (bd.status === 'rejected') {
      return res.render('business-developers/login', { error: 'Your account application was rejected.', success: null });
    }
    if (bd.status === 'suspended') {
      return res.render('business-developers/login', { error: 'Your account has been suspended. Contact support.', success: null });
    }
    bd.lastLogin = new Date();
    await bd.save();
    req.session.bdId   = bd._id.toString();
    req.session.bdName = bd.name;
    res.redirect('/business-developers/dashboard');
  } catch (err) {
    console.error('BD login error:', err);
    res.render('business-developers/login', { error: 'Something went wrong. Please try again.', success: null });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/business-developers/login'));
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get('/dashboard', bdAuth, async (req, res) => {
  try {
    const bd = req.bd;
    const businesses = await Business.find({ createdBy: bd._id }).sort({ createdAt: -1 });

    const earnings = await BDEarning.find({ bdId: bd._id })
      .populate('businessId', 'name username')
      .sort({ createdAt: -1 })
      .limit(20);

    const earningStats = await BDEarning.aggregate([
      { $match: { bdId: bd._id } },
      { $group: {
        _id: '$status',
        total: { $sum: '$commissionAmount' }
      }}
    ]);

    const pendingEarnings = earningStats.find(e => e._id === 'pending')?.total || 0;
    const paidEarnings    = earningStats.find(e => e._id === 'paid')?.total    || 0;

    res.render('business-developers/dashboard', {
      bd,
      businesses,
      earnings,
      pendingEarnings,
      paidEarnings,
      totalEarned: pendingEarnings + paidEarnings
    });
  } catch (err) {
    console.error('BD dashboard error:', err);
    res.redirect('/business-developers/login');
  }
});

// ── Create business account ───────────────────────────────────────────────────

router.post('/create-business', bdAuth, async (req, res) => {
  try {
    const bd = req.bd;
    const { name, username, password, email, phone, description, website, industry } = req.body;

    if (!name || !username || !password) {
      return res.redirect('/business-developers/dashboard?error=name_username_password_required');
    }

    const exists = await Business.findOne({ username: username.toLowerCase().trim() });
    if (exists) {
      return res.redirect('/business-developers/dashboard?error=username_taken');
    }

    const business = await Business.create({
      name, username, password, email, phone, description, website, industry,
      createdBy: bd._id
    });

    bd.businesses.push(business._id);
    await bd.save();

    res.redirect('/business-developers/dashboard?success=business_created');
  } catch (err) {
    console.error('Create business error:', err);
    res.redirect('/business-developers/dashboard?error=server_error');
  }
});

module.exports = router;
