const express = require('express');
const router  = express.Router();
const bc      = require('../controllers/bountyController');

const isAuth = (req, res, next) => req.session.userId ? next() : res.redirect('/auth');

router.get('/',                     bc.listBounties);
router.get('/internal/:id',         bc.internalBountyDetail);
router.post('/internal/:id/submit', isAuth, bc.submitToInternalBounty);
router.get('/external/:id',         bc.externalBountyDetail);
router.post('/external/:id/submit', isAuth, bc.submitToExternalBounty);

module.exports = router;
