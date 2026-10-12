const appProfileService = require('../services/appProfileService');
const { validateProfileUpdatePayload } = require('../validators/appProfileValidator');

class AppProfileController {
    /**
     * GET /api/app/profile
     */
    async getProfile(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appProfileService.getProfile(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppProfileController.getProfile]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve student profile'
            });
        }
    }

    /**
     * PUT /api/app/profile
     */
    async updateProfile(req, res) {
        try {
            const validationError = validateProfileUpdatePayload(req.body);
            if (validationError) {
                return res.status(400).json({
                    success: false,
                    message: validationError
                });
            }

            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appProfileService.updateProfile(tenantId, userId, req.body);
            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                data
            });
        } catch (error) {
            console.error('[AppProfileController.updateProfile]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update student profile'
            });
        }
    }

    /**
     * POST /api/app/profile/photo
     */
    async updateProfilePhoto(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const result = await appProfileService.updateProfilePhoto(tenantId, userId, req.file);
            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    profilePhotoUrl: result.profilePhotoUrl
                }
            });
        } catch (error) {
            console.error('[AppProfileController.updateProfilePhoto]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to update profile photo'
            });
        }
    }

    /**
     * GET /api/app/profile/guardians
     */
    async getGuardians(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appProfileService.getGuardians(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppProfileController.getGuardians]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve guardian information'
            });
        }
    }

    /**
     * GET /api/app/profile/documents
     */
    async getDocuments(req, res) {
        try {
            const userId = req.user.userId || req.user.id;
            const tenantId = req.user.tenantId;

            const data = await appProfileService.getDocuments(tenantId, userId);
            return res.status(200).json({
                success: true,
                data
            });
        } catch (error) {
            console.error('[AppProfileController.getDocuments]', error.message);
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || 'Failed to retrieve student documents'
            });
        }
    }
}

module.exports = new AppProfileController();
