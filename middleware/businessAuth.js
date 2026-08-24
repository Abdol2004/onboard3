const Business = require('../models/Business');

const businessAuth = async (req, res, next) => {
  if (!req.session.businessId) {
    return res.redirect('/business/login');
  }
  try {
    const business = await Business.findById(req.session.businessId);
    if (!business || business.status !== 'approved') {
      req.session.destroy(() => {});
      return res.redirect('/business/login');
    }
    req.business = business;
    next();
  } catch (err) {
    console.error('businessAuth error:', err);
    res.redirect('/business/login');
  }
};

module.exports = businessAuth;
