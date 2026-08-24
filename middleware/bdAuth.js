const BusinessDeveloper = require('../models/BusinessDeveloper');

const bdAuth = async (req, res, next) => {
  if (!req.session.bdId) {
    return res.redirect('/business-developers/login');
  }
  try {
    const bd = await BusinessDeveloper.findById(req.session.bdId);
    if (!bd || bd.status !== 'approved') {
      req.session.destroy(() => {});
      return res.redirect('/business-developers/login');
    }
    req.bd = bd;
    next();
  } catch (err) {
    console.error('bdAuth error:', err);
    res.redirect('/business-developers/login');
  }
};

module.exports = bdAuth;
