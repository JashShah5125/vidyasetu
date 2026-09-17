const express = require('express');
const router = express.Router();
const enquiryController = require('../controllers/enquiryController');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const validate = require('../middleware/validateMiddleware');
const { createEnquirySchema, updateEnquirySchema, followupSchema, convertEnquirySchema } = require('../validators/enquiryValidator');

router.use(requireAuth);

router.get('/', requirePermission('enquiry:read'), enquiryController.getEnquiries);
router.get('/options', requirePermission('enquiry:read'), enquiryController.getEnquiryOptions);
router.get('/:id/followups', requirePermission('enquiry:read'), enquiryController.getFollowups);
router.get('/:id', requirePermission('enquiry:read'), enquiryController.getEnquiryById);
router.post('/', validate(createEnquirySchema), requirePermission('enquiry:create'), enquiryController.createEnquiry);
router.put('/:id', validate(updateEnquirySchema), requirePermission('enquiry:update'), enquiryController.updateEnquiry);
router.post('/:id/followups', validate(followupSchema), requirePermission('enquiry:followup'), enquiryController.addFollowup);
router.post('/:id/convert', validate(convertEnquirySchema), requirePermission('enquiry:convert'), enquiryController.convertEnquiryToStudent);

module.exports = router;