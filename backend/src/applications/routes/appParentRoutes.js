const express = require('express');
const router = express.Router();

const appParentProfileRoutes = require('./appParentProfileRoutes');
const appParentHomeRoutes = require('./appParentHomeRoutes');
const appParentAcademicRoutes = require('./appParentAcademicRoutes');
const appParentFeeRoutes = require('./appParentFeeRoutes');
const { requireAuth } = require('../../middleware/authMiddleware');
const { requireParentAndChildAccess } = require('../middleware/parentAuthMiddleware');

// Mount Parent Sub-routes
router.use('/profile', appParentProfileRoutes);
router.use('/children/:studentId/fees', requireAuth, requireParentAndChildAccess, appParentFeeRoutes);
router.use('/children/:studentId', requireAuth, requireParentAndChildAccess, appParentAcademicRoutes);
router.use('/', appParentHomeRoutes);

module.exports = router;
