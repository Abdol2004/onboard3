const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/academyController');

const isAuth = (req, res, next) => req.session.userId ? next() : res.redirect('/auth');
router.use(isAuth);

router.get('/',                                controller.getList);
router.get('/:slug',                           controller.getCohort);
router.get('/:slug/apply',                     controller.getApplyForm);
router.post('/:slug/apply',                    controller.submitApplication);
router.get('/:slug/classroom',                 controller.getClassroom);
router.post('/:slug/classroom/submit/:week',   controller.submitAssignment);

module.exports = router;
