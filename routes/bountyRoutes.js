const express = require('express');
const router  = express.Router();
const bc      = require('../controllers/bountyController');

const isAuth = (req, res, next) => req.session.userId ? next() : res.redirect('/auth');

router.get('/',                     isAuth, bc.listBounties);
router.get('/internal/:id',         isAuth, bc.internalBountyDetail);
router.post('/internal/:id/submit', isAuth, bc.submitToInternalBounty);
router.get('/external/:id',         isAuth, bc.externalBountyDetail);
router.post('/external/:id/submit', isAuth, bc.submitToExternalBounty);

module.exports = router;
