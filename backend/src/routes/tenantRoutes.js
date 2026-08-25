const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { requireAuth, requireSaasAdmin, requirePermission } = require('../middleware/authMiddleware');
const { uploadLogo, verifyFileSignature } = require('../middleware/uploadMiddleware');

// All routes require authentication and SaaS Admin privileges (with explicit permissions)
router.use(requireAuth);
router.use(requireSaasAdmin);

// Custom middleware to handle multer errors gracefully
const handleUpload = (req, res, next) => {
    const upload = uploadLogo.single('logo');
    upload(req, res, function (err) {
        if (err) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ status: 'error', message: 'Logo file size exceeds the 500KB limit.' });
            }
            return res.status(400).json({ status: 'error', message: err.message });
        }
        next();
    });
};

router.get('/', requirePermission('tenant.view'), tenantController.getTenants);
router.post('/', requirePermission('tenant.create'), handleUpload, verifyFileSignature, tenantController.createTenant);
router.get('/:id', requirePermission('tenant.view'), tenantController.getTenantById);
router.put('/:id', requirePermission('tenant.update'), handleUpload, verifyFileSignature, tenantController.updateTenant);
router.patch('/:id/status', requirePermission('tenant.update_status'), tenantController.updateTenantStatus);

module.exports = router;
