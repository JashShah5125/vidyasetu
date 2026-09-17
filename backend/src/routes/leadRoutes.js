const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');

// All lead routes require authentication and SaaS Admin privileges
router.use(requireAuth);
router.use(requireSaasAdmin);

router.get('/', requirePermission('lead.view'), leadController.getLeads);
router.get('/:id', requirePermission('lead.view'), leadController.getLeadById);
router.post('/', requirePermission('lead.create'), leadController.createLead);
router.put('/:id', requirePermission('lead.update'), leadController.updateLead);
router.patch('/:id/status', requirePermission('lead.update'), leadController.updateLeadStatus);
router.delete('/:id', requirePermission('lead.delete'), leadController.deleteLead);
router.post('/:id/followups', requirePermission('lead_followup.add'), leadController.addFollowup);

module.exports = router;